import { omit } from 'convex-helpers';
import { WorkflowManager, start, vWorkflowId, vResultValidator } from '@convex-dev/workflow';
import { v } from 'convex/values';
import { components, internal } from './_generated/api';
import { internalMutation, internalQuery } from './_generated/server';
import schema from './schema';

const workflow = new WorkflowManager(components.workflow, {
	workpoolOptions: { maxParallelism: 3, retryActionsByDefault: false }
});
export const ingest = workflow
	.define({ args: { jobId: v.id('documentIngestionJobs') }, returns: v.null() })
	.handler(async (step, args): Promise<null> => {
		await step.runAction(internal.documentIngestionActions.submit, args, { retry: false });
		for (let i = 0; i < 240; i++) {
			const done: boolean = await step.runAction(internal.documentIngestionActions.poll, args, {
				runAfter: 5000,
				retry: { maxAttempts: 3, initialBackoffMs: 5000, base: 2 }
			});
			if (done) {
				await step.runAction(internal.ragKnowledge.indexing.finishDocumentIndex, args, {
					retry: false
				});
				return null;
			}
		}
		throw new Error(
			'Processing is taking longer than expected. Resume this document to check the existing request.'
		);
	});
export const begin = internalMutation({
	args: { documentId: v.id('contentLib'), actor: v.string() },
	returns: v.id('documentIngestionJobs'),
	handler: async (ctx, args) => {
		const doc = await ctx.db.get(args.documentId);
		if (!doc || doc.deletedAt) throw new Error('Document not found');
		const previous = doc.metadata?.ingestionJobId
			? await ctx.db.get(doc.metadata.ingestionJobId)
			: null;
		if (previous && previous.status !== 'failed') return previous._id;
		if (
			previous &&
			previous.reservedCents !== undefined &&
			!previous.artifactKey &&
			(!previous.checkUrl || Date.now() - previous.createdAt > 55 * 60_000)
		)
			throw new Error(
				'This request needs administrator review before another paid conversion. No duplicate request was submitted.'
			);
		const jobId = previous
			? previous._id
			: await ctx.db.insert('documentIngestionJobs', {
					...args,
					status: 'queued',
					createdAt: Date.now()
				});
		if (previous) await ctx.db.patch(jobId, { status: 'queued', error: undefined });
		const workflowId = await start(
			ctx,
			internal.documentIngestion.ingest,
			{ jobId },
			{ onComplete: internal.documentIngestion.onComplete, context: { jobId } }
		);
		await ctx.db.patch(jobId, { workflowId });
		await ctx.db.patch(doc._id, {
			metadata: {
				...doc.metadata,
				ingestionJobId: jobId,
				ingestionStatus: 'indexing',
				ingestionStage: 'queued',
				indexError: undefined
			},
			updatedAt: Date.now()
		});
		return jobId;
	}
});
export const getJob = internalQuery({
	args: { jobId: v.id('documentIngestionJobs') },
	returns: schema.tables.documentIngestionJobs.validator,
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (!job) throw new Error('Processing job not found');
		return omit(job, ['_id', '_creationTime']);
	}
});
export const reserve = internalMutation({
	args: { jobId: v.id('documentIngestionJobs'), expectedPages: v.number() },
	returns: v.null(),
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (!job) throw new Error('Job missing');
		if (job.reservedCents !== undefined)
			throw new Error(
				'Submission already reserved; administrator review required before another paid attempt'
			);
		if (!Number.isInteger(args.expectedPages) || args.expectedPages < 1 || args.expectedPages > 150)
			throw new Error('Invalid PDF page count');
		const d = new Date(),
			m = d.getUTCMonth(),
			period = `${d.getUTCFullYear()}-${m < 5 ? 'spring' : m < 7 ? 'summer' : 'fall'}`;
		const reservedCents = Math.ceil(args.expectedPages * 0.4);
		const budget = await ctx.db
			.query('parsingBudgets')
			.withIndex('by_period', (q) => q.eq('period', period))
			.unique();
		if ((budget?.reservedCents ?? 0) + reservedCents > 2000)
			throw new Error('The semester parsing budget has been reached. Contact an administrator.');
		if (budget)
			await ctx.db.patch(budget._id, { reservedCents: budget.reservedCents + reservedCents });
		else await ctx.db.insert('parsingBudgets', { period, reservedCents });
		await ctx.db.patch(job._id, { expectedPages: args.expectedPages, reservedCents, period });
		return null;
	}
});
/** Only call after a definite submission rejection, never a timeout or unknown outcome. */
export const releaseRejected = internalMutation({
	args: { jobId: v.id('documentIngestionJobs') },
	returns: v.null(),
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (!job || job.checkUrl || job.artifactKey)
			throw new Error('Cannot release an accepted request');
		if (job.reservedCents === undefined || !job.period) return null;
		const budget = await ctx.db
			.query('parsingBudgets')
			.withIndex('by_period', (q) => q.eq('period', job.period!))
			.unique();
		if (!budget || budget.reservedCents < job.reservedCents)
			throw new Error('Budget reservation mismatch');
		await ctx.db.patch(budget._id, { reservedCents: budget.reservedCents - job.reservedCents });
		await ctx.db.patch(job._id, { reservedCents: undefined, period: undefined });
		return null;
	}
});
export const progress = internalMutation({
	args: {
		jobId: v.id('documentIngestionJobs'),
		status: v.union(v.literal('processing'), v.literal('indexing'), v.literal('complete')),
		checkUrl: v.optional(v.string()),
		artifactKey: v.optional(v.string()),
		costCents: v.optional(v.number())
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (!job) throw new Error('Job missing');
		const doc = await ctx.db.get(job.documentId);
		if (!doc || doc.deletedAt || doc.metadata?.ingestionJobId !== job._id)
			throw new Error('Document removed or processing superseded');
		const { jobId, ...patch } = args;
		await ctx.db.patch(
			jobId,
			Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
		);
		await ctx.db.patch(doc._id, {
			metadata: { ...doc.metadata, ingestionStage: args.status },
			updatedAt: Date.now()
		});
		return null;
	}
});
export const onComplete = internalMutation({
	args: {
		workflowId: vWorkflowId,
		result: vResultValidator,
		context: v.object({ jobId: v.id('documentIngestionJobs') })
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.context.jobId);
		if (!job || job.workflowId !== args.workflowId) return null;
		if (args.result.kind === 'success') return null;
		const detail =
			args.result.kind === 'failed'
				? args.result.error
				: 'Document processing was interrupted. You can resume it from the library.';
		const error = /semester parsing budget/.test(detail)
			? 'The semester parsing budget has been reached. Contact an administrator.'
			: 'Processing could not finish. Try resuming this document, or contact an administrator if it keeps failing.';
		await ctx.db.patch(job._id, { status: 'failed', error: detail });
		const doc = await ctx.db.get(job.documentId);
		if (doc && !doc.deletedAt && doc.metadata?.ingestionJobId === job._id)
			await ctx.db.patch(doc._id, {
				metadata: {
					...doc.metadata,
					ingestionStatus: doc.metadata.ragEntryId ? 'indexed' : 'failed',
					ingestionStage: 'failed',
					indexError: error
				},
				updatedAt: Date.now()
			});
		return null;
	}
});
