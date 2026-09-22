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
	const open = (fresh = false) => f.owner.mutation(api.studyProgress.open, { questionId, fresh });
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
	return { ...f, questionId, open, check, summary };
}
afterEach(() => vi.useRealTimers());

test('two unaided first checks at least 30 minutes apart earn mastery; duplicates and same-day practice do not', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1000000);
	const f = await fixture();
	const first = await f.open();
	expect((await f.check(first.attemptId)).evidence.cleanRecallCount).toBe(1);
	await f.check(first.attemptId);
	expect(await f.t.run((ctx) => ctx.db.query('studyChecks').collect())).toHaveLength(1);
	vi.setSystemTime(1000000 + MASTERY_INTERVAL_MS - 1);
	const early = await f.open(true);
	expect((await f.check(early.attemptId)).evidence.masteredAt).toBeUndefined();
	vi.setSystemTime(1000000 + MASTERY_INTERVAL_MS);
	const second = await f.open(true);
	const result = await f.check(second.attemptId, 'a', 'second');
	expect(result.evidence.cleanRecallCount).toBe(2);
	expect(result.evidence.masteredAt).toBe(Date.now());
	expect((await f.check(second.attemptId, 'a', 'second')).evidence).toEqual(result.evidence);
	vi.setSystemTime(Date.now() + 100 * MASTERY_INTERVAL_MS);
	expect((await f.summary())[0].masteredAt).toBe(result.evidence.masteredAt);
	const wrong = await f.open(true);
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
	const retry = await f.open(true);
	await f.check(retry.attemptId, 'b');
	expect((await f.check(retry.attemptId)).evidence).toMatchObject({
		latestCorrect: true,
		cleanRecallCount: 0
	});
	expect((await f.open()).selectedOptions).toEqual(['a']);
	expect((await f.open(true)).selectedOptions).toEqual([]);
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
	await expect(f.check(attempt.attemptId)).rejects.toThrow('Start a fresh attempt');
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
	await expect(f.check(attempt.attemptId)).rejects.toThrow('Start a fresh attempt');
	expect((await f.open()).selectedOptions).toEqual([]);
});

test('fresh blank practice preserves checked history and dashboard coverage until reset', async () => {
	const f = await fixture();
	const attempt = await f.open();
	await f.check(attempt.attemptId);
	const classId = (await f.t.run((ctx) => ctx.db.get(f.ids.moduleId)))!.classId;
	await f.open(true);
	await f.owner.mutation(api.userProgress.saveUserProgress, {
		userId: f.ids.owner,
		classId,
		questionId: f.questionId,
		selectedOptions: []
	});
	const stats = () =>
		f.t.run((ctx) =>
			ctx.db
				.query('userModuleStats')
				.withIndex('by_user_module', (q) =>
					q.eq('userId', f.ids.owner).eq('moduleId', f.ids.moduleId)
				)
				.unique()
		);
	expect((await stats())?.questionsInteracted).toBe(1);
	expect(
		(
			await f.owner.query(api.userProgress.getUserProgressForModule, {
				userId: f.ids.owner,
				classId,
				questionIds: [f.questionId]
			})
		).interactedQuestionIds
	).toEqual([f.questionId]);
	await f.owner.mutation(api.userProgress.clearUserProgressForModule, {
		userId: f.ids.owner,
		moduleId: f.ids.moduleId
	});
	expect((await stats())?.questionsInteracted ?? 0).toBe(0);
});
