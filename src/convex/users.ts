import { query, action } from './_generated/server';
import { v } from 'convex/values';
import { mutation, internalMutation } from './_generated/server';
import { internal } from './_generated/api';

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

/**
 * Mutation to sync user data from Clerk
 * Can be called on login to keep user data fresh
 */
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
		// Find the user by clerkUserId
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
			.first();

		if (!user) {
			return null;
		}

		// Update the user with latest Clerk data
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

/**
 * Internal mutation to update a user with Clerk data
 * This is called by the backfill action
 */
export const updateUserFromClerk = internalMutation({
	args: {
		clerkUserId: v.string(),
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
		// Find the user by clerkUserId
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
			.first();

		if (!user) {
			console.log(`User not found for clerkUserId: ${args.clerkUserId}`);
			return null;
		}

		// Update the user with Clerk data
		await ctx.db.patch(user._id, {
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

		return user._id;
	}
});

/**
 * Action to backfill user data from Clerk
 * This fetches all users from Clerk and updates the Convex database
 *
 * Usage: bun convex run backfillUsersFromClerk
 */
export const backfillUsersFromClerk = action({
	args: {},
	handler: async (ctx) => {
		// Check for Clerk secret key
		if (!process.env.CLERK_SECRET_KEY) {
			throw new Error('CLERK_SECRET_KEY environment variable is not set');
		}

		// Import Clerk SDK
		const { createClerkClient } = await import('@clerk/backend');
		const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

		console.log('Fetching users from Clerk...');

		// Get all users from Clerk (paginate if needed)
		let allUsers: any[] = [];
		let offset = 0;
		const limit = 100; // Max limit per request

		// Fetch all users with pagination
		while (true) {
			const response = await clerkClient.users.getUserList({
				limit,
				offset,
				orderBy: '-created_at'
			});

			allUsers = allUsers.concat(response.data);

			console.log(`Fetched ${allUsers.length} users so far...`);

			// Check if we've fetched all users
			if (response.data.length < limit) {
				break;
			}

			offset += limit;
		}

		console.log(`Total users from Clerk: ${allUsers.length}`);

		// Update each user in Convex
		let successCount = 0;
		let errorCount = 0;

		for (const clerkUser of allUsers) {
			try {
				// Extract primary email
				const primaryEmail = clerkUser.emailAddresses?.find(
					(e: any) => e.id === clerkUser.primaryEmailAddressId
				)?.emailAddress;

				// Call the internal mutation to update the user
				await ctx.runMutation(internal.users.updateUserFromClerk, {
					clerkUserId: clerkUser.id,
					firstName: clerkUser.firstName || undefined,
					lastName: clerkUser.lastName || undefined,
					email: primaryEmail || undefined,
					username: clerkUser.username || undefined,
					imageUrl: clerkUser.imageUrl || undefined,
					lastSignInAt: clerkUser.lastSignInAt || undefined,
					createdAt: clerkUser.createdAt || undefined,
					lastActiveAt: clerkUser.lastActiveAt || undefined
				});

				successCount++;
			} catch (error) {
				console.error(
					`Error updating user ${clerkUser.id}:`,
					error instanceof Error ? error.message : error
				);
				errorCount++;
			}
		}

		const summary = {
			totalClerkUsers: allUsers.length,
			successCount,
			errorCount,
			timestamp: Date.now()
		};

		console.log('Backfill complete:', summary);
		return summary;
	}
});
