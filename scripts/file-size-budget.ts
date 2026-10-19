// Prints (or writes) the file-size allowlist used by tests/fileSize.test.ts.
// Usage: bun scripts/file-size-budget.ts [--write]
import { Glob } from 'bun';
import { readFileSync, writeFileSync } from 'node:fs';

export const FILE_LINE_LIMIT = 600;
const BUDGET_PATH = 'tests/fileSizeBudget.json';

export function sourceFiles() {
	const files: string[] = [];
	for (const file of new Glob('src/**/*.{ts,svelte}').scanSync('.')) {
		if (file.includes('/_generated/')) continue;
		files.push(file);
	}
	return files.sort();
}

export function lineCount(file: string) {
	return readFileSync(file, 'utf8').split('\n').length;
}

if (import.meta.main) {
	const budget: Record<string, number> = {};
	for (const file of sourceFiles()) {
		const lines = lineCount(file);
		if (lines > FILE_LINE_LIMIT) budget[file] = lines;
	}
	const json = JSON.stringify(budget, null, '\t') + '\n';
	if (process.argv.includes('--write')) {
		writeFileSync(BUDGET_PATH, json);
		console.log(`Wrote ${Object.keys(budget).length} entries to ${BUDGET_PATH}`);
	} else {
		process.stdout.write(json);
	}
}
