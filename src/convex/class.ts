import { authQuery, authAdminMutation } from './authQueries';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';

// Get user classes by their UserId and looking up their school and cohort
export const getUserClasses = authQuery({
	args: { id: v.id('cohort') },
	handler: async (ctx, args) => {
		const classes = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.id))
			.collect();

		// Get semester information for each class
		const classesWithSemesters = await Promise.all(
			classes.map(async (classItem) => {
				const semester = await ctx.db.get(classItem.semesterId);
				return {
					...classItem,
					semester: semester ? { _id: semester._id, name: semester.name } : null
				};
			})
		);

		return classesWithSemesters.sort((a, b) => a.order - b.order);
	}
});

export const getClassById = authQuery({
	args: { id: v.id('class') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	}
});

export const getAllClasses = authQuery({
	args: {},
	handler: async (ctx) => {
		const classes = await ctx.db.query('class').collect();
		return classes.sort((a, b) => a.order - b.order);
	}
});

export const getClassContentCounts = authQuery({
	args: { classId: v.id('class') },
	handler: async (ctx, args) => {
		const modules = await ctx.db
			.query('module')
			.withIndex('by_classId', (q) => q.eq('classId', args.classId))
			.collect();

		// Use stored questionCount field instead of querying all questions
		const totalQuestions = modules.reduce((sum, module) => sum + (module.questionCount ?? 0), 0);

		return {
			moduleCount: modules.length,
			questionCount: totalQuestions
		};
	}
});

export const updateClassOrder = authAdminMutation({
	args: {
		classId: v.id('class'),
		newOrder: v.number(),
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		const allClasses = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		const movedClass = allClasses.find((c) => c._id === args.classId);
		if (!movedClass) return;

		// Only reorder classes within the same semester
		const semesterClasses = allClasses.filter((c) => c.semesterId === movedClass.semesterId);

		// Sort classes by their current order to get the correct sequence
		semesterClasses.sort((a, b) => a.order - b.order);

		// Find the current position of the moved class in the sorted array
		const oldIndex = semesterClasses.findIndex((c) => c._id === args.classId);
		const newIndex = args.newOrder;

		// Remove the moved class from its current position
		semesterClasses.splice(oldIndex, 1);
		// Insert it at the new position
		semesterClasses.splice(newIndex, 0, movedClass);

		// Update all classes with their new order based on their position in the array
		for (let i = 0; i < semesterClasses.length; i++) {
			await ctx.db.patch(semesterClasses[i]._id, { order: i });
		}
	}
});

export const insertClass = authAdminMutation({
	args: {
		name: v.string(),
		metadata: v.object({}),
		updatedAt: v.number(),
		cohortId: v.id('cohort'),
		semesterId: v.id('semester'),
		code: v.string(),
		description: v.string(),
		order: v.number()
	},
	handler: async (ctx, args) => {
		// Trim whitespace from string fields
		const trimmedName = args.name.trim();
		const trimmedCode = args.code.trim();
		const trimmedDescription = args.description.trim();

		// Validation: Check required fields
		if (!trimmedName) {
			throw new Error('Class name is required and cannot be empty');
		}
		if (!trimmedCode) {
			throw new Error('Class code is required and cannot be empty');
		}
		if (!trimmedDescription) {
			throw new Error('Class description is required and cannot be empty');
		}

		// Validation: Length limits
		if (trimmedName.length < 2) {
			throw new Error('Class name must be at least 2 characters long');
		}
		if (trimmedName.length > 100) {
			throw new Error('Class name cannot exceed 100 characters');
		}
		if (trimmedCode.length < 2) {
			throw new Error('Class code must be at least 2 characters long');
		}
		if (trimmedCode.length > 20) {
			throw new Error('Class code cannot exceed 20 characters');
		}
		if (trimmedDescription.length < 10) {
			throw new Error('Class description must be at least 10 characters long');
		}
		if (trimmedDescription.length > 500) {
			throw new Error('Class description cannot exceed 500 characters');
		}

		// Validation: Class code format (alphanumeric, hyphens, underscores only)
		const codePattern = /^[a-zA-Z0-9\-_\s]+$/;
		if (!codePattern.test(trimmedCode)) {
			throw new Error(
				'Class code can only contain letters, numbers, hyphens, underscores, and spaces'
			);
		}

		// Validation: Check for duplicates within the same cohort
		const existingClasses = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		const nameExists = existingClasses.some(
			(existingClass) => existingClass.name.toLowerCase() === trimmedName.toLowerCase()
		);
		if (nameExists) {
			throw new Error('A class with this name already exists in your cohort');
		}

		const codeExists = existingClasses.some(
			(existingClass) => existingClass.code.toLowerCase() === trimmedCode.toLowerCase()
		);
		if (codeExists) {
			throw new Error('A class with this code already exists in your cohort');
		}

		// Validation: Verify semester exists
		const semester = await ctx.db.get(args.semesterId);
		if (!semester) {
			throw new Error('Selected semester does not exist');
		}

		// Insert with trimmed values
		const id = await ctx.db.insert('class', {
			...args,
			name: trimmedName,
			code: trimmedCode,
			description: trimmedDescription
		});
		return id;
	}
});

