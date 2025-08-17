import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Get user classes by their UserId and looking up their school and cohort
export const getUserClasses = query({
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

export const getClassById = query({
	args: { id: v.id('class') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	}
});

export const getClassContentCounts = query({
	args: { classId: v.id('class') },
	handler: async (ctx, args) => {
		const modules = await ctx.db
			.query('module')
			.withIndex('by_classId', (q) => q.eq('classId', args.classId))
			.collect();

		let totalQuestions = 0;
		for (const module of modules) {
			const questions = await ctx.db
				.query('question')
				.withIndex('by_moduleId', (q) => q.eq('moduleId', module._id))
				.collect();
			totalQuestions += questions.length;
		}

		return {
			moduleCount: modules.length,
			questionCount: totalQuestions
		};
	}
});

export const updateClassOrder = mutation({
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

export const insertClass = mutation({
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

export const deleteClass = mutation({
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

export const updateClass = mutation({
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
