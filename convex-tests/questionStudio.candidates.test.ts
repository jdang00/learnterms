import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api } from '../src/convex/_generated/api';
import { HARNESS_VERSION } from '../src/convex/questionStudio/quality';
import { setup } from './questionStudio.fixtures';
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

test('save uses server candidates, publishes questions and rejects replay', async () => {
	const { t, ids, owner } = await setup();
	const jobId = await owner.mutation(api.questionStudio.jobs.createGenerationJob, {
		documentId: ids.documentId,
		moduleId: ids.moduleId,
		requestedCount: 1
	});
	await t.run(async (ctx) => {
		await ctx.db.patch(jobId, { status: 'ready' });
		await ctx.db.insert('questionStudioJobCandidates', {
			jobId,
			cohortId: ids.cohortId,
			index: 0,
			createdAt: 1,
			candidate: {
				type: 'multiple_choice',
				stem: 'Which number is the sum of two and two?',
				options: ['Four', 'Five', 'Six', 'Seven'],
				correctAnswers: ['Four'],
				rationale: 'Adding two and two produces four.',
				questionType: 'learn',
				topicId: 'math',
				topicTitle: 'Addition',
				sourcePageNumbers: [1],
				sourceCitations: [
					{
						citationId: 'p1c0',
						pageNumber: 1,
						noteFile: 'test',
						chunkTitle: 'Addition',
						chunkIndex: 0,
						quote: 'Two plus two equals four.'
					}
				],
				duplicateRisk: 'low',
				similarQuestionIds: [],
				metadata: {
					model: 'test',
					jobId,
					harnessVersion: HARNESS_VERSION,
					sourceDocumentId: ids.documentId
				}
			}
		});
	});
	const result = await owner.mutation(api.questionStudio.saving.saveSelectedCandidates, {
		jobId,
		documentId: ids.documentId,
		moduleId: ids.moduleId,
		candidateIndexes: [0],
		status: 'draft'
	});
	expect(result.insertedCount).toBe(1);
	const question = await t.run((ctx) => ctx.db.get(result.insertedIds[0]));
	expect(question?.status).toBe('published');
	expect(question?.searchText).toContain(' published ');
	expect(question?.metadata.generation?.questionType).toBe('learn');
	expect(question?.metadata.generation?.reasoningOrder).toBeUndefined();
	expect(question?.metadata.generation?.jobId).toBe(jobId);
	expect(question?.metadata.generation?.sourceCitations?.[0].quote).toBe(
		'Two plus two equals four.'
	);
	await owner.mutation(api.question.updateQuestion, {
		questionId: question!._id,
		moduleId: ids.moduleId,
		type: question!.type,
		stem: question!.stem,
		options: question!.options,
		correctAnswers: question!.correctAnswers,
		rationale: 'Two pairs combine to make four.',
		status: 'published'
	});
	const editedQuestion = await t.run((ctx) => ctx.db.get(question!._id));
	expect(editedQuestion?.rationale).toBe('Two pairs combine to make four.');
	expect(editedQuestion?.metadata.generation).toEqual(question?.metadata.generation);

	await expect(
		owner.mutation(api.questionStudio.saving.saveSelectedCandidates, {
			jobId,
			documentId: ids.documentId,
			moduleId: ids.moduleId,
			candidateIndexes: [0]
		})
	).rejects.toThrow('already saved');
	await expect(
		t
			.withIdentity({ subject: 'other' })
			.mutation(api.questionStudio.saving.saveSelectedCandidates, {
				jobId,
				documentId: ids.documentId,
				moduleId: ids.moduleId,
				candidateIndexes: [0]
			})
	).rejects.toThrow('not available');
});
test('curator edits preserve provenance, reject stale/foreign edits, and save the edited answer', async () => {
	const { t, ids, owner } = await setup();
	const jobId = await owner.mutation(api.questionStudio.jobs.createGenerationJob, {
		documentId: ids.documentId,
		moduleId: ids.moduleId,
		requestedCount: 1
	});
	const candidate = {
		type: 'multiple_choice' as const,
		stem: 'Which number is the sum of two and two?',
		options: ['Four', 'Five', 'Six', 'Seven'],
		correctAnswers: ['Four'],
		rationale: 'Adding two and two produces four.',
		questionType: 'learn' as const,
		topicId: 'math',
		topicTitle: 'Addition',
		sourcePageNumbers: [1],
		sourceCitations: [
			{
				citationId: 'p1c0',
				pageNumber: 1,
				noteFile: 'test',
				chunkTitle: 'Addition',
				chunkIndex: 0,
				quote: 'Two plus two equals four.'
			}
		],
		duplicateRisk: 'low' as const,
		similarQuestionIds: [],
		metadata: {
			model: 'test',
			jobId,
			harnessVersion: HARNESS_VERSION,
			sourceDocumentId: ids.documentId
		}
	};
	const rowId = await t.run(async (ctx) => {
		await ctx.db.patch(jobId, { status: 'ready' });
		return await ctx.db.insert('questionStudioJobCandidates', {
			jobId,
			cohortId: ids.cohortId,
			index: 0,
			createdAt: 1,
			candidate
		});
	});
	const edit = {
		jobId,
		candidateIndex: 0,
		expectedRevision: 0,
		stem: 'Select the sum of two plus two.',
		options: ['Five', 'Four', 'Six', 'Seven'],
		answerIndex: 1,
		rationale: 'Adding two and two gives four.'
	};
	await expect(
		t.withIdentity({ subject: 'other' }).mutation(api.questionStudio.saving.editCandidate, edit)
	).rejects.toThrow('not available');
	await expect(
		owner.mutation(api.questionStudio.saving.editCandidate, {
			...edit,
			options: ['Four', 'four', 'Six', 'Seven']
		})
	).rejects.toThrow('distinct options');
	await expect(
		owner.mutation(api.questionStudio.saving.editCandidate, { ...edit, answerIndex: 4 })
	).rejects.toThrow('correct answer');
	const edited = await owner.mutation(api.questionStudio.saving.editCandidate, edit);
	expect(edited.correctAnswers).toEqual(['Four']);
	expect(edited.sourceCitations).toEqual(candidate.sourceCitations);
	expect(edited.metadata.curatorRevision).toBe(1);
	expect((await t.run((ctx) => ctx.db.get(rowId)))?.originalCandidate).toEqual(candidate);
	await expect(owner.mutation(api.questionStudio.saving.editCandidate, edit)).rejects.toThrow(
		'another window'
	);
	const saved = await owner.mutation(api.questionStudio.saving.saveSelectedCandidates, {
		jobId,
		moduleId: ids.moduleId,
		documentId: ids.documentId,
		candidateIndexes: [0]
	});
	const question = await t.run((ctx) => ctx.db.get(saved.insertedIds[0]));
	expect(question?.stem).toBe(edit.stem);
	expect(question?.options.find((option) => option.id === question.correctAnswers[0])?.text).toBe(
		'Four'
	);
	expect(question?.status).toBe('published');
	expect(question?.metadata.generation?.questionType).toBe('learn');
	expect(question?.metadata.generation?.reasoningOrder).toBeUndefined();
	expect(question?.metadata.generation?.curatorRevision).toBe(1);
	await expect(
		owner.mutation(api.questionStudio.saving.editCandidate, { ...edit, expectedRevision: 1 })
	).rejects.toThrow('already saved');
});