export const deleteClass = authAdminMutation({
	args: {
		classId: v.id('class'),
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		const classToDelete = await ctx.db.get(args.classId);
		if (!classToDelete || classToDelete.cohortId !== args.cohortId) {
			throw new Error('Class not found or access denied');
		}

		const modules = await ctx.db
			.query('module')
			.withIndex('by_classId', (q) => q.eq('classId', args.classId))
			.collect();

		let totalQuestionsDeleted = 0;
		for (const module of modules) {
			const questions = await ctx.db
				.query('question')
				.withIndex('by_moduleId', (q) => q.eq('moduleId', module._id))
				.collect();

			for (const question of questions) {
				await ctx.db.delete(question._id);
			}
			totalQuestionsDeleted += questions.length;

			await ctx.db.delete(module._id);
		}

		await ctx.db.delete(args.classId);
		return {
			deleted: true,
			modulesDeleted: modules.length,
			questionsDeleted: totalQuestionsDeleted
		};
	}
});

export const updateClass = authAdminMutation({
	args: {
		classId: v.id('class'),
		cohortId: v.id('cohort'),
		name: v.string(),
		code: v.string(),
		description: v.string(),
		semesterId: v.id('semester')
	},
	handler: async (ctx, args) => {
		const classToUpdate = await ctx.db.get(args.classId);
		if (!classToUpdate || classToUpdate.cohortId !== args.cohortId) {
			throw new Error('Class not found or access denied');
		}

		// Trim whitespace from string fields
		const trimmedName = args.name.trim();
		const trimmedCode = args.code.trim();
		const trimmedDescription = args.description.trim();

		// Validation: Check required fields
		if (!trimmedName) {
			throw new Error('Class name is required and cannot be empty');
		}
		if (!trimmedCode) {
			throw new Error('Class code is required and cannot be empty');
		}
		if (!trimmedDescription) {
			throw new Error('Class description is required and cannot be empty');
		}

		// Validation: Length limits
		if (trimmedName.length < 2) {
			throw new Error('Class name must be at least 2 characters long');
		}
		if (trimmedName.length > 100) {
			throw new Error('Class name cannot exceed 100 characters');
		}
		if (trimmedCode.length < 2) {
			throw new Error('Class code must be at least 2 characters long');
		}
		if (trimmedCode.length > 20) {
			throw new Error('Class code cannot exceed 20 characters');
		}
		if (trimmedDescription.length < 10) {
			throw new Error('Class description must be at least 10 characters long');
		}
		if (trimmedDescription.length > 500) {
			throw new Error('Class description cannot exceed 500 characters');
		}

		// Validation: Class code format (alphanumeric, hyphens, underscores only)
		const codePattern = /^[a-zA-Z0-9\-_\s]+$/;
		if (!codePattern.test(trimmedCode)) {
			throw new Error(
				'Class code can only contain letters, numbers, hyphens, underscores, and spaces'
			);
		}

		// Validation: Check for duplicates within the same cohort (excluding current class)
		const existingClasses = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		const nameExists = existingClasses.some(
			(existingClass) =>
				existingClass._id !== args.classId &&
				existingClass.name.toLowerCase() === trimmedName.toLowerCase()
		);
		if (nameExists) {
			throw new Error('A class with this name already exists in your cohort');
		}

		const codeExists = existingClasses.some(
			(existingClass) =>
				existingClass._id !== args.classId &&
				existingClass.code.toLowerCase() === trimmedCode.toLowerCase()
		);
		if (codeExists) {
			throw new Error('A class with this code already exists in your cohort');
		}

		// Validation: Verify semester exists
		const semester = await ctx.db.get(args.semesterId);
		if (!semester) {
			throw new Error('Selected semester does not exist');
		}

		await ctx.db.patch(args.classId, {
			name: trimmedName,
			code: trimmedCode,
			description: trimmedDescription,
			semesterId: args.semesterId,
			updatedAt: Date.now()
		});

		return { updated: true };
	}
});

