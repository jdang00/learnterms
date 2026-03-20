import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { authQuery } from './authQueries';
import { components } from './_generated/api';

const PDF_LIMIT_FREE = 1;
const PDF_LIMIT_PRO = 999; // Effectively unlimited

export const getContentLibByCohort = authQuery({
	args: {
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		const contentLib = await ctx.db
			.query('contentLib')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.filter((q) => q.eq(q.field('deletedAt'), undefined)).order('desc')
			.collect();
		return contentLib;
	}
});

export const insertDocument = mutation({
	args: {
		title: v.string(),
		description: v.optional(v.string()),
		cohortId: v.id('cohort'),
		metadata: v.optional(
			v.object({
				originalFileName: v.optional(v.string()),
				sizeBytes: v.optional(v.number()),
				uploadthingKey: v.optional(v.string()),
				uploadthingUrl: v.optional(v.string())
			})
		)
	},
	handler: async (ctx, args) => {
		// Check authentication
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

		// Check and increment PDF upload usage
		const now = Date.now();
		const oneDayMs = 24 * 60 * 60 * 1000;
		let usage = user.pdfUploadUsage;

		// Initialize or reset if older than 24h
		if (!usage || now - usage.lastResetAt > oneDayMs) {
			usage = { count: 0, lastResetAt: now };
		}

		// Check Polar subscription status to determine pro
		let isPro = false;
		try {
			const subscription = await ctx.runQuery(components.polar.lib.getCurrentSubscription, {
				userId: user._id
			});
			isPro =
				subscription?.status === 'active' ||
				subscription?.status === 'trialing';
		} catch {
			// If subscription check fails, user is not pro
			isPro = false;
		}

		const limit = isPro ? PDF_LIMIT_PRO : PDF_LIMIT_FREE;

		if (usage.count + 1 > limit) {
			if (isPro) {
				throw new Error(
					`Daily PDF upload limit reached. You have uploaded ${usage.count}/${limit} documents today. Please check back tomorrow.`
				);
			}
			throw new Error(
				`Daily PDF upload limit reached (${usage.count}/${limit}). Upgrade to Pro for unlimited uploads.`
			);
		}

		// Increment usage
		await ctx.db.patch(user._id, {
			pdfUploadUsage: {
				count: usage.count + 1,
				lastResetAt: usage.lastResetAt
			}
		});

		const id = await ctx.db.insert('contentLib', { ...args, updatedAt: Date.now() });
		return id;
	}
});

export const updateDocument = mutation({
	args: {
		documentId: v.id('contentLib'),
		title: v.string(),
		description: v.optional(v.string()),
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document || document.cohortId !== args.cohortId) {
			throw new Error('Document not found or access denied');
		}

		const trimmedTitle = args.title.trim();
		const trimmedDescription = args.description?.trim();

		if (!trimmedTitle) {
			throw new Error('Document title is required and cannot be empty');
		}
		if (trimmedTitle.length < 2) {
			throw new Error('Document title must be at least 2 characters long');
		}
		if (trimmedTitle.length > 100) {
			throw new Error('Document title cannot exceed 100 characters');
		}
		if (trimmedDescription && trimmedDescription.length < 10) {
			throw new Error('Document description must be at least 10 characters long');
		}
		if (trimmedDescription && trimmedDescription.length > 500) {
			throw new Error('Document description cannot exceed 500 characters');
		}

		await ctx.db.patch(args.documentId, {
			title: trimmedTitle,
			description: trimmedDescription || undefined,
			updatedAt: Date.now()
		});
	}
});

export const deleteDocument = mutation({
	args: {
		documentId: v.id('contentLib'),
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document) {
			throw new Error('Document not found');
		}

		if (document.cohortId !== args.cohortId) {
			throw new Error('Access denied: document does not belong to the specified cohort');
		}

		await ctx.db.patch(args.documentId, {
			deletedAt: Date.now()
		});
	}
});
