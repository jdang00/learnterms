import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { authQuery } from './authQueries';

export const getR2DocumentsByCohort = authQuery({
	args: {
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query('contentLib')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.filter((q) =>
				q.and(
					q.eq(q.field('deletedAt'), undefined),
					q.eq(q.field('metadata.storageProvider'), 'r2')
				)
			)
			.order('desc')
			.collect();
	}
});

export const getIndexedR2DocumentsForRagTester = authQuery({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Not authenticated');

		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
			.first();
		if (!user) throw new Error('User not found');

		const docs = await ctx.db
			.query('contentLib')
			.filter((q) =>
				q.and(
					q.eq(q.field('deletedAt'), undefined),
					q.eq(q.field('metadata.storageProvider'), 'r2'),
					q.neq(q.field('metadata.ragEntryId'), undefined)
				)
			)
			.order('desc')
			.collect();

		if (user.role === 'dev' || user.role === 'admin') return docs;
		return docs.filter((doc) => doc.cohortId === user.cohortId);
	}
});

export const insertR2Document = mutation({
	args: {
		title: v.string(),
		description: v.optional(v.string()),
		cohortId: v.id('cohort'),
		metadata: v.object({
			originalFileName: v.string(),
			sizeBytes: v.number(),
			storageProvider: v.literal('r2'),
			r2Key: v.string(),
			mimeType: v.string()
		})
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Not authenticated');

		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
			.first();
		if (!user) throw new Error('User not found');
		if (user.role !== 'dev' && user.role !== 'admin' && user.role !== 'curator') {
			throw new Error('Unauthorized');
		}
		if (user.role !== 'dev' && user.cohortId !== args.cohortId) {
			throw new Error('Unauthorized for this cohort');
		}

		const title = args.title.trim();
		if (title.length < 2) throw new Error('Document title must be at least 2 characters');
		if (title.length > 100) throw new Error('Document title cannot exceed 100 characters');

		return await ctx.db.insert('contentLib', {
			title,
			description: args.description?.trim() || undefined,
			cohortId: args.cohortId,
			metadata: args.metadata,
			updatedAt: Date.now()
		});
	}
});
