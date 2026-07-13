import { Agent, createTool, stepCountIs } from '@convex-dev/agent';
import { RateLimiter, MINUTE } from '@convex-dev/rate-limiter';
import { v } from 'convex/values';
import {
	action,
	internalAction,
	internalMutation,
	internalQuery,
	mutation,
	query
} from './_generated/server';
import { NoObjectGeneratedError, type ToolSet } from 'ai';
import { components, internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { z } from 'zod/v4';
import { applyQuestionCreationDeltaAndEvaluateBadges } from './badgeEngine';
import {
	MAX_GENERATED_QUESTIONS,
	MAX_QUESTIONS_PER_MODULE,
	MAX_REVIEW_REASON_CHARS,
	MAX_SOURCE_CHARS,
	MAX_TOPIC_SOURCE_CHARS,
	MAX_WORKER_RAG_CHARS,
	MAX_WORKER_RESEARCH_CHARS,
	MAX_WORKER_SOURCE_CHARS,
	MAX_QUESTIONS_PER_WORKER,
	QUESTION_STUDIO_FLASH_MODEL,
	QUESTION_STUDIO_MODEL,
	QUESTION_STUDIO_PROVIDER_OPTIONS,
	WORKER_DRAFT_MAX_OUTPUT_TOKENS,
	assertOpenRouterKey,
	assertOperatorToken,
	candidateReviewValidator,
	candidateValidator,
	generationPlanValidator,
	liveWorkerTaskValidator,
	loopProgressValidator,
	openRouter,
	questionStudioModelValidator,
	questionStudioProviderOptions,
	shouldUseStructuredOutput,
	topicInputValidator,
	topicMapSchema,
	workerCandidateSchema
} from './questionStudio/shared';
import type {
	CandidateQuestion,
	CandidateReview,
	DocumentMappingContext,
	ExistingQuestionSummary,
	GenerateObjectOptions,
	GenerationContext,
	GenerationJobSnapshot,
	LiveWorkerTask,
	MapDocumentTopicMapResult,
	QuestionStudioModel,
	QueuedGenerationResult,
	SourceCitation,
	TopicMapItem
} from './questionStudio/shared';
import {
	buildFocusInstruction,
	buildLiveGenerationWork,
	candidateHasProvenanceLanguage,
	candidateToQuestionInsert,
	citationKey,
	citationsFromSearch,
	clampTopic,
	cleanPlainText,
	coerceGeneratedCandidate,
	createCandidateDraftRepairText,
	createSourceIntelligenceTools,
	defaultWorkerRetrievalQuery,
	deleteGenerationJobRows,
	documentNamespace,
	documentRag,
	formatStructuredOutputError,
	hydrateGenerationJob,
	insertGenerationJobEvent,
	loadMarkdownPages,
	mechanicalCandidateGate,
	normalizeCandidateDraftPayload,
	pagesForTask,
	pagesToPromptText,
	parseModelJsonText,
	reasoningOrderPrompt,
	recoverStructuredObjectFromError,
	safeParseSchema,
	scoreDuplicateRisk,
	selectPages,
	taskLabel,
	taskPageNumbers,
	taskTopics,
	validateCounts
} from './questionStudio/helpers';
import { cognitiveTemplateCard, defaultTemplateForOrder } from './questionStudio/agentLoopConfig';

const questionStudioRateLimiter = new RateLimiter(components.rateLimiter, {
	questionStudioGenerationStart: { kind: 'fixed window', rate: 6, period: 10 * MINUTE },
	questionStudioGlobalGenerationStart: { kind: 'fixed window', rate: 80, period: MINUTE },
	questionStudioTokenUsagePerUser: {
		kind: 'token bucket',
		rate: 120_000,
		period: MINUTE,
		capacity: 240_000
	},
	questionStudioGlobalTokenUsage: {
		kind: 'token bucket',
		rate: 1_000_000,
		period: MINUTE,
		capacity: 2_000_000
	}
});

function normalizeQuestionStudioModel(model?: string): QuestionStudioModel {
	const trimmed = cleanPlainText(model ?? '', 160);
	return trimmed || QUESTION_STUDIO_MODEL;
}

function createQuestionStudioAgent(tools?: ToolSet, model = QUESTION_STUDIO_MODEL, maxSteps = 4) {
	return new Agent(components.agent, {
		name: 'Question Studio Curator',
		languageModel: openRouter().chat(model),
		instructions: [
			'You are a LearnTerms curriculum question curator.',
			'Use only the provided source notes and context.',
			'Prefer precise, teachable medical or course-relevant phrasing.',
			'Never invent facts that are not supported by the retrieved notes.',
			'Multiple choice questions must have one correct answer, plausible distractors, and a concise rationale.'
		].join('\n'),
		tools,
		stopWhen: stepCountIs(maxSteps),
		usageHandler: async (ctx, { usage, userId }) => {
			if (!userId || !usage?.totalTokens) return;
			await questionStudioRateLimiter.limit(ctx, 'questionStudioTokenUsagePerUser', {
				key: userId,
				count: usage.totalTokens,
				reserve: true
			});
			await questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalTokenUsage', {
				count: usage.totalTokens,
				reserve: true
			});
		}
	});
}

type QuestionStudioAgent = ReturnType<typeof createQuestionStudioAgent>;

async function getActor(ctx: Pick<QueryCtx, 'db' | 'auth'>) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error('Unauthorized');
	const user = await ctx.db
		.query('users')
		.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
		.first();
	if (!user) throw new Error('User not found');
	if (!(user.role === 'dev' || user.role === 'admin' || user.role === 'curator')) {
		throw new Error('Unauthorized');
	}
	return { identity, user };
}

