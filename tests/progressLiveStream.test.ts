import { expect, test } from 'bun:test';
import type { Id } from '../src/convex/_generated/dataModel';
import {
	buildRuns,
	isStruggling,
	minuteBuckets,
	questionHeat,
	summarize,
	type Check
} from '../src/lib/admin/progress/liveStream';

const MIN = 60_000;
const now = new Date(2026, 10, 1, 21, 30, 20).getTime();
let n = 0;
const check = (
	userId: string,
	moduleId: string,
	minutesAgo: number,
	isCorrect = true,
	firstTry = isCorrect
): Check => ({
	_id: `c${n++}` as Id<'studyChecks'>,
	userId: userId as Id<'users'>,
	questionId: `q-${moduleId}-${n % 3}` as Id<'question'>,
	moduleId: moduleId as Id<'module'>,
	checkedAt: now - minutesAgo * MIN,
	isCorrect,
	firstTry
});

test('runs group a student in one module and split after a ten-minute pause', () => {
	const runs = buildRuns([
		check('u1', 'm1', 40),
		check('u1', 'm1', 38, false),
		check('u1', 'm1', 5),
		check('u2', 'm1', 1)
	]);
	expect(runs.map((r) => [r.userId as string, r.checks.length, r.correct])).toEqual([
		['u2', 1, 1],
		['u1', 1, 1],
		['u1', 2, 1]
	]);
	expect(runs[2].checks[0].checkedAt).toBeLessThan(runs[2].checks[1].checkedAt);
});

test('minute buckets end at the current minute and split right from wrong', () => {
	const buckets = minuteBuckets(
		[
			check('u1', 'm1', 0, true),
			check('u1', 'm1', 0, false),
			check('u1', 'm1', 2),
			check('u1', 'm1', 90)
		],
		now,
		15
	);
	expect(buckets).toHaveLength(15);
	expect(buckets.at(-1)).toMatchObject({ correct: 1, incorrect: 1 });
	expect(buckets.at(-3)).toMatchObject({ correct: 1, incorrect: 0 });
	expect(buckets.reduce((sum, b) => sum + b.correct + b.incorrect, 0)).toBe(3);
});

test('summaries and question heat flag what the class keeps missing', () => {
	const checks = [
		check('u1', 'm1', 3, false),
		check('u2', 'm1', 2, false),
		check('u3', 'm1', 1, true, false)
	].map((c) => ({ ...c, questionId: 'q1' as Id<'question'> }));
	expect(summarize(checks)).toMatchObject({
		answers: 3,
		correct: 1,
		accuracy: 33,
		firstTryRate: 0
	});
	const [entry] = questionHeat(checks, [
		{
			questionId: 'q1' as Id<'question'>,
			moduleId: 'm1' as Id<'module'>,
			order: 0,
			type: 'multiple_choice',
			stem: 'Stem'
		}
	]);
	expect(entry).toMatchObject({ answers: 3, correct: 1, students: 3 });
	expect(isStruggling(entry)).toBe(true);
	expect(isStruggling({ answers: 3, correct: 1, students: 1 })).toBe(false);
});
