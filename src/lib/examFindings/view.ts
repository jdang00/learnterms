import {
	getExamTest,
	rowHasColumn,
	sectionValueKey,
	type ExamField,
	type ExamTestGroup
} from './catalog';
import { examFindingTitle, hasRecordedValues, type ExamFinding } from './findings';
import { displayAffix } from './input';

// Wide fields hold words ("trace NS"), so they render in sans; short ones are measurements.
export type ExamCell = { value: string; prefix?: string; suffix?: string; wide?: boolean };

export type ExamSectionView =
	| {
			kind: 'grid';
			label?: string;
			columns: ExamField[];
			rows: Array<{ label: string; cells: Array<ExamCell | null> }>;
	  }
	| { kind: 'fields'; label?: string; items: Array<ExamCell & { label: string }> }
	| { kind: 'note'; label: string; value: string };

export type ExamFindingView = {
	title: string;
	group: ExamTestGroup;
	sections: ExamSectionView[];
	note?: string;
	wide: boolean;
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
					return text ? cell(column, text) : null;
				})
			}));
		return rows.length ? [{ kind: 'grid', label: section.label, columns, rows }] : [];
	});
	const note = finding.note?.trim() || undefined;
	if (!sections.length && !note) return null;
	const wide =
		finding.size === 'full' ||
		(finding.size !== 'half' &&
			sections.some(
				(section) =>
					(section.kind === 'grid' && section.columns.length > 4) ||
					(section.kind === 'note' && section.value.length > 160)
			));
	return { title: examFindingTitle(finding), group: test.group, sections, note, wide };
}
