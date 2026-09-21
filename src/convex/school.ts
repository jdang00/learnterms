import { internalQuery } from './_generated/server';
import { authQuery, authAdminMutation } from './authQueries';
import { v } from 'convex/values';

export const getSchoolById = authQuery({
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

export const createSchool = authAdminMutation({
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

export const deleteSchool = authAdminMutation({
	args: {
		schoolId: v.id('school')
	},
	handler: async (ctx, args) => {
		await ctx.db.delete(args.schoolId);
		return { deleted: true };
	}
});
