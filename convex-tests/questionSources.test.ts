import { expect, test } from 'vitest';
import { api } from '../src/convex/_generated/api';
import { setup } from './questionStudio.fixtures';

async function fixture() {
	const base = await setup();
	await base.t.run(async (ctx) => {
		await ctx.db.patch(base.ids.moduleId, { status: 'published' });
		await ctx.db.patch(base.ids.documentId, {
			title: 'Lecture notes',
			metadata: { indexedAt: 1, storageProvider: 'r2', ingestionStatus: 'indexed', pageCount: 10 }
		});
	});
	const args = {
		moduleId: base.ids.moduleId,
		type: 'multiple_choice',
		stem: 'Which answer is correct?',
		options: [{ text: 'A' }, { text: 'B' }],
		correctAnswers: ['0'],
		rationale: 'A is correct because of the evidence.',
		aiGenerated: false,
		status: 'published',
		order: 0,
		metadata: {},
		updatedAt: 1
	};
	const source = {
		sourceDocumentId: base.ids.documentId,
		sourcePageNumbers: [3, 1, 3],
		sourceTitle: 'Untrusted title'
	};
	return { ...base, args, source };
}

test('manual sources are optional, canonicalized, editable and removable', async () => {
	const { t, owner, args, source } = await fixture();
	const plainId = await owner.mutation(api.question.insertQuestion, args);
	expect((await t.run((ctx) => ctx.db.get(plainId)))?.metadata).toEqual({});
	const questionId = await owner.mutation(api.question.insertQuestion, { ...args, source });
	let question = (await t.run((ctx) => ctx.db.get(questionId)))!;
	expect(question.aiGenerated).toBe(false);
	expect(question.metadata.generation).toBeUndefined();
	expect(question.metadata.source).toEqual({
		...source,
		sourcePageNumbers: [1, 3],
		sourceTitle: 'Lecture notes'
	});
	const update = {
		questionId,
		moduleId: args.moduleId,
		type: args.type,
		stem: args.stem,
		options: question.options,
		correctAnswers: question.correctAnswers,
		rationale: args.rationale,
		status: args.status
	};
	await owner.mutation(api.question.updateQuestion, update);
	expect((await t.run((ctx) => ctx.db.get(questionId)))?.metadata.source).toEqual(
		question.metadata.source
	);
	await owner.mutation(api.question.updateQuestion, {
		...update,
		source: { ...source, sourcePageNumbers: [5] }
	});
	question = (await t.run((ctx) => ctx.db.get(questionId)))!;
	expect(question.metadata.source?.sourcePageNumbers).toEqual([5]);
	await owner.mutation(api.question.updateQuestion, { ...update, source: null });
	expect((await t.run((ctx) => ctx.db.get(questionId)))?.metadata.source).toBeUndefined();
});

test('invalid pages and unavailable or foreign documents are rejected atomically', async () => {
	const { t, ids, owner, args, source } = await fixture();
	for (const pages of [[], [0], [11], [1.5]]) {
		await expect(
			owner.mutation(api.question.insertQuestion, {
				...args,
				source: { ...source, sourcePageNumbers: pages }
			})
		).rejects.toThrow('valid pages');
	}
	await t.run(async (ctx) => {
		const cohort = (await ctx.db.get(ids.cohortId))!;
		const { _id, _creationTime, ...fields } = cohort;
		void _id;
		void _creationTime;
		const otherId = await ctx.db.insert('cohort', { ...fields, name: 'Other cohort' });
		await ctx.db.patch(ids.documentId, { cohortId: otherId });
	});
	await expect(owner.mutation(api.question.insertQuestion, { ...args, source })).rejects.toThrow(
		'another cohort'
	);
	await t.run((ctx) => ctx.db.patch(ids.documentId, { cohortId: ids.cohortId, deletedAt: 1 }));
	await expect(owner.mutation(api.question.insertQuestion, { ...args, source })).rejects.toThrow(
		'unavailable'
	);
	expect(await t.run((ctx) => ctx.db.query('question').collect())).toHaveLength(0);
});

test('test attempts retain manual source chips in their snapshots', async () => {
	const { t, ids, owner, args, source } = await fixture();
	await owner.mutation(api.question.insertQuestion, { ...args, source });
	const classId = await t.run(async (ctx) => (await ctx.db.get(ids.moduleId))!.classId);
	await owner.mutation(api.customQuiz.createCustomQuizAttempt, {
		classId,
		moduleIds: [ids.moduleId],
		questionCount: 1,
		sourceFilter: 'all',
		shuffleQuestions: false,
		shuffleOptions: false,
		passThresholdPct: 70
	});
	const items = await t.run((ctx) => ctx.db.query('quizAttemptItems').collect());
	expect(items).toHaveLength(1);
	expect(items[0].questionSnapshot.source).toEqual({
		...source,
		sourceTitle: 'Lecture notes',
		sourcePageNumbers: [1, 3]
	});
});
