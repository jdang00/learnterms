import { describe, expect, test } from 'bun:test';
import {
	formatPageSelection,
	parsePageSelection,
	sourcePageBatch
} from '../src/lib/admin/question-studio/pagePickerSelection';

const pages = Array.from({ length: 107 }, (_, index) => index + 1);
describe('page picker selection', () => {
	test('adds disjoint ranges, normalizes dashes, and deduplicates overlaps', () => {
		expect(parsePageSelection('1–3, 3-5, 90—92, 107', pages)).toEqual([
			1, 2, 3, 4, 5, 90, 91, 92, 107
		]);
	});
	test('rejects malformed, reversed, and out-of-bounds ranges without partial selection', () => {
		for (const input of ['', '1,', 'one', '3-1', '1-108', '0', '1-999999999999', '1.5', '2 3'])
			expect(() => parsePageSelection(input, pages)).toThrow();
		expect(() => parsePageSelection('1-3', [1, 3])).toThrow();
	});
	test('formats a compact, ordered selection without mutating its input', () => {
		const input = [107, 4, 3, 2, 2, 90];
		expect(formatPageSelection(input)).toBe('2–4, 90, 107');
		expect(input).toEqual([107, 4, 3, 2, 2, 90]);
		expect(formatPageSelection([])).toBe('');
	});
	test('jumps directly to the batch containing a distant or nonconsecutive page', () => {
		expect(sourcePageBatch(100, pages)).toBe(96);
		expect(sourcePageBatch(13, pages)).toBe(12);
		expect(sourcePageBatch(100, [1, 3, 100])).toBe(0);
		expect(() => sourcePageBatch(108, pages)).toThrow();
	});
});
