import { retryConflict } from './retry';
import { omit } from 'convex-helpers';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalAction } from '../_generated/server';
import { scoreDuplicateRisk } from './duplicates';
import { selectedSourcePages } from './pageSelection';
import { runAgentBatch } from './agent/batch';
import { searchExemplars } from './exemplarBank';
import { exemplarTiers, formatExemplar, type ExemplarSource } from './exemplars';
import { callAgentTurn, callQualityModel, PRICING_DATE, QuestionProviderError } from './provider';
import {
	HARNESS_VERSION,
	evidenceForObjective,
	runQualityBatch,
	selectDuplicateContext,
	type QualityCaller,
	type QualityCallResult,
	type QualitySlot
} from './quality';
import { questionTypeLabel } from './questionTypes';
import { captureTelemetry } from './runtime';
import type { CandidateQuestion, GenerationContext } from './shared';
import {
	LEARN_DRAFTING_EFFORT,
	liveWorkerTaskValidator,
	questionStudioModelValidator
} from './shared';
import { loadMarkdownPages, selectPages } from './sourceRetrieval';
import { estimateQualityInputTokens, estimateTextTokens } from './tokenEstimate';
import { runLeanBatch } from './lean';
import { STAGE_MODELS, claudeModels } from '../aiModels';

const CACHE_STAGGER_MS = 2500;

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
			ctx.runMutation(internal.questionStudio.jobs.claimWorker, {
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
		// Lean is the default since the v34 eval; `reviewed` and the dev-only `agent` stay switchable.
		const pipeline =
			process.env.QUESTION_STUDIO_PIPELINE === 'agent' ||
			process.env.QUESTION_STUDIO_PIPELINE === 'reviewed'
				? process.env.QUESTION_STUDIO_PIPELINE
				: 'lean';
		const useAgent = pipeline === 'agent';
		const agentModel = claudeModels.find((m) => m === process.env.QUESTION_STUDIO_AGENT_MODEL);
		try {
			const context = (await ctx.runQuery(internal.questionStudio.context.getGenerationContext, {
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
			// Curator exemplars from the human question bank; generation never waits on a failed lookup.
			const exemplars: ExemplarSource = (query) =>
				searchExemplars(ctx, { ...query, tiers: exemplarTiers(query.questionType) }).catch(
					() => []
				);
			if (!useAgent) {
				const shown: string[] = [];
				for (const slot of slots) {
					const found = await exemplars({
						questionType: slot.questionType,
						objective: slot.objective,
						context: slot.evidence[0]?.text.slice(0, 600),
						limit: 2,
						exclude: shown
					});
					shown.push(...found.map((e) => e.id));
					slot.examples = found.map(formatExemplar);
				}
			}
			const key = process.env.ANTHROPIC_API_KEY!;
			const remainingMs = () =>
				claimed.deadlineAt ? Math.max(1, claimed.deadlineAt - Date.now() - 3000) : undefined;
			/** Every model call reserves tokens first, then settles and records actual usage. */
			const accounted = async <T extends QualityCallResult>(
				meta: {
					stage: string;
					model?: string;
					thinking: string;
					estimatedInputTokens: number;
					maxOutputTokens: number;
				},
				run: (timeoutMs: number | undefined) => Promise<T>
			): Promise<T> => {
				const current = await ctx.runQuery(internal.questionStudio.jobs.getGenerationJobInternal, {
					jobId: args.jobId
				});
				if (!current || current.dismissedAt || current.status !== 'running')
					throw new Error('Generation cancelled');
				const allowance = meta.estimatedInputTokens + meta.maxOutputTokens;
				const reservationStarted = Date.now();
				while (true) {
					const limited = await retryConflict(() =>
						ctx.runMutation(internal.questionStudio.tokenBudget.reserveGenerationTokens, {
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
				let response: QualityCallResult;
				let result: T | undefined;
				let providerError: unknown;
				try {
					result = await run(remainingMs());
					response = result;
				} catch (error) {
					if (!(error instanceof QuestionProviderError)) throw error;
					response = error.usage;
					providerError = error;
				}
				// Like Anthropic's own input limits, cache reads don't count against the budget.
				const budgetTokens =
					response.inputTokens - (response.cachedInputTokens ?? 0) + response.outputTokens;
				if (budgetTokens > 0) {
					await retryConflict(() =>
						ctx.runMutation(internal.questionStudio.tokenBudget.settleGenerationTokens, {
							userId: args.clerkUserId,
							allowance,
							actualTokens: budgetTokens
						})
					);
				}
				await retryConflict(() =>
					ctx.runMutation(internal.questionStudio.jobUpdates.recordGenerationUsage, {
						jobId: args.jobId,
						stage: meta.stage,
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
					response.responseId ?? `${args.jobId}:${args.workerIndex}:${meta.stage}`;
				await captureTelemetry(ctx, {
					event: '$ai_generation',
					distinctId: args.clerkUserId,
					properties: {
						ai_trace_id: String(args.jobId),
						ai_session_id: null,
						ai_span_id: generationId,
						ai_generation_id: generationId,
						ai_parent_id: String(args.jobId),
						ai_span_name: `Question Studio ${meta.stage}`,
						ai_model: response.model,
						requested_model: meta.model,
						ai_provider: 'anthropic',
						ai_service_tier: response.serviceTier,
						requested_service_tier: 'standard',
						ai_input_tokens: response.inputTokens,
						ai_output_tokens: response.outputTokens,
						ai_cache_read_input_tokens: response.cachedInputTokens ?? 0,
						ai_cache_creation_input_tokens: response.cacheWriteTokens ?? 0,
						ai_total_cost_usd: response.costUsd ?? null,
						cost_estimated: response.costEstimated ?? false,
						cost_unknown: response.costUsd === undefined,
						pricing_date: PRICING_DATE,
						reservation_wait_ms: reservationWaitMs,
						estimated_input_tokens: meta.estimatedInputTokens,
						reserved_tokens: allowance,
						ai_latency: response.latencyMs / 1000,
						ai_is_error: !!providerError,
						ai_error: providerError instanceof Error ? providerError.message : null,
						ai_http_status: response.httpStatus,
						provider_request_id: response.requestId,
						provider_response_id: response.responseId,
						finish_reason: response.finishReason,
						reasoning_tokens: response.reasoningTokens,
						stage: meta.stage,
						thinking: meta.thinking,
						question_type: args.task.questionType,
						pipeline,
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
						stage: meta.stage,
						requestId: response.requestId,
						responseId: response.responseId,
						latencyMs: response.latencyMs,
						failed: !!providerError
					})
				);
				if (providerError) throw providerError;
				return result!;
			};
			const qualityCall: QualityCaller = async (request) => {
				if (request.stage === 'repair') {
					for (const failure of request.repairFailures ?? []) {
						await ctx.runMutation(internal.questionStudio.jobUpdates.updateGenerationJob, {
							jobId: args.jobId,
							eventLabel: 'Repair requested',
							eventDetail: `${failure.slotId}: ${failure.reasons.join(' ')}`
						});
					}
				}
				return accounted(
					{
						stage: request.stage,
						model: request.model,
						thinking: request.thinking,
						estimatedInputTokens: estimateQualityInputTokens(request),
						maxOutputTokens: request.maxOutputTokens
					},
					(timeoutMs) =>
						callQualityModel(
							{
								...request,
								timeoutMs,
								metadata: {
									job_id: String(args.jobId),
									worker_index: String(args.workerIndex),
									harness_version: HARNESS_VERSION,
									question_type: args.task.questionType
								}
							},
							key
						)
				);
			};
			const avoid = selectDuplicateContext(
				slots,
				context.existingQuestions,
				args.task.reservedConcepts
			);
			// A cache entry is readable only once its first response begins, so parallel workers would
			// all miss and each write the shared instruction prefix. Let worker 0 write it first.
			if (pipeline === 'lean' && args.workerIndex > 0)
				await new Promise((resolve) => setTimeout(resolve, CACHE_STAGGER_MS));
			const result = useAgent
				? await runAgentBatch(slots, {
						turn: (request) =>
							accounted(
								{
									stage: 'agent',
									model: request.model,
									thinking: request.effort,
									estimatedInputTokens: estimateTextTokens(
										request.system + JSON.stringify(request.messages)
									),
									maxOutputTokens: request.maxOutputTokens
								},
								(timeoutMs) => callAgentTurn({ ...request, timeoutMs }, key)
							),
						call: qualityCall,
						sourcePages: pages,
						avoid,
						exemplars,
						...(agentModel ? { stages: { draft: { model: agentModel } } } : {}),
						// An agent turn takes about 5–10 seconds; leave room to finish and persist.
						canContinue: () => !claimed.deadlineAt || Date.now() < claimed.deadlineAt - 12_000,
						timeoutMs: remainingMs
					})
				: pipeline === 'lean'
					? await runLeanBatch(
							slots,
							qualityCall,
							// v34 eval winner: Opus drafts at medium effort and a Haiku blind solve gates, with no
							// repair round (in v35 one cost more per good question). `editor` keeps a Sonnet
							// draft plus one Opus edit.
							process.env.QUESTION_STUDIO_LEAN_GATE === 'editor'
								? {
										gate: 'editor',
										preCue: process.env.QUESTION_STUDIO_CUE_PROBE === 'on',
										avoid
									}
								: {
										gate: 'solve',
										stages: { draft: { model: STAGE_MODELS.leanDraft, effort: 'medium' } },
										avoid
									}
						)
					: await runQualityBatch(slots, qualityCall, {
							referenceLearn: verifiedLearn,
							fastLearnReview: args.task.questionType === 'learn',
							// A repair round (draft + review) takes about 20 seconds; skip it near the deadline.
							canRepair: () => !claimed.deadlineAt || Date.now() < claimed.deadlineAt - 22_000,
							// Off by default: in the v33 eval its repair lost more good questions than it saved.
							cueProbe: process.env.QUESTION_STUDIO_CUE_PROBE === 'on',
							...(verifiedLearn ? { draftingEffortOverride: LEARN_DRAFTING_EFFORT } : {}),
							sourcePages: pages,
							sessionId: `question-studio:${context.user._id}:${args.documentId}:${claimed.sourceIndexedAt}`,
							avoid
						});
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
					const citation = omit(
						slot.evidence.find((c) => c.citationId === e.citationId)!,
						['text']
					);
					return { ...citation, quote: e.quote };
				}),
				duplicateRisk: 'low',
				similarQuestionIds: [],
				metadata: {
					// The models that actually served this worker, e.g. after a fallback or on the lean path.
					model:
						[...new Set(result.calls.flatMap((call) => (call.model ? [call.model] : [])))].join(
							'+'
						) || STAGE_MODELS.draft,
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
		await ctx.runMutation(internal.questionStudio.jobUpdates.appendGenerationWorkerResult, {
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
			await ctx.scheduler.runAfter(0, internal.questionStudio.workers.generateCandidateWorker, {
				...args,
				task,
				remainingTasks,
				// Jobs queued before this change used two lanes.
				workerIndex: args.workerIndex + (args.workerStride ?? 2)
			});
		}
		await ctx.scheduler.runAfter(0, internal.questionStudio.review.reviewGenerationJob, {
			jobId: args.jobId,
			documentId: args.documentId,
			moduleId: args.moduleId,
			clerkUserId: args.clerkUserId,
			workerTotal: args.workerTotal
		});
	}
});
