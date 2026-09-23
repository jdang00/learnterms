import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api, internal } from '../src/convex/_generated/api';
import { setup } from './questionStudio.fixtures';
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

test('page-mode scope survives resume and worker claims without a saved topic map', async () => {
	const { t, ids, owner } = await setup();
	const jobId = await owner.mutation(api.questionStudio.jobs.createGenerationJob, {
		documentId: ids.documentId,
		moduleId: ids.moduleId,
		requestedCount: 2,
		counts: { learn: 2, clinical: 0, criticalThinking: 0 },
		sourceMode: 'pages',
		selectedPageNumbers: [5, 2],
		sourceIndexedAt: 1
	});
	expect(await owner.query(api.questionStudio.jobs.getCurrentGenerationJob, {})).toMatchObject({
		_id: jobId,
		sourceMode: 'pages',
		selectedPageNumbers: [2, 5],
		sourceIndexedAt: 1
	});
	await t.mutation(internal.questionStudio.jobs.claimGenerationJob, {
		jobId,
		clerkUserId: 'owner',
		documentId: ids.documentId,
		moduleId: ids.moduleId,
		total: 2
	});
	expect(
		await t.mutation(internal.questionStudio.jobs.claimWorker, { jobId, workerIndex: 0 })
	).toMatchObject({ sourceMode: 'pages', selectedPageNumbers: [2, 5], sourceIndexedAt: 1 });
});

test('page runs reject stale, empty, duplicate, and out-of-range selections before replacing a run', async () => {
	const { t, ids, owner } = await setup();
	await t.run((ctx) => ctx.db.patch(ids.documentId, { metadata: { indexedAt: 1, pageCount: 5 } }));
	const jobId = await owner.mutation(api.questionStudio.jobs.createGenerationJob, {
		documentId: ids.documentId,
		moduleId: ids.moduleId,
		requestedCount: 1
	});
	const base = {
		documentId: ids.documentId,
		moduleId: ids.moduleId,
		requestedCount: 1,
		sourceMode: 'pages' as const,
		sourceIndexedAt: 1
	};
	for (const selectedPageNumbers of [[], [2, 2], [6], [1.5]]) {
		await expect(
			owner.mutation(api.questionStudio.jobs.createGenerationJob, { ...base, selectedPageNumbers })
		).rejects.toThrow('valid source pages');
	}
	await expect(
		owner.mutation(api.questionStudio.jobs.createGenerationJob, {
			...base,
			selectedPageNumbers: [2],
			sourceIndexedAt: 0
		})
	).rejects.toThrow('Source changed');
	expect((await owner.query(api.questionStudio.jobs.getCurrentGenerationJob, {}))?._id).toBe(jobId);
});

test('source preview rejects unauthenticated and cross-cohort access before fetching text', async () => {
	const { t, ids } = await setup();
	await expect(
		t.action(api.questionStudio.context.getSourcePages, { documentId: ids.documentId })
	).rejects.toThrow('Unauthorized');
	await t.run(async (ctx) => {
		await ctx.db.patch(ids.documentId, {
			metadata: {
				indexedAt: 1,
				storageProvider: 'r2',
				ingestionStatus: 'indexed',
				ragEntryId: 'entry'
			}
		});
		await ctx.db.insert('users', {
			name: 'Outside curator',
			clerkUserId: 'outside',
			role: 'curator',
			metadata: {},
			updatedAt: 1
		});
	});
	await expect(
		t
			.withIdentity({ subject: 'outside' })
			.action(api.questionStudio.context.getSourcePages, { documentId: ids.documentId })
	).rejects.toThrow('Unauthorized for this cohort');
});
