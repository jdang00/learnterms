import { generationDeadline } from './deadline';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { action } from '../_generated/server';
import { planPageContext, selectedSourcePages } from './pageSelection';
import {
	buildLiveGenerationWork,
	clampTopic,
	generationWorkerLanes,
	validateCounts
} from './planning';
import {
	learnPageTopics,
	pagePlanningPrompt,
	pagePlanSchema,
	pagePlanTopics
} from './pagePlanning';
import { createQuestionStudioAgent, questionStudioRateLimiter } from './runtime';
import type {
	GenerationContext,
	GenerationJobSnapshot,
	LiveWorkerTask,
	QueuedGenerationResult
} from './shared';
import {
	MAX_QUESTIONS_PER_MODULE,
	MAX_QUESTIONS_PER_WORKER,
	LEARN_QUESTIONS_PER_WORKER,
	LEARN_MODEL_BATCH_SIZE,
	MAX_CONCURRENT_LEARN_WORKERS,
	QUESTION_STUDIO_MAPPING_PROVIDER_OPTIONS,
	assertQuestionStudioKey,
	topicInputValidator
} from './shared';
import { loadMarkdownPages, selectPages } from './sourceRetrieval';
import { cleanPlainText } from './text';
import { TEXT_MODEL } from '../aiModels';

