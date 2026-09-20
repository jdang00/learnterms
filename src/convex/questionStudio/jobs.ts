import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalMutation, internalQuery, mutation, query } from '../_generated/server';
import { assertJobBinding } from './access';
import { assertSaveAccess, getActor } from './authorization';
import { hydrateGenerationJob } from './jobRows';
import { normalizeSelectedPages } from './pageSelection';
import { validateCounts } from './planning';
import { HARNESS_VERSION } from './quality';
import { MAX_GENERATED_QUESTIONS, QUESTION_STUDIO_MODEL } from './shared';

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
		const model = QUESTION_STUDIO_MODEL;
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
		await ctx.scheduler.runAfter(10 * 60_000, internal.questionStudio.expireGenerationJob, {
			jobId
		});
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
	returns: v.null(),
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
			.first();
		const job = await ctx.db.get(args.jobId);
		if (!user || !job || !['dev', 'admin', 'curator'].includes(user.role ?? ''))
			throw new Error('Unauthorized');
		assertJobBinding(job, user._id, args);
		if (user.role !== 'dev' && user.cohortId !== job.cohortId) throw new Error('Unauthorized');
		await ctx.db.patch(job._id, { status: 'running', updatedAt: Date.now() });
		await ctx.scheduler.runAfter(10 * 60_000, internal.questionStudio.expireGenerationJob, {
			jobId: job._id
		});
		await ctx.scheduler.runAfter(0, internal.aiTelemetry.capture, {
			event: 'question_generation_started',
			distinctId: args.clerkUserId,
			properties: {
				job_id: job._id,
				requested_count: job.requestedCount,
				harness_version: HARNESS_VERSION
			}
		});
		return null;
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
		await ctx.db.patch(job._id, {
			claimedWorkers: [...(job.claimedWorkers ?? []), args.workerIndex]
		});
		return {
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
		if (job && ['queued', 'running'].includes(job.status))
			await ctx.db.patch(job._id, {
				status: 'failed',
				statusText: 'Run timed out. Start a new run to retry.',
				completedAt: Date.now()
			});
		return null;
	}
});
