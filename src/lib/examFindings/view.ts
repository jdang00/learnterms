import {
	getExamTest,
	rowHasColumn,
	sectionValueKey,
	type ExamField,
	type ExamTestGroup
} from './catalog';
import {
	examFindingTitle,
	hasRecordedValues,
	type ExamFinding,
	type ExamFindingSize
} from './findings';
import { displayAffix, effectiveField } from './input';
import { parseOffset, parseResponse, redEyeFor, type Eye, type Worth4DotState } from './worth4dot';

// Wide fields hold words ("trace NS"), so they render in sans; short ones are measurements.
export type ExamCell = { value: string; prefix?: string; suffix?: string; wide?: boolean };

// Grids wider than this take the full row (and stack per eye on phones).
export const WIDE_GRID_COLUMNS = 4;
// A small box fits a grid row of about this many characters, or a few short fields.
const SMALL_ROW_CHARS = 18;
const SMALL_FIELD_CHARS = 14;
const SMALL_FIELD_COUNT = 3;
const SMALL_NOTE_CHARS = 120;
const FULL_NOTE_CHARS = 160;

export type ExamSectionView =
	| {
			kind: 'grid';
			label?: string;
			columns: ExamField[];
			rows: Array<{ label: string; cells: Array<ExamCell | null> }>;
	  }
	| { kind: 'fields'; label?: string; items: Array<ExamCell & { label: string }> }
	| { kind: 'note'; label: string; value: string }
	| {
			kind: 'worth4dot';
			label?: string;
			redEye: Eye;
			rows: Array<Worth4DotState & { label: string }>;
	  };

export type ExamFindingView = {
	title: string;
	group: ExamTestGroup;
	sections: ExamSectionView[];
	note?: string;
	size: ExamFindingSize;
	hideInterpretation: boolean;
};

const cell = (field: ExamField, value: string): ExamCell => ({
	value,
	prefix: displayAffix(field, value) ? field.prefix : undefined,
	suffix: displayAffix(field, value) ? field.suffix : undefined,
	wide: field.wide
});

// Only recorded rows, columns and fields are shown, so a box is as small as its findings.
export function buildExamFindingView(finding: ExamFinding): ExamFindingView | null {
	const test = getExamTest(finding.test);
	if (!test) return null;
	if (!hasRecordedValues(test, finding.values) && !finding.note?.trim()) return null;
	const read = (key: string) => finding.values[key]?.trim() ?? '';
	const sections = test.layout.flatMap((section): ExamSectionView[] => {
		if (section.kind === 'note') {
			const value = read(section.key);
			return value ? [{ kind: 'note', label: section.label, value }] : [];
		}
		if (section.kind === 'fields') {
			const items = section.fields.flatMap((field) => {
				const value = read(sectionValueKey(section, field.key));
				return value ? [{ ...cell(field, value), label: field.label }] : [];
			});
			return items.length ? [{ kind: 'fields', label: section.label, items }] : [];
		}
		const value = (row: string, column: string) => read(sectionValueKey(section, row, column));
		if (section.display === 'worth4dot') {
			const rows = section.rows.flatMap((row) => {
				const response = parseResponse(value(row.key, 'response'));
				return response
					? [
							{
								label: row.label,
								response,
								white: value(row.key, 'white') || undefined,
								offset: parseOffset(value(row.key, 'offset'))
							}
						]
					: [];
			});
			return rows.length
				? [{ kind: 'worth4dot', label: section.label, redEye: redEyeFor(read('lenses')), rows }]
				: [];
		}
		const columns = section.columns.filter((column) =>
			section.rows.some((row) => value(row.key, column.key))
		);
		const rows = section.rows
			.filter((row) => columns.some((column) => value(row.key, column.key)))
			.map((row) => ({
				label: row.label,
				cells: columns.map((column) => {
					// Columns a row doesn't record (Sphere on an OU VA row) stay blank, not "–".
					if (!rowHasColumn(row, column)) return { value: '' };
					const text = value(row.key, column.key);
					return text ? cell(effectiveField(column, row), text) : null;
				})
			}));
		return rows.length ? [{ kind: 'grid', label: section.label, columns, rows }] : [];
	});
	const note = finding.note?.trim() || undefined;
	if (!sections.length && !note) return null;
	return {
		title: examFindingTitle(finding),
		group: test.group,
		sections,
		note,
		size: finding.size ?? autoSize(sections, note),
		hideInterpretation: Boolean(finding.hideInterpretation)
	};
}

const cellText = (cell: ExamCell | null) =>
	cell ? `${cell.prefix ?? ''}${cell.value}${cell.suffix ?? ''}` : '';

// Sizes a box by what it shows: wide grids take the row, short readings take a third.
function autoSize(sections: ExamSectionView[], note?: string): ExamFindingSize {
	// The box note is clamped, so only note sections (shown in full) widen a box.
	if (
		sections.some(
			(section) =>
				(section.kind === 'grid' && section.columns.length > WIDE_GRID_COLUMNS) ||
				(section.kind === 'note' && section.value.length > FULL_NOTE_CHARS)
		)
	)
		return 'full';
	const fitsSmall = (section: ExamSectionView) => {
		if (section.kind === 'note' || section.kind === 'worth4dot') return false;
		if (section.kind === 'fields')
			return (
				section.items.length <= SMALL_FIELD_COUNT &&
				section.items.every(
					(item) => Math.max(item.label.length, cellText(item).length) <= SMALL_FIELD_CHARS
				)
			);
		const labelChars = Math.max(
			section.label?.length ?? 0,
			...section.rows.map((r) => r.label.length)
		);
		const columnChars = section.columns.map((column, index) =>
			Math.max(column.label.length, ...section.rows.map((row) => cellText(row.cells[index]).length))
		);
		// Each column carries about two characters of padding.
		return labelChars + columnChars.reduce((sum, chars) => sum + chars + 2, 2) <= SMALL_ROW_CHARS;
	};
	return sections.every(fitsSmall) && (note?.length ?? 0) <= SMALL_NOTE_CHARS ? 'small' : 'half';
}
