import { expect, test } from 'bun:test';
import {
	clampTextScale,
	formatDuration,
	nextTextScale,
	TEXT_SCALES
} from '../src/lib/components/quiz-dock/format';

test('formats study time as mm:ss, growing to h:mm:ss', () => {
	expect(formatDuration(0)).toBe('00:00');
	expect(formatDuration(75)).toBe('01:15');
	expect(formatDuration(3725)).toBe('1:02:05');
	expect(formatDuration(-4)).toBe('00:00');
});

test('text size cycles through every step and back to 100%', () => {
	let scale = 1;
	const seen = [scale];
	for (let i = 0; i < TEXT_SCALES.length; i++) seen.push((scale = nextTextScale(scale)));
	expect(seen).toEqual([1, 1.15, 1.3, 0.9, 1]);
});

test('stored text sizes outside the allowed steps fall back to 100%', () => {
	expect(clampTextScale('1.3')).toBe(1.3);
	expect(clampTextScale('7')).toBe(1);
	expect(clampTextScale(null)).toBe(1);
});
