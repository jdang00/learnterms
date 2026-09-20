import { expect, test } from 'bun:test';
import {
	shuffleCorrectAnswer,
	hasSourceFraming,
	assertStandaloneRationale
} from '../src/convex/questionStudio/presentation';

test('all-A model output becomes balanced keys with intact answer identities and no four-key streaks', () => {
	const positions: number[] = [];
	for (let i = 0; i < 100; i++) {
		const options = [{ id: 'correct' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
		const shuffled = shuffleCorrectAnswer(options, 0, positions, [], () => 0.3);
		expect(shuffled.map((o) => o.id).sort()).toEqual(options.map((o) => o.id).sort());
		expect(options[0].id).toBe('correct');
		positions.push(shuffled.findIndex((o) => o.id === 'correct'));
		if (positions.length >= 4) expect(new Set(positions.slice(-4)).size).toBeGreaterThan(1);
	}
	for (let i = 0; i < 4; i++) expect(positions.filter((p) => p === i)).toHaveLength(25);
});

test('publishing in the middle cannot join a four-answer streak on either side', () => {
	for (const [before, after] of [
		[[0, 0, 0], []],
		[[], [0, 0, 0]],
		[[0], [0, 0]],
		[[0, 0], [0]]
	] as [number[], number[]][]) {
		const result = shuffleCorrectAnswer(['correct', 'b', 'c', 'd'], 0, before, after, () => 0);
		expect(result.indexOf('correct')).not.toBe(0);
	}
});

test('standalone rationales reject document framing and answer letters but allow clinical sources', () => {
	for (const text of [
		'The PDF explains the mechanism.',
		'The source states that four is correct.',
		'These notes describe the condition.',
		'The uploaded slides show this.',
		'As shown on page 12, this is correct.',
		'This is supported by the provided evidence.',
		'The excerpt explains why.',
		'See [p12c0].',
		'Option A is correct.'
	]) {
		expect(() => assertStandaloneRationale(text)).toThrow();
	}
	for (const text of [
		'The source of retinal emboli is commonly the carotid artery.',
		'A light source illuminates the retina.',
		'Clinical evidence supports this diagnosis.',
		'Two pairs combine to make four.'
	]) {
		expect(hasSourceFraming(text)).toBe(false);
		expect(() => assertStandaloneRationale(text)).not.toThrow();
	}
});
