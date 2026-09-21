import { afterEach, expect, test, vi } from 'vitest';
import { internal } from '../src/convex/_generated/api';
import { setup } from './questionStudio.fixtures';
import { generationDeadline } from '../src/convex/questionStudio/deadline';
afterEach(() => vi.useRealTimers());

test('Learn deadline includes queue time and expires without relying on scheduler timing', async () => {
	vi.useFakeTimers();
	vi.setSystemTime(100_000);
	const { t, ids } = await setup();
	const jobId = await t.run((ctx) =>
		ctx.db.insert('questionStudioJobs', {
			documentId: ids.documentId,
			moduleId: ids.moduleId,
			cohortId: ids.cohortId,
			createdByUserId: ids.owner,
			kind: 'candidate_generation',
			status: 'running',
			statusText: 'Working',
			model: 'gpt-5.6-luna',
			requestedCount: 15,
			requestedCounts: { learn: 15, clinical: 0, criticalThinking: 0 },
			createdAt: 100_000,
			updatedAt: 100_000
		})
	);
	const first = await t.mutation(internal.questionStudio.claimWorker, { jobId, workerIndex: 0 });
	expect(first?.deadlineAt).toBe(145_000);
	vi.setSystemTime(145_000);
	await t.mutation(internal.questionStudio.updateGenerationJob, {
		jobId,
		status: 'ready',
		completed: true,
		candidates: []
	});
	const job = await t.run((ctx) => ctx.db.get(jobId));
	expect(job?.status).toBe('failed');
	expect(job?.completedAt).toBe(145_000);
	await t.mutation(internal.questionStudio.updateGenerationJob, {
		jobId,
		status: 'ready',
		completed: true
	});
	expect((await t.run((ctx) => ctx.db.get(jobId)))?.status).toBe('failed');
	await t.finishAllScheduledFunctions(vi.runAllTimers);
});

test('mixed-type generation retains its separate runtime policy', () => {
	expect(
		generationDeadline({
			createdAt: 100,
			requestedCount: 15,
			requestedCounts: { learn: 12, clinical: 3, criticalThinking: 0 }
		})
	).toBeUndefined();
});
