import { afterEach, expect, test, vi } from 'vitest';
import { setup } from './questionStudio.fixtures';
import { api } from '../src/convex/_generated/api';
import { MASTERY_INTERVAL_MS } from '../src/lib/utils/studyMastery';

async function fixture() {
	const f = await setup();
	const questionId = await f.t.run((ctx) =>
		ctx.db.insert('question', {
			moduleId: f.ids.moduleId,
			stem: 'Recall',
			rationale: '',
			type: 'multiple_choice',
			options: [
				{ id: 'a', text: 'A' },
				{ id: 'b', text: 'B' }
			],
			correctAnswers: ['a'],
			metadata: {},
			status: 'published',
			aiGenerated: false,
			order: 0,
			updatedAt: 1
		})
	);
	const open = () => f.owner.mutation(api.studyProgress.open, { questionId });
	const reset = () =>
		f.owner.mutation(api.userProgress.clearUserProgressForModule, {
			userId: f.ids.owner,
			moduleId: f.ids.moduleId
		});
	const check = (
		attemptId: Awaited<ReturnType<typeof open>>['attemptId'],
		answer = 'a',
		submissionId = crypto.randomUUID()
	) =>
		f.owner.mutation(api.studyProgress.check, {
			attemptId,
			selectedOptions: [answer],
			submissionId
		});
	const summary = () => f.owner.query(api.studyProgress.getForModule, { moduleId: f.ids.moduleId });
	return { ...f, questionId, open, check, summary, reset };
}
afterEach(() => vi.useRealTimers());

test('completed runs separated by 30 minutes earn mastery; retries, reopening and early runs do not', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1000000);
	const f = await fixture();
	const first = await f.open();
	expect((await f.check(first.attemptId)).evidence.cleanRecallCount).toBe(1);
	await f.check(first.attemptId);
	expect(await f.t.run((ctx) => ctx.db.query('studyChecks').collect())).toHaveLength(1);
	vi.setSystemTime(1000000 + MASTERY_INTERVAL_MS - 1);
	await f.reset();
	const early = await f.open();
	expect((await f.check(early.attemptId)).evidence.masteredAt).toBeUndefined();
	vi.setSystemTime(1000000 + MASTERY_INTERVAL_MS);
	await f.reset();
	const second = await f.open();
	const result = await f.check(second.attemptId, 'a', 'second');
	expect(result.evidence.cleanRecallCount).toBe(2);
	expect(result.evidence.masteredAt).toBe(Date.now());
	expect((await f.check(second.attemptId, 'a', 'second')).evidence).toEqual(result.evidence);
	vi.setSystemTime(Date.now() + 100 * MASTERY_INTERVAL_MS);
	expect((await f.summary())[0].masteredAt).toBe(result.evidence.masteredAt);
	await f.reset();
	const wrong = await f.open();
	const lost = await f.check(wrong.attemptId, 'b');
	expect(lost.evidence).toMatchObject({
		latestCorrect: false,
		cleanRecallCount: 0,
		lastMasteredAt: result.evidence.masteredAt
	});
	expect(lost.evidence.masteredAt).toBeUndefined();
});

test('reveals and corrected retries count as checked but never as unaided recalls', async () => {
	const f = await fixture();
	const attempt = await f.open();
	await f.owner.mutation(api.studyProgress.reveal, { attemptId: attempt.attemptId });
	expect((await f.check(attempt.attemptId)).evidence).toMatchObject({
		latestCorrect: true,
		cleanRecallCount: 0
	});
	await f.reset();
	const retry = await f.open();
	await f.check(retry.attemptId, 'b');
	expect((await f.check(retry.attemptId)).evidence).toMatchObject({
		latestCorrect: true,
		cleanRecallCount: 0
	});
	expect((await f.open()).selectedOptions).toEqual(['a']);
	await f.reset();
	expect((await f.open()).selectedOptions).toEqual([]);
});

test('saved selections and flags cannot grant mastery; reset invalidates tokens and retains attempts', async () => {
	const f = await fixture();
	const classId = (await f.t.run((ctx) => ctx.db.get(f.ids.moduleId)))!.classId;
	await f.owner.mutation(api.userProgress.saveUserProgress, {
		userId: f.ids.owner,
		classId,
		questionId: f.questionId,
		selectedOptions: ['a'],
		isFlagged: true,
		isMastered: true
	});
	expect((await f.summary())[0].checkedAt).toBeUndefined();
	const attempt = await f.open();
	expect(attempt.selectedOptions).toEqual([]);
	expect((await f.check(attempt.attemptId)).evidence.cleanRecallCount).toBe(1);
	expect(
		(
			await f.owner.query(api.userProgress.checkExistingRecord, {
				userId: f.ids.owner,
				questionId: f.questionId
			})
		)?.isFlagged
	).toBe(true);
	await f.owner.mutation(api.userProgress.clearUserProgressForModule, {
		userId: f.ids.owner,
		moduleId: f.ids.moduleId
	});
	expect((await f.summary())[0].checkedAt).toBeUndefined();
	await expect(f.check(attempt.attemptId)).rejects.toThrow('Reload to continue');
	expect(await f.t.run((ctx) => ctx.db.query('studyChecks').collect())).toHaveLength(1);
	expect((await f.open()).selectedOptions).toEqual([]);
});

