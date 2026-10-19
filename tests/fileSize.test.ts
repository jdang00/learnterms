import { describe, expect, test } from 'bun:test';
import budget from './fileSizeBudget.json';
import { FILE_LINE_LIMIT, lineCount, sourceFiles } from '../scripts/file-size-budget';

// Files over the limit must shrink, never grow. Regenerate the allowlist with
// `bun scripts/file-size-budget.ts --write` only after a file gets smaller.
describe('file size budget', () => {
	const allowed = budget as Record<string, number>;

	test(`source files stay under ${FILE_LINE_LIMIT} lines unless allowlisted, and never grow`, () => {
		const offenders: string[] = [];
		for (const file of sourceFiles()) {
			const lines = lineCount(file);
			const cap = allowed[file] ?? FILE_LINE_LIMIT;
			if (lines > cap) offenders.push(`${file}: ${lines} lines (cap ${cap})`);
		}
		expect(offenders).toEqual([]);
	});

	test('allowlist entries that shrank below the limit are removed', () => {
		const stale = Object.keys(allowed).filter((file) => {
			try {
				return lineCount(file) <= FILE_LINE_LIMIT;
			} catch {
				return true;
			}
		});
		expect(stale).toEqual([]);
	});
});
