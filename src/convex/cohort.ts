import { v } from 'convex/values';
import { action, internalQuery, mutation } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { authQuery } from './authQueries';

export const validateCohortCode = action({
	args: { code: v.string() },
	handler: async (ctx, args): Promise<{ cohort: Doc<'cohort'>; school: Doc<'school'> }> => {
		const cohort = await ctx.runQuery(internal.cohort.cohortCheck, { code: args.code });
		if (!cohort) throw new Error('Invalid code');

		const school = await ctx.runQuery(internal.school.getSchoolByIdInternal, {
			id: cohort.schoolId
		});
		if (!school) throw new Error('School not found');

		return { cohort, school };
	}
});

export const joinCohort = mutation({
	args: {
		clerkUserId: v.string(),
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.filter((q) => q.eq(q.field('clerkUserId'), args.clerkUserId))
			.first();

		if (!user) {
			throw new Error('User not found');
		}

		await ctx.db.patch(user._id, {
			cohortId: args.cohortId,
			updatedAt: Date.now()
		});

		return { success: true };
	}
});

export const cohortCheck = internalQuery({
	args: { code: v.string() },
	handler: async (ctx, args) => {
		const matchingCohort = ctx.db
			.query('cohort')
			.filter((q) => q.eq(q.field('classCode'), args.code))
			.unique();

		return matchingCohort;
	}
});

export const createCohort = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		metadata: v.object({}),
		updatedAt: v.number(),
		schoolId: v.id('school'),
		startYear: v.string(),
		endYear: v.string(),
		classCode: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const id = await ctx.db.insert('cohort', args);
		return id;
	}
});

export const deleteCohort = mutation({
	args: {
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		await ctx.db.delete(args.cohortId);
		return { deleted: true };
	}
});

export const listCohortsWithSchools = authQuery({
	args: {},
	handler: async (ctx) => {
		const meta = ctx.identity?.public_metadata;
		const viewVal =
			meta && typeof meta === 'object' && !Array.isArray(meta)
				? (meta as Record<string, unknown>).view
				: undefined;
		const view = typeof viewVal === 'string' ? viewVal : undefined;
		if (view !== 'developer') throw new Error('Unauthorized');

		const cohorts = await ctx.db.query('cohort').collect();
		const result = await Promise.all(
			cohorts.map(async (cohort) => {
				const school = await ctx.db.get(cohort.schoolId);
				return { _id: cohort._id, name: cohort.name, schoolName: school?.name ?? '' };
			})
		);
		return result;
	}
});
