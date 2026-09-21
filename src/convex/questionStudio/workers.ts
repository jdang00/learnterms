import { retryConflict } from './retry';
import { omit } from 'convex-helpers';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalAction, internalQuery } from '../_generated/server';
import { scoreDuplicateRisk } from './duplicates';
import { selectedSourcePages } from './pageSelection';
import { callQualityModel, QuestionProviderError } from './provider';
import {
	HARNESS_VERSION,
	evidenceForObjective,
	runQualityBatch,
	selectDuplicateContext,
	type QualitySlot
} from './quality';
import { questionTypeLabel } from './questionTypes';
import { captureTelemetry } from './runtime';
import type { CandidateQuestion, GenerationContext } from './shared';
import {
	QUESTION_STUDIO_MODEL,
	LEARN_DRAFTING_EFFORT,
	liveWorkerTaskValidator,
	questionStudioModelValidator
} from './shared';
import { loadMarkdownPages, selectPages } from './sourceRetrieval';
import { cleanPlainText } from './text';
import { estimateQualityInputTokens } from './tokenEstimate';

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
		workerStride: v.optional(v.number()),
		model: questionStudioModelValidator,
		focusNotes: v.optional(v.string()),
		startPage: v.optional(v.number()),
		endPage: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const claimed = await retryConflict(() =>
			ctx.runMutation(internal.questionStudio.claimWorker, {
				jobId: args.jobId,
				workerIndex: args.workerIndex
			})
		);
		if (!claimed) return;
		let candidates: CandidateQuestion[] = [];
		let detail = '';
		let failed = false;
		const started = Date.now();
		const verifiedLearn = claimed.deadlineAt !== undefined && args.task.questionType === 'learn';
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
					if (request.stage === 'repair') {
						for (const failure of request.repairFailures ?? []) {
							await ctx.runMutation(internal.questionStudio.updateGenerationJob, {
								jobId: args.jobId,
								eventLabel: 'Repair requested',
								eventDetail: `${failure.slotId}: ${failure.reasons.join(' ')}`
							});
						}
					}
					// Reserve estimated input plus the maximum output before spending.
					const estimatedInputTokens = estimateQualityInputTokens(request);
					const allowance = estimatedInputTokens + request.maxOutputTokens;
					const reservationStarted = Date.now();
					while (true) {
						const limited = await retryConflict(() =>
							ctx.runMutation(internal.questionStudio.reserveGenerationTokens, {
								userId: args.clerkUserId,
								allowance,
								waitForCapacity: true
							})
						);
						if (!limited) break;
						if (
							Date.now() - reservationStarted >= 6000 ||
							(claimed.deadlineAt && Date.now() >= claimed.deadlineAt - 2000)
						)
							throw new Error('Question token budget is busy; try again shortly.');
						await new Promise((resolve) =>
							setTimeout(resolve, Math.min(1000, Math.max(100, limited.retryAfter)))
						);
					}
					const reservationWaitMs = Date.now() - reservationStarted;
					let response;
					let providerError: unknown;
					try {
						response = await callQualityModel(
							{
								...request,
								timeoutMs: claimed.deadlineAt
									? Math.max(1, claimed.deadlineAt - Date.now() - 3000)
									: undefined,
								metadata: {
									job_id: String(args.jobId),
									worker_index: String(args.workerIndex),
									harness_version: HARNESS_VERSION,
									question_type: args.task.questionType
								}
							},
							process.env.OPENAI_API_KEY!
						);
					} catch (error) {
						if (!(error instanceof QuestionProviderError)) throw error;
						response = error.usage;
						providerError = error;
					}
					if (response.inputTokens + response.outputTokens > 0) {
						await retryConflict(() =>
							ctx.runMutation(internal.questionStudio.settleGenerationTokens, {
								userId: args.clerkUserId,
								allowance,
								actualTokens: response.inputTokens + response.outputTokens
							})
						);
					}
					await retryConflict(() =>
						ctx.runMutation(internal.questionStudio.recordGenerationUsage, {
							jobId: args.jobId,
							stage: request.stage,
							failed: !!providerError,
							inputTokens: response.inputTokens,
							outputTokens: response.outputTokens,
							reasoningTokens: response.reasoningTokens,
							cachedInputTokens: response.cachedInputTokens,
							cacheWriteTokens: response.cacheWriteTokens,
							costUsd: response.costUsd,
							costEstimated: response.costEstimated,
							latencyMs: response.latencyMs
						})
					);
					const generationId =
						response.responseId ?? `${args.jobId}:${args.workerIndex}:${request.stage}`;
					await captureTelemetry(ctx, {
						event: '$ai_generation',
						distinctId: args.clerkUserId,
						properties: {
							ai_trace_id: String(args.jobId),
							ai_session_id: null,
							ai_span_id: generationId,
							ai_generation_id: generationId,
							ai_parent_id: String(args.jobId),
							ai_span_name: `Question Studio ${request.stage}`,
							ai_model: QUESTION_STUDIO_MODEL,
							ai_provider: 'openai',
							ai_service_tier: response.serviceTier,
							requested_service_tier: 'default',
							ai_input_tokens: response.inputTokens,
							ai_output_tokens: response.outputTokens,
							ai_cache_read_input_tokens: response.cachedInputTokens ?? 0,
							ai_cache_creation_input_tokens: response.cacheWriteTokens ?? 0,
							ai_total_cost_usd: response.costUsd ?? null,
							cost_estimated: response.costEstimated ?? false,
							cost_unknown: response.costUsd === undefined,
							pricing_date: '2026-09-20',
							reservation_wait_ms: reservationWaitMs,
							estimated_input_tokens: estimatedInputTokens,
							reserved_tokens: allowance,
							ai_latency: response.latencyMs / 1000,
							ai_is_error: !!providerError,
							ai_error: providerError instanceof Error ? providerError.message : null,
							ai_http_status: response.httpStatus,
							provider_request_id: response.requestId,
							provider_response_id: response.responseId,
							finish_reason: response.finishReason,
							reasoning_tokens: response.reasoningTokens,
							stage: request.stage,
							thinking: request.thinking,
							question_type: args.task.questionType,
							harness_version: HARNESS_VERSION,
							job_id: args.jobId,
							worker_index: args.workerIndex
						}
					});
					console.info(
						'Question Studio model call',
						JSON.stringify({
							jobId: args.jobId,
							worker: args.workerIndex,
							stage: request.stage,
							requestId: response.requestId,
							responseId: response.responseId,
							latencyMs: response.latencyMs,
							failed: !!providerError
						})
					);
					if (providerError) throw providerError;
					return response;
				},
				{
					referenceLearn: verifiedLearn,
					fastLearnReview: args.task.questionType === 'learn',
					...(verifiedLearn ? { draftingEffortOverride: LEARN_DRAFTING_EFFORT } : {}),
					sourcePages: pages,
					sessionId: `question-studio:${context.user._id}:${args.documentId}:${claimed.sourceIndexedAt}`,
					avoid: selectDuplicateContext(
						slots,
						context.existingQuestions,
						args.task.reservedConcepts
					)
				}
			);
			failed =
				result.accepted.length === 0 &&
				result.rejected.some((r) =>
					r.reasons.some((reason) => reason.startsWith('Provider or format failure:'))
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
					reviewMode: 'independent',
					sourceDocumentId: args.documentId
				}
			}));
			candidates = candidates.filter(
				(c) => scoreDuplicateRisk(c, context.existingQuestions).risk !== 'high'
			);
			detail = `${candidates.length}/${slots.length} passed evidence checks and independent automated review. ${result.corrections.length} corrected during review. ${result.rejected.length} withheld. ${result.rejected
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
				// Jobs queued before this change used two lanes.
				workerIndex: args.workerIndex + (args.workerStride ?? 2)
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
