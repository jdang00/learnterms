import { omit } from 'convex-helpers';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalAction, internalQuery } from '../_generated/server';
import { scoreDuplicateRisk } from './duplicates';
import { selectedSourcePages } from './pageSelection';
import { callQualityModel } from './provider';
import {
	HARNESS_VERSION,
	evidenceForObjective,
	runQualityBatch,
	selectDuplicateContext,
	type QualitySlot
} from './quality';
import { questionTypeLabel } from './questionTypes';
import { captureTelemetry, questionStudioRateLimiter } from './runtime';
import type { CandidateQuestion, GenerationContext } from './shared';
import {
	QUESTION_STUDIO_MODEL,
	liveWorkerTaskValidator,
	questionStudioModelValidator
} from './shared';
import { loadMarkdownPages, selectPages } from './sourceRetrieval';
import { cleanPlainText } from './text';

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
						questionType: question.metadata.generation?.questionType,
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
		remainingTasks: v.optional(v.array(liveWorkerTaskValidator)),
		workerIndex: v.number(),
		workerTotal: v.number(),
		model: questionStudioModelValidator,
		focusNotes: v.optional(v.string()),
		startPage: v.optional(v.number()),
		endPage: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const claimed = await ctx.runMutation(internal.questionStudio.claimWorker, {
			jobId: args.jobId,
			workerIndex: args.workerIndex
		});
		if (!claimed) return;
		let candidates: CandidateQuestion[] = [];
		let detail = '';
		let failed = false;
		const started = Date.now();
		try {
			const context = (await ctx.runQuery(internal.questionStudio.getGenerationContext, {
				clerkUserId: args.clerkUserId,
				documentId: args.documentId,
				moduleId: args.moduleId
			})) as GenerationContext;
			if (claimed.sourceIndexedAt !== context.document.metadata?.indexedAt)
				throw new Error('Source changed during this run; start again');
			const allPages = await loadMarkdownPages(context.document);
			const pages =
				claimed.sourceMode === 'pages'
					? selectedSourcePages(allPages, claimed.selectedPageNumbers ?? [])
					: selectPages(allPages, args.startPage, args.endPage);
			const slots: QualitySlot[] = (args.task.blueprints ?? []).map((blueprint) => {
				const topic = args.task.topicAllocations.find(
					(a) => a.topic.topicId === blueprint.topicId
				)!.topic;
				return {
					slotId: blueprint.slotId,
					topicId: topic.topicId,
					topicTitle: topic.title,
					objective: blueprint.targetObjective,
					focusPreference: args.focusNotes || undefined,
					questionType: blueprint.questionType,
					evidence: evidenceForObjective(
						pages,
						topic.pageNumbers,
						blueprint.targetObjective,
						context.document.metadata?.originalFileName ?? context.document.title
					)
				};
			});
			const result = await runQualityBatch(
				slots,
				async (request) => {
					const current = await ctx.runQuery(internal.questionStudio.getGenerationJobInternal, {
						jobId: args.jobId
					});
					if (!current || current.dismissedAt || current.status !== 'running')
						throw new Error('Generation cancelled');
					// Reserve the worst-case token allowance before spending, including failed requests.
					const allowance = request.system.length + request.prompt.length + request.maxOutputTokens;
					await questionStudioRateLimiter.limit(ctx, 'questionStudioTokenUsagePerUser', {
						key: args.clerkUserId,
						count: allowance,
						throws: true
					});
					await questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalTokenUsage', {
						count: allowance,
						throws: true
					});
					let response;
					try {
						response = await callQualityModel(request, process.env.OPENROUTER_API_KEY!);
					} catch (error) {
						await ctx.runMutation(internal.questionStudio.recordGenerationUsage, {
							jobId: args.jobId,
							stage: request.stage,
							failed: true
						});
						await captureTelemetry(ctx, {
							event: '$ai_generation',
							distinctId: args.clerkUserId,
							properties: {
								ai_trace_id: String(args.jobId),
								ai_span_id: `${args.jobId}:${args.workerIndex}:${request.stage}`,
								ai_model: QUESTION_STUDIO_MODEL,
								ai_provider: 'openrouter',
								ai_is_error: true,
								job_id: args.jobId,
								stage: request.stage,
								thinking: request.thinking,
								question_type: args.task.questionType,
								harness_version: HARNESS_VERSION,
								cost_unknown: true
							}
						});
						throw error;
					}
					await ctx.runMutation(internal.questionStudio.recordGenerationUsage, {
						jobId: args.jobId,
						stage: request.stage,
						inputTokens: response.inputTokens,
						outputTokens: response.outputTokens,
						reasoningTokens: response.reasoningTokens,
						costUsd: response.costUsd,
						latencyMs: response.latencyMs
					});
					await captureTelemetry(ctx, {
						event: '$ai_generation',
						distinctId: args.clerkUserId,
						properties: {
							ai_trace_id: String(args.jobId),
							ai_span_id: `${args.jobId}:${args.workerIndex}:${request.stage}`,
							ai_model: QUESTION_STUDIO_MODEL,
							ai_provider: 'openrouter',
							ai_input_tokens: response.inputTokens,
							ai_output_tokens: response.outputTokens,
							ai_total_cost_usd: response.costUsd ?? null,
							ai_latency: response.latencyMs / 1000,
							stage: request.stage,
							thinking: request.thinking,
							question_type: args.task.questionType,
							harness_version: HARNESS_VERSION,
							job_id: args.jobId
						}
					});
					return response;
				},
				{
					avoid: selectDuplicateContext(
						slots,
						context.existingQuestions,
						args.task.reservedConcepts
					)
				}
			);
			candidates = result.accepted.map(({ slot, draft }) => ({
				type: 'multiple_choice',
				stem: draft.stem,
				options: draft.options,
				correctAnswers: [draft.options[draft.answerIndex]],
				rationale: draft.rationale,
				questionType: slot.questionType,
				topicId: slot.topicId,
				topicTitle: slot.topicTitle,
				sourcePageNumbers: [
					...new Set(
						draft.evidence.map(
							(e) => slot.evidence.find((c) => c.citationId === e.citationId)!.pageNumber
						)
					)
				],
				sourceCitations: draft.evidence.map((e) => {
					const citation = omit(slot.evidence.find((c) => c.citationId === e.citationId)!, [
						'text'
					]);
					return { ...citation, quote: e.quote };
				}),
				duplicateRisk: 'low',
				similarQuestionIds: [],
				metadata: {
					model: QUESTION_STUDIO_MODEL,
					jobId: args.jobId,
					harnessVersion: HARNESS_VERSION,
					sourceDocumentId: args.documentId
				}
			}));
			candidates = candidates.filter(
				(c) => scoreDuplicateRisk(c, context.existingQuestions).risk !== 'high'
			);
			detail = `${candidates.length}/${slots.length} passed evidence checks and independent automated review. ${result.rejected.length} withheld. ${result.rejected
				.flatMap((r) => r.reasons)
				.join(' ')
				.slice(0, 320)}`;
		} catch (error) {
			failed = true;
			detail = error instanceof Error ? error.message : 'Generation failed';
		}
		await ctx.runMutation(internal.questionStudio.appendGenerationWorkerResult, {
			jobId: args.jobId,
			workerTotal: args.workerTotal,
			workerIndex: args.workerIndex,
			candidates,
			rawReturnedCount: candidates.length,
			eventLabel: failed ? 'Worker failed' : 'Worker complete',
			eventDetail: `${questionTypeLabel(args.task.questionType)}: ${detail}`
		});
		await captureTelemetry(ctx, {
			event: 'question_generation_worker_completed',
			distinctId: args.clerkUserId,
			properties: {
				job_id: args.jobId,
				requested_count: args.task.plannedCount,
				question_type: args.task.questionType,
				accepted_count: candidates.length,
				failed,
				latency_ms: Date.now() - started,
				harness_version: HARNESS_VERSION
			}
		});
		if (args.remainingTasks?.length) {
			const [task, ...remainingTasks] = args.remainingTasks;
			await ctx.scheduler.runAfter(0, internal.questionStudio.generateCandidateWorker, {
				...args,
				task,
				remainingTasks,
				workerIndex: args.workerIndex + 2
			});
		}
		await ctx.scheduler.runAfter(0, internal.questionStudio.reviewGenerationJob, {
			jobId: args.jobId,
			documentId: args.documentId,
			moduleId: args.moduleId,
			clerkUserId: args.clerkUserId,
			workerTotal: args.workerTotal
		});
	}
});
