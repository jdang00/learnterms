import { omit } from 'convex-helpers';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { action, internalQuery, query } from '../_generated/server';
import { getActor } from './authorization';
import type { DocumentMappingContext } from './shared';
import { loadMarkdownPages } from './sourceRetrieval';
import { isSavedMapForSource } from './topicMaps';

export const getGenerationContext = internalQuery({
	args: {
		clerkUserId: v.string(),
		documentId: v.id('contentLib'),
		moduleId: v.id('module')
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
			.first();
		if (!user) throw new Error('User not found');
		if (!(user.role === 'dev' || user.role === 'admin' || user.role === 'curator')) {
			throw new Error('Unauthorized');
		}

		const document = await ctx.db.get(args.documentId);
		if (!document || document.deletedAt) throw new Error('Document not found');
		const ingestionStatus = document.metadata?.ingestionStatus;
		if (
			document.metadata?.storageProvider !== 'r2' ||
			(ingestionStatus !== 'indexed' && ingestionStatus !== 'mapped') ||
			!document.metadata?.ragEntryId
		) {
			throw new Error('Select an indexed or mapped R2 document before using Question Studio');
		}

		const module = await ctx.db.get(args.moduleId);
		if (!module || module.deletedAt) throw new Error('Module not found');
		const classDoc = await ctx.db.get(module.classId);
		if (!classDoc || classDoc.deletedAt) throw new Error('Class not found');
		if (classDoc.cohortId !== document.cohortId) {
			throw new Error('Source document and destination module must be in the same cohort');
		}
		if (user.role !== 'dev' && user.cohortId !== classDoc.cohortId) {
			throw new Error('Unauthorized for this cohort');
		}

		const questions = await ctx.db
			.query('question')
			.withIndex('by_moduleId_order', (q) => q.eq('moduleId', args.moduleId))
			.collect();

		return {
			user: { _id: user._id, role: user.role, cohortId: user.cohortId },
			document,
			module,
			classDoc,
			existingQuestions: questions.map((question) => ({
				_id: question._id,
				stem: question.stem,
				options: question.options.map((option) => `${option.id}:${option.text}`),
				correctAnswers: question.correctAnswers,
				rationale: question.rationale ?? question.explanation,
				status: question.status,
				searchText: question.searchText,
				sourceDocumentId: question.metadata.generation?.sourceDocumentId,
				sourcePageNumbers: question.metadata.generation?.sourcePageNumbers,
				sourceCitations: question.metadata.generation?.sourceCitations,
				topicTitle: question.metadata.generation?.topicTitle,
				questionType: question.metadata.generation?.questionType,
				reasoningOrder: question.metadata.generation?.reasoningOrder
			}))
		};
	}
});

export const getDocumentMappingContext = internalQuery({
	args: {
		clerkUserId: v.string(),
		documentId: v.id('contentLib')
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
			.first();
		if (!user) throw new Error('User not found');
		if (!(user.role === 'dev' || user.role === 'admin' || user.role === 'curator')) {
			throw new Error('Unauthorized');
		}

		const document = await ctx.db.get(args.documentId);
		if (!document || document.deletedAt) throw new Error('Document not found');
		const ingestionStatus = document.metadata?.ingestionStatus;
		if (
			document.metadata?.storageProvider !== 'r2' ||
			(ingestionStatus !== 'indexed' && ingestionStatus !== 'mapped') ||
			!document.metadata?.ragEntryId
		) {
			throw new Error('Select an indexed or mapped R2 document before mapping topics');
		}
		if (user.role !== 'dev' && user.cohortId !== document.cohortId) {
			throw new Error('Unauthorized for this cohort');
		}

		return {
			user: { _id: user._id, role: user.role, cohortId: user.cohortId },
			document
		};
	}
});

