import { expect, test } from 'vitest';
import { api } from '../src/convex/_generated/api';
import { setup } from './questionStudio.fixtures';

async function fixture() {
	const base = await setup();
	await base.t.run((ctx) => ctx.db.patch(base.ids.moduleId, { status: 'published' }));
	const args = {
		moduleId: base.ids.moduleId,
		type: 'multiple_choice',
		stem: 'What is the most likely diagnosis?',
		options: [{ text: 'A' }, { text: 'B' }],
		correctAnswers: ['0'],
		rationale: 'A is correct because of the findings.',
		aiGenerated: false,
		status: 'published',
		order: 0,
		metadata: {},
		updatedAt: 1
	};
	const findings = [
		{
			test: 'iop',
			title: ' IOP ',
			values: { 'od.pressure': ' 32 ', 'os.pressure': '', junk: 'x' }
		},
		{ test: 'pupils', values: {} }
	];
	return { ...base, args, findings };
}

test('exam findings are normalized on save, kept on untouched edits and cleared with null', async () => {
	const { t, owner, args, findings } = await fixture();
	const questionId = await owner.mutation(api.question.insertQuestion, {
		...args,
		examFindings: findings,
		examFindingsStyle: 'compact'
	});
	let question = (await t.run((ctx) => ctx.db.get(questionId)))!;
	expect(question.examFindings).toEqual([{ test: 'iop', values: { 'od.pressure': '32' } }]);
	expect(question.searchText).toContain('32');
	expect(question.examFindingsStyle).toBe('compact');

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
	question = (await t.run((ctx) => ctx.db.get(questionId)))!;
	expect(question.examFindings).toHaveLength(1);

	await owner.mutation(api.question.updateQuestion, {
		...update,
		examFindings: [
			{ test: 'aidedVa', title: 'VA cc', values: { 'od.distance': '20' }, note: ' Squinting ' }
		]
	});
	question = (await t.run((ctx) => ctx.db.get(questionId)))!;
	expect(question.examFindings).toEqual([
		{ test: 'aidedVa', title: 'VA cc', values: { 'od.distance': '20' }, note: 'Squinting' }
	]);

	await owner.mutation(api.question.updateQuestion, { ...update, examFindings: null });
	question = (await t.run((ctx) => ctx.db.get(questionId)))!;
	expect(question.examFindings).toBeUndefined();
	expect(question.examFindingsStyle).toBeUndefined();
});

test('unknown tests and AI-generated questions are rejected', async () => {
	const { t, owner, args, findings } = await fixture();
	await expect(
		owner.mutation(api.question.insertQuestion, {
			...args,
			examFindings: [{ test: 'madeUp', values: { a: '1' } }]
		})
	).rejects.toThrow('Unknown exam test');
	await expect(
		owner.mutation(api.question.insertQuestion, {
			...args,
			aiGenerated: true,
			examFindings: findings
		})
	).rejects.toThrow('manually written');
	expect(await t.run((ctx) => ctx.db.query('question').collect())).toHaveLength(0);
});

test('practice test snapshots carry exam findings', async () => {
	const { t, ids, owner, args, findings } = await fixture();
	await owner.mutation(api.question.insertQuestion, { ...args, examFindings: findings });
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
	expect(items[0].questionSnapshot.examFindings).toEqual([
		{ test: 'iop', values: { 'od.pressure': '32' } }
	]);
});
