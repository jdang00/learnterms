import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';

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
			v.literal('mapped'),
			v.literal('failed')
		),
		ragNamespace: v.optional(v.string()),
		ragEntryId: v.optional(v.string()),
		extractionArtifactKeys: v.optional(v.array(v.string())),
		extractionProvider: v.optional(v.string()),
		extractionModel: v.optional(v.string()),
		indexedAt: v.optional(v.number()),
		indexError: v.optional(v.string()),
		pageCount: v.optional(v.number()),
		triggeredByClerkUserId: v.optional(v.string()),
		ingestionJobId: v.optional(v.id('documentIngestionJobs'))
	},
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document || document.deletedAt) throw new Error('Document not found');
		if (args.ingestionJobId && document.metadata?.ingestionJobId !== args.ingestionJobId)
			throw new Error('Document processing superseded');

		if (
			args.status === 'indexing' &&
			document.metadata?.ingestionStatus === 'indexing' &&
			Date.now() - (document.updatedAt ?? 0) < 10 * 60_000
		)
			throw new Error('Document indexing is already running');
		const { documentId, status, triggeredByClerkUserId, ...updates } = args;
		await ctx.db.patch(documentId, {
			metadata: {
				...(document.metadata ?? {}),
				...Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined)),
				ingestionStatus: status,
				indexError: args.indexError,
				...(status === 'indexed' ? { mappedAt: undefined, topics: undefined } : {})
			},
			updatedAt: Date.now()
		});
		// Persist indexing completion and schedule its one mapping job atomically.
		if (
			status === 'indexed' &&
			args.indexedAt !== undefined &&
			args.indexedAt !== document.metadata?.indexedAt
		) {
			await ctx.scheduler.runAfter(0, internal.questionStudio.autoMapIndexedDocument, {
				documentId,
				sourceIndexedAt: args.indexedAt,
				triggeredByClerkUserId
			});
		}
	}
});

export const markDocumentMapped = internalMutation({
	args: {
		documentId: v.id('contentLib'),
		mappedAt: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document) throw new Error('Document not found');

		await ctx.db.patch(args.documentId, {
			metadata: {
				...(document.metadata ?? {}),
				ingestionStatus: 'mapped',
				mappedAt: args.mappedAt ?? Date.now(),
				indexError: undefined
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

		const restMetadata = { ...(document.metadata ?? {}) };
		delete restMetadata.ingestionStatus;
		delete restMetadata.ingestionJobId;
		delete restMetadata.ingestionStage;
		delete restMetadata.ragNamespace;
		delete restMetadata.ragEntryId;
		delete restMetadata.extractionArtifactKeys;
		delete restMetadata.extractionProvider;
		delete restMetadata.extractionModel;
		delete restMetadata.indexedAt;
		delete restMetadata.mappedAt;
		delete restMetadata.topicMapping;
		delete restMetadata.indexError;
		delete restMetadata.pageCount;
		delete restMetadata.topics;

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
