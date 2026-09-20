import workflow from '@convex-dev/workflow/test';
import { convexTest } from 'convex-test';
import { afterEach, expect, test, vi } from 'vitest';
import { api, internal } from '../src/convex/_generated/api';
import schema from '../src/convex/schema';
const modules = import.meta.glob('../src/convex/**/*.ts');
afterEach(() => vi.useRealTimers());
async function setup() {
	vi.useFakeTimers();
	const t = convexTest(schema, modules);
	workflow.register(t);
	const ids = await t.run(async (ctx) => {
		const schoolId = await ctx.db.insert('school', {
			name: 'test',
			description: 'test',
			metadata: {},
			updatedAt: 1
		});
		const cohortId = await ctx.db.insert('cohort', {
			name: 'test',
			metadata: {},
			updatedAt: 1,
			schoolId,
			startYear: '2026',
			endYear: '2030'
		});
		const documentId = await ctx.db.insert('contentLib', {
			title: 'test',
			cohortId,
			updatedAt: 1,
			metadata: { storageProvider: 'r2', r2Key: 'test.pdf', mimeType: 'application/pdf' }
		});
		return { cohortId, documentId };
	});
	return { t, ...ids };
}
test('repeated start reuses one job without duplicate parsing', async () => {
	const { t, documentId } = await setup();
	const a = await t.mutation(internal.documentIngestion.begin, { documentId, actor: 'test' });
	const b = await t.mutation(internal.documentIngestion.begin, { documentId, actor: 'test' });
	expect(a).toBe(b);
	expect((await t.run((ctx) => ctx.db.query('documentIngestionJobs').collect())).length).toBe(1);
});
test('budget reservation is atomic and cannot be repeated', async () => {
	const { t, documentId } = await setup();
	const jobId = await t.mutation(internal.documentIngestion.begin, { documentId, actor: 'test' });
	await t.mutation(internal.documentIngestion.reserve, { jobId, expectedPages: 7 });
	await expect(
		t.mutation(internal.documentIngestion.reserve, { jobId, expectedPages: 7 })
	).rejects.toThrow('already reserved');
	const budget = await t.run((ctx) => ctx.db.query('parsingBudgets').first());
	expect(budget?.reservedCents).toBe(3);
});
test('budget exhaustion prevents a paid submission reservation', async () => {
	const { t, documentId } = await setup();
	const jobId = await t.mutation(internal.documentIngestion.begin, { documentId, actor: 'test' });
	const d = new Date(),
		m = d.getUTCMonth();
	await t.run((ctx) =>
		ctx.db.insert('parsingBudgets', {
			period: `${d.getUTCFullYear()}-${m < 5 ? 'spring' : m < 7 ? 'summer' : 'fall'}`,
			reservedCents: 2000
		})
	);
	await expect(
		t.mutation(internal.documentIngestion.reserve, { jobId, expectedPages: 7 })
	).rejects.toThrow('semester parsing budget');
	expect(
		(await t.query(internal.documentIngestion.getJob, { jobId })).reservedCents
	).toBeUndefined();
});
test('unauthenticated callers cannot initiate parsing', async () => {
	const { t, documentId } = await setup();
	await expect(t.action(api.ragKnowledge.indexR2Document, { documentId })).rejects.toThrow(
		'Unauthorized'
	);
});
test('deleted documents reject later job updates', async () => {
	const { t, documentId } = await setup();
	const jobId = await t.mutation(internal.documentIngestion.begin, { documentId, actor: 'test' });
	await t.run((ctx) => ctx.db.patch(documentId, { deletedAt: Date.now() }));
	await expect(
		t.mutation(internal.documentIngestion.progress, {
			jobId,
			status: 'indexing',
			artifactKey: 'test'
		})
	).rejects.toThrow('removed');
});

test('definite rejections release budget once; accepted requests cannot release', async () => {
	const { t, documentId } = await setup();
	const jobId = await t.mutation(internal.documentIngestion.begin, { documentId, actor: 'test' });
	await t.mutation(internal.documentIngestion.reserve, { jobId, expectedPages: 7 });
	await t.mutation(internal.documentIngestion.releaseRejected, { jobId });
	await t.mutation(internal.documentIngestion.releaseRejected, { jobId });
	expect((await t.run((ctx) => ctx.db.query('parsingBudgets').first()))?.reservedCents).toBe(0);
	await t.mutation(internal.documentIngestion.reserve, { jobId, expectedPages: 7 });
	await t.mutation(internal.documentIngestion.progress, {
		jobId,
		status: 'processing',
		checkUrl: 'https://www.datalab.to/api/v1/convert/test'
	});
	await expect(t.mutation(internal.documentIngestion.releaseRejected, { jobId })).rejects.toThrow(
		'accepted request'
	);
});
