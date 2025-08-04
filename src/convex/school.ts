import { query, internalQuery } from './_generated/server';
import { v } from 'convex/values';

export const getAllSchools = query({
	args: {},
	handler: async (ctx) => {
		const schools = ctx.db.query('school').collect();

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
