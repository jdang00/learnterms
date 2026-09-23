import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalMutation } from '../_generated/server';
import { MAPPING_VERSION } from './mapping';
import { topicInputValidator } from './shared';
import { isSavedMapForSource } from './topicMaps';

export const saveTopicMapForRange = internalMutation({
	args: {
		documentId: v.id('contentLib'),
		cohortId: v.id('cohort'),
		createdFromModuleId: v.optional(v.id('module')),
		startPage: v.number(),
		endPage: v.number(),
		pageCount: v.number(),
		topics: v.array(topicInputValidator),
		model: v.string(),
		agentThreadId: v.optional(v.string()),
		sourceDocumentUpdatedAt: v.number(),
		sourceIndexedAt: v.optional(v.number()),
		createdByUserId: v.optional(v.id('users'))
	},
	returns: v.id('questionStudioTopicMaps'),
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (
			!document ||
			document.deletedAt ||
			document.metadata?.indexedAt !== args.sourceIndexedAt ||
			document.metadata?.ingestionStatus === 'indexing'
		)
			throw new Error('Source changed while mapping; retry');
		await ctx.db.patch(args.documentId, {
			metadata: {
				...document.metadata,
				ingestionStatus: 'mapped',
				mappedAt: Date.now(),
				...(document.metadata?.topicMapping
					? { topicMapping: { ...document.metadata.topicMapping, status: 'complete' as const } }
					: {})
			}
		});
		const now = Date.now();
		const existing = await ctx.db
			.query('questionStudioTopicMaps')
			.withIndex('by_documentId_pageRange', (q) =>
				q
					.eq('documentId', args.documentId)
					.eq('startPage', args.startPage)
					.eq('endPage', args.endPage)
			)
			.filter((q) => q.eq(q.field('deletedAt'), undefined))
			.order('desc')
			.take(100);

		const [latest, ...older] = existing.sort((a, b) => b.updatedAt - a.updatedAt);
		for (const old of older) {
			await ctx.db.patch(old._id, { deletedAt: now, updatedAt: now });
		}

		if (latest) {
			await ctx.db.patch(latest._id, {
				mappingVersion: MAPPING_VERSION,
				createdFromModuleId: args.createdFromModuleId,
				pageCount: args.pageCount,
				topics: args.topics,
				model: args.model,
				agentThreadId: args.agentThreadId,
				sourceDocumentUpdatedAt: args.sourceDocumentUpdatedAt,
				sourceIndexedAt: args.sourceIndexedAt,
				createdByUserId: args.createdByUserId,
				updatedAt: now
			});
			return latest._id;
		}

		return await ctx.db.insert('questionStudioTopicMaps', {
			mappingVersion: MAPPING_VERSION,
			documentId: args.documentId,
			cohortId: args.cohortId,
			createdFromModuleId: args.createdFromModuleId,
			startPage: args.startPage,
			endPage: args.endPage,
			pageCount: args.pageCount,
			topics: args.topics,
			model: args.model,
			agentThreadId: args.agentThreadId,
			sourceDocumentUpdatedAt: args.sourceDocumentUpdatedAt,
			sourceIndexedAt: args.sourceIndexedAt,
			createdByUserId: args.createdByUserId,
			createdAt: now,
			updatedAt: now
		});
	}
});

// The upload pipeline owns mapping. Claim the source revision before any external work.
export const claimDocumentTopicMapping = internalMutation({
	args: { documentId: v.id('contentLib'), sourceIndexedAt: v.number() },
	returns: v.object({
		status: v.union(v.literal('claimed'), v.literal('cached'), v.literal('skipped'))
	}),
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (
			!document ||
			document.deletedAt ||
			document.metadata?.indexedAt !== args.sourceIndexedAt ||
			!['indexed', 'mapped'].includes(document.metadata?.ingestionStatus ?? '')
		)
			return { status: 'skipped' as const };
		const maps = await ctx.db
			.query('questionStudioTopicMaps')
			.withIndex('by_documentId', (q) => q.eq('documentId', args.documentId))
			.order('desc')
			.take(100);
		if (maps.some((map) => isSavedMapForSource(map, document)))
			return { status: 'cached' as const };
		if (document.metadata?.topicMapping?.sourceIndexedAt === args.sourceIndexedAt)
			return { status: 'skipped' as const };
		await ctx.db.patch(args.documentId, {
			metadata: {
				...document.metadata,
				topicMapping: {
					sourceIndexedAt: args.sourceIndexedAt,
					status: 'running',
					startedAt: Date.now()
				}
			}
		});
		await ctx.scheduler.runAfter(
			15 * 60_000,
			internal.questionStudio.mappingState.failDocumentTopicMapping,
			{
				documentId: args.documentId,
				sourceIndexedAt: args.sourceIndexedAt,
				error:
					'Upload topic preparation did not finish. Review this document in the Content Library.'
			}
		);
		return { status: 'claimed' as const };
	}
});

export const resetFailedDocumentTopicMapping = internalMutation({
	args: { documentId: v.id('contentLib') },
	returns: v.boolean(),
	handler: async (ctx, { documentId }) => {
		const document = await ctx.db.get(documentId);
		const metadata = document?.metadata;
		if (
			!document ||
			document.deletedAt ||
			!metadata ||
			metadata.storageProvider !== 'r2' ||
			!metadata.ragEntryId ||
			!['indexed', 'mapped'].includes(metadata.ingestionStatus ?? '') ||
			metadata.topicMapping?.status !== 'failed' ||
			metadata.topicMapping.sourceIndexedAt !== metadata.indexedAt
		)
			return false;
		const updatedMetadata = { ...metadata };
		delete updatedMetadata.topicMapping;
		await ctx.db.patch(documentId, { metadata: updatedMetadata });
		return true;
	}
});

export const failDocumentTopicMapping = internalMutation({
	args: { documentId: v.id('contentLib'), sourceIndexedAt: v.number(), error: v.string() },
	returns: v.null(),
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		const mapping = document?.metadata?.topicMapping;
		if (
			document &&
			!document.deletedAt &&
			document.metadata?.indexedAt === args.sourceIndexedAt &&
			mapping?.sourceIndexedAt === args.sourceIndexedAt &&
			mapping.status === 'running'
		) {
			await ctx.db.patch(args.documentId, {
				metadata: {
					...document.metadata,
					topicMapping: { ...mapping, status: 'failed', error: args.error.slice(0, 500) }
				}
			});
		}
		return null;
	}
});
