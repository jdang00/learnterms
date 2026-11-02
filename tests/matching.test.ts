import { describe, expect, test } from 'bun:test';
import {
	addMatchingSide,
	answerLetter,
	clearMatch,
	correctPairs,
	encodeMatchingDraft,
	insertPastedPairs,
	evaluateMatching,
	matchingDraft,
	matchingKey,
	matchResults,
	removeMatchingSide,
	selectionsByPrompt,
	setMatch,
	shuffledAnswers
} from '../src/lib/utils/matching';

const options = [
	{ id: 'p1', text: 'prompt: Disease' },
	{ id: 'p2', text: 'Prompt:Impairment' },
	{ id: 'a1', text: 'answer: An anatomical change' },
	{ id: 'a2', text: 'answer: Loss of function' },
	{ id: 'a3', text: 'answer:  loss of  FUNCTION ' },
	{ id: 'd1', text: 'answer: Distractor' }
];
const question = { _id: 'q1', options, correctAnswers: ['p1::a1', 'p2::a2'] };

describe('matching', () => {
	test('keys resolve ids, indexes, alternatives and same-text answers', () => {
		expect(matchingKey(question).get('p2')).toEqual(['a2', 'a3']);
		expect(matchingKey({ options, correctAnswers: ['0::2', '1::d1|3'] }).get('p2')).toEqual([
			'd1',
			'a2',
			'a3'
		]);
		// Legacy: answer ids aligned with prompt order.
		expect(correctPairs({ options, correctAnswers: ['a2', 'a1'] })).toEqual(['p1::a2', 'p2::a1']);
		// Nothing keyed: zip prompts with answers.
		expect(correctPairs({ options, correctAnswers: [] })).toEqual(['p1::a1', 'p2::a2']);
	});

	test('grading matches keyed prompts and expects prompts without answers left blank', () => {
		expect(evaluateMatching(question, ['p1::a1', 'p2::a3'])).toBe(true);
		expect(evaluateMatching(question, ['p1::a1'])).toBe(false);
		expect(evaluateMatching(question, ['p1::a1', 'p2::d1'])).toBe(false);
		const noAnswerForP2 = { ...question, correctAnswers: ['p1::a1'] };
		expect(evaluateMatching(noAnswerForP2, ['p1::a1'])).toBe(true);
		expect(evaluateMatching(noAnswerForP2, ['p1::a1', 'p2::d1'])).toBe(false);
		expect(evaluateMatching({ ...question, correctAnswers: [] }, [])).toBe(false);
		expect(matchResults(noAnswerForP2, ['p1::a1'])[1]).toMatchObject({
			correct: undefined,
			status: 'correct'
		});
		expect(evaluateMatching(question, ['p1::a1', 'p2::a2', 'junk', 'a1'])).toBe(true);
	});

	test('picking an answer held by another prompt moves it', () => {
		const one = setMatch([], 'p1', 'a1');
		const moved = setMatch(one, 'p2', 'a1');
		expect(moved).toEqual(['p2::a1']);
		expect(setMatch(moved, 'p2', 'a2')).toEqual(['p2::a2']);
		expect(clearMatch(['p1::a1', 'p2::a2'], 'p1')).toEqual(['p2::a2']);
		expect(selectionsByPrompt(question, ['p1::a1', 'p1::a2']).get('p1')).toBe('a2');
	});

	test('results label each prompt for review', () => {
		expect(matchResults(question, ['p1::a2']).map((row) => row.status)).toEqual([
			'incorrect',
			'unanswered'
		]);
		expect(matchResults(question, ['p1::a1'])[0]).toMatchObject({
			prompt: 'Disease',
			chosen: 'An anatomical change',
			correct: 'An anatomical change',
			status: 'correct'
		});
	});

	test('answer order is stable and never gives the key away', () => {
		const order = shuffledAnswers(question).map((answer) => answer.id);
		expect(shuffledAnswers(question).map((answer) => answer.id)).toEqual(order);
		expect([...order].sort()).toEqual(['a1', 'a2', 'a3', 'd1']);
		expect(order.slice(0, 2)).not.toEqual(['a1', 'a2']);
	});

	test('letters continue past Z', () => {
		expect([0, 25, 26, 27].map(answerLetter)).toEqual(['A', 'Z', 'AA', 'AB']);
	});
});

test('editor rows pair answers by key, keep prompts without answers, then distractors', () => {
	expect(matchingDraft({ options, correctAnswers: ['p1::a2'] })).toEqual([
		{ prompt: 'Disease', answer: 'Loss of function' },
		{ prompt: 'Impairment', answer: null },
		{ prompt: null, answer: 'An anatomical change' },
		{ prompt: null, answer: 'loss of  FUNCTION' },
		{ prompt: null, answer: 'Distractor' }
	]);
});

test('adding or removing one side never shifts the other column', () => {
	const rows = [
		{ prompt: 'A', answer: '1' },
		{ prompt: 'B', answer: '2' },
		{ prompt: null, answer: 'x' }
	];
	expect(removeMatchingSide(rows, 0, 'prompt')).toEqual([
		{ prompt: null, answer: '1' },
		{ prompt: 'B', answer: '2' },
		{ prompt: null, answer: 'x' }
	]);
	expect(removeMatchingSide(rows, 2, 'answer')).toEqual(rows.slice(0, 2));
	expect(addMatchingSide(rows, 'prompt')[2]).toEqual({ prompt: '', answer: 'x' });
	expect(addMatchingSide(rows, 'answer')[3]).toEqual({ prompt: null, answer: '' });
});

test('rows save as prompts then answers, pairing only rows with both sides', () => {
	expect(encodeMatchingDraft([{ prompt: 'A', answer: '' }])).toEqual({
		error: 'Add at least one pair'
	});
	expect(
		encodeMatchingDraft([
			{ prompt: ' A ', answer: '1' },
			{ prompt: 'B', answer: null },
			{ prompt: '', answer: '' },
			{ prompt: 'C', answer: '2' },
			{ prompt: null, answer: 'x' }
		])
	).toEqual({
		options: [
			{ text: 'prompt:A' },
			{ text: 'prompt:B' },
			{ text: 'prompt:C' },
			{ text: 'answer:1' },
			{ text: 'answer:2' },
			{ text: 'answer:x' }
		],
		correctAnswers: ['0::3', '2::4']
	});
});

test('a spreadsheet paste fills the blank row and inserts the rest', () => {
	const rows = [
		{ prompt: 'Keep', answer: 'me' },
		{ prompt: '', answer: '' },
		{ prompt: '', answer: '' }
	];
	expect(insertPastedPairs(rows, 1, 'Myopia\tMinus lens\nHyperopia\tPlus lens\n')).toEqual([
		{ prompt: 'Keep', answer: 'me' },
		{ prompt: 'Myopia', answer: 'Minus lens' },
		{ prompt: 'Hyperopia', answer: 'Plus lens' }
	]);
	expect(insertPastedPairs(rows, 1, 'just one line')).toBeNull();
});
