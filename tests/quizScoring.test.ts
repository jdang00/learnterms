import { expect, test } from 'bun:test';
import {
	buildCorrectAnswerDisplay,
	computeAttemptCounters,
	evaluateFitb,
	evaluateMatchingSelection,
	scoreAttemptItem,
	shuffledWithSeed,
	type AttemptItem
} from '../src/convex/tests/scoring';

function item(
	snapshot: Partial<AttemptItem['questionSnapshot']>,
	response: Partial<AttemptItem['response']> = {}
): AttemptItem {
	return {
		questionSnapshot: {
			type: 'multiple_choice',
			stem: 'Stem',
			options: [
				{ id: 'a', text: 'A' },
				{ id: 'b', text: 'B' }
			],
			correctAnswers: ['a'],
			rationale: 'Because',
			questionUpdatedAt: 1,
			...snapshot
		},
		response: {
			selectedOptions: [],
			isFlagged: false,
			changeCount: 0,
			timeSpentMs: 0,
			...response
		},
		score: { pointsPossible: 1 }
	} as AttemptItem;
}

test('multiple choice scores an exact set match and marks blanks unanswered', () => {
	expect(scoreAttemptItem(item({}, { selectedOptions: ['a'] }))).toMatchObject({
		isCorrect: true,
		pointsEarned: 1
	});
	expect(scoreAttemptItem(item({}, { selectedOptions: ['a', 'b'] })).isCorrect).toBe(false);
	expect(scoreAttemptItem(item({})).unanswered).toBe(true);
});

test('fill in the blank honours mode and flags', () => {
	const snapshot = {
		type: 'fill_in_the_blank',
		options: [
			{ id: 'x', text: 'exact:Cornea | flags=ignore_punct' },
			{ id: 'y', text: 'regex:^sclera' }
		],
		correctAnswers: ['x', 'y']
	};
	expect(evaluateFitb(item(snapshot).questionSnapshot, 'cornea.')).toBe(true);
	expect(evaluateFitb(item(snapshot).questionSnapshot, 'sclera edge')).toBe(true);
	expect(evaluateFitb(item(snapshot).questionSnapshot, 'retina')).toBe(false);
	expect(buildCorrectAnswerDisplay(item(snapshot))).toEqual(['Cornea', '^sclera']);
});

test('matching accepts answers with the same text and rejects partial maps', () => {
	const snapshot = {
		type: 'matching',
		options: [
			{ id: 'p1', text: 'prompt: Myopia' },
			{ id: 'p2', text: 'prompt: Hyperopia' },
			{ id: 'a1', text: 'answer: Minus lens' },
			{ id: 'a2', text: 'answer: Plus lens' },
			{ id: 'a3', text: 'answer: Plus lens' }
		],
		correctAnswers: ['p1::a1', 'p2::a2']
	};
	const q = item(snapshot).questionSnapshot;
	expect(evaluateMatchingSelection(q, ['p1::a1', 'p2::a3'])).toBe(true);
	expect(evaluateMatchingSelection(q, ['p1::a1'])).toBe(false);
	expect(evaluateMatchingSelection(q, ['p1::a2', 'p2::a1'])).toBe(false);
});

test('attempt counters and seeded shuffles are stable', () => {
	const items = [
		item({}, { selectedOptions: ['a'], visitedAt: 1, isFlagged: true }),
		item({}, { visitedAt: 2 }),
		item({})
	];
	expect(computeAttemptCounters(items)).toEqual({
		visitedCount: 2,
		answeredCount: 1,
		flaggedCount: 1
	});
	const first = shuffledWithSeed([1, 2, 3, 4, 5], 'seed');
	expect(shuffledWithSeed([1, 2, 3, 4, 5], 'seed')).toEqual(first);
	expect([...first].sort()).toEqual([1, 2, 3, 4, 5]);
});
