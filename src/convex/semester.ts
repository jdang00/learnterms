import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getAllSemesters = query({
	args: {},
	handler: async (ctx) => {
		const semesters = ctx.db.query('semester').collect();

		return semesters;
	}
});

export const createSemester = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		metadata: v.object({}),
		updatedAt: v.number()
	},
	handler: async (ctx, args) => {
		const id = await ctx.db.insert('semester', args);
		return id;
	}
});

export const deleteSemester = mutation({
	args: {
		semesterId: v.id('semester')
	},
	handler: async (ctx, args) => {
		await ctx.db.delete(args.semesterId);
		return { deleted: true };
	}
});