function computeClassSearchScore(
	query: string,
	classItem: { name: string; code: string; description: string }
) {
	const name = classItem.name.toLowerCase();
	const code = classItem.code.toLowerCase();
	const description = classItem.description.toLowerCase();
	let score = 0;

	if (name === query) score += 300;
	else if (name.startsWith(query)) score += 220;
	else if (name.includes(query)) score += 150;

	if (code === query) score += 240;
	else if (code.startsWith(query)) score += 190;
	else if (code.includes(query)) score += 130;

	if (description.startsWith(query)) score += 80;
	else if (description.includes(query)) score += 40;

	return score;
}

async function assertCohortSearchAccess(
	ctx: { db: any; identity: { subject: string } },
	cohortId: Id<'cohort'>
) {
	const viewer = await ctx.db
		.query('users')
		.withIndex('by_clerkUserId', (q: any) => q.eq('clerkUserId', ctx.identity.subject))
		.first();
	if (!viewer) throw new Error('Unauthorized');
	if (viewer.role !== 'dev' && viewer.cohortId !== cohortId) {
		throw new Error('Unauthorized');
	}
}

export const searchClassesByCohort = authQuery({
	args: {
		cohortId: v.id('cohort'),
		query: v.string(),
		limit: v.optional(v.number())
	},
	handler: async (ctx, { cohortId, query, limit }) => {
		const trimmed = query.trim().toLowerCase();
		if (trimmed.length < 2) return [];
		await assertCohortSearchAccess(ctx, cohortId);
		if (!trimmed) return [];

		const max = Math.min(Math.max(limit ?? 12, 1), 40);
		const searchWindow = Math.min(max * 2, 60);
		let searchCandidates: Array<{
			_id: string;
			name: string;
			code: string;
			description: string;
			order: number;
			semesterId: Id<'semester'>;
			deletedAt?: number;
		}> = [];

		try {
			const [nameMatches, codeMatches, descriptionMatches] = await Promise.all([
				ctx.db
					.query('class')
					.withSearchIndex('by_cohortId_name', (q) =>
						q.search('name', trimmed).eq('cohortId', cohortId)
					)
					.take(searchWindow),
				ctx.db
					.query('class')
					.withSearchIndex('by_cohortId_code', (q) =>
						q.search('code', trimmed).eq('cohortId', cohortId)
					)
					.take(searchWindow),
				ctx.db
					.query('class')
					.withSearchIndex('by_cohortId_description', (q) =>
						q.search('description', trimmed).eq('cohortId', cohortId)
					)
					.take(searchWindow)
			]);
			searchCandidates = [...nameMatches, ...codeMatches, ...descriptionMatches];
		} catch {
			const scannedClasses = await ctx.db
				.query('class')
				.withIndex('by_cohortId', (q) => q.eq('cohortId', cohortId))
				.collect();
			searchCandidates = scannedClasses.filter((classItem) =>
				`${classItem.name} ${classItem.code} ${classItem.description}`
					.toLowerCase()
					.includes(trimmed)
			);
		}

		const merged = new Map<
			string,
			{
				_id: string;
				name: string;
				code: string;
				description: string;
				order: number;
				semesterId: Id<'semester'>;
				score: number;
			}
		>();

		for (const classItem of searchCandidates) {
			if (classItem.deletedAt) continue;
			const key = classItem._id;
			const score = computeClassSearchScore(trimmed, classItem);
			const existing = merged.get(key);
			if (existing) {
				existing.score = Math.max(existing.score, score);
				continue;
			}
			merged.set(key, {
				_id: classItem._id,
				name: classItem.name,
				code: classItem.code,
				description: classItem.description,
				order: classItem.order,
				semesterId: classItem.semesterId,
				score
			});
		}

		const ranked = Array.from(merged.values())
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score || a.order - b.order)
			.slice(0, max);

		const semesterIds = Array.from(new Set(ranked.map((item) => item.semesterId)));
		const semesters = await Promise.all(semesterIds.map((id) => ctx.db.get(id)));
		const semesterMap = new Map<Id<'semester'>, Doc<'semester'>>();
		for (const semester of semesters) {
			if (semester) {
				semesterMap.set(semester._id, semester);
			}
		}

		return ranked.map((item) => ({
			_id: item._id,
			name: item.name,
			code: item.code,
			description: item.description,
			semesterName: semesterMap.get(item.semesterId)?.name ?? null
		}));
	}
});
