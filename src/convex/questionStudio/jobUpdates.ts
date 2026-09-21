import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalMutation } from '../_generated/server';
import { scoreDuplicateRisk } from './duplicates';
import { closeWorkerState, insertGenerationJobEvent } from './jobRows';
import { HARNESS_VERSION } from './quality';
import type { CandidateQuestion } from './shared';
import { cleanPlainText } from './text';
import {
	MAX_QUESTIONS_PER_WORKER,
	candidateReviewValidator,
	candidateValidator,
	generationPlanValidator,
	loopProgressValidator
} from './shared';

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
		if (!job || job.dismissedAt || job.status === 'ready' || job.status === 'failed') return;
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
		const actor = args.completed ? await ctx.db.get(job.createdByUserId) : null;
		if (args.completed)
			await ctx.scheduler.runAfter(0, internal.aiTelemetry.capture, {
				event: 'question_generation_completed',
				distinctId: actor?.clerkUserId ?? String(job.createdByUserId),
				properties: {
					job_id: job._id,
					status: args.status ?? job.status,
					requested_count: job.requestedCount,
					accepted_count: candidateCount,
					latency_ms: now - job.createdAt,
					effort_policy: 'question_type',
					harness_version: HARNESS_VERSION
				}
			});
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

/**
 * One accounted model call. Accumulated on the job so the run view can report tokens,
 * spend and latency while the run is still going.
 */
export const recordGenerationUsage = internalMutation({
	args: {
		jobId: v.id('questionStudioJobs'),
		stage: v.string(),
		failed: v.optional(v.boolean()),
		inputTokens: v.optional(v.number()),
		outputTokens: v.optional(v.number()),
		reasoningTokens: v.optional(v.number()),
		costUsd: v.optional(v.number()),
		latencyMs: v.optional(v.number())
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (!job || job.dismissedAt) return null;
		const call = {
			calls: 1,
			failedCalls: args.failed ? 1 : 0,
			inputTokens: args.inputTokens ?? 0,
			outputTokens: args.outputTokens ?? 0,
			reasoningTokens: args.reasoningTokens ?? 0,
			costUsd: args.costUsd ?? 0,
			costKnownCalls: typeof args.costUsd === 'number' ? 1 : 0,
			latencyMsTotal: args.latencyMs ?? 0
		};
		const previous = job.usage;
		const stage = cleanPlainText(args.stage || 'other', 40);
		const byStage = [...(previous?.byStage ?? [])];
		const stageIndex = byStage.findIndex((entry) => entry.stage === stage);
		const previousStage = stageIndex >= 0 ? byStage[stageIndex] : null;
		const mergedStage = {
			stage,
			calls: (previousStage?.calls ?? 0) + call.calls,
			failedCalls: (previousStage?.failedCalls ?? 0) + call.failedCalls,
			inputTokens: (previousStage?.inputTokens ?? 0) + call.inputTokens,
			outputTokens: (previousStage?.outputTokens ?? 0) + call.outputTokens,
			reasoningTokens: (previousStage?.reasoningTokens ?? 0) + call.reasoningTokens,
			costUsd: (previousStage?.costUsd ?? 0) + call.costUsd,
			costKnownCalls: (previousStage?.costKnownCalls ?? 0) + call.costKnownCalls,
			latencyMsTotal: (previousStage?.latencyMsTotal ?? 0) + call.latencyMsTotal
		};
		if (stageIndex >= 0) byStage[stageIndex] = mergedStage;
		else byStage.push(mergedStage);
		await ctx.db.patch(job._id, {
			usage: {
				calls: (previous?.calls ?? 0) + call.calls,
				failedCalls: (previous?.failedCalls ?? 0) + call.failedCalls,
				inputTokens: (previous?.inputTokens ?? 0) + call.inputTokens,
				outputTokens: (previous?.outputTokens ?? 0) + call.outputTokens,
				reasoningTokens: (previous?.reasoningTokens ?? 0) + call.reasoningTokens,
				costUsd: (previous?.costUsd ?? 0) + call.costUsd,
				costKnownCalls: (previous?.costKnownCalls ?? 0) + call.costKnownCalls,
				latencyMsTotal: (previous?.latencyMsTotal ?? 0) + call.latencyMsTotal,
				byStage
			}
		});
		return null;
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
		if (
			!job ||
			job.dismissedAt ||
			job.status === 'ready' ||
			job.status === 'failed' ||
			job.completedWorkers?.includes(args.workerIndex)
		) {
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
		await ctx.db.patch(job._id, {
			completedWorkers: [...(job.completedWorkers ?? []), args.workerIndex],
			workerStates: closeWorkerState(job.workerStates, args.workerIndex, {
				finishedAt: now,
				failed: args.eventLabel === 'Worker failed',
				draftedCount: insertedCandidates.length
			})
		});
		await insertGenerationJobEvent(ctx, job, {
			at: now,
			label: args.eventLabel,
			detail: args.eventDetail
		});
		return { candidateCount: (job.candidateCount ?? 0) + insertedCandidates.length };
	}
});
