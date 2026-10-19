import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { userDisplayName } from '../../lib/userDisplayName';
import { pagedArgs, scheduleNextPage } from './shared';

export const bootstrapAdmin = internalMutation({
	args: {
		clerkUserId: v.string()
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
			.first();

		if (!user) throw new Error('User not found');

		await ctx.db.patch(user._id, { role: 'admin', updatedAt: Date.now() });
		return { success: true, userId: user._id };
	}
});

export const bootstrapDev = internalMutation({
	args: {
		clerkUserId: v.string()
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
			.first();

		if (!user) throw new Error('User not found');

		await ctx.db.patch(user._id, { role: 'dev', updatedAt: Date.now() });
		return { success: true, userId: user._id };
	}
});

export const listUserClerkIds = internalQuery({
	args: { cursor: v.union(v.string(), v.null()) },
	handler: async (ctx, args) => {
		const { page, isDone, continueCursor } = await ctx.db
			.query('users')
			.paginate({ cursor: args.cursor, numItems: 100 });
		return {
			users: page
				.filter((u) => !u.deletedAt)
				.map((u) => ({ _id: u._id, clerkUserId: u.clerkUserId })),
			isDone,
			continueCursor
		};
	}
});

export const applyClerkNames = internalMutation({
	args: {
		updates: v.array(
			v.object({
				userId: v.id('users'),
				name: v.string(),
				firstName: v.optional(v.string()),
				lastName: v.optional(v.string())
			})
		)
	},
	handler: async (ctx, args) => {
		let updated = 0;
		for (const { userId, ...names } of args.updates) {
			const user = await ctx.db.get(userId);
			if (
				!user ||
				(user.name === names.name &&
					user.firstName === names.firstName &&
					user.lastName === names.lastName)
			) {
				continue;
			}
			await ctx.db.patch(userId, { ...names, updatedAt: Date.now() });
			updated++;
		}
		return updated;
	}
});

type ClerkApiUser = {
	id: string;
	first_name: string | null;
	last_name: string | null;
	username: string | null;
	primary_email_address_id: string | null;
	email_addresses: { id: string; email_address: string }[];
};

/**
 * Copy first/last names from Clerk onto every Convex user that has one in Clerk.
 * Run via CLI: bunx convex run migrations/users:backfillUserNamesFromClerk --prod
 */
export const backfillUserNamesFromClerk = internalAction({
	args: {},
	handler: async (ctx) => {
		const secretKey = process.env.CLERK_SECRET_KEY;
		if (!secretKey) throw new Error('CLERK_SECRET_KEY is not set');

		let cursor: string | null = null;
		let updated = 0;
		const stillMissing: string[] = [];
		for (;;) {
			const batch: {
				users: { _id: Id<'users'>; clerkUserId: string }[];
				isDone: boolean;
				continueCursor: string;
			} = await ctx.runQuery(internal.migrations.users.listUserClerkIds, { cursor });

			if (batch.users.length > 0) {
				const params = new URLSearchParams({ limit: '100' });
				for (const u of batch.users) params.append('user_id', u.clerkUserId);
				const res = await fetch(`https://api.clerk.com/v1/users?${params}`, {
					headers: { Authorization: `Bearer ${secretKey}` }
				});
				if (!res.ok) throw new Error(`Clerk returned ${res.status}: ${await res.text()}`);
				const clerkUsers = new Map(((await res.json()) as ClerkApiUser[]).map((cu) => [cu.id, cu]));

				const updates = [];
				for (const u of batch.users) {
					const cu = clerkUsers.get(u.clerkUserId);
					const firstName = cu?.first_name?.trim() || undefined;
					const lastName = cu?.last_name?.trim() || undefined;
					if (!cu || (!firstName && !lastName)) {
						stillMissing.push(u.clerkUserId);
						continue;
					}
					updates.push({
						userId: u._id,
						firstName,
						lastName,
						name: userDisplayName({
							fullName: [firstName, lastName].filter(Boolean).join(' '),
							username: cu.username,
							primaryEmailAddressId: cu.primary_email_address_id,
							emailAddresses: cu.email_addresses.map((e) => ({
								id: e.id,
								emailAddress: e.email_address
							}))
						})
					});
				}
				updated += await ctx.runMutation(internal.migrations.users.applyClerkNames, { updates });
			}

			if (batch.isDone) break;
			cursor = batch.continueCursor;
		}
		return { updated, stillMissing };
	}
});

/**
 * Clear the deprecated `plan` field from all users. Pro status comes from Polar.
 * Run via CLI: bunx convex run migrations/users:clearPlanField
 */
export const clearPlanField = internalMutation({
	args: pagedArgs,
	handler: async (ctx, args) => {
		const page = await ctx.db
			.query('users')
			.paginate({ cursor: args.cursor ?? null, numItems: args.batchSize ?? 100 });
		let cleared = 0;
		for (const user of page.page) {
			if (user.plan !== undefined) {
				await ctx.db.patch(user._id, { plan: undefined });
				cleared++;
			}
		}
		await scheduleNextPage(ctx, internal.migrations.users.clearPlanField, args, page);
		return { done: page.isDone, cursor: page.continueCursor, processed: page.page.length, cleared };
	}
});
