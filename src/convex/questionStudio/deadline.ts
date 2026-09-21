import type { Doc } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import { insertGenerationJobEvent } from './jobRows';
import { HARNESS_VERSION } from './quality';

export const LEARN_DEADLINE_MS = 45_000;
export function generationDeadline(job: {
	createdAt: number;
	requestedCount: number;
	requestedCounts?: { learn: number; clinical: number; criticalThinking: number };
}) {
	const counts = job.requestedCounts;
	return counts &&
		counts.learn === job.requestedCount &&
		!counts.clinical &&
		!counts.criticalThinking &&
		job.requestedCount <= 15
		? job.createdAt + LEARN_DEADLINE_MS
		: undefined;
}

/** Reject late writes even if the scheduled timeout is delayed. Preserve actual wall time. */
export async function expireIfDue(ctx: MutationCtx, job: Doc<'questionStudioJobs'>) {
	const deadline = generationDeadline(job) ?? job.createdAt + 600_000;
	const now = Date.now();
	if (
		now < deadline - (generationDeadline(job) ? 1000 : 0) ||
		!['queued', 'running'].includes(job.status)
	)
		return false;
	const message = generationDeadline(job)
		? 'Could not finish within the 45-second budget. No late results will be accepted.'
		: 'Run timed out. Start a new run to retry.';
	await ctx.db.patch(job._id, {
		status: 'failed',
		statusText: message,
		completedAt: now,
		updatedAt: now
	});
	await insertGenerationJobEvent(ctx, job, { at: now, label: 'Deadline reached', detail: message });
	const actor = await ctx.db.get(job.createdByUserId);
	const properties = {
		job_id: job._id,
		requested_count: job.requestedCount,
		accepted_count: 0,
		latency_ms: now - job.createdAt,
		deadline_ms: deadline - job.createdAt,
		deadline_exceeded: true,
		target_met: false,
		full_count: false,
		status: 'failed',
		harness_version: HARNESS_VERSION
	};
	await ctx.scheduler.runAfter(0, internal.aiTelemetry.capture, {
		event: 'question_generation_completed',
		distinctId: actor?.clerkUserId ?? String(job.createdByUserId),
		properties
	});
	await ctx.scheduler.runAfter(0, internal.aiTelemetry.capture, {
		event: '$ai_trace',
		distinctId: actor?.clerkUserId ?? String(job.createdByUserId),
		properties: {
			...properties,
			ai_trace_id: String(job._id),
			ai_span_id: String(job._id),
			ai_span_name: 'Question Studio generation',
			ai_latency: (now - job.createdAt) / 1000,
			ai_is_error: true,
			ai_error: message
		}
	});
	return true;
}
