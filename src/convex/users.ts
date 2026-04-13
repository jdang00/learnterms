import { query } from './_generated/server';
import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { authAdminMutation } from './authQueries';
import type { Doc } from './_generated/dataModel';

function buildRoleUpdates(role: Doc<'users'>['role'] | null | undefined) {
	const updates: { updatedAt: number; role?: Doc<'users'>['role'] } = {
		updatedAt: Date.now()
	};
	if (role !== undefined) {
		updates.role = role ?? undefined;
	}
	return updates;
}

export const getUserById = query({
	args: { id: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.filter((q) => q.eq(q.field('clerkUserId'), args.id))
			.first();

		if (!user) return null;

		const cohort = user.cohortId ? await ctx.db.get(user.cohortId) : null;
		const school = cohort?.schoolId ? await ctx.db.get(cohort.schoolId) : null;

		return {
			...user,
			cohortName: cohort?.name ?? null,
			schoolName: school?.name ?? null
		};
	}
});

export const addUser = mutation({
	args: {
		clerkUserId: v.string(),
		name: v.string(),
		firstName: v.optional(v.string()),
		lastName: v.optional(v.string()),
		email: v.optional(v.string()),
		username: v.optional(v.string()),
		imageUrl: v.optional(v.string()),
		lastSignInAt: v.optional(v.number()),
		createdAt: v.optional(v.number()),
		lastActiveAt: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const user = await ctx.db.insert('users', {
			clerkUserId: args.clerkUserId,
			metadata: {},
			seenFeatureAnnouncementIds: [],
			name: args.name,
			firstName: args.firstName,
			lastName: args.lastName,
			email: args.email,
			username: args.username,
			imageUrl: args.imageUrl,
			lastSignInAt: args.lastSignInAt,
			createdAt: args.createdAt,
			lastActiveAt: args.lastActiveAt,
			updatedAt: Date.now()
		});

		return user;
	}
});

export const syncUserFromClerk = mutation({
	args: {
		clerkUserId: v.string(),
		firstName: v.optional(v.string()),
		lastName: v.optional(v.string()),
		email: v.optional(v.string()),
		username: v.optional(v.string()),
		imageUrl: v.optional(v.string()),
		lastSignInAt: v.optional(v.number()),
		lastActiveAt: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
			.first();

		if (!user) {
			return null;
		}

		await ctx.db.patch(user._id, {
			firstName: args.firstName,
			lastName: args.lastName,
			email: args.email,
			username: args.username,
			imageUrl: args.imageUrl,
			lastSignInAt: args.lastSignInAt,
			lastActiveAt: args.lastActiveAt,
			updatedAt: Date.now()
		});

		return user._id;
	}
});

export const updateUserRole = authAdminMutation({
	args: {
		userId: v.id('users'),
		role: v.optional(v.union(v.literal('dev'), v.literal('admin'), v.literal('curator'), v.null()))
	},
	handler: async (ctx, args) => {
		// Get the caller's user record to check their role
		const caller = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', ctx.identity.subject))
			.first();

		const targetUser = await ctx.db.get(args.userId);
		if (!targetUser) {
			throw new Error('Target user not found');
		}

		const callerRole = caller?.role || 'student';
		const targetCurrentRole = targetUser.role || 'student';
		const targetNewRole = args.role === null ? 'student' : args.role || targetCurrentRole;

		// Rule 1: Users cannot change their own role
		if (caller?._id === args.userId && args.role !== undefined) {
			throw new Error('You cannot change your own role');
		}

		// Rule 2: Dev can do ANYTHING (skip all other checks)
		if (callerRole === 'dev') {
			await ctx.db.patch(args.userId, buildRoleUpdates(args.role));
			return { success: true };
		}

		// Rule 3: Admin restrictions
		if (callerRole === 'admin') {
			// Check if trying to modify a user with admin/dev role
			if (targetCurrentRole === 'admin' || targetCurrentRole === 'dev') {
				throw new Error('Admins cannot manage other admins or devs');
			}

			// Check if trying to assign admin/dev role
			if (targetNewRole === 'admin' || targetNewRole === 'dev') {
				throw new Error('Admins can only assign student or curator roles');
			}

			// If we got here, admin is changing student ↔ curator which is allowed
			await ctx.db.patch(args.userId, buildRoleUpdates(args.role));
			return { success: true };
		}

		// Rule 4: Curators and students cannot manage roles
		throw new Error('You do not have permission to manage roles');
	}
});

// Get current authenticated user
export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
			.first();

		if (!user) {
			return null;
		}

		// Get cohort and school info if available
		let cohortName = null;
		let schoolName = null;

		if (user.cohortId) {
			const cohort = await ctx.db.get(user.cohortId);
			cohortName = cohort?.name || null;
			if (cohort?.schoolId) {
				const school = await ctx.db.get(cohort.schoolId);
				schoolName = school?.name || null;
			}
		}

		return {
			...user,
			cohortName,
			schoolName
		};
	}
});
