import { query, mutation } from './_generated/server';
import { customQuery, customMutation } from 'convex-helpers/server/customFunctions';
import { v } from 'convex/values';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { requireCurrentUser } from './access';

async function getUserRole(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) return { identity: null, role: undefined };
	const user = await ctx.db
		.query('users')
		.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
		.first();
	return { identity, role: user && !user.deletedAt ? user.role : undefined };
}

export const authQuery = customQuery(query, {
	args: {},
	input: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');
		return { ctx: { db: ctx.db, identity }, args: {} };
	}
});

export const authAdminQuery = customQuery(query, {
	args: {},
	input: async (ctx) => {
		const { identity, role } = await getUserRole(ctx);
		if (!identity || !(role === 'dev' || role === 'admin')) throw new Error('Unauthorized');
		return { ctx: { db: ctx.db, identity }, args: {} };
	}
});

export const authAdminMutation = customMutation(mutation, {
	args: {},
	input: async (ctx) => {
		const { identity, role } = await getUserRole(ctx);
		if (!identity || !(role === 'dev' || role === 'admin')) throw new Error('Unauthorized');
		return { ctx: { db: ctx.db, identity }, args: {} };
	}
});

export const authDevQuery = customQuery(query, {
	args: {},
	input: async (ctx) => {
		const { identity, role } = await getUserRole(ctx);
		if (!identity || role !== 'dev') throw new Error('Unauthorized');
		return { ctx: { db: ctx.db, identity }, args: {} };
	}
});

export const authDevMutation = customMutation(mutation, {
	args: {},
	input: async (ctx) => {
		const { identity, role } = await getUserRole(ctx);
		if (!identity || role !== 'dev') throw new Error('Unauthorized');
		return { ctx: { db: ctx.db, identity }, args: {} };
	}
});

export const authCuratorMutation = customMutation(mutation, {
	args: {},
	input: async (ctx) => {
		const { identity, role } = await getUserRole(ctx);
		if (!identity || !(role === 'dev' || role === 'admin' || role === 'curator'))
			throw new Error('Unauthorized');
		return { ctx: { db: ctx.db, identity }, args: {} };
	}
});

export const joinCohort = mutation({
	args: {
		clerkUserId: v.string(),
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		const { role } = await getUserRole(ctx);
		if (!(role === 'dev' || role === 'admin')) throw new Error('Unauthorized');

		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
			.first();

		if (!user) {
			throw new Error('User not found');
		}

		const caller = await requireCurrentUser(ctx);
		const cohort = await ctx.db.get(args.cohortId);
		if (!cohort || cohort.deletedAt || user.deletedAt) throw new Error('Cohort or user not found');
		if (
			caller.role !== 'dev' &&
			(caller.cohortId !== args.cohortId ||
				(user.cohortId !== undefined && user.cohortId !== caller.cohortId) ||
				user.role === 'dev' ||
				user.role === 'admin')
		)
			throw new Error('Unauthorized for this cohort');

		await ctx.db.patch(user._id, {
			cohortId: args.cohortId,
			updatedAt: Date.now()
		});

		return { success: true };
	}
});

export const switchCohort = mutation({
	args: {
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		const { identity, role } = await getUserRole(ctx);
		if (!identity || role !== 'dev') throw new Error('Unauthorized');

		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
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
