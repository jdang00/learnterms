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

		const oldOrder = movedClass.order;
		const newOrder = args.newOrder;

		for (const classItem of allClasses) {
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
