import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Doc } from '../_generated/dataModel';
import { action } from '../_generated/server';
import type { DocumentMappingContext, GenerationContext } from './shared';
import { MAX_SOURCE_CHARS } from './shared';
import {
	createSourceIntelligenceOperations,
	loadMarkdownPages,
	pagesToPromptText,
	selectPages
} from './sourceRetrieval';
import { cleanPlainText } from './text';

export const runDevTool = action({
	args: {
		documentId: v.id('contentLib'),
		moduleId: v.optional(v.id('module')),
		tool: v.union(
			v.literal('searchSourceChunks'),
			v.literal('getSourcePages'),
			v.literal('getTopicCoverageMap'),
			v.literal('getAllowedSourceText')
		),
		query: v.optional(v.string()),
		limit: v.optional(v.number()),
		pageNumbers: v.optional(v.array(v.number())),
		startPage: v.optional(v.number()),
		endPage: v.optional(v.number())
	},
	handler: async (ctx, args): Promise<unknown> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');

		const context = args.moduleId
			? ((await ctx.runQuery(internal.questionStudio.context.getGenerationContext, {
					clerkUserId: identity.subject,
					documentId: args.documentId,
					moduleId: args.moduleId
				})) as GenerationContext)
			: ((await ctx.runQuery(internal.questionStudio.context.getDocumentMappingContext, {
					clerkUserId: identity.subject,
					documentId: args.documentId
				})) as DocumentMappingContext);

		const allPages = await loadMarkdownPages(context.document);
		const selectedPages = selectPages(allPages, args.startPage, args.endPage);
		const pageNumbers = args.pageNumbers?.length
			? args.pageNumbers
			: selectedPages.slice(0, 2).map((page) => page.pageNumber);
		const noteFile = cleanPlainText(
			String(context.document.metadata?.originalFileName ?? context.document.title),
			260
		);
		const savedMap = (await ctx.runQuery(internal.questionStudio.context.getSavedTopicMapForRange, {
			documentId: args.documentId,
			startPage: selectedPages[0].pageNumber,
			endPage: selectedPages[selectedPages.length - 1].pageNumber
		})) as Doc<'questionStudioTopicMaps'> | null;
		const existingQuestions = args.moduleId ? (context as GenerationContext).existingQuestions : [];
		const sourceOperations = createSourceIntelligenceOperations({
			ctx,
			documentId: args.documentId,
			documentTitle: context.document.title,
			noteFile,
			selectedPages,
			topics: (savedMap?.topics ?? []).map((topic) => ({
				...topic,
				suggestedTypes: topic.suggestedTypes ?? []
			})),
			existingQuestions
		});

		const inputByTool = {
			searchSourceChunks: {
				query: cleanPlainText(args.query ?? '', 500) || context.document.title,
				limit: Math.max(1, Math.min(8, Math.floor(args.limit ?? 4)))
			},
			getSourcePages: { pageNumbers },
			getTopicCoverageMap: {},
			getAllowedSourceText: {}
		};

		const startedAt = Date.now();
		const output =
			args.tool === 'searchSourceChunks'
				? await sourceOperations.searchSourceChunks(inputByTool.searchSourceChunks)
				: args.tool === 'getSourcePages'
					? await sourceOperations.getSourcePages(inputByTool.getSourcePages)
					: args.tool === 'getTopicCoverageMap'
						? await sourceOperations.getTopicCoverageMap()
						: {
								documentTitle: context.document.title,
								pageNumbers: selectedPages.map((page) => page.pageNumber),
								text: pagesToPromptText(selectedPages, MAX_SOURCE_CHARS)
							};

		return {
			tool: args.tool,
			input: inputByTool[args.tool],
			output,
			diagnostics: {
				documentId: args.documentId,
				documentTitle: context.document.title,
				moduleId: args.moduleId,
				pageRange: {
					startPage: selectedPages[0].pageNumber,
					endPage: selectedPages[selectedPages.length - 1].pageNumber,
					selectedPageCount: selectedPages.length
				},
				topicMapId: savedMap?._id,
				topicCount: savedMap?.topics.length ?? 0,
				existingQuestionCount: existingQuestions.length,
				elapsedMs: Date.now() - startedAt
			}
		};
	}
});