test('question content changes invalidate current evidence and other users cannot submit an attempt', async () => {
	const f = await fixture();
	const attempt = await f.open();
	await f.check(attempt.attemptId);
	await expect(
		f.t.mutation(api.studyProgress.open, { questionId: f.questionId })
	).rejects.toThrow();
	await expect(
		f.t.withIdentity({ subject: 'other' }).mutation(api.studyProgress.check, {
			attemptId: attempt.attemptId,
			selectedOptions: ['a'],
			submissionId: 'other'
		})
	).rejects.toThrow('Unauthorized');
	await f.t.run((ctx) => ctx.db.patch(f.questionId, { stem: 'Changed question' }));
	expect((await f.summary())[0]).toMatchObject({ cleanRecallCount: 0, needsFreshEvidence: true });
	await expect(f.check(attempt.attemptId)).rejects.toThrow('Reload to continue');
	expect((await f.open()).selectedOptions).toEqual([]);
});

test('reset retains earned mastery and dashboard totals while clearing current run coverage', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1000000);
	const f = await fixture();
	await f.check((await f.open()).attemptId);
	await f.reset();
	expect((await f.summary())[0]).toMatchObject({ cleanRecallCount: 1 });
	vi.setSystemTime(1000000 + MASTERY_INTERVAL_MS);
	await f.check((await f.open()).attemptId);
	const masteredAt = (await f.summary())[0].masteredAt;
	expect(masteredAt).toBeDefined();
	await f.reset();
	const evidence = (await f.summary())[0];
	expect(evidence).toMatchObject({ cleanRecallCount: 2, masteredAt });
	expect(evidence.checkedAt).toBeUndefined();
	const progress = await f.owner.query(api.userProgress.checkExistingRecord, {
		userId: f.ids.owner,
		questionId: f.questionId
	});
	expect(progress).toMatchObject({
		isMastered: true,
		attempts: 0,
		selectedOptions: [],
		isFlagged: false
	});
	const stats = await f.t.run((ctx) =>
		ctx.db
			.query('userModuleStats')
			.withIndex('by_user_module', (q) =>
				q.eq('userId', f.ids.owner).eq('moduleId', f.ids.moduleId)
			)
			.unique()
	);
	expect(stats).toMatchObject({ questionsInteracted: 0, questionsMastered: 1 });
	expect((await f.open()).selectedOptions).toEqual([]);
	expect((await f.summary())[0].masteredAt).toBe(masteredAt);
});

test('only completed module runs earn recalls, once per run, and all question mastery is synced', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1000000);
	const f = await fixture();
	const secondId = await f.t.run(async (ctx) => {
		const { _id, _creationTime, ...question } = (await ctx.db.get(f.questionId))!;
		return await ctx.db.insert('question', { ...question, stem: 'Second', order: 1 });
	});
	const finish = async () => {
		const second = await f.owner.mutation(api.studyProgress.open, { questionId: secondId });
		await f.check(second.attemptId);
	};
	const abandoned = await f.open();
	await f.check(abandoned.attemptId);
	expect((await f.summary()).every((q) => q.cleanRecallCount === 0)).toBe(true);
	await f.reset();
	await finish();
	expect((await f.summary()).every((q) => q.cleanRecallCount === 0)).toBe(true);
	const first = await f.open();
	await f.check(first.attemptId);
	expect((await f.summary()).every((q) => q.cleanRecallCount === 1)).toBe(true);
	vi.setSystemTime(1000000 + MASTERY_INTERVAL_MS);
	expect((await f.open()).attemptId).toBe(first.attemptId);
	await f.check(first.attemptId);
	expect((await f.summary()).every((q) => q.cleanRecallCount === 1)).toBe(true);
	await f.reset();
	await f.check((await f.open()).attemptId);
	expect((await f.summary()).every((q) => q.masteredAt === undefined)).toBe(true);
	await finish();
	expect(
		(await f.summary()).every((q) => q.cleanRecallCount === 2 && q.masteredAt !== undefined)
	).toBe(true);
	for (const questionId of [f.questionId, secondId]) {
		expect(
			(
				await f.owner.query(api.userProgress.checkExistingRecord, {
					userId: f.ids.owner,
					questionId
				})
			)?.isMastered
		).toBe(true);
	}
	await expect(
		f.owner.mutation(api.studyProgress.open, {
			questionId: f.questionId,
			fresh: true
		} as never)
	).rejects.toThrow();
});