/** Same extracted page text used by generation, fetched only for an authorized curator. */
export const getSourcePages = action({
	args: { documentId: v.id('contentLib'), offset: v.optional(v.number()) },
	returns: v.object({
		pages: v.array(v.object({ pageNumber: v.number(), text: v.string() })),
		pageNumbers: v.array(v.number()),
		pageCharacterCounts: v.array(v.object({ pageNumber: v.number(), characters: v.number() })),
		nextOffset: v.union(v.number(), v.null()),
		sourceIndexedAt: v.number()
	}),
	handler: async (
		ctx,
		args
	): Promise<{
		pages: Array<{ pageNumber: number; text: string }>;
		pageNumbers: number[];
		pageCharacterCounts: Array<{ pageNumber: number; characters: number }>;
		nextOffset: number | null;
		sourceIndexedAt: number;
	}> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');
		const { document }: DocumentMappingContext = await ctx.runQuery(
			internal.questionStudio.getDocumentMappingContext,
			{
				documentId: args.documentId,
				clerkUserId: identity.subject
			}
		);
		if (document.metadata?.indexedAt === undefined) throw new Error('Source is not indexed yet.');
		const pages = await loadMarkdownPages(document);
		const offset = args.offset ?? 0;
		if (!Number.isInteger(offset) || offset < 0 || offset >= pages.length)
			throw new Error('Invalid page offset');
		const end = Math.min(offset + 12, pages.length);
		return {
			pages: pages.slice(offset, end).map(({ pageNumber, text }) => ({ pageNumber, text })),
			pageNumbers: pages.map((page) => page.pageNumber),
			pageCharacterCounts: pages.map((page) => ({
				pageNumber: page.pageNumber,
				characters: page.text.length
			})),
			nextOffset: end < pages.length ? end : null,
			sourceIndexedAt: document.metadata.indexedAt
		};
	}
});

export const getSavedTopicMapForRange = internalQuery({
	args: {
		documentId: v.id('contentLib'),
		startPage: v.number(),
		endPage: v.number()
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query('questionStudioTopicMaps')
			.withIndex('by_documentId_pageRange', (q) =>
				q
					.eq('documentId', args.documentId)
					.eq('startPage', args.startPage)
					.eq('endPage', args.endPage)
			)
			.filter((q) => q.eq(q.field('deletedAt'), undefined))
			.order('desc')
			.first();
	}
});

export const getLatestSavedTopicMap = query({
	args: {
		documentId: v.id('contentLib'),
		moduleId: v.id('module')
	},
	handler: async (ctx, args) => {
		const { user } = await getActor(ctx);
		const document = await ctx.db.get(args.documentId);
		if (!document || document.deletedAt) throw new Error('Document not found');
		const module = await ctx.db.get(args.moduleId);
		if (!module || module.deletedAt) throw new Error('Module not found');
		const classDoc = await ctx.db.get(module.classId);
		if (!classDoc || classDoc.deletedAt) throw new Error('Class not found');
		if (classDoc.cohortId !== document.cohortId) {
			throw new Error('Source document and destination module must be in the same cohort');
		}
		if (user.role !== 'dev' && user.cohortId !== classDoc.cohortId) {
			throw new Error('Unauthorized for this cohort');
		}

		const maps = await ctx.db
			.query('questionStudioTopicMaps')
			.withIndex('by_documentId', (q) => q.eq('documentId', args.documentId))
			.order('desc')
			.take(100);
		const latest = maps
			.filter((map) => isSavedMapForSource(map, document))
			.sort((a, b) => b.updatedAt - a.updatedAt)[0];
		if (!latest) return null;

		return {
			_id: latest._id,
			documentId: latest.documentId,
			moduleId: args.moduleId,
			startPage: latest.startPage,
			endPage: latest.endPage,
			topics: latest.topics.map((topic) => omit(topic, ['suggestedOrders'])),
			model: latest.model,
			agentThreadId: latest.agentThreadId,
			updatedAt: latest.updatedAt
		};
	}
});
