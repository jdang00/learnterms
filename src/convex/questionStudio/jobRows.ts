import type { Doc } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { GenerationJobSnapshot, JobEvent } from './shared';
import { MAX_JOB_EVENT_DETAIL_CHARS } from './shared';
import { cleanPlainText } from './text';

export function normalizeJobEvent(event: JobEvent): JobEvent {
	return {
		at: event.at,
		label: cleanPlainText(event.label, 80),
		detail: event.detail ? cleanPlainText(event.detail, MAX_JOB_EVENT_DETAIL_CHARS) : undefined
	};
}

export async function insertGenerationJobEvent(
	ctx: MutationCtx,
	job: Doc<'questionStudioJobs'>,
	event: JobEvent
) {
	await ctx.db.insert('questionStudioJobEvents', {
		jobId: job._id,
		cohortId: job.cohortId,
		...normalizeJobEvent(event)
	});
}

export async function hydrateGenerationJob(
	ctx: QueryCtx | MutationCtx,
	job: Doc<'questionStudioJobs'>
): Promise<GenerationJobSnapshot> {
	const module = await ctx.db.get(job.moduleId);
	const eventRows = await ctx.db
		.query('questionStudioJobEvents')
		.withIndex('by_jobId', (q) => q.eq('jobId', job._id))
		.collect();
	const candidateRows = await ctx.db
		.query('questionStudioJobCandidates')
		.withIndex('by_jobId_index', (q) => q.eq('jobId', job._id))
		.collect();
	const candidates =
		candidateRows.length > 0
			? candidateRows.sort((a, b) => a.index - b.index).map((row) => row.candidate)
			: [];
	const completedWorkerCount = eventRows.filter((row) => row.label === 'Worker complete').length;
	const failedWorkerCount = eventRows.filter((row) => row.label === 'Worker failed').length;
	return {
		...job,
		moduleTitle: module?.title,
		moduleClassId: module?.classId,
		eventCount: eventRows.length,
		candidateCount: candidates.length,
		completedWorkerCount,
		failedWorkerCount,
		workerNotes: eventRows
			.filter((row) => row.label === 'Worker complete' || row.label === 'Worker failed')
			.map((row) => row.detail)
			.filter((detail): detail is string => Boolean(detail)),
		candidates
	};
}
