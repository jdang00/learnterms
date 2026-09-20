'use node';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { action } from '../_generated/server';
import type { EntryId } from '@convex-dev/rag';

import { r2 } from '../r2Documents';
import {
	EMBEDDING_MODEL,
	RAG_TESTER_CHAT_MODEL,
	openRouter,
	assertOpenRouterKey,
	documentRag,
	documentNamespace,
	assertDocumentAccess
} from './shared';
export const clearR2DocumentIndexes = action({
	args: {
		documentIds: v.optional(v.array(v.id('contentLib')))
	},
	handler: async (
		ctx,
		{ documentIds }
	): Promise<{
		clearedCount: number;
		cleared: Array<{ documentId: Id<'contentLib'>; title: string }>;
	}> => {
		const documents: Array<Doc<'contentLib'> | null> = documentIds
			? await Promise.all(
					documentIds.map((documentId) =>
						ctx.runQuery(internal.ragKnowledgeInternal.getDocumentForRagIngestion, {
							documentId
						})
					)
				)
			: await ctx.runQuery(internal.ragKnowledgeInternal.getIndexedR2Documents);

		const cleared = [];
		for (const document of documents) {
			if (!document || document.deletedAt) continue;
			await assertDocumentAccess(ctx, document);

			const metadata = document.metadata ?? {};
			const artifactKeys = metadata.extractionArtifactKeys ?? [];
			if (
				metadata.storageProvider !== 'r2' ||
				(!metadata.ragEntryId && artifactKeys.length === 0)
			) {
				continue;
			}

			if (metadata.ragEntryId) {
				await documentRag.delete(ctx, { entryId: metadata.ragEntryId as EntryId });
			}
			for (const artifactKey of artifactKeys) {
				await r2.deleteObject(ctx, artifactKey);
			}
			await ctx.runMutation(internal.ragKnowledgeInternal.clearDocumentIngestion, {
				documentId: document._id
			});

			cleared.push({ documentId: document._id, title: document.title });
		}

		return { clearedCount: cleared.length, cleared };
	}
});

export const deleteR2DocumentCompletely = action({
	args: {
		documentId: v.id('contentLib')
	},
	handler: async (ctx, args): Promise<{ deleted: true; documentId: Id<'contentLib'> }> => {
		const document = await ctx.runQuery(internal.ragKnowledgeInternal.getDocumentForRagIngestion, {
			documentId: args.documentId
		});
		if (!document) throw new Error('Document not found');
		await assertDocumentAccess(ctx, document);

		const metadata = document.metadata ?? {};
		if (metadata.storageProvider !== 'r2') {
			throw new Error('Only R2-backed documents can be fully deleted from this flow.');
		}

		if (metadata.ragEntryId) {
			await documentRag.delete(ctx, { entryId: metadata.ragEntryId as EntryId });
		}

		for (const artifactKey of metadata.extractionArtifactKeys ?? []) {
			await r2.deleteObject(ctx, artifactKey);
		}

		if (metadata.r2Key) {
			await r2.deleteObject(ctx, metadata.r2Key);
		}
		await ctx.runMutation(internal.ragKnowledgeInternal.markDocumentDeleted, {
			documentId: document._id
		});

		return { deleted: true, documentId: document._id };
	}
});

export const askCohort = action({
	args: {
		cohortId: v.id('cohort'),
		prompt: v.string(),
		sourceDocumentId: v.optional(v.id('contentLib')),
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		assertOpenRouterKey();
		if (!args.sourceDocumentId) {
			throw new Error('Select an indexed or mapped R2 document before asking the RAG tester.');
		}
		const document = await ctx.runQuery(internal.ragKnowledgeInternal.getDocumentForRagIngestion, {
			documentId: args.sourceDocumentId
		});
		if (!document) throw new Error('Document not found');
		if (!document.metadata?.ragEntryId) {
			throw new Error('This document has not been indexed for AI yet.');
		}
		await assertDocumentAccess(ctx, document);

		const limit = Math.min(Math.max(args.limit ?? 8, 1), 20);
		const chatModel = RAG_TESTER_CHAT_MODEL;
		const namespace = documentNamespace(String(args.sourceDocumentId));

		const result = await documentRag.generateText(ctx, {
			search: {
				namespace,
				query: args.prompt,
				limit,
				chunkContext: { before: 1, after: 1 },
				searchType: 'hybrid'
			},
			model: openRouter().chat(chatModel),
			system:
				'You are a concise study assistant for LearnTerms curators. Answer only from the retrieved cohort knowledge. If the context does not contain the answer, say that the cohort knowledge base does not include enough information yet.',
			prompt: args.prompt
		});

		return {
			answer: result.text,
			context: result.context,
			usage: result.usage,
			diagnostics: {
				model: chatModel,
				embeddingModel: EMBEDDING_MODEL,
				namespace,
				source: 'r2Document',
				sourceDocumentId: String(args.sourceDocumentId),
				search: {
					limit,
					searchType: 'hybrid',
					chunkContext: { before: 1, after: 1 },
					filters: []
				},
				retrievedGroupCount: result.context.results.length,
				entryCount: result.context.entries.length,
				contextTextLength: result.context.text.length
			}
		};
	}
});
