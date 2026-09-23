import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { internalAction } from '../_generated/server';
import { mappingPageGroups } from '../documentParsing';
import { clampTopic } from './planning';
import { MAPPING_INSTRUCTIONS } from './questionTypes';
import { createQuestionStudioAgent, questionStudioRateLimiter } from './runtime';
import type { TopicMapItem } from './shared';
import {
	QUESTION_STUDIO_MAPPING_PROVIDER_OPTIONS,
	assertQuestionStudioKey,
	topicMapSchema
} from './shared';
import { loadMarkdownPages, pagesToPromptText, selectPages } from './sourceRetrieval';
import { TEXT_MODEL } from '../aiModels';

export const MAPPING_VERSION = 'question-types-v4';

export const autoMapIndexedDocument = internalAction({
	args: {
		documentId: v.id('contentLib'),
		sourceIndexedAt: v.optional(v.number()),
		triggeredByClerkUserId: v.optional(v.string())
	},
	returns: v.object({
		status: v.union(v.literal('cached'), v.literal('skipped'), v.literal('mapped')),
		topicMapId: v.optional(v.id('questionStudioTopicMaps')),
		topicCount: v.optional(v.number()),
		threadId: v.optional(v.string()),
		usage: v.optional(v.array(v.any()))
	}),
	handler: async (
		ctx,
		args
	): Promise<{
		status: 'cached' | 'skipped' | 'mapped';
		topicMapId?: Id<'questionStudioTopicMaps'>;
		topicCount?: number;
		threadId?: string;
		usage?: unknown[];
	}> => {
		const document = (await ctx.runQuery(internal.ragKnowledgeInternal.getDocumentForRagIngestion, {
			documentId: args.documentId
		})) as Doc<'contentLib'> | null;

		if (!document || document.deletedAt) throw new Error('Document not found');
		const ingestionStatus = document.metadata?.ingestionStatus;
		if (
			document.metadata?.storageProvider !== 'r2' ||
			(ingestionStatus !== 'indexed' && ingestionStatus !== 'mapped') ||
			!document.metadata?.ragEntryId
		) {
			throw new Error('Only indexed or mapped R2 documents can be mapped');
		}

		const sourceIndexedAt = document.metadata?.indexedAt;
		if (args.sourceIndexedAt !== undefined && args.sourceIndexedAt !== sourceIndexedAt)
			return { status: 'skipped' };
		if (sourceIndexedAt === undefined)
			throw new Error('Source must finish indexing before mapping');
		const claim = await ctx.runMutation(
			internal.questionStudio.mappingState.claimDocumentTopicMapping,
			{
				documentId: args.documentId,
				sourceIndexedAt
			}
		);
		if (claim.status !== 'claimed') return { status: claim.status };
		try {
			const pages = selectPages(await loadMarkdownPages(document));
			const pageRange = {
				startPage: pages[0].pageNumber,
				endPage: pages[pages.length - 1].pageNumber
			};

			assertQuestionStudioKey();
			const agentUserId = args.triggeredByClerkUserId ?? `document:${args.documentId}`;
			const creator = args.triggeredByClerkUserId
				? await ctx.runQuery(internal.ragKnowledgeInternal.getUserForRagAccess, {
						clerkUserId: args.triggeredByClerkUserId
					})
				: null;

			await questionStudioRateLimiter.limit(ctx, 'questionStudioGenerationStart', {
				key: agentUserId,
				throws: true
			});
			await questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalGenerationStart', {
				throws: true
			});

			const agent = createQuestionStudioAgent(TEXT_MODEL);
			let threadId = '';
			const topics: TopicMapItem[] = [];
			const usage: unknown[] = [];
			for (const group of mappingPageGroups(pages)) {
				const thread = await agent.createThread(ctx, {
					userId: agentUserId,
					title: `Auto map document: ${document.title}`
				});
				threadId = thread.threadId;
				await questionStudioRateLimiter.limit(ctx, 'questionStudioTokenUsagePerUser', {
					key: agentUserId,
					count: group.reduce((n, p) => n + p.text.length, 0) + 10000,
					throws: true
				});
				const result = await agent.generateObject(
					ctx,
					{ threadId, userId: agentUserId },
					{
						schema: topicMapSchema,
						providerOptions: QUESTION_STUDIO_MAPPING_PROVIDER_OPTIONS,
						maxOutputTokens: 10000,
						maxRetries: 0,
						prompt: [MAPPING_INSTRUCTIONS, pagesToPromptText(group, Number.MAX_SAFE_INTEGER)].join(
							'\n\n'
						)
					},
					{ storageOptions: { saveMessages: 'none' } }
				);
				const allowed = new Set(group.map((p) => p.pageNumber));
				for (const topic of result.object.topics) {
					const validPages = topic.pageNumbers.filter((p) => allowed.has(p));
					if (!validPages.length) continue;
					topics.push({
						...clampTopic({ ...topic, pageNumbers: validPages }, group, topics.length),
						topicId: `topic-${topics.length + 1}`
					});
				}
				usage.push(result.usage);
			}
			const result = { usage };
			const topicMapId = (await ctx.runMutation(
				internal.questionStudio.mappingState.saveTopicMapForRange,
				{
					documentId: args.documentId,
					cohortId: document.cohortId,
					startPage: pageRange.startPage,
					endPage: pageRange.endPage,
					pageCount: pages.length,
					topics,
					model: TEXT_MODEL,
					agentThreadId: threadId,
					sourceDocumentUpdatedAt: document.updatedAt,
					sourceIndexedAt: document.metadata?.indexedAt,
					createdByUserId: creator?._id
				}
			)) as Id<'questionStudioTopicMaps'>;
			return {
				status: 'mapped',
				topicMapId,
				topicCount: topics.length,
				threadId,
				usage: result.usage
			};
		} catch (error) {
			await ctx.runMutation(internal.questionStudio.mappingState.failDocumentTopicMapping, {
				documentId: args.documentId,
				sourceIndexedAt,
				error: error instanceof Error ? error.message : 'Topic mapping failed'
			});
			throw error;
		}
	}
});