// Each slot receives one objective; only nearby reserved objectives cross worker boundaries.
function assignBlueprints(tasks: LiveWorkerTask[]) {
	const objectiveCursorByTopic = new Map<string, number>();
	for (const task of tasks) {
		const slotTopics = task.topicAllocations.flatMap(({ topic, plannedCount }) =>
			Array.from({ length: plannedCount }, () => topic)
		);
		task.blueprints = slotTopics.map((topic, slotIndex) => {
			const objectives = topic.learningObjectives.length
				? [...new Set(topic.learningObjectives.map((objective) => cleanPlainText(objective, 200)))]
				: [topic.title || 'Core concept from the assigned topic'];
			const objectiveCursor = objectiveCursorByTopic.get(topic.topicId) ?? 0;
			objectiveCursorByTopic.set(topic.topicId, objectiveCursor + 1);
			return {
				slotId: `${task.taskId}:q${slotIndex + 1}`,
				topicId: topic.topicId,
				questionType: task.questionType,
				cognitiveTemplate: 'source-objective',
				targetObjective: cleanPlainText(objectives[objectiveCursor % objectives.length], 200),
				distractorStrategy: 'Use near-miss options from adjacent concepts in the same topic.'
			};
		});
	}

	const allBlueprints = tasks.flatMap((task) => task.blueprints ?? []);
	for (const task of tasks) {
		const ownSlotIds = new Set((task.blueprints ?? []).map((blueprint) => blueprint.slotId));
		const ownTopicIds = new Set((task.blueprints ?? []).map((blueprint) => blueprint.topicId));
		task.reservedConcepts = allBlueprints
			.filter(
				(blueprint) => !ownSlotIds.has(blueprint.slotId) && ownTopicIds.has(blueprint.topicId)
			)
			.map((blueprint) => blueprint.targetObjective);
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
			learn: v.number(),
			clinical: v.number(),
			criticalThinking: v.number()
		}),
		focusNotes: v.optional(v.string()),
		jobId: v.optional(v.id('questionStudioJobs'))
	},
	returns: v.object({ requestedCount: v.number(), workerCount: v.number(), queued: v.boolean() }),
	handler: async (ctx, args): Promise<QueuedGenerationResult> => {
		const report = async (update: Record<string, unknown>) => {
			if (!args.jobId) return;
			try {
				await ctx.runMutation(internal.questionStudio.jobUpdates.updateGenerationJob, {
					jobId: args.jobId,
					...update
				});
			} catch {
				// Queuing progress is best-effort; scheduled workers own the durable result.
			}
		};
		assertQuestionStudioKey();
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');
		if (!args.jobId) throw new Error('A generation job is required for live worker generation.');
		const { counts, total } = validateCounts(args.counts);
		const job = (await ctx.runQuery(internal.questionStudio.jobs.getGenerationJobInternal, {
			jobId: args.jobId
		})) as GenerationJobSnapshot | null;
		if (!job) throw new Error('Generation job not found');
		if (job.sourceMode !== 'pages' && args.topics.length === 0)
			throw new Error('Select at least one topic');
		const claimed = await ctx.runMutation(internal.questionStudio.jobs.claimGenerationJob, {
			jobId: args.jobId,
			clerkUserId: identity.subject,
			documentId: args.documentId,
			moduleId: args.moduleId,
			total
		});
		if (!claimed) throw new Error('Generation deadline reached');
		const deadlineAt = generationDeadline(job);
		const model = TEXT_MODEL;
		const focusNotes = cleanPlainText(args.focusNotes ?? '', 1800);

		try {
			await report({
				status: 'running',
				statusText: 'Checking limits and destination capacity.',
				eventLabel: 'Started',
				eventDetail: `${total} questions requested.`
			});

			await questionStudioRateLimiter.limit(ctx, 'questionStudioGenerationStart', {
				key: identity.subject,
				throws: true
			});
			await questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalGenerationStart', {
				throws: true
			});

			const context = (await ctx.runQuery(internal.questionStudio.context.getGenerationContext, {
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
			if (job.sourceIndexedAt !== context.document.metadata?.indexedAt)
				throw new Error('Source changed during this run; start again');
			const selectedPages =
				job.sourceMode === 'pages'
					? selectedSourcePages(allPages, job.selectedPageNumbers ?? [])
					: selectPages(allPages, args.startPage, args.endPage);
			let inputTopics = args.topics;
			const directLearn =
				job.sourceMode === 'pages' &&
				counts.clinical === 0 &&
				counts.criticalThinking === 0 &&
				selectedPages.filter((page) => page.text.trim().length >= 40).length >=
					Math.ceil(counts.learn / LEARN_QUESTIONS_PER_WORKER);
			if (directLearn) {
				inputTopics = learnPageTopics(selectedPages, counts.learn);
				await report({
					eventLabel: 'Page plan',
					eventDetail: `Assigned selected pages to ${inputTopics.length} Learn groups without an AI planning call.`
				});
			} else if (job.sourceMode === 'pages') {
				await report({
					statusText: 'Planning questions from your selected pages.',
					eventLabel: 'Selected pages',
					eventDetail: `Pages ${job.selectedPageNumbers?.join(', ')}. Only these pages are in context.`
				});
				const agent = createQuestionStudioAgent(TEXT_MODEL, true);
				inputTopics = await planPageContext(
					allPages,
					job.selectedPageNumbers ?? [],
					async (group) => {
						const prompt = pagePlanningPrompt(group, counts, context.existingQuestions);
						const allowance = prompt.length + 6000;
						await ctx.runMutation(internal.questionStudio.tokenBudget.reserveGenerationTokens, {
							userId: identity.subject,
							allowance
						});
						const thread = await agent.createThread(ctx, {
							userId: identity.subject,
							title: 'Plan selected pages'
						});
						const planningStarted = Date.now();
						const result = await agent.generateObject(
							ctx,
							{ threadId: thread.threadId, userId: identity.subject },
							{
								schema: pagePlanSchema,
								abortSignal: deadlineAt
									? AbortSignal.timeout(Math.max(1, deadlineAt - Date.now() - 3000))
									: undefined,
								providerOptions: QUESTION_STUDIO_MAPPING_PROVIDER_OPTIONS,
								maxOutputTokens: 6000,
								maxRetries: 0,
								prompt
							},
							{ storageOptions: { saveMessages: 'none' } }
						);
						if (result.usage.inputTokens !== undefined && result.usage.outputTokens !== undefined) {
							await ctx.runMutation(internal.questionStudio.tokenBudget.settleGenerationTokens, {
								userId: identity.subject,
								allowance,
								actualTokens: result.usage.inputTokens + result.usage.outputTokens
							});
						}
						await ctx.runMutation(internal.questionStudio.jobUpdates.recordGenerationUsage, {
							jobId: args.jobId!,
							stage: 'plan',
							inputTokens: result.usage.inputTokens,
							outputTokens: result.usage.outputTokens,
							reasoningTokens: result.usage.outputTokenDetails?.reasoningTokens,
							cachedInputTokens: result.usage.inputTokenDetails?.cacheReadTokens,
							cacheWriteTokens: result.usage.inputTokenDetails?.cacheWriteTokens,
							latencyMs: Date.now() - planningStarted
						});
						await report({
							eventLabel: 'Page plan',
							eventDetail: `${result.object.topics.length} topic groups planned.`
						});
						return pagePlanTopics(result.object);
					}
				);
			}
			const selectedPageSet = new Set(selectedPages.map((page) => page.pageNumber));
			const topics = inputTopics
				.filter((topic) => topic.pageNumbers.some((page) => selectedPageSet.has(page)))
				.map((topic, index) =>
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

			if (!topics.length)
				throw new Error('No selected topic has evidence in the chosen page range');
			const verifiedLearn = counts.learn === total && total <= 15;
			const { plan, tasks } = buildLiveGenerationWork(topics, counts, {
				packByTopic: directLearn,
				maxPerWorker: verifiedLearn ? LEARN_MODEL_BATCH_SIZE : MAX_QUESTIONS_PER_WORKER
			});
			if (!tasks.length)
				throw new Error(plan.riskNotes.join(' ') || 'No supported questions could be assigned.');
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
				`Assigned ${tasks.reduce((sum, task) => sum + task.plannedCount, 0)} deterministic slot contracts across ${tasks.length} workers.`
			);
			await report({
				statusText: 'Work orders ready; starting draft workers.',
				eventLabel: 'Work orders ready',
				eventDetail: `${tasks.length} worker${tasks.length === 1 ? '' : 's'} queued with at most ${verifiedLearn ? LEARN_MODEL_BATCH_SIZE : MAX_QUESTIONS_PER_WORKER} questions each.`,
				plan,
				loop: { enabled: true, pass: 'draft', blueprintCount: total, blueprintSource: 'fallback' }
			});

			if (plan.riskNotes.length)
				await report({ eventLabel: 'Coverage notes', eventDetail: plan.riskNotes.join(' ') });
			for (const lane of generationWorkerLanes(
				tasks,
				directLearn ? MAX_CONCURRENT_LEARN_WORKERS : undefined
			)) {
				await ctx.scheduler.runAfter(0, internal.questionStudio.workers.generateCandidateWorker, {
					jobId: args.jobId,
					documentId: args.documentId,
					moduleId: args.moduleId,
					clerkUserId: identity.subject,
					...lane,
					workerTotal: tasks.length,
					model,
					focusNotes,
					startPage: args.startPage,
					endPage: args.endPage
				});
			}
			await report({
				statusText: `${tasks.length} workers launched. Candidates will appear as they finish.`,
				eventLabel: 'Workers launched',
				eventDetail: verifiedLearn
					? 'Each Learn worker drafts up to two questions, then independently checks and corrects them. Local source and duplicate checks follow.'
					: 'Each worker drafts from selected page excerpts, then checks the answer and source support independently.'
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
