import type { FunctionReturnType } from 'convex/server';
import { api } from '../../convex/_generated/api';
import type { CandidateQuestion, QuestionType } from './questionStudioTypes';

export type AgentJob = NonNullable<FunctionReturnType<typeof api.questionStudio.getGenerationJob>>;
export type CandidateReview = FunctionReturnType<
	typeof api.questionStudio.getGenerationJobReviews
>[number];

export type PlannedSlot = { questionType?: QuestionType; topicTitle?: string };

export type RunRow =
	| {
			kind: 'candidate';
			key: string;
			index: number;
			candidate: CandidateQuestion;
			review?: CandidateReview;
			saved: boolean;
	  }
	| { kind: 'pending'; key: string; slot: PlannedSlot; writing: boolean }
	| { kind: 'cut'; key: string; slot: PlannedSlot; reason: string };

/**
 * The reviewer indexes verdicts against the pre-filter draft list, then stores only the
 * survivors. So the nth surviving verdict describes the nth candidate we display, and the
 * rejected ones describe slots that never made it.
 */
export function acceptedReviews(reviews: CandidateReview[]): CandidateReview[] {
	return reviews.filter((review) => review.verdict !== 'reject');
}

export function rejectedReviews(reviews: CandidateReview[]): CandidateReview[] {
	return reviews.filter((review) => review.verdict === 'reject');
}

/** One entry per question the planner intends to write, in the order workers take them. */
export function plannedSlots(job?: AgentJob | null): PlannedSlot[] {
	if (!job) return [];
	const batches = job.plan?.workerBatches ?? [];
	if (batches.length === 0)
		return Array.from({ length: Math.max(0, job.requestedCount) }, () => ({}));
	return batches.flatMap((batch) =>
		Array.from({ length: Math.max(0, batch.plannedCount) }, (_, offset) => ({
			questionType: batch.questionType,
			topicTitle: batch.topicTitles[offset % Math.max(1, batch.topicTitles.length)]
		}))
	);
}

/** The learning objective the planner assigned to a candidate's topic, when it recorded one. */
export function objectiveForCandidate(
	job: AgentJob | null | undefined,
	candidate: CandidateQuestion
): string {
	const allocation = job?.plan?.topicAllocations?.find(
		(item) => item.topicId === candidate.topicId
	);
	return allocation?.notes?.trim() ?? '';
}

export function buildRunRows(options: {
	job?: AgentJob | null;
	candidates: CandidateQuestion[];
	reviews: CandidateReview[];
	savedIndexes: Set<number>;
}): RunRow[] {
	const { job, candidates, reviews, savedIndexes } = options;
	const slots = plannedSlots(job);
	const kept = acceptedReviews(reviews);
	const rows: RunRow[] = candidates.map((candidate, index) => ({
		kind: 'candidate',
		key: `c:${index}`,
		index,
		candidate,
		review: kept[index],
		saved: savedIndexes.has(index)
	}));

	const cuts: Array<{ reason: string }> = [
		...rejectedReviews(reviews).map((review) => ({
			reason: review.reasons[0] ?? 'Cut during review.'
		})),
		...Array.from({ length: job?.blockedDuplicateCount ?? 0 }, () => ({
			reason: 'Blocked as a near-duplicate of a question already in this module.'
		}))
	];

	const running = job?.status === 'queued' || job?.status === 'running';
	const remaining = Math.max(0, slots.length - candidates.length - cuts.length);

	cuts.forEach((cut, offset) => {
		rows.push({
			kind: 'cut',
			key: `x:${offset}`,
			slot: slots[candidates.length + offset] ?? {},
			reason: cut.reason
		});
	});

	for (let offset = 0; offset < remaining; offset++) {
		const slot = slots[candidates.length + cuts.length + offset] ?? {};
		if (running) {
			rows.push({ kind: 'pending', key: `p:${offset}`, slot, writing: offset === 0 });
		} else {
			rows.push({
				kind: 'cut',
				key: `p:${offset}`,
				slot,
				reason: 'Not returned — the agent could not support this slot from your source.'
			});
		}
	}

	return rows;
}

export type RunPhase = 'planning' | 'writing' | 'checking' | 'ready' | 'failed';

export function runPhase(job?: AgentJob | null): RunPhase {
	if (!job) return 'planning';
	if (job.status === 'ready') return 'ready';
	if (job.status === 'failed') return 'failed';
	if (!job.plan) return 'planning';
	const batches = job.plan.workerBatches ?? [];
	const done = (job.completedWorkerCount ?? 0) + (job.failedWorkerCount ?? 0);
	if (batches.length > 0 && done >= batches.length) return 'checking';
	return 'writing';
}

export function runHeadline(job: AgentJob | null | undefined, candidateCount: number): string {
	const phase = runPhase(job);
	const planned = plannedSlots(job).length || job?.requestedCount || 0;
	if (phase === 'planning') return 'Reading your source';
	if (phase === 'writing') return `Writing ${candidateCount} of ${planned}`;
	if (phase === 'checking') return 'Checking every question';
	if (phase === 'failed') return job?.statusText || 'Run stopped';
	return `${candidateCount} ready to review`;
}
