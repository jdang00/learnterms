import { query } from './_generated/server';
import { v } from 'convex/values';
import { mutation } from './_generated/server';

export const getUserById = query({
	args: { id: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.filter((q) => q.eq(q.field('clerkUserId'), args.id))
			.first();

		if (!user) return null;

		if (!user.cohortId) return user;

		const cohort = await ctx.db.get(user.cohortId);
		const school = cohort ? await ctx.db.get(cohort.schoolId) : null;

		return {
			...user,
			cohortName: cohort?.name || null,
			schoolName: school?.name || null
		};
	}
});

export const addUser = mutation({
	args: { clerkUserId: v.string(), name: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db.insert('users', {
			clerkUserId: args.clerkUserId,
			metadata: {},
			name: args.name,
			updatedAt: Date.now()
		});

		return user;
	}
});
