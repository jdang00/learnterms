import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

const MAX_RETRIES = 5;

export const getJobByDocumentId = query({
	args: { documentId: v.id('contentLib') },
	handler: async (ctx, args) => {
		return await ctx.db
			.query('pdfProcessingJobs')
			.withIndex('by_documentId', (q) => q.eq('documentId', args.documentId))
			.order('desc')
			.first();
	}
});

export const createJob = mutation({
	args: {
		documentId: v.id('contentLib'),
		pdfUrl: v.string(),
		fileKey: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('pdfProcessingJobs')
			.withIndex('by_documentId', (q) => q.eq('documentId', args.documentId))
			.filter((q) =>
				q.or(q.eq(q.field('status'), 'pending'), q.eq(q.field('status'), 'processing'))
			)
			.first();

		if (existing) {
			return { jobId: existing._id, alreadyExists: true };
		}

		const now = Date.now();
		const jobId = await ctx.db.insert('pdfProcessingJobs', {
			documentId: args.documentId,
			pdfUrl: args.pdfUrl,
			fileKey: args.fileKey,
			status: 'pending',
			progress: { chunksProcessed: 0, currentStep: 'Queued' },
			retryCount: 0,
			createdAt: now,
			updatedAt: now
		});

		await ctx.scheduler.runAfter(0, internal.pdfJobsAction.processNextJob, {});

		return { jobId, alreadyExists: false };
	}
});

export const updateJobProgress = internalMutation({
	args: {
		jobId: v.id('pdfProcessingJobs'),
		chunksProcessed: v.number(),
		totalChunks: v.optional(v.number()),
		currentStep: v.string()
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.jobId, {
			progress: {
				chunksProcessed: args.chunksProcessed,
				totalChunks: args.totalChunks,
				currentStep: args.currentStep
			},
			updatedAt: Date.now()
		});
	}
});

export const markJobProcessing = internalMutation({
	args: { jobId: v.id('pdfProcessingJobs') },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.jobId, {
			status: 'processing',
			progress: { chunksProcessed: 0, currentStep: 'Starting...' },
			updatedAt: Date.now()
		});
	}
});

export const markJobCompleted = internalMutation({
	args: { jobId: v.id('pdfProcessingJobs'), chunksCount: v.number() },
	handler: async (ctx, args) => {
		const now = Date.now();
		await ctx.db.patch(args.jobId, {
			status: 'completed',
			progress: {
				chunksProcessed: args.chunksCount,
				totalChunks: args.chunksCount,
				currentStep: 'Completed'
			},
			updatedAt: now,
			completedAt: now
		});
	}
});

export const markJobFailed = internalMutation({
	args: { jobId: v.id('pdfProcessingJobs'), error: v.string() },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.jobId, {
			status: 'failed',
			error: args.error,
			updatedAt: Date.now()
		});
	}
});

export const incrementRetry = internalMutation({
	args: { jobId: v.id('pdfProcessingJobs') },
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (!job) return { canRetry: false, retryCount: 0 };
		const newCount = job.retryCount + 1;
		await ctx.db.patch(args.jobId, {
			retryCount: newCount,
			updatedAt: Date.now()
		});
		return { canRetry: newCount < MAX_RETRIES, retryCount: newCount };
	}
});

export const insertChunk = internalMutation({
	args: {
		documentId: v.id('contentLib'),
		title: v.string(),
		summary: v.string(),
		content: v.string(),
		keywords: v.array(v.string()),
		chunk_type: v.string()
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert('chunkContent', {
			...args,
			metadata: {},
			updatedAt: Date.now()
		});
	}
});

export const getNextPendingJob = internalQuery({
	args: {},
	handler: async (ctx) => {
		const processingJob = await ctx.db
			.query('pdfProcessingJobs')
			.withIndex('by_status', (q) => q.eq('status', 'processing'))
			.first();
		if (processingJob) return null;

		return await ctx.db
			.query('pdfProcessingJobs')
			.withIndex('by_status', (q) => q.eq('status', 'pending'))
			.order('asc')
			.first();
	}
});

export const retryJob = mutation({
	args: { jobId: v.id('pdfProcessingJobs') },
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (!job || job.status !== 'failed') {
			throw new Error('Job not found or not in failed state');
		}

		await ctx.db.patch(args.jobId, {
			status: 'pending',
			error: undefined,
			retryCount: 0,
			progress: { chunksProcessed: 0, currentStep: 'Queued for retry' },
			updatedAt: Date.now()
		});

		await ctx.scheduler.runAfter(0, internal.pdfJobsAction.processNextJob, {});
		return { success: true };
	}
});
