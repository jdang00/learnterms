import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getContentLibByCohort = query({
	args: {
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		const contentLib = await ctx.db
			.query('contentLib')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.filter((q) => q.eq(q.field('deletedAt'), undefined))
			.collect();
		return contentLib;
	}
});

export const insertDocument = mutation({
	args: {
		title: v.string(),
		description: v.optional(v.string()),
		cohortId: v.id('cohort'),
		metadata: v.optional(v.object({}))
	},
	handler: async (ctx, args) => {
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
