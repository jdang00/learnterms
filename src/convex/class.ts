import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Get user classes by their UserId and looking up their school and cohort
export const getUserClasses = query({
	args: { id: v.string() },
	handler: async (ctx, args) => {
		const classes = await ctx.db
			.query('class')
			.filter((q) => q.eq(q.field('cohortId'), args.id))
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
			.filter((q) => q.eq(q.field('classId'), args.classId))
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
			.filter((q) => q.eq(q.field('cohortId'), args.cohortId))
			.collect();

		const movedClass = allClasses.find((c) => c._id === args.classId);
		if (!movedClass) return;

		// Only reorder classes within the same semester
		const semesterClasses = allClasses.filter(c => c.semesterId === movedClass.semesterId);
		
		const oldOrder = movedClass.order;
		const newOrder = args.newOrder;

		for (const classItem of semesterClasses) {
			let updatedOrder = classItem.order;

			if (classItem._id === args.classId) {
				updatedOrder = newOrder;
			} else if (oldOrder < newOrder) {
				if (classItem.order > oldOrder && classItem.order <= newOrder) {
					updatedOrder = classItem.order - 1;
				}
			} else if (oldOrder > newOrder) {
				if (classItem.order >= newOrder && classItem.order < oldOrder) {
					updatedOrder = classItem.order + 1;
				}
			}

			await ctx.db.patch(classItem._id, { order: updatedOrder });
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
		const id = await ctx.db.insert('class', args);
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
			.filter((q) => q.eq(q.field('classId'), args.classId))
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
		
		await ctx.db.patch(args.classId, {
			name: args.name,
			code: args.code,
			description: args.description,
			semesterId: args.semesterId,
			updatedAt: Date.now()
		});
		
		return { updated: true };
	}
});