test('publishing older all-A AI drafts balances keys, preserves IDs and blocks source-framed rationales', async () => {
	const { t, ids, owner } = await setup();
	const questionIds = await t.run(async (ctx) => {
		const result = [];
		for (let order = 0; order < 12; order++) {
			result.push(
				await ctx.db.insert('question', {
					moduleId: ids.moduleId,
					order,
					type: 'multiple_choice',
					stem: `Arithmetic practice ${order}`,
					options: [
						{ id: 'correct', text: 'Four' },
						{ id: 'b', text: 'Five' },
						{ id: 'c', text: 'Six' },
						{ id: 'd', text: 'Seven' }
					],
					correctAnswers: ['correct'],
					rationale: 'Two pairs combine to make four.',
					aiGenerated: true,
					status: 'draft',
					metadata: {},
					updatedAt: 1
				})
			);
		}
		return result;
	});
	const result = await owner.mutation(api.question.bulkUpdateQuestionStatus, {
		moduleId: ids.moduleId,
		questionIds,
		status: 'published'
	});
	expect(result.updatedCount).toBe(12);
	const questions = await t.run(async (ctx) =>
		Promise.all(questionIds.map((id) => ctx.db.get(id)))
	);
	const positions = questions.map((q) =>
		q!.options.findIndex((o) => o.id === q!.correctAnswers[0])
	);
	for (let i = 0; i < 4; i++) expect(positions.filter((p) => p === i)).toHaveLength(3);
	for (const q of questions)
		expect(q!.options.find((o) => o.id === q!.correctAnswers[0])?.text).toBe('Four');
	await t.run((ctx) =>
		ctx.db.patch(questionIds[0], {
			status: 'draft',
			rationale: 'According to the PDF, two pairs make four.'
		})
	);
	const rejected = await owner.mutation(api.question.bulkUpdateQuestionStatus, {
		moduleId: ids.moduleId,
		questionIds: [questionIds[0]],
		status: 'published'
	});
	expect(rejected.updatedCount).toBe(0);
	expect(rejected.errors.join(' ')).toContain('standalone teaching rationale');
	expect((await t.run((ctx) => ctx.db.get(questionIds[0])))?.status).toBe('draft');
});
