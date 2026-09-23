import type { FunctionReturnType } from 'convex/server';
import { api } from '../../../convex/_generated/api';
import type { CandidateQuestion, QuestionType } from './questionStudioTypes';

export type AgentJob = NonNullable<
	FunctionReturnType<typeof api.questionStudio.jobs.getGenerationJob>
>;
export type CandidateReview = FunctionReturnType<
	typeof api.questionStudio.jobs.getGenerationJobReviews
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

/** Why a curator should read a draft more carefully, or '' when nothing stood out. */
export function candidateConcern(candidate: CandidateQuestion, review?: CandidateReview): string {
	if (candidate.duplicateRisk !== 'low')
		return candidate.duplicateRisk === 'high'
			? 'This likely repeats a question already in the module.'
			: 'This may overlap with a question already in the module.';
	if (review?.sourceSupport === 'weak')
		return review.reasons[0] ?? 'The document only weakly supports this question.';
	if (review?.answerQuality === 'ambiguous')
		return review.reasons[0] ?? 'More than one option could be read as correct.';
	return '';
}

export type JobActivity = FunctionReturnType<
	typeof api.questionStudio.jobs.getGenerationJobActivity
>;
export type JobEvent = JobActivity['events'][number];
export type CohortRunHistory = FunctionReturnType<
	typeof api.questionStudio.jobs.listCohortGenerationJobs
>;
export type CohortRun = CohortRunHistory['runs'][number];

const STALL_AFTER_MS = 45_000;

export type RunTelemetry = {
	elapsedMs: number;
	queueWaitMs?: number;
	drafted: number;
	planned: number;
	kept?: number;
	cut: number;
	workersRunning: number;
	workersDone: number;
	workersTotal: number;
	calls: number;
	failedCalls: number;
	totalTokens: number;
	costUsd: number;
	costComplete: boolean;
	costEstimated?: boolean;
	costPerKept?: number;
	secondsPerQuestion?: number;
	projectedRemainingMs?: number;
	budgetRemainingPercent?: number;
	stalledForMs?: number;
};

/** Everything the run's instrument row reports, derived from what the job already stores. */
export function runTelemetry(options: {
	job?: AgentJob | null;
	candidates: CandidateQuestion[];
	reviews: CandidateReview[];
	activity?: JobActivity | null;
	now: number;
}): RunTelemetry | null {
	const { job, candidates, reviews, activity, now } = options;
	if (!job) return null;
	const running = job.status === 'queued' || job.status === 'running';
	const endedAt = job.completedAt ?? (running ? now : job.updatedAt);
	const planned = plannedSlots(job).length || job.requestedCount || 0;
	const usage = job.usage;
	const totalTokens = (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
	const workerStates = job.workerStates ?? [];
	const workersDone = workerStates.filter((state) => state.finishedAt !== undefined).length;
	const workersTotal = Math.max(
		workerStates.length,
		job.plan?.workerBatches?.length ?? 0,
		workersDone
	);
	const kept = reviews.length > 0 ? acceptedReviews(reviews).length : undefined;
	const costUsd = usage?.costUsd ?? 0;
	const costComplete = Boolean(usage && usage.costKnownCalls >= usage.calls);
	const perQuestionMs =
		candidates.length > 0 ? (endedAt - job.createdAt) / candidates.length : undefined;
	const firstEventAt = activity?.events?.[0]?.at;
	const lastEventAt = activity?.events?.length
		? activity.events[activity.events.length - 1].at
		: undefined;
	const quietFor = running && lastEventAt ? now - lastEventAt : 0;
	const budget = activity?.tokenBudget;

	return {
		elapsedMs: Math.max(0, endedAt - job.createdAt),
		queueWaitMs: firstEventAt ? Math.max(0, firstEventAt - job.createdAt) : undefined,
		drafted: candidates.length,
		planned,
		kept,
		cut: rejectedReviews(reviews).length + (job.blockedDuplicateCount ?? 0),
		workersRunning: Math.max(0, workerStates.length - workersDone),
		workersDone,
		workersTotal,
		calls: usage?.calls ?? 0,
		failedCalls: usage?.failedCalls ?? 0,
		totalTokens,
		costUsd,
		costComplete,
		costEstimated: (usage?.costEstimatedCalls ?? 0) > 0,
		costPerKept: kept && kept > 0 && costUsd > 0 ? costUsd / kept : undefined,
		secondsPerQuestion: perQuestionMs ? perQuestionMs / 1000 : undefined,
		projectedRemainingMs:
			running && perQuestionMs && planned > candidates.length
				? perQuestionMs * (planned - candidates.length)
				: undefined,
		budgetRemainingPercent:
			budget && budget.capacity > 0
				? Math.round((budget.remaining / budget.capacity) * 100)
				: undefined,
		stalledForMs: quietFor >= STALL_AFTER_MS ? quietFor : undefined
	};
}

export type CoverageRow = {
	topicId: string;
	topicTitle: string;
	planned: number;
	drafted: number;
	kept: number;
};

/** Planned questions per topic against what actually came back, so gaps are visible. */
export function coverageRows(options: {
	job?: AgentJob | null;
	candidates: CandidateQuestion[];
	reviews: CandidateReview[];
	savedIndexes?: Set<number>;
}): CoverageRow[] {
	const { job, candidates, reviews } = options;
	const allocations = job?.plan?.topicAllocations ?? [];
	const rows = new Map<string, CoverageRow>();
	for (const allocation of allocations) {
		const row = rows.get(allocation.topicId) ?? {
			topicId: allocation.topicId,
			topicTitle: allocation.topicTitle,
			planned: 0,
			drafted: 0,
			kept: 0
		};
		row.planned += allocation.plannedCount;
		rows.set(allocation.topicId, row);
	}
	const keptVerdicts = acceptedReviews(reviews);
	candidates.forEach((candidate, index) => {
		const row = rows.get(candidate.topicId) ?? {
			topicId: candidate.topicId,
			topicTitle: candidate.topicTitle,
			planned: 0,
			drafted: 0,
			kept: 0
		};
		row.drafted += 1;
		// Before the reviewer runs, every draft still counts as kept.
		if (keptVerdicts.length === 0 || keptVerdicts[index]) row.kept += 1;
		rows.set(candidate.topicId, row);
	});
	return [...rows.values()].sort(
		(a, b) => a.kept - b.kept || b.planned - a.planned || a.topicTitle.localeCompare(b.topicTitle)
	);
}

/** The reason the reviewer gave most often, which is how a weak source shows itself. */
export function topRejectReason(
	reviews: CandidateReview[]
): { reason: string; count: number } | null {
	const counts = new Map<string, number>();
	for (const review of rejectedReviews(reviews)) {
		const reason = review.reasons[0];
		if (!reason) continue;
		counts.set(reason, (counts.get(reason) ?? 0) + 1);
	}
	const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
	return top ? { reason: top[0], count: top[1] } : null;
}

export function formatDuration(ms: number): string {
	const seconds = Math.max(0, Math.round(ms / 1000));
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatTokens(tokens: number): string {
	if (tokens < 1000) return String(tokens);
	return `${(tokens / 1000).toFixed(tokens < 10_000 ? 1 : 0)}k`;
}

export function formatUsd(amount: number): string {
	if (amount === 0) return '$0.00';
	return amount < 0.01 ? `$${amount.toFixed(4)}` : `$${amount.toFixed(2)}`;
}
