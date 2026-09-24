import { expect, test } from 'bun:test';
import {
	briefDescription,
	classActionLabel,
	classColor,
	moduleStatusLabel,
	summarizeClassProgress
} from '../src/lib/utils/classProgress';

const m = (total: number, answered: number, mastered: number) => ({
	total,
	answered,
	mastered,
	flagged: 0
});

test('moduleStatusLabel names what is left in plain words', () => {
	expect(moduleStatusLabel(m(0, 0, 0))).toBe('No questions');
	expect(moduleStatusLabel(m(18, 0, 0))).toBe('Not started');
	expect(moduleStatusLabel(m(18, 6, 2))).toBe('12 left');
	expect(moduleStatusLabel(m(18, 18, 10))).toBe('8 to master');
	expect(moduleStatusLabel(m(18, 18, 18))).toBe('Mastered');
});

test('summarizeClassProgress counts started and mastered modules', () => {
	expect(summarizeClassProgress([m(10, 0, 0), m(10, 3, 0), m(5, 5, 5), m(0, 0, 0)])).toEqual({
		modules: 4,
		started: 2,
		mastered: 1
	});
});

test('classColor prefers the class theme and is stable otherwise', () => {
	expect(classColor({ _id: 'a', cardTheme: { base: '#123456' } })).toBe('#123456');
	expect(classColor({ _id: 'class-1' })).toBe(classColor({ _id: 'class-1' }));
});

test('briefDescription keeps short text, prefers a whole first sentence, else cuts at a word', () => {
	expect(briefDescription('Drug classes by mechanism.')).toEqual({
		text: 'Drug classes by mechanism.',
		truncated: false
	});
	const twoSentences =
		'Anterior segment disease across lids, lashes, and cornea. Includes the clinical signs that separate one diagnosis from the next, with images.';
	expect(briefDescription(twoSentences)).toEqual({
		text: 'Anterior segment disease across lids, lashes, and cornea.',
		truncated: true
	});
	const runOn = 'word '.repeat(60);
	const brief = briefDescription(runOn);
	expect(brief.truncated).toBe(true);
	expect(brief.text.endsWith('word…')).toBe(true);
	expect(brief.text.length).toBeLessThanOrEqual(121);
});

test('classActionLabel reflects where the student is', () => {
	expect(classActionLabel({ modules: 4, started: 0, mastered: 0 })).toBe('Start');
	expect(classActionLabel({ modules: 4, started: 2, mastered: 1 })).toBe('Continue');
	expect(classActionLabel({ modules: 4, started: 4, mastered: 4 })).toBe('Review');
});
