import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api, internal } from '../src/convex/_generated/api';
import { setup } from './questionStudio.fixtures';
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});
async function seedUploadMap() {
	const context = await setup();
	await context.t.run(async (ctx) => {
		await ctx.db.patch(context.ids.documentId, {
			updatedAt: 99,
			metadata: {
				indexedAt: 1,
				storageProvider: 'r2',
				ingestionStatus: 'mapped',
				ragEntryId: 'entry'
			}
		});
		await ctx.db.insert('questionStudioTopicMaps', {
			documentId: context.ids.documentId,
			cohortId: context.ids.cohortId,
			startPage: 1,
			endPage: 1,
			pageCount: 1,
			mappingVersion: 'older-prompt',
			sourceIndexedAt: 1,
			sourceDocumentUpdatedAt: 1,
			model: 'historical',
			createdAt: 2,
			updatedAt: 2,
			topics: [
				{
					topicId: 'saved',
					title: 'Saved',
					summary: 'Saved topic',
					pageNumbers: [1],
					learningObjectives: ['Recognize the term'],
					keyTerms: [],
					suggestedOrders: ['first'],
					estimatedQuestionCapacity: 1
				}
			]
		});
	});
	return context;
}

test('legacy topic maps are reused without relabeling old orders as new types', async () => {
	const { t, ids, owner } = await setup();
	const jobId = await owner.mutation(api.questionStudio.jobs.createGenerationJob, {
		documentId: ids.documentId,
		moduleId: ids.moduleId,
		requestedCount: 1
	});
	await t.run(async (ctx) => {
		await ctx.db.insert('questionStudioTopicMaps', {
			documentId: ids.documentId,
			cohortId: ids.cohortId,
			startPage: 1,
			endPage: 1,
			pageCount: 1,
			mappingVersion: 'complete-pages-v2',
			sourceIndexedAt: 1,
			sourceDocumentUpdatedAt: 1,
			model: 'historical',
			createdAt: 1,
			updatedAt: 1,
			topics: [
				{
					topicId: 'old',
					title: 'Old topic',
					summary: 'Old source map',
					pageNumbers: [1],
					learningObjectives: ['Recognize a term'],
					keyTerms: [],
					suggestedOrders: ['second'],
					estimatedQuestionCapacity: 1
				}
			]
		});
		await ctx.db.patch(jobId, { status: 'ready' });
		await ctx.db.insert('questionStudioJobCandidates', {
			jobId,
			cohortId: ids.cohortId,
			index: 0,
			createdAt: 1,
			candidate: {
				type: 'multiple_choice',
				stem: 'A previous draft question',
				options: ['A', 'B', 'C', 'D'],
				correctAnswers: ['A'],
				rationale: 'A previous explanation.',
				reasoningOrder: 'second',
				topicId: 'old',
				topicTitle: 'Old topic',
				sourcePageNumbers: [1],
				duplicateRisk: 'low',
				similarQuestionIds: [],
				metadata: {
					model: 'historical',
					harnessVersion: 'evidence-v3',
					sourceDocumentId: ids.documentId
				}
			}
		});
	});
	expect(
		await owner.query(api.questionStudio.context.getLatestSavedTopicMap, {
			documentId: ids.documentId,
			moduleId: ids.moduleId
		})
	).toMatchObject({ topics: [{ topicId: 'old', learningObjectives: ['Recognize a term'] }] });
	const job = await owner.query(api.questionStudio.jobs.getGenerationJob, { jobId });
	expect(job?.candidates[0].reasoningOrder).toBe('second');
	expect(job?.candidates[0].questionType).toBeUndefined();
	await expect(
		owner.mutation(api.questionStudio.saving.saveSelectedCandidates, {
			jobId,
			documentId: ids.documentId,
			moduleId: ids.moduleId,
			candidateIndexes: [0],
			status: 'draft'
		})
	).rejects.toThrow('older quality harness');
});
test('selection reuses old prompt maps across renames and never starts mapping', async () => {
	const { t, ids, owner } = await seedUploadMap();
	for (let i = 0; i < 3; i++) {
		const map = await owner.query(api.questionStudio.context.getLatestSavedTopicMap, {
			documentId: ids.documentId,
			moduleId: ids.moduleId
		});
		expect(map?.topics[0].topicId).toBe('saved');
		expect(map?.topics[0].suggestedTypes).toBeUndefined();
	}
	expect(await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect())).toEqual([]);
});

test('duplicate upload mapping returns from cache before fetching source text', async () => {
	const { t, ids } = await seedUploadMap();
	const fetchMock = vi.fn(() => {
		throw new Error('Must not fetch');
	});
	vi.stubGlobal('fetch', fetchMock);
	try {
		expect(
			await t.action(internal.questionStudio.mapping.autoMapIndexedDocument, {
				documentId: ids.documentId
			})
		).toEqual({ status: 'cached' });
		expect(fetchMock).not.toHaveBeenCalled();
	} finally {
		vi.unstubAllGlobals();
	}
});

