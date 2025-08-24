import { query, mutation } from './_generated/server';
import { customQuery, customMutation } from 'convex-helpers/server/customFunctions';
import { v } from 'convex/values';


// Logged-in only query builder
export const authQuery = customQuery(query, {
	args: {},
	input: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');
		return { ctx: { db: ctx.db, identity }, args: {} };
	}
});

export const listUsers = authQuery({
	args: {},
	handler: async (ctx) => {
		const users = await ctx.db.query('users').collect();
		return users;
	}
});

// Generic admin-only query builder
export const authAdminQuery = customQuery(query, {
	args: {},
	input: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		const meta = identity?.public_metadata;
		const roleVal =
			meta && typeof meta === 'object' && !Array.isArray(meta)
				? (meta as Record<string, unknown>).role
				: undefined;
		const role = typeof roleVal === 'string' ? roleVal : undefined;
		if (role !== 'admin') throw new Error('Unauthorized');

		return { ctx: { db: ctx.db, identity }, args: {} };
	}
});


// Generic admin-only mutation builder
export const authAdminMutation = customMutation(mutation, {
	args: {},
	input: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		const meta = identity?.public_metadata;
		const roleVal =
			meta && typeof meta === 'object' && !Array.isArray(meta)
				? (meta as Record<string, unknown>).role
				: undefined;
		const role = typeof roleVal === 'string' ? roleVal : undefined;
		if (role !== 'admin') throw new Error('Unauthorized');

		return { ctx: { db: ctx.db, identity }, args: {} };
	}
});

// Admin or contributor (create) mutation builder
export const authCreateMutation = customMutation(mutation, {
	args: {},
	input: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		const meta = identity?.public_metadata;
		const roleVal =
			meta && typeof meta === 'object' && !Array.isArray(meta)
				? (meta as Record<string, unknown>).role
				: undefined;
		const createVal =
			meta && typeof meta === 'object' && !Array.isArray(meta)
				? (meta as Record<string, unknown>).create
				: undefined;
		const role = typeof roleVal === 'string' ? roleVal : undefined;
		const create = typeof createVal === 'string' ? createVal : undefined;
		if (!(role === 'admin' || create === 'contributor')) throw new Error('Unauthorized');

		return { ctx: { db: ctx.db, identity }, args: {} };
	}
});


export const joinCohort = mutation({
	args: {
		clerkUserId: v.string(),
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {

		const identity = await ctx.auth.getUserIdentity();
		const meta = identity?.public_metadata;
		const viewVal =
			meta && typeof meta === 'object' && !Array.isArray(meta)
				? (meta as Record<string, unknown>).view
				: undefined;
		const view = typeof viewVal === 'string' ? viewVal : undefined;
		if (view !== 'developer') throw new Error('Unauthorized');

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