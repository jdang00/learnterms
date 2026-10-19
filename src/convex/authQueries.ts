import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { customCtx, customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import { v } from 'convex/values';
import { findUserByClerkId, requireIdentity } from './access';

type Role = NonNullable<Doc<'users'>['role']>;

/** Loads the caller once; every wrapped handler reads `ctx.user` and `ctx.identity`. */
async function loadCaller(ctx: QueryCtx | MutationCtx) {
	const identity = await requireIdentity(ctx);
	const user = await findUserByClerkId(ctx, identity.subject);
	if (!user) throw new Error('Unauthorized');
	return { identity, user };
}

function callerWithRole(roles: readonly Role[]) {
	return customCtx(async (ctx: QueryCtx | MutationCtx) => {
		const caller = await loadCaller(ctx);
		if (!caller.user.role || !roles.includes(caller.user.role)) throw new Error('Unauthorized');
		return caller;
	});
}

const ADMIN: readonly Role[] = ['dev', 'admin'];
const CURATOR: readonly Role[] = ['dev', 'admin', 'curator'];
const DEV: readonly Role[] = ['dev'];

export const authQuery = customQuery(query, customCtx(loadCaller));
export const authMutation = customMutation(mutation, customCtx(loadCaller));
export const authAdminQuery = customQuery(query, callerWithRole(ADMIN));
export const authAdminMutation = customMutation(mutation, callerWithRole(ADMIN));
export const authCuratorQuery = customQuery(query, callerWithRole(CURATOR));
export const authCuratorMutation = customMutation(mutation, callerWithRole(CURATOR));
export const authDevQuery = customQuery(query, callerWithRole(DEV));
export const authDevMutation = customMutation(mutation, callerWithRole(DEV));

export const joinCohort = authAdminMutation({
	args: {
		clerkUserId: v.string(),
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
			.first();
		if (!user) {
			throw new Error('User not found');
		}

		const caller = ctx.user;
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

export const switchCohort = authDevMutation({
	args: {
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(ctx.user._id, {
			cohortId: args.cohortId,
			updatedAt: Date.now()
		});

		return { success: true };
	}
});
