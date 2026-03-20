import { Polar } from '@convex-dev/polar';
import { api, components } from './_generated/api';
import { query } from './_generated/server';
import type { QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';

// User query for Polar component - must be defined BEFORE polar client
export const getUserInfo = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error('Not authenticated');
		}

		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
			.first();

		if (!user) {
			throw new Error('User not found');
		}

		return user;
	}
});

// Initialize Polar client
export const polar = new Polar(components.polar, {
	// Get user info for subscription management
	getUserInfo: async (ctx) => {
		const user: { _id: Id<'users'>; email?: string } = await ctx.runQuery(
			api.polar.getUserInfo
		);
		return {
			userId: user._id,
			email: user.email || ''
		};
	},

	// Map product keys to Polar product IDs
	// These will be populated when products sync from Polar
	products: {
		proSemester: process.env.POLAR_PRODUCT_PRO_SEMESTER || '',
		proAnnual: process.env.POLAR_PRODUCT_PRO_ANNUAL || ''
	}

	// Server mode is configured via POLAR_SERVER env var in Convex
});

// Export API functions
export const {
	changeCurrentSubscription,
	cancelCurrentSubscription,
	getConfiguredProducts,
	listAllProducts,
	generateCheckoutLink,
	generateCustomerPortalUrl
} = polar.api();

// Helper to get current user with subscription
const getCurrentUserInternal = async (ctx: QueryCtx) => {
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

	const subscription = await polar.getCurrentSubscription(ctx, {
		userId: user._id
	});

	// Only check subscription status - plan field is deprecated
	const isPro =
		subscription?.status === 'active' ||
		subscription?.status === 'trialing';

	return {
		...user,
		subscription,
		isPro,
		isFree: !isPro
	};
};

// Get current user with subscription details
export const getCurrentUserWithSubscription = query({
	args: {},
	handler: async (ctx) => {
		return getCurrentUserInternal(ctx);
	}
});

// Get arbitrary user with subscription details (for admin)
export const getUserWithSubscriptionById = query({
	args: { userId: v.id('users') },
	handler: async (ctx, { userId }) => {
		const user = await ctx.db.get(userId);
		if (!user) return null;

		const subscription = await polar.getCurrentSubscription(ctx, {
			userId: user._id
		});

		const isPro =
			subscription?.status === 'active' ||
			subscription?.status === 'trialing';

		return {
			...user,
			subscription,
			isPro,
			isFree: !isPro
		};
	}
});

export const getUserWithSubscriptionByClerkId = query({
	args: { clerkUserId: v.string() },
	handler: async (ctx, { clerkUserId }) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', clerkUserId))
			.first();

		if (!user) return null;

		const subscription = await polar.getCurrentSubscription(ctx, {
			userId: user._id
		});

		const isPro =
			subscription?.status === 'active' ||
			subscription?.status === 'trialing';

		return {
			...user,
			subscription,
			isPro,
			isFree: !isPro
		};
	}
});

// Sync products from Polar (run this to pull existing products)
import { action } from './_generated/server';

export const syncProducts = action({
	args: {},
	handler: async (ctx) => {
		await polar.syncProducts(ctx);
		return { success: true };
	}
});

// Get just the current subscription (useful for checking status)
export const getCurrentSubscription = query({
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

		return polar.getCurrentSubscription(ctx, {
			userId: user._id
		});
	}
});
