import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api, internal } from '../src/convex/_generated/api';
import { setup } from './questionStudio.fixtures';
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

test('foreign job claim cannot change status', async () => {
	const { t, ids, owner } = await setup();
	const jobId = await owner.mutation(api.questionStudio.jobs.createGenerationJob, {
		documentId: ids.documentId,
		moduleId: ids.moduleId,
		requestedCount: 3
	});
	await expect(
		t.mutation(internal.questionStudio.jobs.claimGenerationJob, {
			jobId,
			clerkUserId: 'other',
			documentId: ids.documentId,
			moduleId: ids.moduleId,
			total: 3
		})
	).rejects.toThrow();
	expect((await t.run((ctx) => ctx.db.get(jobId)))?.status).toBe('queued');
});
test('clear cancels work but retains the audit record', async () => {
	const { t, ids, owner } = await setup();
	const jobId = await owner.mutation(api.questionStudio.jobs.createGenerationJob, {
		documentId: ids.documentId,
		moduleId: ids.moduleId,
		requestedCount: 3
	});
	await owner.mutation(api.questionStudio.jobs.clearCurrentGenerationJob, {});
	const job = await t.run((ctx) => ctx.db.get(jobId));
	expect(job?.dismissedAt).toBeTruthy();
	expect(job?.status).toBe('failed');
	expect(
		await t.mutation(internal.questionStudio.jobs.claimWorker, { jobId, workerIndex: 0 })
	).toBeNull();
	expect(await owner.query(api.questionStudio.jobs.getCurrentGenerationJob, {})).toBeNull();
});
test('a worker can be claimed only once', async () => {
	const { t, ids, owner } = await setup();
	const jobId = await owner.mutation(api.questionStudio.jobs.createGenerationJob, {
		documentId: ids.documentId,
		moduleId: ids.moduleId,
		requestedCount: 3
	});
	await t.mutation(internal.questionStudio.jobs.claimGenerationJob, {
		jobId,
		clerkUserId: 'owner',
		documentId: ids.documentId,
		moduleId: ids.moduleId,
		total: 3
	});
	expect(
		await t.mutation(internal.questionStudio.jobs.claimWorker, { jobId, workerIndex: 0 })
	).not.toBeNull();
	expect(
		await t.mutation(internal.questionStudio.jobs.claimWorker, { jobId, workerIndex: 0 })
	).toBeNull();
});
test('completed worker retries do not duplicate events', async () => {
	const { t, ids, owner } = await setup();
	const jobId = await owner.mutation(api.questionStudio.jobs.createGenerationJob, {
		documentId: ids.documentId,
		moduleId: ids.moduleId,
		requestedCount: 3
	});
	await t.mutation(internal.questionStudio.jobs.claimGenerationJob, {
		jobId,
		clerkUserId: 'owner',
		documentId: ids.documentId,
		moduleId: ids.moduleId,
		total: 3
	});
	const result = {
		jobId,
		workerIndex: 0,
		workerTotal: 1,
		candidates: [],
		rawReturnedCount: 0,
		eventLabel: 'Worker complete'
	};
	await t.mutation(internal.questionStudio.jobUpdates.appendGenerationWorkerResult, result);
	await t.mutation(internal.questionStudio.jobUpdates.appendGenerationWorkerResult, result);
	const events = await t.run((ctx) =>
		ctx.db
			.query('questionStudioJobEvents')
			.withIndex('by_jobId', (q) => q.eq('jobId', jobId))
			.collect()
	);
	expect(events.filter((e) => e.label === 'Worker complete')).toHaveLength(1);
});