async function assertSaveAccess(
	ctx: MutationCtx,
	args: { moduleId: Id<'module'>; documentId: Id<'contentLib'> }
) {
	const { identity, user } = await getActor(ctx);
	const module = await ctx.db.get(args.moduleId);
	if (!module || module.deletedAt) throw new Error('Module not found');
	const classDoc = await ctx.db.get(module.classId);
	if (!classDoc || classDoc.deletedAt) throw new Error('Class not found');
	const document = await ctx.db.get(args.documentId);
	if (!document || document.deletedAt) throw new Error('Document not found');
	if (document.cohortId !== classDoc.cohortId) {
		throw new Error('Source document and destination module must be in the same cohort');
	}
	if (user.role !== 'dev' && user.cohortId !== classDoc.cohortId) {
		throw new Error('Unauthorized for this cohort');
	}
	return { identity, user, module, classDoc, document };
}

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
			.filter((q) => q.eq(q.field('deletedAt'), undefined))
			.collect();

		const freshMaps = maps.filter((map) =>
			map.sourceIndexedAt
				? map.sourceIndexedAt === document.metadata?.indexedAt
				: map.sourceDocumentUpdatedAt === document.updatedAt
		);
		const latest = freshMaps.sort((a, b) => b.updatedAt - a.updatedAt)[0];
		if (!latest) return null;

		return {
			_id: latest._id,
			documentId: latest.documentId,
			moduleId: args.moduleId,
			startPage: latest.startPage,
			endPage: latest.endPage,
			topics: latest.topics,
			model: latest.model,
			agentThreadId: latest.agentThreadId,
			updatedAt: latest.updatedAt
		};
	}
});

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
			? ((await ctx.runQuery(internal.questionStudio.getGenerationContext, {
					clerkUserId: identity.subject,
					documentId: args.documentId,
					moduleId: args.moduleId
				})) as GenerationContext)
			: ((await ctx.runQuery(internal.questionStudio.getDocumentMappingContext, {
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
		const savedMap = (await ctx.runQuery(internal.questionStudio.getSavedTopicMapForRange, {
			documentId: args.documentId,
			startPage: selectedPages[0].pageNumber,
			endPage: selectedPages[selectedPages.length - 1].pageNumber
		})) as Doc<'questionStudioTopicMaps'> | null;
		const existingQuestions = args.moduleId ? (context as GenerationContext).existingQuestions : [];
		const sourceTools = createSourceIntelligenceTools({
			ctx,
			documentId: args.documentId,
			documentTitle: context.document.title,
			noteFile,
			selectedPages,
			topics: savedMap?.topics ?? [],
			existingQuestions
		});
		const tools = {
			...sourceTools,
			getAllowedSourceText: createTool({
				description:
					'Return the selected source notes. This tool has no access outside the selected document and page range.',
				inputSchema: z.object({}),
				execute: async () => ({
					documentTitle: context.document.title,
					pageNumbers: selectedPages.map((page) => page.pageNumber),
					text: pagesToPromptText(selectedPages, MAX_SOURCE_CHARS)
				})
			})
		};
		const tool = tools[args.tool] as { execute?: (...toolArgs: unknown[]) => Promise<unknown> };
		if (!tool?.execute) throw new Error(`Unknown Question Studio tool: ${args.tool}`);

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
		const output = await tool.execute.call({ ctx }, inputByTool[args.tool], {
			toolCallId: `dev-${args.tool}`,
			messages: []
		});

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
	handler: async (ctx, args) => {
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
			.collect();

		const [latest, ...older] = existing.sort((a, b) => b.updatedAt - a.updatedAt);
		for (const old of older) {
			await ctx.db.patch(old._id, { deletedAt: now, updatedAt: now });
		}

		if (latest) {
			await ctx.db.patch(latest._id, {
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

export const autoMapIndexedDocument = internalAction({
	args: {
		documentId: v.id('contentLib'),
		triggeredByClerkUserId: v.optional(v.string())
	},
	handler: async (ctx, args) => {
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

		const pages = selectPages(await loadMarkdownPages(document));
		const pageRange = {
			startPage: pages[0].pageNumber,
			endPage: pages[pages.length - 1].pageNumber
		};
		const savedMap = (await ctx.runQuery(internal.questionStudio.getSavedTopicMapForRange, {
			documentId: args.documentId,
			startPage: pageRange.startPage,
			endPage: pageRange.endPage
		})) as Doc<'questionStudioTopicMaps'> | null;
		const savedMapIsFresh = Boolean(
			savedMap &&
			(savedMap.sourceIndexedAt
				? savedMap.sourceIndexedAt === document.metadata?.indexedAt
				: savedMap.sourceDocumentUpdatedAt === document.updatedAt)
		);
		if (savedMap && savedMapIsFresh) {
			if (document.metadata?.ingestionStatus !== 'mapped') {
				await ctx.runMutation(internal.ragKnowledgeInternal.markDocumentMapped, {
					documentId: args.documentId,
					mappedAt: savedMap.updatedAt
				});
			}
			return {
				status: 'cached',
				topicMapId: savedMap._id,
				topicCount: savedMap.topics.length
			};
		}

		assertOpenRouterKey();
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

		const sourceText = pagesToPromptText(pages, MAX_TOPIC_SOURCE_CHARS);
		const noteFile = cleanPlainText(
			String(document.metadata?.originalFileName ?? document.title),
			260
		);
		const sourceTools = createSourceIntelligenceTools({
			ctx,
			documentId: args.documentId,
			documentTitle: document.title,
			noteFile,
			selectedPages: pages
		});
		const tools = {
			...sourceTools,
			getAllowedSourceText: createTool({
				description:
					'Return the indexed source notes for this document. This tool has no access outside the selected document.',
				inputSchema: z.object({}),
				execute: async () => ({
					documentTitle: document.title,
					pageNumbers: pages.map((page) => page.pageNumber),
					text: pagesToPromptText(pages, MAX_SOURCE_CHARS)
				})
			})
		};
		const agent = createQuestionStudioAgent(tools, QUESTION_STUDIO_FLASH_MODEL);
		const { threadId } = await agent.createThread(ctx, {
			userId: agentUserId,
			title: `Auto map document: ${document.title}`
		});

		const result = await agent.generateObject(
			ctx,
			{ threadId, userId: agentUserId },
			{
				schema: topicMapSchema,
				providerOptions: QUESTION_STUDIO_PROVIDER_OPTIONS,
				prompt: [
					'Map this indexed document into reusable teachable topics for future question generation.',
					'Return coverage-focused topics. Each topic should be narrow enough to support 1-10 questions.',
					'Use page numbers from the source only.',
					reasoningOrderPrompt(),
					'No destination module has been selected yet, so make this a document-level topic map.',
					`Selected pages: ${pages.map((page) => page.pageNumber).join(', ')}`,
					'Source excerpt:',
					sourceText
				].join('\n\n')
			},
			{ storageOptions: { saveMessages: 'promptAndOutput' } }
		);

		const topics = result.object.topics.map((topic, index) => clampTopic(topic, pages, index));
		const topicMapId = (await ctx.runMutation(internal.questionStudio.saveTopicMapForRange, {
			documentId: args.documentId,
			cohortId: document.cohortId,
			startPage: pageRange.startPage,
			endPage: pageRange.endPage,
			pageCount: pages.length,
			topics,
			model: QUESTION_STUDIO_FLASH_MODEL,
			agentThreadId: threadId,
			sourceDocumentUpdatedAt: document.updatedAt,
			sourceIndexedAt: document.metadata?.indexedAt,
			createdByUserId: creator?._id
		})) as Id<'questionStudioTopicMaps'>;
		await ctx.runMutation(internal.ragKnowledgeInternal.markDocumentMapped, {
			documentId: args.documentId,
			mappedAt: Date.now()
		});

		return {
			status: 'mapped',
			topicMapId,
			topicCount: topics.length,
			threadId,
			usage: result.usage
		};
	}
});

export const createGenerationJob = mutation({
	args: {
		documentId: v.id('contentLib'),
		moduleId: v.id('module'),
		requestedCount: v.number(),
		model: v.optional(questionStudioModelValidator)
	},
	handler: async (ctx, args) => {
		const { user, classDoc } = await assertSaveAccess(ctx, {
			moduleId: args.moduleId,
			documentId: args.documentId
		});
		const now = Date.now();
		const model = normalizeQuestionStudioModel(args.model);
		const existingJobs = await ctx.db
			.query('questionStudioJobs')
			.withIndex('by_createdByUserId', (q) => q.eq('createdByUserId', user._id))
			.collect();
		for (const job of existingJobs) {
			await deleteGenerationJobRows(ctx, job._id);
			await ctx.db.delete(job._id);
		}
		const jobId = await ctx.db.insert('questionStudioJobs', {
			documentId: args.documentId,
			moduleId: args.moduleId,
			cohortId: classDoc.cohortId,
			createdByUserId: user._id,
			kind: 'candidate_generation',
			status: 'queued',
			statusText: 'Queued candidate generation.',
			model,
			requestedCount: Math.floor(args.requestedCount),
			loop: { enabled: true, pass: 'plan' as const },
			blockedDuplicateCount: 0,
			candidateCount: 0,
			reviewCount: 0,
			eventCount: 1,
			completedWorkerCount: 0,
			failedWorkerCount: 0,
			createdAt: now,
			updatedAt: now
		});
		await ctx.db.insert('questionStudioJobEvents', {
			jobId,
			cohortId: classDoc.cohortId,
			at: now,
			label: 'Queued',
			detail: 'Preparing the agent run.'
		});
		return jobId;
	}
});

export const getCurrentGenerationJob = query({
	args: {},
	handler: async (ctx) => {
		const { user } = await getActor(ctx);
		const jobs = await ctx.db
			.query('questionStudioJobs')
			.withIndex('by_createdByUserId', (q) => q.eq('createdByUserId', user._id))
			.collect();
		const job = jobs.sort((a, b) => b.createdAt - a.createdAt)[0];
		if (!job) return null;
		return await hydrateGenerationJob(ctx, job);
	}
});

export const clearCurrentGenerationJob = mutation({
	args: {},
	handler: async (ctx) => {
		const { user } = await getActor(ctx);
		const jobs = await ctx.db
			.query('questionStudioJobs')
			.withIndex('by_createdByUserId', (q) => q.eq('createdByUserId', user._id))
			.collect();
		for (const job of jobs) {
			await deleteGenerationJobRows(ctx, job._id);
			await ctx.db.delete(job._id);
		}
		return { deletedCount: jobs.length };
	}
});

export const getGenerationJob = query({
	args: { jobId: v.id('questionStudioJobs') },
	handler: async (ctx, { jobId }) => {
		const { user } = await getActor(ctx);
		const job = await ctx.db.get(jobId);
		if (!job) return null;
		if (user.role !== 'dev' && user.cohortId !== job.cohortId) {
			throw new Error('Unauthorized for this cohort');
		}
		return await hydrateGenerationJob(ctx, job);
	}
});

// Fetched lazily by the UI when the reviewer phase is expanded — keeps the live job
// subscription light while still exposing per-candidate verdicts on demand.
export const getGenerationJobReviews = query({
	args: { jobId: v.id('questionStudioJobs') },
	handler: async (ctx, { jobId }) => {
		const { user } = await getActor(ctx);
		const job = await ctx.db.get(jobId);
		if (!job) return [];
		if (user.role !== 'dev' && user.cohortId !== job.cohortId) {
			throw new Error('Unauthorized for this cohort');
		}
		const rows = await ctx.db
			.query('questionStudioJobReviews')
			.withIndex('by_jobId_candidateIndex', (q) => q.eq('jobId', jobId))
			.collect();
		return rows.sort((a, b) => a.candidateIndex - b.candidateIndex).map((row) => row.review);
	}
});

export const updateGenerationJob = internalMutation({
	args: {
		jobId: v.id('questionStudioJobs'),
		status: v.optional(
			v.union(v.literal('queued'), v.literal('running'), v.literal('ready'), v.literal('failed'))
		),
		statusText: v.optional(v.string()),
		eventLabel: v.optional(v.string()),
		eventDetail: v.optional(v.string()),
		threadId: v.optional(v.string()),
		plan: v.optional(generationPlanValidator),
		loop: v.optional(loopProgressValidator),
		reviews: v.optional(v.array(candidateReviewValidator)),
		candidates: v.optional(v.array(candidateValidator)),
		blockedDuplicateCount: v.optional(v.number()),
		error: v.optional(v.string()),
		completed: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (!job) return;
		const now = Date.now();
		let eventCount = job.eventCount ?? 0;
		if (args.eventLabel) {
			await insertGenerationJobEvent(ctx, job, {
				at: now,
				label: args.eventLabel,
				detail: args.eventDetail
			});
			eventCount += 1;
		}
		const shouldPatchSummary = Boolean(
			args.status ||
			(args.statusText && !args.eventLabel) ||
			args.threadId ||
			args.plan ||
			args.loop ||
			args.reviews ||
			args.candidates ||
			args.blockedDuplicateCount !== undefined ||
			args.error ||
			args.completed
		);
		if (!shouldPatchSummary) return;
		let candidateCount = job.candidateCount ?? 0;
		if (args.candidates) {
			const existingRows = await ctx.db
				.query('questionStudioJobCandidates')
				.withIndex('by_jobId', (q) => q.eq('jobId', args.jobId))
				.collect();
			await Promise.all(existingRows.map((row) => ctx.db.delete(row._id)));
			await Promise.all(
				args.candidates.map((candidate, index) =>
					ctx.db.insert('questionStudioJobCandidates', {
						jobId: args.jobId,
						cohortId: job.cohortId,
						index,
						candidate,
						createdAt: now
					})
				)
			);
			candidateCount = args.candidates.length;
		}
		let reviewCount = job.reviewCount ?? 0;
		if (args.reviews) {
			const existingRows = await ctx.db
				.query('questionStudioJobReviews')
				.withIndex('by_jobId', (q) => q.eq('jobId', args.jobId))
				.collect();
			await Promise.all(existingRows.map((row) => ctx.db.delete(row._id)));
			await Promise.all(
				args.reviews.map((review) =>
					ctx.db.insert('questionStudioJobReviews', {
						jobId: args.jobId,
						cohortId: job.cohortId,
						candidateIndex: review.candidateIndex,
						review,
						createdAt: now
					})
				)
			);
			reviewCount = args.reviews.length;
		}
		await ctx.db.patch(args.jobId, {
			...(args.status ? { status: args.status } : {}),
			...(args.statusText ? { statusText: args.statusText } : {}),
			...(args.threadId ? { threadId: args.threadId } : {}),
			...(args.plan ? { plan: args.plan } : {}),
			...(args.loop
				? {
						loop: {
							enabled: args.loop.enabled ?? job.loop?.enabled ?? true,
							pass: args.loop.pass ?? job.loop?.pass ?? ('plan' as const),
							blueprintCount: args.loop.blueprintCount ?? job.loop?.blueprintCount,
							blueprintSource: args.loop.blueprintSource ?? job.loop?.blueprintSource,
							gatePassedCount: args.loop.gatePassedCount ?? job.loop?.gatePassedCount,
							gateRejectedCount: args.loop.gateRejectedCount ?? job.loop?.gateRejectedCount,
							selectedCount: args.loop.selectedCount ?? job.loop?.selectedCount,
							dedupedCount: args.loop.dedupedCount ?? job.loop?.dedupedCount
						}
					}
				: {}),
			...(args.blockedDuplicateCount !== undefined
				? { blockedDuplicateCount: args.blockedDuplicateCount }
				: {}),
			...(args.error ? { error: args.error } : {}),
			eventCount,
			candidateCount,
			reviewCount,
			updatedAt: now,
			...(args.completed ? { completedAt: now } : {})
		});
	}
});

export const appendGenerationWorkerResult = internalMutation({
	args: {
		jobId: v.id('questionStudioJobs'),
		workerTotal: v.number(),
		workerIndex: v.number(),
		threadId: v.optional(v.string()),
		candidates: v.array(candidateValidator),
		rawReturnedCount: v.number(),
		eventLabel: v.string(),
		eventDetail: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (!job || job.status === 'ready' || job.status === 'failed') {
			return { candidateCount: job?.candidateCount ?? 0 };
		}
		const now = Date.now();
		const acceptedIncoming: CandidateQuestion[] = [];
		for (const candidate of args.candidates as CandidateQuestion[]) {
			const duplicate = scoreDuplicateRisk(candidate, [], acceptedIncoming);
			if (duplicate.risk === 'high') continue;
			acceptedIncoming.push({
				...candidate,
				duplicateRisk: duplicate.risk === 'low' ? candidate.duplicateRisk : duplicate.risk
			});
		}
		const insertedCandidates = acceptedIncoming.slice(0, MAX_QUESTIONS_PER_WORKER);
		for (const [offset, candidate] of insertedCandidates.entries()) {
			await ctx.db.insert('questionStudioJobCandidates', {
				jobId: args.jobId,
				cohortId: job.cohortId,
				index: args.workerIndex * MAX_QUESTIONS_PER_WORKER + offset,
				candidate,
				createdAt: now
			});
		}
		await insertGenerationJobEvent(ctx, job, {
			at: now,
			label: args.eventLabel,
			detail: args.eventDetail
		});
		return { candidateCount: (job.candidateCount ?? 0) + insertedCandidates.length };
	}
});

export const getGenerationJobInternal = internalQuery({
	args: { jobId: v.id('questionStudioJobs') },
	handler: async (ctx, { jobId }) => {
		const job = await ctx.db.get(jobId);
		if (!job) return null;
		return await hydrateGenerationJob(ctx, job);
	}
});

export const findLikelyDuplicateQuestions = internalQuery({
	args: {
		moduleId: v.id('module'),
		queries: v.array(v.object({ key: v.string(), text: v.string() }))
	},
	handler: async (ctx, args) => {
		const queries = args.queries.slice(0, 3);
		return await Promise.all(
			queries.map(async ({ key, text }) => {
				const searchText = [
					...new Set(
						cleanPlainText(text, 600)
							.toLowerCase()
							.split(/\s+/)
							.map((term) => term.replace(/[^a-z0-9-]/g, ''))
							.filter((term) => term.length >= 3)
					)
				]
					.slice(0, 16)
					.join(' ');
				if (!searchText) return { key, matches: [] };
				const matches = await ctx.db
					.query('question')
					.withSearchIndex('by_moduleId_searchText', (q) =>
						q.search('searchText', searchText).eq('moduleId', args.moduleId)
					)
					.take(5);
				return {
					key,
					matches: matches.map((question) => ({
						questionId: question._id,
						stem: question.stem,
						topicTitle: question.metadata.generation?.topicTitle,
						reasoningOrder: question.metadata.generation?.reasoningOrder
					}))
				};
			})
		);
	}
});

export const generateCandidateWorker = internalAction({
	args: {
		jobId: v.id('questionStudioJobs'),
		documentId: v.id('contentLib'),
		moduleId: v.id('module'),
		clerkUserId: v.string(),
		task: liveWorkerTaskValidator,
		workerIndex: v.number(),
		workerTotal: v.number(),
		model: questionStudioModelValidator,
		focusNotes: v.optional(v.string()),
		startPage: v.optional(v.number()),
		endPage: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const report = async (update: Record<string, unknown>) => {
			try {
				await ctx.runMutation(internal.questionStudio.updateGenerationJob, {
					jobId: args.jobId,
					...update
				});
			} catch {
				// Progress updates are best-effort; final worker result writes are authoritative.
			}
		};
		const generateStructuredObject = async <T>(
			stage: string,
			agent: QuestionStudioAgent,
			threadId: string,
			userId: string,
			model: QuestionStudioModel,
			options: GenerateObjectOptions
		): Promise<T> => {
			if (!shouldUseStructuredOutput(model)) {
				const textResult = await agent.generateText(
					ctx,
					{ threadId, userId },
					{
						prompt: [
							options.prompt,
							'Return one valid JSON object only. Do not wrap it in markdown fences.',
							'The root object must match this shape: {"questions":[{"type":"multiple_choice","stem":"...","options":["..."],"correctAnswers":["..."],"rationale":"...","reasoningOrder":"first|second|third","topicId":"...","topicTitle":"...","sourcePageNumbers":[1],"sourceCitations":[{"citationId":"c1","pageNumber":1,"noteFile":"...","chunkTitle":"...","chunkIndex":0}]}]}.'
						].join('\n\n'),
						maxOutputTokens: options.callSettings?.maxOutputTokens,
						temperature: options.callSettings?.temperature,
						maxRetries: options.callSettings?.maxRetries
					} as unknown as Parameters<QuestionStudioAgent['generateText']>[2],
					{
						storageOptions: { saveMessages: 'promptAndOutput' }
					}
				);
				const parsed = parseModelJsonText(textResult.text);
				const normalized = normalizeCandidateDraftPayload(parsed);
				const validated = safeParseSchema(options.schema, normalized);
				if (validated) {
					await report({
						statusText: `${stage} parsed text output locally.`,
						eventLabel: `${stage} parsed`,
						eventDetail: `${model} returned text JSON that passed local schema validation.`
					});
					return { object: validated, usage: textResult.usage } as T;
				}
				const detail = `${stage} text output did not match the expected JSON shape. Returned: ${cleanPlainText(textResult.text, 320)}`;
				await report({
					statusText: `${stage} returned invalid text JSON.`,
					eventLabel: `${stage} failed`,
					eventDetail: detail
				});
				throw new Error(detail);
			}
			try {
				return (await agent.generateObject(
					ctx,
					{ threadId, userId },
					options as unknown as Parameters<QuestionStudioAgent['generateObject']>[2],
					{
						storageOptions: { saveMessages: 'promptAndOutput' }
					}
				)) as T;
			} catch (error) {
				if (!NoObjectGeneratedError.isInstance(error)) throw error;
				const recovered = recoverStructuredObjectFromError(error, options.schema);
				if (recovered) {
					await report({
						statusText: `${stage} recovered malformed structured output locally.`,
						eventLabel: `${stage} repaired`,
						eventDetail:
							'The model returned usable JSON with minor shape noise, so no model retry was needed.'
					});
					return recovered as T;
				}
				const detail = formatStructuredOutputError(stage, error);
				await report({
					statusText: `${stage} returned malformed output.`,
					eventLabel: `${stage} failed`,
					eventDetail: detail
				});
				throw new Error(detail);
			}
		};

		const task = args.task as LiveWorkerTask;
		try {
			assertOpenRouterKey();
			const label = taskLabel(task);
			const allocations = task.topicAllocations;
			const assignedTopics = taskTopics(task);
			const pageNumbers = taskPageNumbers(task);
			const context = (await ctx.runQuery(internal.questionStudio.getGenerationContext, {
				clerkUserId: args.clerkUserId,
				documentId: args.documentId,
				moduleId: args.moduleId
			})) as GenerationContext;
			const allPages = await loadMarkdownPages(context.document);
			const selectedPages = selectPages(allPages, args.startPage, args.endPage);
			const fallbackTopicText = pagesToPromptText(
				pagesForTask(selectedPages, task),
				MAX_WORKER_SOURCE_CHARS
			);
			const focusInstruction = buildFocusInstruction(args.focusNotes);
			const noteFile = cleanPlainText(
				String(context.document.metadata?.originalFileName ?? context.document.title),
				260
			);
			const retrievedCitations: SourceCitation[] = [];
			const intelligenceTools = createSourceIntelligenceTools({
				ctx,
				documentId: args.documentId,
				documentTitle: context.document.title,
				noteFile,
				selectedPages,
				topics: assignedTopics,
				existingQuestions: context.existingQuestions
			});
			let preparedBatchContext: Record<string, unknown> | null = null;
			let didPrepareBatch = false;
			const sourceTools = {
				prepareQuestionBatch: createTool({
					description:
						'Load the complete bounded work order for this worker: up to three slots, evidence, citations, and likely duplicate stems. Call this once before drafting.',
					inputSchema: z.object({}),
					execute: async () => {
						if (!preparedBatchContext) throw new Error('Question batch is not prepared yet');
						didPrepareBatch = true;
						return preparedBatchContext;
					}
				}),
				getObjectiveCandidates: createTool({
					description:
						'Return the bounded learning-objective choices for this worker’s assigned topics. Use only when a prepared slot needs a different objective.',
					inputSchema: z.object({}),
					execute: async () => ({
						topics: assignedTopics.map((topic) => ({
							topicId: topic.topicId,
							title: topic.title,
							objectives: topic.learningObjectives.slice(0, 6).map((objective, index) => ({
								objectiveId: `${topic.topicId}:o${index + 1}`,
								objective
							}))
						}))
					})
				}),
				findSimilarQuestions: createTool({
					description:
						'Find the five existing module questions most likely to overlap each proposed objective or stem. Accepts up to three searches.',
					inputSchema: z.object({
						candidates: z
							.array(z.object({ key: z.string().min(1).max(80), text: z.string().min(3).max(600) }))
							.min(1)
							.max(3)
					}),
					execute: async (_toolCtx, { candidates }) =>
						await ctx.runQuery(internal.questionStudio.findLikelyDuplicateQuestions, {
							moduleId: args.moduleId,
							queries: candidates
						})
				}),
				searchSourceChunks: intelligenceTools.searchSourceChunks,
				getSourcePages: intelligenceTools.getSourcePages
			};
			const workerAgent = createQuestionStudioAgent(sourceTools, args.model);
			const workerThread = await workerAgent.createThread(ctx, {
				userId: args.clerkUserId,
				title: `Draft ${task.plannedCount}: ${label}`
			});
			await report({
				threadId: workerThread.threadId,
				statusText: `Worker ${args.workerIndex + 1}/${args.workerTotal}: ${label}`,
				eventLabel: 'Worker started',
				eventDetail: `${task.plannedCount} ${task.reasoningOrder}-order candidate${task.plannedCount === 1 ? '' : 's'} across ${allocations.length} topic${allocations.length === 1 ? '' : 's'} from pages ${pageNumbers.join(', ')}.`
			});
			const retrievalQuery = task.blueprints?.length
				? [
						`${task.reasoningOrder}-order question batch`,
						task.blueprints.map((blueprint) => blueprint.targetObjective).join('; '),
						task.topicAllocations.map((allocation) => allocation.topic.title).join('; ')
					].join('\n')
				: defaultWorkerRetrievalQuery(task);
			await report({
				statusText: `Searching source for ${label}.`,
				eventLabel: 'Source search',
				eventDetail: retrievalQuery
			});
			await report({
				statusText: `Retrieving RAG context for ${label}.`,
				eventLabel: 'RAG query',
				eventDetail: retrievalQuery
			});
			const search = await documentRag.search(ctx, {
				namespace: documentNamespace(String(args.documentId)),
				query: retrievalQuery,
				limit: 6,
				chunkContext: { before: 1, after: 1 },
				searchType: 'hybrid'
			});
			const citations = citationsFromSearch(search, {
				noteFile,
				title: context.document.title
			});
			for (const citation of citations) {
				if (retrievedCitations.some((item) => citationKey(item) === citationKey(citation))) {
					continue;
				}
				retrievedCitations.push({
					...citation,
					citationId: `c${retrievedCitations.length + 1}`
				});
			}
			const retrievedText = cleanPlainText(search.text, MAX_WORKER_RAG_CHARS);
			await report({
				statusText: `Retrieved ${search.results.length} source chunk groups for ${label}.`,
				eventLabel: 'RAG retrieved',
				eventDetail: retrievedText
					? cleanPlainText(retrievedText, 700)
					: 'No RAG chunks matched; using extracted page fallback.'
			});
			const sourceBrief = cleanPlainText(
				retrievedText || `Fallback extracted page text:\n${fallbackTopicText}`,
				MAX_WORKER_RESEARCH_CHARS
			);
			await report({
				statusText: `Source context ready for ${label}.`,
				eventLabel: 'Source note',
				eventDetail: sourceBrief
			});
			const fallbackCitation: SourceCitation = {
				citationId: 'fallback-p1',
				pageNumber: pageNumbers[0],
				noteFile,
				chunkTitle: 'Extracted page fallback',
				chunkIndex: 0
			};
			const availableCitations =
				retrievedCitations.length > 0 ? retrievedCitations.slice(0, 8) : [fallbackCitation];

			const currentJob = (await ctx.runQuery(internal.questionStudio.getGenerationJobInternal, {
				jobId: args.jobId
			})) as GenerationJobSnapshot | null;
			const slotContracts = (task.blueprints ?? []).map((blueprint) => ({
				slotId: blueprint.slotId,
				template: blueprint.cognitiveTemplate,
				objective: blueprint.targetObjective,
				distractors: blueprint.distractorStrategy
			}));
			const compactTopics = allocations.map(({ topic, plannedCount }) => ({
				topicId: topic.topicId,
				title: topic.title,
				plannedCount,
				pages: topic.pageNumbers,
				objectives: topic.learningObjectives.slice(0, 4),
				keyTerms: topic.keyTerms.slice(0, 8)
			}));
			const likelyDuplicates = await ctx.runQuery(
				internal.questionStudio.findLikelyDuplicateQuestions,
				{
					moduleId: args.moduleId,
					queries: slotContracts.map((slot) => ({
						key: slot.slotId,
						text: `${slot.objective} ${slot.template} ${compactTopics.map((topic) => topic.title).join(' ')}`
					}))
				}
			);
			preparedBatchContext = {
				taskId: task.taskId,
				reasoningOrder: task.reasoningOrder,
				focus: focusInstruction,
				slots: slotContracts.map((slot) => ({
					...slot,
					templateContract: cognitiveTemplateCard(slot.template).split('\n').slice(0, 4).join(' ')
				})),
				topics: compactTopics,
				evidence: sourceBrief,
				citations: availableCitations,
				likelyDuplicates,
				alreadyDraftedStems: (currentJob?.candidates ?? []).map((candidate) => candidate.stem)
			};
			await workerAgent.generateText(
				ctx,
				{ threadId: workerThread.threadId, userId: args.clerkUserId },
				{
					prompt: `Load work order ${task.taskId}.`,
					toolChoice: { type: 'tool', toolName: 'prepareQuestionBatch' },
					stopWhen: stepCountIs(1),
					maxOutputTokens: 120,
					temperature: 0,
					maxRetries: 0
				},
				{ storageOptions: { saveMessages: 'promptAndOutput' } }
			);
			if (!didPrepareBatch) throw new Error('Draft worker could not prepare its work order');

			const result = await generateStructuredObject<{
				object: z.infer<typeof workerCandidateSchema>;
				usage?: unknown;
			}>('Drafting', workerAgent, workerThread.threadId, args.clerkUserId, args.model, {
				schemaName: 'QuestionCandidateDrafts',
				schemaDescription:
					'Multiple-choice question candidates grounded only in the provided notes.',
				schema: workerCandidateSchema,
				providerOptions: questionStudioProviderOptions(args.model),
				callSettings: {
					maxOutputTokens: WORKER_DRAFT_MAX_OUTPUT_TOKENS,
					temperature: 0.2,
					maxRetries: 0
				},
				prompt: [
					`Create exactly ${task.plannedCount} multiple-choice questions for work order ${task.taskId}.`,
					'Follow the prepared slots, evidence, citations, and duplicate-avoidance data from the previous turn.',
					'Use searchSourceChunks or getSourcePages only when the prepared evidence is insufficient.',
					'Return one question per slot in slot order using the structured schema. Do not mention source provenance in student-facing text.'
				]
					.filter(Boolean)
					.join('\n\n'),
				experimental_repairText: createCandidateDraftRepairText(workerCandidateSchema)
			});
			const postDraftMatches = await ctx.runQuery(
				internal.questionStudio.findLikelyDuplicateQuestions,
				{
					moduleId: args.moduleId,
					queries: result.object.questions.slice(0, task.plannedCount).map((question, index) => ({
						key: `draft:${index}`,
						text: `${question.stem} ${question.correctAnswers.join(' ')}`
					}))
				}
			);
			const postDraftMatchesByIndex = new Map(
				postDraftMatches.map((entry) => [Number(entry.key.split(':')[1]), entry.matches])
			);

			const accepted: CandidateQuestion[] = [];
			const acceptedSlotIndexes = new Set<number>();
			const duplicateConflictsBySlot = new Map<number, string[]>();
			for (const [rawIndex, raw] of result.object.questions.entries()) {
				const blueprint = task.blueprints?.[rawIndex];
				const topic =
					assignedTopics.find((item) => item.topicId === blueprint?.topicId) ?? assignedTopics[0];
				const enriched = {
					...raw,
					type: 'multiple_choice' as const,
					reasoningOrder: task.reasoningOrder,
					topicId: topic?.topicId ?? blueprint?.topicId ?? 'topic-1',
					topicTitle: topic?.title ?? 'Assigned topic',
					sourcePageNumbers: raw.sourceCitations.map((citation) => citation.pageNumber),
					duplicateRisk: 'low' as const,
					similarQuestionIds: []
				};
				const coerced = coerceGeneratedCandidate(
					enriched,
					assignedTopics,
					args.documentId,
					workerThread.threadId,
					args.model,
					availableCitations
				);
				if (!coerced) continue;
				if (candidateHasProvenanceLanguage(coerced)) continue;
				if (blueprint) coerced.cognitiveTemplate = blueprint.cognitiveTemplate;
				const likelyIds = new Set(
					(postDraftMatchesByIndex.get(rawIndex) ?? []).map((match) => match.questionId)
				);
				const duplicatePool = context.existingQuestions.filter((question) =>
					likelyIds.has(question._id)
				);
				const duplicate = scoreDuplicateRisk(coerced, duplicatePool, accepted);
				coerced.duplicateRisk = duplicate.risk;
				if (duplicate.risk !== 'low') coerced.duplicateRisk = duplicate.risk;
				coerced.similarQuestionIds = duplicate.similarQuestionIds;
				if (coerced.duplicateRisk === 'high') {
					duplicateConflictsBySlot.set(
						rawIndex,
						(postDraftMatchesByIndex.get(rawIndex) ?? []).map((match) => match.stem)
					);
					continue;
				}
				accepted.push(coerced);
				acceptedSlotIndexes.add(rawIndex);
			}

			if (accepted.length < task.plannedCount) {
				const missingSlots = (task.blueprints ?? [])
					.map((blueprint, index) => ({ blueprint, index }))
					.filter(({ index }) => !acceptedSlotIndexes.has(index));
				const missingCount = task.plannedCount - accepted.length;
				await report({
					statusText: `${label} is completing ${missingCount} missing question${missingCount === 1 ? '' : 's'} in the same thread.`,
					eventLabel: 'Worker continuation',
					eventDetail:
						'Reusing the worker thread and prior evidence instead of starting another agent.'
				});
				try {
					const continuation = await generateStructuredObject<{
						object: z.infer<typeof workerCandidateSchema>;
						usage?: unknown;
					}>('Continuation', workerAgent, workerThread.threadId, args.clerkUserId, args.model, {
						schemaName: 'QuestionCandidateReplacements',
						schemaDescription: 'Replacement questions for missing slots in the current batch.',
						schema: workerCandidateSchema,
						providerOptions: questionStudioProviderOptions(args.model),
						callSettings: {
							maxOutputTokens: WORKER_DRAFT_MAX_OUTPUT_TOKENS,
							temperature: 0.2,
							maxRetries: 0
						},
						prompt: [
							`Continue the same work order. Return exactly ${missingCount} replacement question${missingCount === 1 ? '' : 's'} for these missing slots, in order:`,
							JSON.stringify(
								missingSlots.map(({ blueprint }) => blueprint),
								null,
								2
							),
							`Do not repeat these accepted stems:\n${accepted.map((candidate) => candidate.stem).join('\n')}`,
							`Avoid these close existing stems:\n${missingSlots
								.flatMap(({ index }) => duplicateConflictsBySlot.get(index) ?? [])
								.join('\n')}`,
							'Reuse the evidence and citations already in this thread. Call a source tool only if a missing slot lacks support. Return only the structured object.'
						].join('\n\n'),
						experimental_repairText: createCandidateDraftRepairText(workerCandidateSchema)
					});
					for (const [replacementIndex, raw] of continuation.object.questions.entries()) {
						if (accepted.length >= task.plannedCount) break;
						const missing = missingSlots[replacementIndex];
						const topic =
							assignedTopics.find((item) => item.topicId === missing?.blueprint.topicId) ??
							assignedTopics[0];
						const enriched = {
							...raw,
							type: 'multiple_choice' as const,
							reasoningOrder: task.reasoningOrder,
							topicId: topic?.topicId ?? missing?.blueprint.topicId ?? 'topic-1',
							topicTitle: topic?.title ?? 'Assigned topic',
							sourcePageNumbers: raw.sourceCitations.map((citation) => citation.pageNumber),
							duplicateRisk: 'low' as const,
							similarQuestionIds: []
						};
						const coerced = coerceGeneratedCandidate(
							enriched,
							assignedTopics,
							args.documentId,
							workerThread.threadId,
							args.model,
							availableCitations
						);
						if (!coerced || candidateHasProvenanceLanguage(coerced)) continue;
						if (missing?.blueprint) {
							coerced.cognitiveTemplate = missing.blueprint.cognitiveTemplate;
						}
						const duplicate = scoreDuplicateRisk(coerced, context.existingQuestions, accepted);
						coerced.duplicateRisk = duplicate.risk;
						coerced.similarQuestionIds = duplicate.similarQuestionIds;
						if (coerced.duplicateRisk === 'high') continue;
						accepted.push(coerced);
					}
				} catch {
					// Preserve valid first-turn questions if the optional continuation fails.
				}
			}

			await ctx.runMutation(internal.questionStudio.appendGenerationWorkerResult, {
				jobId: args.jobId,
				workerTotal: args.workerTotal,
				workerIndex: args.workerIndex,
				threadId: workerThread.threadId,
				candidates: accepted,
				rawReturnedCount: result.object.questions.length,
				eventLabel: 'Worker complete',
				eventDetail: `${accepted.length} candidate${accepted.length === 1 ? '' : 's'} from ${label} passed local checks.`
			});

			await ctx.scheduler.runAfter(1_500, internal.questionStudio.reviewGenerationJob, {
				jobId: args.jobId,
				documentId: args.documentId,
				moduleId: args.moduleId,
				clerkUserId: args.clerkUserId,
				workerTotal: args.workerTotal,
				focusNotes: args.focusNotes,
				startPage: args.startPage,
				endPage: args.endPage
			});
		} catch (error) {
			await ctx.runMutation(internal.questionStudio.appendGenerationWorkerResult, {
				jobId: args.jobId,
				workerTotal: args.workerTotal,
				workerIndex: args.workerIndex,
				candidates: [],
				rawReturnedCount: 0,
				eventLabel: 'Worker failed',
				eventDetail: error instanceof Error ? error.message : 'Unknown worker error'
			});
			await ctx.scheduler.runAfter(1_500, internal.questionStudio.reviewGenerationJob, {
				jobId: args.jobId,
				documentId: args.documentId,
				moduleId: args.moduleId,
				clerkUserId: args.clerkUserId,
				workerTotal: args.workerTotal,
				focusNotes: args.focusNotes,
				startPage: args.startPage,
				endPage: args.endPage
			});
		}
	}
});

export const reviewGenerationJob = internalAction({
	args: {
		jobId: v.id('questionStudioJobs'),
		documentId: v.id('contentLib'),
		moduleId: v.id('module'),
		clerkUserId: v.string(),
		workerTotal: v.number(),
		focusNotes: v.optional(v.string()),
		startPage: v.optional(v.number()),
		endPage: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const report = async (update: Record<string, unknown>) => {
			await ctx.runMutation(internal.questionStudio.updateGenerationJob, {
				jobId: args.jobId,
				...update
			});
		};
		try {
			const job = (await ctx.runQuery(internal.questionStudio.getGenerationJobInternal, {
				jobId: args.jobId
			})) as GenerationJobSnapshot | null;
			if (!job || job.status === 'ready' || job.status === 'failed') return;
			const completedWorkers = (job.completedWorkerCount ?? 0) + (job.failedWorkerCount ?? 0);
			const requestedCount = Math.floor(job.requestedCount || MAX_GENERATED_QUESTIONS);
			const enoughCandidates = (job.candidateCount ?? 0) >= requestedCount;
			if (!enoughCandidates && completedWorkers < args.workerTotal) return;
			const candidates = job.candidates.slice(0, job.requestedCount);
			if (candidates.length === 0) {
				await report({
					status: 'failed',
					statusText: 'No candidates passed worker checks.',
					eventLabel: 'Failed',
					eventDetail: 'All workers finished, but no candidate passed local quality checks.',
					completed: true
				});
				return;
			}

			await report({
				statusText: 'Running local candidate checks.',
				eventLabel: 'Reviewing',
				eventDetail: `${candidates.length} candidates are ready for local source, answer, and provenance checks.`,
				...(job.loop ? { loop: { pass: 'gate' as const } } : {})
			});
			const reviews: CandidateReview[] = candidates.map((candidate, index) => {
				const gate = mechanicalCandidateGate(candidate);
				const reasons = gate.pass
					? ['Passed local schema, citation, answer, duplicate, and provenance checks.']
					: gate.reasons;
				return {
					candidateIndex: index,
					verdict: gate.pass ? 'accept' : 'reject',
					reasons: reasons.map((reason) => cleanPlainText(reason, MAX_REVIEW_REASON_CHARS)),
					sourceSupport: gate.sourceSupport,
					answerQuality: gate.answerQuality
				};
			});
			const reviewByIndex = new Map(reviews.map((review) => [review.candidateIndex, review]));
			const finalCandidates: CandidateQuestion[] = [];
			for (const [index, candidate] of candidates.entries()) {
				const review = reviewByIndex.get(index);
				if (!review || review.verdict === 'reject') continue;
				if (scoreDuplicateRisk(candidate, [], finalCandidates).risk === 'high') {
					review.verdict = 'reject';
					review.reasons = ['Rejected as a near-duplicate of another candidate in this run.'];
					continue;
				}
				finalCandidates.push(candidate);
				if (finalCandidates.length >= job.requestedCount) break;
			}
			await report({
				statusText: 'Review complete.',
				eventLabel: 'Review complete',
				eventDetail: `${reviews.filter((review) => review.verdict === 'reject').length} rejected, ${reviews.filter((review) => review.verdict === 'revise').length} revised.`,
				reviews
			});
			await report({
				status: 'ready',
				statusText:
					finalCandidates.length >= job.requestedCount
						? `Ready: ${finalCandidates.length} candidates to review.`
						: `Partial ready: ${finalCandidates.length}/${job.requestedCount} candidates to review.`,
				eventLabel: 'Ready',
				eventDetail:
					finalCandidates.length >= job.requestedCount
						? 'Draft workers and local review finished.'
						: 'Draft workers finished with partial usable candidates.',
				candidates: finalCandidates,
				...(job.loop
					? {
							loop: {
								pass: 'done' as const,
								gatePassedCount: finalCandidates.length,
								gateRejectedCount: reviews.length - finalCandidates.length,
								selectedCount: finalCandidates.length
							}
						}
					: {}),
				completed: true
			});
		} catch (error) {
			await report({
				status: 'failed',
				statusText: 'Review failed.',
				eventLabel: 'Failed',
				eventDetail: error instanceof Error ? error.message : 'Unknown review error',
				error: error instanceof Error ? error.message : 'Unknown review error',
				completed: true
			});
		}
	}
});

export const mapDocumentTopicMap = action({
	args: {
		documentId: v.id('contentLib'),
		force: v.optional(v.boolean()),
		operatorToken: v.optional(v.string())
	},
	handler: async (ctx, args): Promise<MapDocumentTopicMapResult> => {
		const identity = await ctx.auth.getUserIdentity();
		let context: DocumentMappingContext;
		if (identity) {
			context = (await ctx.runQuery(internal.questionStudio.getDocumentMappingContext, {
				clerkUserId: identity.subject,
				documentId: args.documentId
			})) as DocumentMappingContext;
		} else {
			assertOperatorToken(args.operatorToken);
			const document = (await ctx.runQuery(
				internal.ragKnowledgeInternal.getDocumentForRagIngestion,
				{
					documentId: args.documentId
				}
			)) as Doc<'contentLib'> | null;
			if (!document || document.deletedAt) throw new Error('Document not found');
			const ingestionStatus = document.metadata?.ingestionStatus;
			if (
				document.metadata?.storageProvider !== 'r2' ||
				(ingestionStatus !== 'indexed' && ingestionStatus !== 'mapped') ||
				!document.metadata?.ragEntryId
			) {
				throw new Error('Select an indexed or mapped R2 document before mapping topics');
			}
			context = { document };
		}
		const pages = selectPages(await loadMarkdownPages(context.document));
		const pageRange = {
			startPage: pages[0].pageNumber,
			endPage: pages[pages.length - 1].pageNumber
		};
		const savedMap = (await ctx.runQuery(internal.questionStudio.getSavedTopicMapForRange, {
			documentId: args.documentId,
			startPage: pageRange.startPage,
			endPage: pageRange.endPage
		})) as Doc<'questionStudioTopicMaps'> | null;
		const savedMapIsFresh = Boolean(
			savedMap &&
			(savedMap.sourceIndexedAt
				? savedMap.sourceIndexedAt === context.document.metadata?.indexedAt
				: savedMap.sourceDocumentUpdatedAt === context.document.updatedAt)
		);
		if (savedMap && savedMapIsFresh && !args.force) {
			if (context.document.metadata?.ingestionStatus !== 'mapped') {
				await ctx.runMutation(internal.ragKnowledgeInternal.markDocumentMapped, {
					documentId: args.documentId,
					mappedAt: savedMap.updatedAt
				});
			}
			return {
				threadId: savedMap.agentThreadId ?? '',
				model: savedMap.model,
				documentId: args.documentId,
				pageRange,
				topics: savedMap.topics as TopicMapItem[],
				topicMapId: savedMap._id,
				cached: true,
				updatedAt: savedMap.updatedAt,
				usage: null
			};
		}

		assertOpenRouterKey();
		await questionStudioRateLimiter.limit(ctx, 'questionStudioGenerationStart', {
			key: identity?.subject ?? `operator:${args.documentId}`,
			throws: true
		});
		await questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalGenerationStart', {
			throws: true
		});

		const sourceText = pagesToPromptText(pages, MAX_TOPIC_SOURCE_CHARS);
		const noteFile = cleanPlainText(
			String(context.document.metadata?.originalFileName ?? context.document.title),
			260
		);
		const sourceTools = createSourceIntelligenceTools({
			ctx,
			documentId: args.documentId,
			documentTitle: context.document.title,
			noteFile,
			selectedPages: pages
		});

		const tools = {
			...sourceTools,
			getAllowedSourceText: createTool({
				description:
					'Return the selected source notes. This tool has no access outside the selected document and page range.',
				inputSchema: z.object({}),
				execute: async () => ({
					documentTitle: context.document.title,
					pageNumbers: pages.map((page) => page.pageNumber),
					text: pagesToPromptText(pages, MAX_SOURCE_CHARS)
				})
			})
		};
		const agent = createQuestionStudioAgent(tools, QUESTION_STUDIO_FLASH_MODEL);
		const { threadId } = await agent.createThread(ctx, {
			userId: identity?.subject ?? `operator:${args.documentId}`,
			title: `Map notes: ${context.document.title}`
		});

		const result = await agent.generateObject(
			ctx,
			{ threadId, userId: identity?.subject ?? `operator:${args.documentId}` },
			{
				schema: topicMapSchema,
				providerOptions: QUESTION_STUDIO_PROVIDER_OPTIONS,
				prompt: [
					'Map these notes into teachable topics for question generation.',
					'Return coverage-focused topics. Each topic should be narrow enough to support 1-10 questions.',
					'Use page numbers from the source only.',
					reasoningOrderPrompt(),
					'No destination module has been selected, so make this a document-level topic map.',
					`Selected pages: ${pages.map((page) => page.pageNumber).join(', ')}`,
					'Source excerpt:',
					sourceText
				].join('\n\n')
			},
			{ storageOptions: { saveMessages: 'promptAndOutput' } }
		);

		const topics = result.object.topics.map((topic, index) => clampTopic(topic, pages, index));
		const topicMapId = (await ctx.runMutation(internal.questionStudio.saveTopicMapForRange, {
			documentId: args.documentId,
			cohortId: context.document.cohortId,
			startPage: pageRange.startPage,
			endPage: pageRange.endPage,
			pageCount: pages.length,
			topics,
			model: QUESTION_STUDIO_FLASH_MODEL,
			agentThreadId: threadId,
			sourceDocumentUpdatedAt: context.document.updatedAt,
			sourceIndexedAt: context.document.metadata?.indexedAt,
			createdByUserId: context.user?._id
		})) as Id<'questionStudioTopicMaps'>;
		await ctx.runMutation(internal.ragKnowledgeInternal.markDocumentMapped, {
			documentId: args.documentId,
			mappedAt: Date.now()
		});
		return {
			threadId,
			model: QUESTION_STUDIO_FLASH_MODEL,
			documentId: args.documentId,
			pageRange,
			topics,
			topicMapId,
			cached: false,
			updatedAt: Date.now(),
			usage: result.usage
		};
	}
});

// Deterministic slot planning keeps objectives and templates out of the model prompt.
function assignBlueprints(tasks: LiveWorkerTask[]) {
	let globalIndex = 0;
	for (const task of tasks) {
		const topic = task.topicAllocations[0]?.topic;
		const objectives = topic?.learningObjectives.length
			? topic.learningObjectives
			: [topic?.title ?? 'Core concept from the assigned topic'];
		task.blueprints = Array.from({ length: task.plannedCount }, (_, slotIndex) => ({
			slotId: `${task.taskId}:q${slotIndex + 1}`,
			topicId: topic?.topicId ?? 'topic-1',
			reasoningOrder: task.reasoningOrder,
			cognitiveTemplate: defaultTemplateForOrder(task.reasoningOrder, globalIndex++),
			targetObjective: cleanPlainText(objectives[slotIndex % objectives.length], 200),
			distractorStrategy: 'Use near-miss options from adjacent concepts in the same topic.'
		}));
	}
}

export const generateCandidates = action({
	args: {
		documentId: v.id('contentLib'),
		moduleId: v.id('module'),
		startPage: v.optional(v.number()),
		endPage: v.optional(v.number()),
		topics: v.array(topicInputValidator),
		counts: v.object({
			first: v.number(),
			second: v.number(),
			third: v.number()
		}),
		focusNotes: v.optional(v.string()),
		jobId: v.optional(v.id('questionStudioJobs')),
		model: v.optional(questionStudioModelValidator)
	},
	handler: async (ctx, args): Promise<QueuedGenerationResult> => {
		const report = async (update: Record<string, unknown>) => {
			if (!args.jobId) return;
			try {
				await ctx.runMutation(internal.questionStudio.updateGenerationJob, {
					jobId: args.jobId,
					...update
				});
			} catch {
				// Queuing progress is best-effort; scheduled workers own the durable result.
			}
		};
		assertOpenRouterKey();
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');
		if (!args.jobId) throw new Error('A generation job is required for live worker generation.');
		const { counts, total } = validateCounts(args.counts);
		const job = (await ctx.runQuery(internal.questionStudio.getGenerationJobInternal, {
			jobId: args.jobId
		})) as GenerationJobSnapshot | null;
		if (!job) throw new Error('Generation job not found');
		const model = normalizeQuestionStudioModel(job.model ?? args.model);
		if (args.topics.length === 0) throw new Error('Select at least one topic');
		const focusNotes = cleanPlainText(args.focusNotes ?? '', 1800);

		try {
			await report({
				status: 'running',
				statusText: 'Checking limits and destination capacity.',
				eventLabel: 'Started',
				eventDetail: `${total} candidates requested with ${model}.`
			});

			await questionStudioRateLimiter.limit(ctx, 'questionStudioGenerationStart', {
				key: identity.subject,
				throws: true
			});
			await questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalGenerationStart', {
				throws: true
			});

			const context = (await ctx.runQuery(internal.questionStudio.getGenerationContext, {
				clerkUserId: identity.subject,
				documentId: args.documentId,
				moduleId: args.moduleId
			})) as GenerationContext;
			if (
				(context.module.questionCount ?? context.existingQuestions.length) + total >
				MAX_QUESTIONS_PER_MODULE
			) {
				throw new Error(
					`Module limit reached (${MAX_QUESTIONS_PER_MODULE} questions). Please split this module for better learning retention.`
				);
			}

			await report({
				statusText: 'Loading extracted source pages and selected topics.',
				eventLabel: 'Loaded context',
				eventDetail: `${context.existingQuestions.length} existing module questions available for duplicate checks.`
			});

			const allPages = await loadMarkdownPages(context.document);
			const selectedPages = selectPages(allPages, args.startPage, args.endPage);
			const selectedPageSet = new Set(selectedPages.map((page) => page.pageNumber));
			const topics = args.topics.map((topic, index) =>
				clampTopic(
					{
						...topic,
						pageNumbers: topic.pageNumbers.filter((page) => selectedPageSet.has(page))
					},
					selectedPages,
					index
				)
			);

			await report({
				statusText: 'Preparing source-grounded context.',
				eventLabel: 'Prepared context',
				eventDetail: `${topics.length} topics and ${selectedPages.length} pages are in scope.`
			});

			const { plan, tasks } = buildLiveGenerationWork(topics, counts);
			assignBlueprints(tasks);
			tasks.forEach((task, index) => {
				plan.workerBatches[index].cognitiveTemplate = task.blueprints
					?.map((blueprint) => blueprint.cognitiveTemplate)
					.join(', ');
				plan.workerBatches[index].targetObjective = task.blueprints
					?.map((blueprint) => blueprint.targetObjective)
					.join('; ');
			});
			plan.coverageNotes.push(
				`Assigned ${total} deterministic slot contracts across ${tasks.length} workers.`
			);
			await report({
				statusText: 'Work orders ready; starting draft workers.',
				eventLabel: 'Work orders ready',
				eventDetail: `${tasks.length} worker${tasks.length === 1 ? '' : 's'} queued with at most ${MAX_QUESTIONS_PER_WORKER} questions each.`,
				plan,
				loop: { enabled: true, pass: 'draft', blueprintCount: total, blueprintSource: 'fallback' }
			});

			for (const [workerIndex, task] of tasks.entries()) {
				await ctx.scheduler.runAfter(
					500 + workerIndex * 100,
					internal.questionStudio.generateCandidateWorker,
					{
						jobId: args.jobId,
						documentId: args.documentId,
						moduleId: args.moduleId,
						clerkUserId: identity.subject,
						task,
						workerIndex,
						workerTotal: tasks.length,
						model,
						focusNotes,
						startPage: args.startPage,
						endPage: args.endPage
					}
				);
			}
			await report({
				statusText: `${tasks.length} workers launched. Candidates will appear as they finish.`,
				eventLabel: 'Workers launched',
				eventDetail:
					'Each worker retrieves source context with RAG, then drafts one assigned question.'
			});

			return {
				requestedCount: total,
				workerCount: tasks.length,
				queued: true
			};
		} catch (error) {
			await report({
				status: 'failed',
				statusText: 'Generation failed.',
				eventLabel: 'Failed',
				eventDetail: error instanceof Error ? error.message : 'Unknown error',
				error: error instanceof Error ? error.message : 'Unknown error',
				completed: true
			});
			throw error;
		}
	}
});

export const saveSelectedCandidates = mutation({
	args: {
		moduleId: v.id('module'),
		documentId: v.id('contentLib'),
		candidates: v.array(candidateValidator),
		status: v.optional(v.union(v.literal('draft'), v.literal('published'), v.literal('archived')))
	},
	handler: async (ctx, args) => {
		if (args.candidates.length === 0) return { insertedIds: [], insertedCount: 0 };
		if (args.candidates.length > MAX_GENERATED_QUESTIONS) {
			throw new Error(`Save at most ${MAX_GENERATED_QUESTIONS} questions at a time`);
		}
		const { identity, module, classDoc } = await assertSaveAccess(ctx, {
			moduleId: args.moduleId,
			documentId: args.documentId
		});
		if ((module.questionCount ?? 0) + args.candidates.length > MAX_QUESTIONS_PER_MODULE) {
			throw new Error(
				`Module limit reached (${MAX_QUESTIONS_PER_MODULE} questions). Please split this module for better learning retention.`
			);
		}

		const existing = await ctx.db
			.query('question')
			.withIndex('by_moduleId_order', (q) => q.eq('moduleId', args.moduleId))
			.collect();
		const existingSummaries: ExistingQuestionSummary[] = existing.map((question) => ({
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
			reasoningOrder: question.metadata.generation?.reasoningOrder
		}));
		let nextOrder =
			existing.length > 0 ? Math.max(...existing.map((question) => question.order)) + 1 : 0;
		const status = args.status ?? 'draft';
		const insertedIds: Id<'question'>[] = [];

		for (const candidate of args.candidates) {
			if (candidate.metadata.sourceDocumentId !== args.documentId) {
				throw new Error('Candidate source document does not match this save request');
			}
			const duplicate = scoreDuplicateRisk(candidate, existingSummaries);
			if (duplicate.risk === 'high') {
				throw new Error('A selected question is too similar to an existing module question');
			}
			const insert = candidateToQuestionInsert(candidate, args.moduleId, nextOrder);
			const id = await ctx.db.insert('question', {
				...insert,
				status,
				searchText: insert.searchText.replace(' draft ', ` ${status} `)
			});
			insertedIds.push(id);
			existingSummaries.push({
				_id: id,
				stem: insert.stem,
				options: insert.options.map((option) => `${option.id}:${option.text}`),
				correctAnswers: insert.correctAnswers,
				rationale: insert.rationale,
				status,
				searchText: insert.searchText,
				sourceDocumentId: insert.metadata.generation.sourceDocumentId,
				sourcePageNumbers: insert.metadata.generation.sourcePageNumbers,
				sourceCitations: insert.metadata.generation.sourceCitations,
				topicTitle: insert.metadata.generation.topicTitle,
				reasoningOrder: insert.metadata.generation.reasoningOrder
			});
			nextOrder++;
		}

		if (insertedIds.length > 0) {
			await ctx.db.patch(args.moduleId, {
				questionCount: Math.max(0, (module.questionCount ?? 0) + insertedIds.length)
			});
			const actor = await ctx.db
				.query('users')
				.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
				.first();
			if (actor) {
				await applyQuestionCreationDeltaAndEvaluateBadges(ctx, {
					userId: actor._id,
					classId: classDoc._id,
					questionsCreatedDelta: insertedIds.length,
					occurredAt: Date.now()
				});
			}
		}

		return { insertedIds, insertedCount: insertedIds.length };
	}
});
