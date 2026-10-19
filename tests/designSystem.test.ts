import { describe, expect, test } from 'bun:test';
import { Glob } from 'bun';
import { readFileSync } from 'node:fs';

const CLASS_STRING = /(["'`])((?:(?!\1)[^\n{}])*?)\1/g;

// A hand-built surface: a large radius, a border and the page or card background on one element.
// Floating menus (absolute/fixed with a big shadow) are exempt until they move to Popover.
function isHandBuiltSurface(classes: string) {
	const tokens = classes.split(/\s+/);
	const has = (re: RegExp) => tokens.some((token) => re.test(token));
	return (
		has(/^rounded-(xl|2xl|3xl)$/) &&
		tokens.includes('border') &&
		has(/^bg-(background|card)(\/\d+)?$/) &&
		!has(/^border-(?!border|dashed)[a-z]/) &&
		!(has(/^(absolute|fixed)$/) && has(/^shadow-(md|lg|xl|2xl)$/))
	);
}

async function* appSources() {
	for await (const file of new Glob('src/**/*.svelte').scan('.')) {
		if (file.includes('/components/ui/')) continue;
		yield { file, source: readFileSync(file, 'utf8') };
	}
}

describe('design system', () => {
	test('bordered panels use Card or the surface utilities', async () => {
		const offenders: string[] = [];
		for await (const { file, source } of appSources()) {
			for (const [, , classes] of source.matchAll(CLASS_STRING)) {
				if (isHandBuiltSurface(classes)) offenders.push(`${file}: ${classes}`);
			}
		}
		expect(offenders).toEqual([]);
	});

	test('colors come from brand tokens, not the raw Tailwind palette', async () => {
		const palette =
			/\b(bg|text|border|ring|stroke|fill|from|to|via|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
		const offenders: string[] = [];
		for await (const { file, source } of appSources()) {
			const match = source.match(palette);
			if (match) offenders.push(`${file}: ${match[0]}`);
		}
		expect(offenders).toEqual([]);
	});

	test('spinners and popovers use the shared primitives', async () => {
		const offenders: string[] = [];
		for await (const { file, source } of appSources()) {
			if (/animate-spin/.test(source))
				offenders.push(`${file}: animate-spin (use Spinner or LoadingState)`);
			if (/\spopover="(auto|manual)"/.test(source))
				offenders.push(`${file}: native popover (use Popover or DropdownMenu)`);
			if (/role="radio"/.test(source) && !file.includes('Worth4DotEditor'))
				offenders.push(`${file}: hand-built radio (use SegmentedControl or RadioGroup)`);
		}
		expect(offenders).toEqual([]);
	});

	test('icons are imported one module at a time', async () => {
		const offenders: string[] = [];
		for await (const file of new Glob('src/**/*.{svelte,ts}').scan('.')) {
			const source = readFileSync(file, 'utf8');
			if (/from '(lucide-svelte|@lucide\/svelte)'/.test(source.replace(/import type[^;]+;/g, '')))
				offenders.push(file);
		}
		expect(offenders).toEqual([]);
	});
});
