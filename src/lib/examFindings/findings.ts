import {
	getExamTest,
	rowHasColumn,
	sectionValueKey,
	type ExamField,
	type ExamTest
} from './catalog';
import { effectiveField, formatExamValue } from './input';

// Boxes size themselves unless a curator pins them to a third, half or the full row.
export const EXAM_FINDING_SIZES = ['small', 'half', 'full'] as const;
export type ExamFindingSize = (typeof EXAM_FINDING_SIZES)[number];

export type ExamFinding = {
	test: string;
	title?: string;
	size?: ExamFindingSize;
	values: Record<string, string>;
	// Free-text notes any box can carry, shown under its findings.
	note?: string;
	// Quiz on the pattern: interpretations (Worth 4 Dot readouts) stay hidden until the answer shows.
	hideInterpretation?: boolean;
};

export const MAX_EXAM_FINDINGS = 12;
const MAX_TITLE_LENGTH = 80;
export const MAX_VALUE_LENGTH = 1000;
export const MAX_NOTE_LENGTH = 2000;

// Drops keys the layout doesn't know and boxes left empty, so stored findings always render.
export function normalizeExamFindings(
	findings: ExamFinding[] | undefined
): ExamFinding[] | undefined {
	if (!findings?.length) return undefined;
	if (findings.length > MAX_EXAM_FINDINGS)
		throw new Error(`A question can show up to ${MAX_EXAM_FINDINGS} exam findings.`);
	const normalized = findings.flatMap((finding) => {
		const test = getExamTest(finding.test);
		if (!test) throw new Error(`Unknown exam test "${finding.test}".`);
		const values: Record<string, string> = {};
		eachSlot(test, (key, _sample, _normal, field) => {
			const value = finding.values[key] && formatExamValue(finding.values[key], field);
			if (!value) return;
			if (value.length > MAX_VALUE_LENGTH)
				throw new Error(`${test.title} values must be ${MAX_VALUE_LENGTH} characters or fewer.`);
			values[key] = value;
		});
		const note = finding.note?.trim();
		if (note && note.length > MAX_NOTE_LENGTH)
			throw new Error(`${test.title} notes must be ${MAX_NOTE_LENGTH} characters or fewer.`);
		if (!hasRecordedValues(test, values) && !note) return [];
		const title = finding.title?.trim().slice(0, MAX_TITLE_LENGTH);
		return [
			{
				test: test.id,
				...(title && title !== test.title && { title }),
				...(finding.size && EXAM_FINDING_SIZES.includes(finding.size) && { size: finding.size }),
				values,
				...(note && { note }),
				...(finding.hideInterpretation && { hideInterpretation: true })
			}
		];
	});
	return normalized.length ? normalized : undefined;
}

export function examFindingTitle(finding: ExamFinding) {
	return finding.title || getExamTest(finding.test)?.title || 'Findings';
}

export function examFindingsText(findings: ExamFinding[] | undefined) {
	return (findings ?? [])
		.map((finding) =>
			[examFindingTitle(finding), ...Object.values(finding.values), finding.note ?? ''].join(' ')
		)
		.join(' ');
}

export function countExamValues(finding: ExamFinding) {
	const test = getExamTest(finding.test);
	const defaults = test ? defaultExamValues(test) : {};
	return (
		Object.entries(finding.values).filter(
			([key, value]) => value?.trim() && value.trim() !== defaults[key]
		).length + (finding.note?.trim() ? 1 : 0)
	);
}

export function hasRecordedValues(test: ExamTest, values: Record<string, string>) {
	const defaults = defaultExamValues(test);
	return Object.entries(values).some(
		([key, value]) => value?.trim() && value.trim() !== defaults[key]
	);
}

// Walks every value slot a test offers, with the sample and normal that apply to it.
function eachSlot(
	test: ExamTest,
	visit: (
		key: string,
		sample: string | undefined,
		normal: string | undefined,
		field: ExamField
	) => void
) {
	for (const section of test.layout) {
		if (section.kind === 'note')
			visit(section.key, section.sample, section.normal, {
				key: section.key,
				label: section.label
			});
		else if (section.kind === 'fields')
			for (const field of section.fields)
				visit(sectionValueKey(section, field.key), field.sample, field.normal, field);
		else
			for (const row of section.rows)
				for (const column of section.columns)
					if (rowHasColumn(row, column))
						visit(
							sectionValueKey(section, row.key, column.key),
							row.sample ?? column.sample,
							row.normal ?? column.normal,
							effectiveField(column, row)
						);
	}
}

export function defaultExamValues(test: ExamTest): Record<string, string> {
	const values: Record<string, string> = {};
	eachSlot(test, (key, _sample, _normal, field) => {
		if (field.default) values[key] = field.default;
	});
	return values;
}

export function sampleExamFinding(test: ExamTest): ExamFinding {
	const values: Record<string, string> = {};
	eachSlot(test, (key, sample) => {
		if (sample) values[key] = sample;
	});
	return { test: test.id, values };
}

export function normalExamValues(test: ExamTest): Record<string, string> {
	const values: Record<string, string> = {};
	eachSlot(test, (key, _sample, normal) => {
		if (normal) values[key] = normal;
	});
	return values;
}

// Fills empty slots with normal findings, leaving anything already entered alone.
export function applyNormalValues(finding: ExamFinding, test: ExamTest) {
	let filled = 0;
	for (const [key, normal] of Object.entries(normalExamValues(test))) {
		if (finding.values[key]?.trim()) continue;
		finding.values[key] = normal;
		filled++;
	}
	return filled;
}

// Pairs of OD → OS keys: eye rows (od.sphere → os.sphere) and eye columns (cornea.od → cornea.os).
export function mirrorPairs(test: ExamTest): Array<[string, string]> {
	return test.layout.flatMap((section): Array<[string, string]> => {
		if (section.kind !== 'grid') return [];
		const od = section.rows.find((row) => row.key === 'od');
		const os = section.rows.find((row) => row.key === 'os');
		if (od && os)
			return section.columns
				.filter((column) => rowHasColumn(od, column) && rowHasColumn(os, column))
				.map((column) => [
					sectionValueKey(section, 'od', column.key),
					sectionValueKey(section, 'os', column.key)
				]);
		const hasEyeColumns = ['od', 'os'].every((key) => section.columns.some((c) => c.key === key));
		return hasEyeColumns
			? section.rows.map((row) => [
					sectionValueKey(section, row.key, 'od'),
					sectionValueKey(section, row.key, 'os')
				])
			: [];
	});
}

// OS = OD: the left eye takes the right eye's findings, blanks included.
export function mirrorOdToOs(finding: ExamFinding, test: ExamTest) {
	for (const [from, to] of mirrorPairs(test)) {
		const value = finding.values[from]?.trim();
		if (value) finding.values[to] = value;
		else delete finding.values[to];
	}
}
