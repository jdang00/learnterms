import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

export const getUserForRagAccess = internalQuery({
	args: { clerkUserId: v.string() },
	handler: async (ctx, { clerkUserId }) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', clerkUserId))
			.first();
		if (!user) return null;
		return {
			_id: user._id,
			cohortId: user.cohortId,
			role: user.role
		};
	}
});

export const getDocumentForRagIngestion = internalQuery({
	args: {
		documentId: v.id('contentLib')
	},
	handler: async (ctx, { documentId }) => {
		const document = await ctx.db.get(documentId);
		if (!document || document.deletedAt) return null;
		return document;
	}
});

export const getIndexedR2Documents = internalQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db
			.query('contentLib')
			.filter((q) =>
				q.and(
					q.eq(q.field('deletedAt'), undefined),
					q.eq(q.field('metadata.storageProvider'), 'r2')
				)
			)
			.collect();
	}
});

export const updateDocumentIngestion = internalMutation({
	args: {
		documentId: v.id('contentLib'),
		status: v.union(
			v.literal('not_started'),
			v.literal('indexing'),
			v.literal('indexed'),
			v.literal('failed')
		),
		ragNamespace: v.optional(v.string()),
		ragEntryId: v.optional(v.string()),
		extractionArtifactKeys: v.optional(v.array(v.string())),
		extractionProvider: v.optional(v.string()),
		extractionModel: v.optional(v.string()),
		indexedAt: v.optional(v.number()),
		indexError: v.optional(v.string()),
		pageCount: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document) throw new Error('Document not found');

		await ctx.db.patch(args.documentId, {
			metadata: {
				...(document.metadata ?? {}),
				ingestionStatus: args.status,
				ragNamespace: args.ragNamespace,
				ragEntryId: args.ragEntryId,
				extractionArtifactKeys: args.extractionArtifactKeys,
				extractionProvider: args.extractionProvider,
				extractionModel: args.extractionModel,
				indexedAt: args.indexedAt,
				indexError: args.indexError,
				pageCount: args.pageCount
			},
			updatedAt: Date.now()
		});
	}
});

export const clearDocumentIngestion = internalMutation({
	args: {
		documentId: v.id('contentLib')
	},
	handler: async (ctx, { documentId }) => {
		const document = await ctx.db.get(documentId);
		if (!document) throw new Error('Document not found');

		const {
			ingestionStatus: _ingestionStatus,
			ragNamespace: _ragNamespace,
			ragEntryId: _ragEntryId,
			extractionArtifactKeys: _extractionArtifactKeys,
			extractionProvider: _extractionProvider,
			extractionModel: _extractionModel,
			indexedAt: _indexedAt,
			indexError: _indexError,
			pageCount: _pageCount,
			topics: _topics,
			...restMetadata
		} = document.metadata ?? {};

		await ctx.db.patch(documentId, {
			metadata: {
				...restMetadata,
				ingestionStatus: 'not_started'
			},
			updatedAt: Date.now()
		});
	}
});

export const markDocumentDeleted = internalMutation({
	args: {
		documentId: v.id('contentLib')
	},
	handler: async (ctx, { documentId }) => {
		const document = await ctx.db.get(documentId);
		if (!document) throw new Error('Document not found');

		await ctx.db.patch(documentId, {
			deletedAt: Date.now(),
			updatedAt: Date.now()
		});
	}
});
