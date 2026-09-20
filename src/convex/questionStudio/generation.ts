import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { action } from '../_generated/server';
import { planPageContext, selectedSourcePages } from './pageSelection';
import { buildLiveGenerationWork, clampTopic, validateCounts } from './planning';
import { MAPPING_INSTRUCTIONS } from './questionTypes';
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
	QUESTION_STUDIO_MAPPING_MODEL,
	QUESTION_STUDIO_MAPPING_PROVIDER_OPTIONS,
	QUESTION_STUDIO_MODEL,
	assertOpenRouterKey,
	topicInputValidator,
	topicMapSchema
} from './shared';
import { loadMarkdownPages, pagesToPromptText, selectPages } from './sourceRetrieval';
import { cleanPlainText } from './text';

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
		if (job.sourceMode !== 'pages' && args.topics.length === 0)
			throw new Error('Select at least one topic');
		await ctx.runMutation(internal.questionStudio.claimGenerationJob, {
			jobId: args.jobId,
			clerkUserId: identity.subject,
			documentId: args.documentId,
			moduleId: args.moduleId,
			total
		});
		const model = QUESTION_STUDIO_MODEL;
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
			if (job.sourceIndexedAt !== context.document.metadata?.indexedAt)
				throw new Error('Source changed during this run; start again');
			const selectedPages =
				job.sourceMode === 'pages'
					? selectedSourcePages(allPages, job.selectedPageNumbers ?? [])
					: selectPages(allPages, args.startPage, args.endPage);
			let inputTopics = args.topics;
			if (job.sourceMode === 'pages') {
				await report({
					statusText: 'Planning questions from your selected pages.',
					eventLabel: 'Selected pages',
					eventDetail: `Pages ${job.selectedPageNumbers?.join(', ')}. Only these pages are in context.`
				});
				const agent = createQuestionStudioAgent(QUESTION_STUDIO_MAPPING_MODEL);
				inputTopics = await planPageContext(
					allPages,
					job.selectedPageNumbers ?? [],
					async (group) => {
						const allowance = group.reduce((sum, page) => sum + page.text.length, 0) + 10000;
						await questionStudioRateLimiter.limit(ctx, 'questionStudioTokenUsagePerUser', {
							key: identity.subject,
							count: allowance,
							throws: true
						});
						await questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalTokenUsage', {
							count: allowance,
							throws: true
						});
						const thread = await agent.createThread(ctx, {
							userId: identity.subject,
							title: 'Plan selected pages'
						});
						const result = await agent.generateObject(
							ctx,
							{ threadId: thread.threadId, userId: identity.subject },
							{
								schema: topicMapSchema,
								providerOptions: QUESTION_STUDIO_MAPPING_PROVIDER_OPTIONS,
								maxOutputTokens: 10000,
								maxRetries: 0,
								prompt: [
									MAPPING_INSTRUCTIONS,
									pagesToPromptText(group, Number.MAX_SAFE_INTEGER)
								].join('\n\n')
							},
							{ storageOptions: { saveMessages: 'none' } }
						);
						return result.object.topics;
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
			const { plan, tasks } = buildLiveGenerationWork(topics, counts);
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
				`Assigned ${total} deterministic slot contracts across ${tasks.length} workers.`
			);
			await report({
				statusText: 'Work orders ready; starting draft workers.',
				eventLabel: 'Work orders ready',
				eventDetail: `${tasks.length} worker${tasks.length === 1 ? '' : 's'} queued with at most ${MAX_QUESTIONS_PER_WORKER} questions each.`,
				plan,
				loop: { enabled: true, pass: 'draft', blueprintCount: total, blueprintSource: 'fallback' }
			});

			if (plan.riskNotes.length)
				await report({ eventLabel: 'Coverage notes', eventDetail: plan.riskNotes.join(' ') });
			for (const [workerIndex, task] of tasks.slice(0, 2).entries()) {
				await ctx.scheduler.runAfter(
					500 + workerIndex * 100,
					internal.questionStudio.generateCandidateWorker,
					{
						jobId: args.jobId,
						documentId: args.documentId,
						moduleId: args.moduleId,
						clerkUserId: identity.subject,
						task,
						remainingTasks: tasks.filter(
							(_, index) => index > workerIndex && index % 2 === workerIndex
						),
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
					'Each worker drafts from selected page excerpts, then checks the answer and source support independently.'
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