test('a failed upload map only retries after an explicit reset', async () => {
	const { t, ids } = await setup();
	await t.run((ctx) =>
		ctx.db.patch(ids.documentId, {
			metadata: {
				indexedAt: 1,
				ingestionStatus: 'indexed',
				storageProvider: 'r2',
				ragEntryId: 'entry'
			}
		})
	);
	const args = { documentId: ids.documentId, sourceIndexedAt: 1 };
	const results = await Promise.all([
		t.mutation(internal.questionStudio.mappingState.claimDocumentTopicMapping, args),
		t.mutation(internal.questionStudio.mappingState.claimDocumentTopicMapping, args)
	]);
	expect(results.map((r) => r.status).sort()).toEqual(['claimed', 'skipped']);
	await t.mutation(internal.questionStudio.mappingState.failDocumentTopicMapping, {
		...args,
		error: 'Provider failed'
	});
	expect(
		await t.mutation(internal.questionStudio.mappingState.claimDocumentTopicMapping, args)
	).toEqual({
		status: 'skipped'
	});
	expect(
		await t.mutation(internal.questionStudio.mappingState.resetFailedDocumentTopicMapping, {
			documentId: ids.documentId
		})
	).toBe(true);
	expect(
		await t.mutation(internal.questionStudio.mappingState.resetFailedDocumentTopicMapping, {
			documentId: ids.documentId
		})
	).toBe(false);
	expect(
		await t.mutation(internal.questionStudio.mappingState.claimDocumentTopicMapping, args)
	).toEqual({ status: 'claimed' });
});

test('a new indexed revision cannot reuse a prior source map or be claimed by an old task', async () => {
	const { t, ids, owner } = await seedUploadMap();
	await t.run((ctx) =>
		ctx.db.patch(ids.documentId, { metadata: { indexedAt: 2, ingestionStatus: 'indexed' } })
	);
	expect(
		await owner.query(api.questionStudio.context.getLatestSavedTopicMap, {
			documentId: ids.documentId,
			moduleId: ids.moduleId
		})
	).toBeNull();
	expect(
		await t.mutation(internal.questionStudio.mappingState.claimDocumentTopicMapping, {
			documentId: ids.documentId,
			sourceIndexedAt: 1
		})
	).toEqual({ status: 'skipped' });
	expect(
		await t.mutation(internal.questionStudio.mappingState.claimDocumentTopicMapping, {
			documentId: ids.documentId,
			sourceIndexedAt: 2
		})
	).toEqual({ status: 'claimed' });
});

test('index completion atomically schedules only one map for its source revision', async () => {
	const { t, ids } = await setup();
	const args = {
		documentId: ids.documentId,
		status: 'indexed' as const,
		indexedAt: 2,
		triggeredByClerkUserId: 'owner'
	};
	await t.mutation(internal.ragKnowledgeInternal.updateDocumentIngestion, args);
	await t.mutation(internal.ragKnowledgeInternal.updateDocumentIngestion, args);
	const scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
	expect(scheduled).toHaveLength(1);
	expect(scheduled[0].args).toEqual([
		{ documentId: ids.documentId, sourceIndexedAt: 2, triggeredByClerkUserId: 'owner' }
	]);
});

test('saving a map completes preparation atomically and ignores a later timeout', async () => {
	const { t, ids, owner } = await setup();
	await t.run((ctx) =>
		ctx.db.patch(ids.documentId, { metadata: { indexedAt: 1, ingestionStatus: 'indexed' } })
	);
	await t.mutation(internal.questionStudio.mappingState.claimDocumentTopicMapping, {
		documentId: ids.documentId,
		sourceIndexedAt: 1
	});
	await t.mutation(internal.questionStudio.mappingState.saveTopicMapForRange, {
		documentId: ids.documentId,
		cohortId: ids.cohortId,
		startPage: 1,
		endPage: 1,
		pageCount: 1,
		model: 'test',
		sourceIndexedAt: 1,
		sourceDocumentUpdatedAt: 1,
		topics: [
			{
				topicId: 'saved',
				title: 'Saved',
				summary: 'Saved',
				pageNumbers: [1],
				learningObjectives: ['A concept'],
				keyTerms: [],
				suggestedTypes: ['learn'],
				estimatedQuestionCapacity: 1
			}
		]
	});
	await t.mutation(internal.questionStudio.mappingState.failDocumentTopicMapping, {
		documentId: ids.documentId,
		sourceIndexedAt: 1,
		error: 'Late timeout'
	});
	const doc = await t.run((ctx) => ctx.db.get(ids.documentId));
	expect(doc?.metadata?.ingestionStatus).toBe('mapped');
	expect(doc?.metadata?.topicMapping?.status).toBe('complete');
	expect(
		(
			await owner.query(api.questionStudio.context.getLatestSavedTopicMap, {
				documentId: ids.documentId,
				moduleId: ids.moduleId
			})
		)?.topics
	).toHaveLength(1);
});
