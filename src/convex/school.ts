import { query, internalQuery, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getAllSchools = query({
	args: {},
	handler: async (ctx) => {
		const schools = await ctx.db.query('school').collect();

		return schools;
	}
});

export const getSchoolById = query({
	args: { id: v.id('school') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	}
});

export const getSchoolByIdInternal = internalQuery({
	args: { id: v.id('school') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	}
});

export const createSchool = mutation({
	args: {
		name: v.string(),
		description: v.string(),
		metadata: v.object({}),
		updatedAt: v.number()
	},
	handler: async (ctx, args) => {
		const id = await ctx.db.insert('school', args);
		return id;
	}
});

export const deleteSchool = mutation({
	args: {
		schoolId: v.id('school')
	},
	handler: async (ctx, args) => {
		await ctx.db.delete(args.schoolId);
		return { deleted: true };
	}
});
