import { expect, test } from 'bun:test';
import { selectedContextSize } from '../src/lib/admin/sourceContext';

test('context counts overlapping topic pages once', () => {
	expect(
		selectedContextSize(
			[
				{ pageNumber: 1, characters: 1000 },
				{ pageNumber: 2, characters: 4000 }
			],
			[1, 2, 2, 1]
		)
	).toEqual({ characters: 5000, estimatedTokens: 1250, pageCount: 2, complete: true });
});

test('a distant page is counted from metadata without loading its preview text', () => {
	const metadata = Array.from({ length: 107 }, (_, index) => ({
		pageNumber: index + 1,
		characters: (index + 1) * 100
	}));
	expect(selectedContextSize(metadata, [100, 107])).toEqual({
		characters: 20700,
		estimatedTokens: 5175,
		pageCount: 2,
		complete: true
	});
});

test('missing source pages make an estimate incomplete instead of presenting a low total as complete', () => {
	expect(selectedContextSize([{ pageNumber: 1, characters: 1201 }], [1, 2])).toEqual({
		characters: 1201,
		estimatedTokens: 301,
		pageCount: 2,
		complete: false
	});
	expect(selectedContextSize([], [])).toEqual({
		characters: 0,
		estimatedTokens: 0,
		pageCount: 0,
		complete: true
	});
});
