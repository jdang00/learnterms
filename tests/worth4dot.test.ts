import { expect, test } from 'bun:test';
import { EXAM_TESTS, layoutKeys } from '../src/lib/examFindings/catalog';
import { normalizeExamFindings } from '../src/lib/examFindings/findings';
import { buildExamFindingView } from '../src/lib/examFindings/view';
import {
	diplopiaPattern,
	formatOffset,
	isFusedOffset,
	parseOffset,
	presetOffset,
	redEyeFor,
	worth4DotSummary
} from '../src/lib/examFindings/worth4dot';

const worth = EXAM_TESTS.find((entry) => entry.id === 'worth4Dot')!;

test('records a response, white dot and red image offset at distance and near', () => {
	expect(layoutKeys(worth.layout)).toEqual([
		'distance.response',
		'distance.white',
		'distance.offset',
		'near.response',
		'near.white',
		'near.offset',
		'lenses',
		'correction',
		'lighting',
		'breakpoint'
	]);
});

test('suppression reads as the dots the other eye still sees', () => {
	expect(worth4DotSummary({ response: 'Suppression OS', offset: null }, 'OD').dots).toBe(
		'2 red dots'
	);
	expect(worth4DotSummary({ response: 'Suppression OD', offset: null }, 'OD').dots).toBe(
		'3 green dots'
	);
	// Flipped goggles flip the colors.
	expect(worth4DotSummary({ response: 'Suppression OD', offset: null }, 'OS').dots).toBe(
		'2 red dots'
	);
});

test('red image on the red-lens side is uncrossed (eso); opposite is crossed (exo)', () => {
	expect(diplopiaPattern({ x: 1.6, y: 0 }, 'OD').horizontal).toBe('uncrossed');
	expect(diplopiaPattern({ x: -1.6, y: 0 }, 'OD').horizontal).toBe('crossed');
	expect(diplopiaPattern({ x: -1.6, y: 0 }, 'OS').horizontal).toBe('uncrossed');
	expect(worth4DotSummary({ response: 'Diplopia', offset: { x: -1.6, y: 0 } }, 'OD')).toEqual({
		title: 'Crossed diplopia',
		dots: '5 dots',
		detail: 'Exo pattern'
	});
});

test('the lower image belongs to the hyper eye', () => {
	// Red (OD) image lower: right hyper.
	expect(diplopiaPattern({ x: 0, y: 1.1 }, 'OD').hyperEye).toBe('OD');
	expect(diplopiaPattern({ x: 0, y: -1.1 }, 'OD').hyperEye).toBe('OS');
	expect(worth4DotSummary({ response: 'Diplopia', offset: { x: 1.2, y: 0.8 } }, 'OD').detail).toBe(
		'Eso pattern · R hyper'
	);
	for (const eye of ['OD', 'OS'] as const) {
		expect(diplopiaPattern(presetOffset('rHyper', eye), eye).hyperEye).toBe('OD');
		expect(diplopiaPattern(presetOffset('lHyper', eye), eye).hyperEye).toBe('OS');
		expect(diplopiaPattern(presetOffset('uncrossed', eye), eye).horizontal).toBe('uncrossed');
		expect(diplopiaPattern(presetOffset('crossed', eye), eye).horizontal).toBe('crossed');
	}
});

test('white dot color points to the dominant eye when fused', () => {
	expect(worth4DotSummary({ response: 'Fusion', white: 'Red', offset: null }, 'OD').detail).toBe(
		'White dot red · OD dominant'
	);
	expect(worth4DotSummary({ response: 'Fusion', white: 'Green', offset: null }, 'OD').detail).toBe(
		'White dot green · OS dominant'
	);
});

test('offsets round, clamp, snap back to fusion and survive saving', () => {
	expect(parseOffset('9, -0.33')).toEqual({ x: 2.4, y: -0.35 });
	expect(formatOffset({ x: -0.001, y: 0 })).toBe('0,0');
	expect(parseOffset('left')).toBeNull();
	expect(isFusedOffset({ x: 0.2, y: 0.1 })).toBe(true);
	expect(redEyeFor('Red OS / green OD')).toBe('OS');
	expect(redEyeFor(undefined)).toBe('OD');
	expect(
		normalizeExamFindings([
			{
				test: 'worth4Dot',
				values: { 'near.response': 'Diplopia', 'near.offset': ' 1.62 , 0 ', 'distance.offset': 'x' }
			}
		])
	).toEqual([
		{ test: 'worth4Dot', values: { 'near.response': 'Diplopia', 'near.offset': '1.6,0' } }
	]);
});

test('the display shows one diagram per recorded distance', () => {
	const view = buildExamFindingView({
		test: 'worth4Dot',
		values: {
			'distance.response': 'Suppression OS',
			'near.response': 'Fusion',
			lenses: 'Red OS / green OD'
		}
	})!;
	expect(view.sections[0]).toMatchObject({
		kind: 'worth4dot',
		redEye: 'OS',
		rows: [
			{ label: 'Distance', response: 'Suppression OS' },
			{ label: 'Near', response: 'Fusion' }
		]
	});
	expect(view.size).toBe('half');
});
