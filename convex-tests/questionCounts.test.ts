import { expect, test } from 'vitest';
import { api, internal } from '../src/convex/_generated/api';
import { setup } from './questionStudio.fixtures';

async function fixture() {
	const base = await setup();
	const classId = await base.t.run(async (ctx) => {
		await ctx.db.patch(base.ids.moduleId, { status: 'published' });
		return (await ctx.db.get(base.ids.moduleId))!.classId;
	});
	const question = (status: string, order: number) => ({
		moduleId: base.ids.moduleId,
		type: 'multiple_choice',
		stem: `Question ${order}`,
		options: [{ text: 'A' }, { text: 'B' }],
		correctAnswers: ['0'],
		rationale: 'A is correct because of the findings.',
		aiGenerated: false,
		status,
		order,
		metadata: {},
		updatedAt: 1
	});
	const counts = async () => {
		const module = (await base.t.run((ctx) => ctx.db.get(base.ids.moduleId)))!;
		return { all: module.questionCount, published: module.publishedQuestionCount };
	};
	return { ...base, classId, question, counts };
}

test('drafts count for staff but not for students', async () => {
	const { owner, ids, classId, question, counts } = await fixture();
	const draftId = await owner.mutation(api.questions.write.insertQuestion, question('draft', 0));
	expect(await counts()).toEqual({ all: 1, published: 0 });
	await owner.mutation(api.questions.write.insertQuestion, question('published', 1));
	expect(await counts()).toEqual({ all: 2, published: 1 });

	const [studentModule] = await owner.query(api.module.getClassModules, { id: classId });
	expect(studentModule.questionCount).toBe(1);
	const [staffModule] = await owner.query(api.module.getAdminModulesWithQuestionCounts, {
		classId
	});
	expect(staffModule.questionCount).toBe(2);

	await owner.mutation(api.questions.bulk.bulkUpdateQuestionStatus, {
		questionIds: [draftId],
		moduleId: ids.moduleId,
		status: 'published'
	});
	expect(await counts()).toEqual({ all: 2, published: 2 });

	const { moduleId, type, stem, rationale } = question('draft', 0);
	await owner.mutation(api.questions.write.updateQuestion, {
		questionId: draftId,
		moduleId,
		type,
		stem,
		options: [{ text: 'A' }, { text: 'B' }],
		correctAnswers: ['0'],
		rationale,
		status: 'draft'
	});
	expect(await counts()).toEqual({ all: 2, published: 1 });
});

test('the backfill sets the published count on older modules', async () => {
	const { t, owner, ids, classId, question, counts } = await fixture();
	await owner.mutation(api.questions.write.insertQuestion, question('published', 0));
	await owner.mutation(api.questions.write.insertQuestion, question('draft', 1));
	await t.run((ctx) => ctx.db.patch(ids.moduleId, { publishedQuestionCount: undefined }));

	// Until the backfill runs, older modules fall back to the full count.
	const [before] = await owner.query(api.module.getClassModules, { id: classId });
	expect(before.questionCount).toBe(2);

	await t.mutation(internal.migrations.modules.backfillPublishedQuestionCounts, {});
	expect(await counts()).toEqual({ all: 2, published: 1 });
});
