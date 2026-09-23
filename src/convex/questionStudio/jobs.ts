import { v } from 'convex/values';
import { generationDeadline, expireIfDue } from './deadline';
import type { Doc } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { internalMutation, internalQuery, mutation, query } from '../_generated/server';
import { assertJobBinding } from './access';
import { assertSaveAccess, getActor } from './authorization';
import { hydrateGenerationJob, openWorkerState } from './jobRows';
import { normalizeSelectedPages } from './pageSelection';
import { validateCounts } from './planning';
import { HARNESS_VERSION } from './quality';
import { questionStudioRateLimiter } from './runtime';
import { MAX_GENERATED_QUESTIONS } from './shared';
import { TEXT_MODEL } from '../aiModels';

function medianOf(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function costPerSaved(jobs: Doc<'questionStudioJobs'>[]): number | null {
	const saved = jobs.reduce((total, job) => total + (job.savedCandidateIndexes?.length ?? 0), 0);
	const spend = jobs.reduce((total, job) => total + (job.usage?.costUsd ?? 0), 0);
	return saved > 0 && spend > 0 ? spend / saved : null;
}

export const createGenerationJob = mutation({
	args: {
		documentId: v.id('contentLib'),
		moduleId: v.id('module'),
		requestedCount: v.number(),
		sourceMode: v.optional(v.union(v.literal('topics'), v.literal('pages'))),
		selectedPageNumbers: v.optional(v.array(v.number())),
		sourceIndexedAt: v.optional(v.number()),
		counts: v.optional(
			v.object({ learn: v.number(), clinical: v.number(), criticalThinking: v.number() })
		)
	},
	returns: v.id('questionStudioJobs'),
	handler: async (ctx, args) => {
		const { user, classDoc, document } = await assertSaveAccess(ctx, {
			moduleId: args.moduleId,
			documentId: args.documentId
		});
		if (
			!Number.isInteger(args.requestedCount) ||
			args.requestedCount < 1 ||
			args.requestedCount > MAX_GENERATED_QUESTIONS
		)
			throw new Error('Invalid question count');
		if (args.counts && validateCounts(args.counts).total !== args.requestedCount)
			throw new Error('Question mix must match the requested count');
		const sourceMode = args.sourceMode ?? 'topics';
		const selectedPageNumbers =
			sourceMode === 'pages'
				? normalizeSelectedPages(args.selectedPageNumbers ?? [], document.metadata?.pageCount)
				: undefined;
		if (
			sourceMode === 'pages' &&
			(args.sourceIndexedAt === undefined || args.sourceIndexedAt !== document.metadata?.indexedAt)
		)
			throw new Error('Source changed. Reload the pages before starting a run.');
		const now = Date.now();
		const model = TEXT_MODEL;
		const existingJobs = await ctx.db
			.query('questionStudioJobs')
			.withIndex('by_createdByUserId', (q) => q.eq('createdByUserId', user._id))
			.order('desc')
			.take(50);
		for (const job of existingJobs) {
			await ctx.db.patch(job._id, {
				dismissedAt: Date.now(),
				...(job.status === 'queued' || job.status === 'running'
					? { status: 'failed' as const, statusText: 'Cancelled', completedAt: Date.now() }
					: {})
			});
		}
		const jobId = await ctx.db.insert('questionStudioJobs', {
			documentId: args.documentId,
			moduleId: args.moduleId,
			cohortId: classDoc.cohortId,
			createdByUserId: user._id,
			kind: 'candidate_generation',
			status: 'queued',
			statusText: 'Queued candidate generation.',
			model,
			sourceIndexedAt: document.metadata?.indexedAt,
			requestedCount: Math.floor(args.requestedCount),
			requestedCounts: args.counts,
			sourceMode,
			selectedPageNumbers,
			loop: { enabled: true, pass: 'plan' as const },
			blockedDuplicateCount: 0,
			candidateCount: 0,
			reviewCount: 0,
			eventCount: 1,
			completedWorkerCount: 0,
			failedWorkerCount: 0,
			createdAt: now,
			updatedAt: now
		});
		await ctx.db.insert('questionStudioJobEvents', {
			jobId,
			cohortId: classDoc.cohortId,
			at: now,
			label: 'Queued',
			detail: 'Preparing the agent run.'
		});
		await ctx.scheduler.runAfter(
			(generationDeadline({
				createdAt: now,
				requestedCount: args.requestedCount,
				requestedCounts: args.counts
			}) ?? now + 601_000) -
				now -
				1000,
			internal.questionStudio.jobs.expireGenerationJob,
			{
				jobId
			}
		);
		return jobId;
	}
});

export const getCurrentGenerationJob = query({
	args: {},
	handler: async (ctx) => {
		const { user } = await getActor(ctx);
		const jobs = await ctx.db
			.query('questionStudioJobs')
			.withIndex('by_createdByUserId', (q) => q.eq('createdByUserId', user._id))
			.order('desc')
			.take(50);
		const job = jobs.filter((j) => !j.dismissedAt).sort((a, b) => b.createdAt - a.createdAt)[0];
		if (!job) return null;
		return await hydrateGenerationJob(ctx, job);
	}
});

export const clearCurrentGenerationJob = mutation({
	args: {},
	handler: async (ctx) => {
		const { user } = await getActor(ctx);
		const jobs = await ctx.db
			.query('questionStudioJobs')
			.withIndex('by_createdByUserId', (q) => q.eq('createdByUserId', user._id))
			.order('desc')
			.take(50);
		for (const job of jobs) {
			await ctx.db.patch(job._id, {
				dismissedAt: Date.now(),
				...(job.status === 'queued' || job.status === 'running'
					? { status: 'failed' as const, statusText: 'Cancelled', completedAt: Date.now() }
					: {})
			});
		}
		return { deletedCount: jobs.length };
	}
});

export const getGenerationJob = query({
	args: { jobId: v.id('questionStudioJobs') },
	handler: async (ctx, { jobId }) => {
		const { user } = await getActor(ctx);
		const job = await ctx.db.get(jobId);
		if (!job) return null;
		if (user.role !== 'dev' && user.cohortId !== job.cohortId) {
			throw new Error('Unauthorized for this cohort');
		}
		return await hydrateGenerationJob(ctx, job);
	}
});

// Fetched lazily by the UI when the reviewer phase is expanded — keeps the live job
// subscription light while still exposing per-candidate verdicts on demand.
export const getGenerationJobReviews = query({
	args: { jobId: v.id('questionStudioJobs') },
	handler: async (ctx, { jobId }) => {
		const { user } = await getActor(ctx);
		const job = await ctx.db.get(jobId);
		if (!job) return [];
		if (user.role !== 'dev' && user.cohortId !== job.cohortId) {
			throw new Error('Unauthorized for this cohort');
		}
		const rows = await ctx.db
			.query('questionStudioJobReviews')
			.withIndex('by_jobId_candidateIndex', (q) => q.eq('jobId', jobId))
			.collect();
		return rows.sort((a, b) => a.candidateIndex - b.candidateIndex).map((row) => row.review);
	}
});

// Fetched separately from the job snapshot: the event log grows all run long, and the
// live job subscription should not re-send it on every worker write.
export const getGenerationJobActivity = query({
	args: { jobId: v.id('questionStudioJobs'), limit: v.optional(v.number()) },
	handler: async (ctx, { jobId, limit }) => {
		const { user } = await getActor(ctx);
		const job = await ctx.db.get(jobId);
		if (!job) return { events: [], tokenBudget: null };
		if (user.role !== 'dev' && user.cohortId !== job.cohortId) {
			throw new Error('Unauthorized for this cohort');
		}
		const take = Math.max(1, Math.min(Math.floor(limit ?? 60), 200));
		const rows = await ctx.db
			.query('questionStudioJobEvents')
			.withIndex('by_jobId', (q) => q.eq('jobId', jobId))
			.order('desc')
			.take(take);
		const clerkUserId = user.clerkUserId;
		const [perUser, global] = await Promise.all([
			questionStudioRateLimiter.getValue(ctx, 'questionStudioTokenUsagePerUser', {
				key: clerkUserId
			}),
			questionStudioRateLimiter.getValue(ctx, 'questionStudioGlobalTokenUsage', {})
		]);
		return {
			events: rows
				.map((row) => ({ at: row.at, label: row.label, detail: row.detail }))
				.sort((a, b) => a.at - b.at),
			tokenBudget: {
				remaining: Math.max(0, Math.floor(perUser.value)),
				capacity: Math.floor(perUser.config.capacity ?? perUser.config.rate),
				globalRemaining: Math.max(0, Math.floor(global.value)),
				globalCapacity: Math.floor(global.config.capacity ?? global.config.rate)
			}
		};
	}
});

/**
 * Cohort-wide generation history for the Class Progress dashboard: one row per run plus
 * the totals a curator lead watches (throughput, what was kept, and what it cost).
 */
export const listCohortGenerationJobs = query({
	args: { cohortId: v.id('cohort'), limit: v.optional(v.number()) },
	handler: async (ctx, { cohortId, limit }) => {
		const { user } = await getActor(ctx);
		if (user.role !== 'dev' && user.cohortId !== cohortId) {
			throw new Error('Unauthorized for this cohort');
		}
		const take = Math.max(1, Math.min(Math.floor(limit ?? 12), 50));
		// Summaries read a wider window than the table shows, so the totals mean something.
		const recent = await ctx.db
			.query('questionStudioJobs')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', cohortId))
			.order('desc')
			.take(100);
		const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
		const thisWeek = recent.filter((job) => job.createdAt >= weekAgo);
		const finished = recent.filter((job) => job.completedAt);
		const summary = {
			runsThisWeek: thisWeek.length,
			savedThisWeek: thisWeek.reduce(
				(total, job) => total + (job.savedCandidateIndexes?.length ?? 0),
				0
			),
			spendThisWeek: thisWeek.reduce((total, job) => total + (job.usage?.costUsd ?? 0), 0),
			tokensThisWeek: thisWeek.reduce(
				(total, job) => total + (job.usage?.inputTokens ?? 0) + (job.usage?.outputTokens ?? 0),
				0
			),
			failedThisWeek: thisWeek.filter((job) => job.status === 'failed').length,
			medianDurationMs: medianOf(
				finished.map((job) => (job.completedAt ?? job.createdAt) - job.createdAt)
			),
			costPerSavedQuestion: costPerSaved(thisWeek)
		};
		const rows = await Promise.all(
			recent.slice(0, take).map(async (job) => {
				const [module, document, curator] = await Promise.all([
					ctx.db.get(job.moduleId),
					ctx.db.get(job.documentId),
					ctx.db.get(job.createdByUserId)
				]);
				return {
					jobId: job._id,
					status: job.status,
					createdAt: job.createdAt,
					completedAt: job.completedAt,
					requestedCount: job.requestedCount,
					deliveredCount: job.candidateCount ?? 0,
					savedCount: job.savedCandidateIndexes?.length ?? 0,
					costUsd: job.usage?.costUsd ?? 0,
					costKnownCalls: job.usage?.costKnownCalls ?? 0,
					costEstimated: (job.usage?.costEstimatedCalls ?? 0) > 0,
					totalTokens: (job.usage?.inputTokens ?? 0) + (job.usage?.outputTokens ?? 0),
					curatorName: curator?.name,
					moduleId: job.moduleId,
					moduleTitle: module?.title,
					moduleClassId: module?.classId,
					documentTitle: document?.title
				};
			})
		);
		return { summary, runs: rows };
	}
});

export const getGenerationJobInternal = internalQuery({
	args: { jobId: v.id('questionStudioJobs') },
	handler: async (ctx, { jobId }) => {
		const job = await ctx.db.get(jobId);
		if (!job) return null;
		return await hydrateGenerationJob(ctx, job);
	}
});

export const claimGenerationJob = internalMutation({
	args: {
		jobId: v.id('questionStudioJobs'),
		clerkUserId: v.string(),
		documentId: v.id('contentLib'),
		moduleId: v.id('module'),
		total: v.number()
	},
	returns: v.boolean(),
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
			.first();
		const job = await ctx.db.get(args.jobId);
		if (!user || !job || !['dev', 'admin', 'curator'].includes(user.role ?? ''))
			throw new Error('Unauthorized');
		assertJobBinding(job, user._id, args);
		if (await expireIfDue(ctx, job)) return false;
		if (job.status !== 'queued' || job.dismissedAt) throw new Error('Generation is not queued');
		if (user.role !== 'dev' && user.cohortId !== job.cohortId) throw new Error('Unauthorized');
		await ctx.db.patch(job._id, { status: 'running', updatedAt: Date.now() });

		await ctx.scheduler.runAfter(0, internal.aiTelemetry.capture, {
			event: 'question_generation_started',
			distinctId: args.clerkUserId,
			properties: {
				job_id: job._id,
				requested_count: job.requestedCount,
				harness_version: HARNESS_VERSION
			}
		});
		return true;
	}
});

export const claimWorker = internalMutation({
	args: { jobId: v.id('questionStudioJobs'), workerIndex: v.number() },
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (
			!job ||
			job.status !== 'running' ||
			job.dismissedAt ||
			job.claimedWorkers?.includes(args.workerIndex)
		)
			return null;
		if (await expireIfDue(ctx, job)) return null;
		await ctx.db.patch(job._id, {
			claimedWorkers: [...(job.claimedWorkers ?? []), args.workerIndex],
			workerStates: openWorkerState(job.workerStates, args.workerIndex, Date.now())
		});
		return {
			deadlineAt: generationDeadline(job),
			sourceIndexedAt: job.sourceIndexedAt,
			sourceMode: job.sourceMode,
			selectedPageNumbers: job.selectedPageNumbers
		};
	}
});

export const expireGenerationJob = internalMutation({
	args: { jobId: v.id('questionStudioJobs') },
	returns: v.null(),
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (job) await expireIfDue(ctx, job);
		return null;
	}
});
