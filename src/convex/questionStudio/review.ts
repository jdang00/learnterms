import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalAction } from '../_generated/server';
import { mechanicalCandidateGate } from './candidates';
import { scoreDuplicateRisk } from './duplicates';
import type { CandidateQuestion, CandidateReview, GenerationJobSnapshot } from './shared';
import { MAX_GENERATED_QUESTIONS, MAX_REVIEW_REASON_CHARS } from './shared';
import { cleanPlainText } from './text';

export const reviewGenerationJob = internalAction({
	args: {
		jobId: v.id('questionStudioJobs'),
		documentId: v.id('contentLib'),
		moduleId: v.id('module'),
		clerkUserId: v.string(),
		workerTotal: v.number(),
		focusNotes: v.optional(v.string()),
		startPage: v.optional(v.number()),
		endPage: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const report = async (update: Record<string, unknown>) => {
			await ctx.runMutation(internal.questionStudio.updateGenerationJob, {
				jobId: args.jobId,
				...update
			});
		};
		try {
			const job = (await ctx.runQuery(internal.questionStudio.getGenerationJobInternal, {
				jobId: args.jobId
			})) as GenerationJobSnapshot | null;
			if (!job || job.status === 'ready' || job.status === 'failed') return;
			const completedWorkers = (job.completedWorkerCount ?? 0) + (job.failedWorkerCount ?? 0);
			const requestedCount = Math.floor(job.requestedCount || MAX_GENERATED_QUESTIONS);
			const enoughCandidates = (job.candidateCount ?? 0) >= requestedCount;
			if (!enoughCandidates && completedWorkers < args.workerTotal) return;
			const candidates = job.candidates.slice(0, job.requestedCount);
			if (candidates.length === 0) {
				await report({
					status: 'failed',
					statusText: 'No candidates passed worker checks.',
					eventLabel: 'Failed',
					eventDetail: 'All workers finished, but no candidate passed local quality checks.',
					completed: true
				});
				return;
			}

			await report({
				statusText: 'Running local candidate checks.',
				eventLabel: 'Reviewing',
				eventDetail: `${candidates.length} candidates are ready for local source, answer, and provenance checks.`,
				...(job.loop ? { loop: { pass: 'gate' as const } } : {})
			});
			const reviews: CandidateReview[] = candidates.map((candidate, index) => {
				const gate = mechanicalCandidateGate(candidate);
				const reasons = gate.pass
					? [
							'Passed source evidence checks and separate AI screening. Review the answer and source before publishing.'
						]
					: gate.reasons;
				return {
					candidateIndex: index,
					verdict: gate.pass ? 'accept' : 'reject',
					reasons: reasons.map((reason) => cleanPlainText(reason, MAX_REVIEW_REASON_CHARS)),
					sourceSupport: gate.sourceSupport,
					answerQuality: gate.answerQuality
				};
			});
			const reviewByIndex = new Map(reviews.map((review) => [review.candidateIndex, review]));
			const finalCandidates: CandidateQuestion[] = [];
			for (const [index, candidate] of candidates.entries()) {
				const review = reviewByIndex.get(index);
				if (!review || review.verdict === 'reject') continue;
				if (scoreDuplicateRisk(candidate, [], finalCandidates).risk === 'high') {
					review.verdict = 'reject';
					review.reasons = ['Rejected as a near-duplicate of another candidate in this run.'];
					continue;
				}
				finalCandidates.push(candidate);
				if (finalCandidates.length >= job.requestedCount) break;
			}
			await report({
				statusText: 'Review complete.',
				eventLabel: 'Review complete',
				eventDetail: `${reviews.filter((review) => review.verdict === 'reject').length} rejected, ${reviews.filter((review) => review.verdict === 'revise').length} need reasoning review.`,
				reviews
			});
			await report({
				status: finalCandidates.length ? 'ready' : 'failed',
				statusText:
					finalCandidates.length >= job.requestedCount
						? `Ready: ${finalCandidates.length} candidates to review.`
						: `Partial ready: ${finalCandidates.length}/${job.requestedCount} candidates to review.`,
				eventLabel: 'Ready',
				eventDetail:
					finalCandidates.length >= job.requestedCount
						? 'Draft workers and local review finished.'
						: 'Draft workers finished with partial usable candidates.',
				candidates: finalCandidates,
				...(job.loop
					? {
							loop: {
								pass: 'done' as const,
								gatePassedCount: finalCandidates.length,
								gateRejectedCount: reviews.length - finalCandidates.length,
								selectedCount: finalCandidates.length
							}
						}
					: {}),
				completed: true
			});
		} catch (error) {
			await report({
				status: 'failed',
				statusText: 'Review failed.',
				eventLabel: 'Failed',
				eventDetail: error instanceof Error ? error.message : 'Unknown review error',
				error: error instanceof Error ? error.message : 'Unknown review error',
				completed: true
			});
		}
	}
});
