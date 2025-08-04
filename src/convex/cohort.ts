import { v } from 'convex/values';
import { action, internalQuery, mutation } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';

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
