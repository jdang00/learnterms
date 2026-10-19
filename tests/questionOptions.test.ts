import { expect, test } from 'bun:test';
import {
	assertPairFormattedAnswers,
	assignMatchingOptionIds,
	assignOptionIds,
	normalizeMatchingCorrectAnswers,
	normalizeStandardCorrectAnswers
} from '../src/convex/questions/options';

test('option ids are kept, reused by position, or generated, and answers follow renames', () => {
	const existing = [
		{ id: 'opt_a', text: 'Alpha' },
		{ id: 'opt_b', text: 'Beta' }
	];
	const { optionsWithIds, legacyIdMap } = assignOptionIds(
		[{ text: 'Alpha', id: 'opt_a' }, { text: 'Beta changed' }, { text: 'Gamma' }],
		existing
	);
	expect(optionsWithIds.map((o) => o.id).slice(0, 2)).toEqual(['opt_a', 'opt_b']);
	expect(optionsWithIds[2].id).toMatch(/^opt_/);
	expect(legacyIdMap.size).toBe(0);
	expect(normalizeStandardCorrectAnswers(['opt_b', '2', 'missing'], optionsWithIds)).toEqual([
		'opt_b',
		optionsWithIds[2].id
	]);
});

test('matching options keep ids by text and pairs resolve to prompt::answer', () => {
	const existing = [
		{ id: 'p1', text: 'prompt: Myopia' },
		{ id: 'a1', text: 'answer: Minus lens' }
	];
	const { optionsWithIds } = assignMatchingOptionIds(
		[{ text: 'answer: Minus lens' }, { text: 'prompt: Myopia' }],
		existing
	);
	expect(optionsWithIds.map((o) => o.id)).toEqual(['a1', 'p1']);
	expect(normalizeMatchingCorrectAnswers(['p1::a1'], optionsWithIds)).toEqual(['p1::a1']);
	expect(normalizeMatchingCorrectAnswers(['a1'], optionsWithIds)).toEqual(['p1::a1']);
	expect(() => assertPairFormattedAnswers(['a1'])).toThrow('pair-formatted');
	expect(() => assertPairFormattedAnswers(['p1::a1'])).not.toThrow();
});
