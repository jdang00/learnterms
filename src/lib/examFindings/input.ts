import type { ExamField, ExamRow } from './catalog';

export function effectiveField(field: ExamField, row?: ExamRow | null): ExamField {
	return row
		? {
				...field,
				input: row.input ?? field.input,
				normal: row.normal ?? field.normal,
				choices: [...(field.choices ?? []), ...(row.choices ?? [])]
			}
		: field;
}

export function inputMode(field: ExamField): 'decimal' | 'numeric' | 'text' {
	if (field.input === 'axis' || field.input === 'integer') return 'numeric';
	if (field.input === 'number' || field.input === 'cupDisc') return 'decimal';
	return 'text';
}

export function fieldChoices(field: ExamField, row?: ExamRow | null): string[] {
	return [
		...new Set(
			[
				row?.normal ?? field.normal,
				field.default,
				...(field.choices ?? []),
				...(row?.choices ?? [])
			].filter(Boolean) as string[]
		)
	];
}

export function fieldHint(field: ExamField): string | undefined {
	if (field.input === 'axis') return 'Axis 001–180 (0 becomes 180)';
	if (field.input === 'cupDisc') return 'Cup-to-disc ratio 0.00–1.00';
	if (field.max !== undefined) return `Maximum ${field.max}`;
	if (field.input === 'power') return 'Signed diopters, e.g. -1.25 or +2.00';
	return undefined;
}

export function prismParts(value: string) {
	const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(?:Δ|d|pd)?\s*(BI|BO|BU|BD)?$/i);
	return match
		? { magnitude: match[1], direction: match[2]?.toUpperCase() ?? '' }
		: { magnitude: value, direction: '' };
}

const COVER_DIRECTIONS = ['Ortho', 'Esoph', 'Exoph', 'Rhyper', 'Lhyper'] as const;
const COVER_ALIASES: Record<string, (typeof COVER_DIRECTIONS)[number]> = {
	esophoria: 'Esoph',
	exophoria: 'Exoph',
	'r hyperphoria': 'Rhyper',
	'l hyperphoria': 'Lhyper'
};

export function coverDeviationParts(value: string) {
	const match = value
		.trim()
		.match(
			/^(?:(\d+(?:\.\d*)?)\s*(?:Δ|pd)?\s*)?(Ortho|Esoph|Exoph|Rhyper|Lhyper|Esophoria|Exophoria|R hyperphoria|L hyperphoria)?$/i
		);
	if (!match || (!match[1] && !match[2])) return { magnitude: value, direction: '' };
	const direction = match[2]
		? (COVER_DIRECTIONS.find((item) => item.toLowerCase() === match[2].toLowerCase()) ??
			COVER_ALIASES[match[2].toLowerCase()])
		: undefined;
	return { magnitude: match[1] ?? '', direction: direction ?? '' };
}

export function combineCoverDeviation(magnitude: string, direction: string) {
	if (direction === 'Ortho') return 'Ortho';
	const amount = magnitude.trim();
	return [amount, direction].filter(Boolean).join(' ');
}

export const COVER_CORRECTION_CHOICES = ['With correction', 'Without correction'] as const;

export function coverCorrectionValues(value: string) {
	return COVER_CORRECTION_CHOICES.filter((choice) =>
		value
			.toLowerCase()
			.split(/\s*[,;·]\s*/)
			.includes(choice.toLowerCase())
	);
}

export function toggleCoverCorrection(value: string, choice: string, checked: boolean) {
	const selected = coverCorrectionValues(value);
	return COVER_CORRECTION_CHOICES.filter((item) =>
		item === choice ? checked : selected.includes(item)
	).join(', ');
}

export function combinePrism(magnitude: string, direction: string) {
	const amount = magnitude.trim();
	if (!amount || !/^\d+(?:\.\d+)?$/.test(amount)) return amount;
	return `${amount}Δ${direction ? ` ${direction}` : ''}`;
}

export function displayAffix(field: ExamField, value: string): boolean {
	if (!value) return true;
	if (field.input === 'acuity') return /^\d/.test(value);
	if (['axis', 'power', 'number', 'integer', 'cupDisc'].includes(field.input ?? ''))
		return /^[+-]?(?:\d|\.\d)/.test(value);
	return true;
}

function stripAffixes(raw: string, field: ExamField) {
	let value = raw.trim();
	if (field.prefix && value.toLowerCase().startsWith(field.prefix.toLowerCase()))
		value = value.slice(field.prefix.length).trim();
	if (field.suffix && value.toLowerCase().endsWith(field.suffix.toLowerCase()))
		value = value.slice(0, -field.suffix.length).trim();
	return value;
}

function formatTime(value: string) {
	const match = value.match(/^(\d{1,2})(?::?(\d{2}))?\s*([ap](?:\.?m\.?)?)?$/i);
	if (!match) return value;
	const hour = Number(match[1]);
	const minute = Number(match[2] ?? '0');
	if (hour > 23 || minute > 59 || (match[3] && (hour < 1 || hour > 12))) return value;
	const period = match[3]
		? match[3][0].toUpperCase() + 'M'
		: hour === 0
			? 'AM'
			: hour > 12
				? 'PM'
				: '';
	return `${hour % 12 || 12}:${String(minute).padStart(2, '0')}${period ? ` ${period}` : ''}`;
}

export function formatExamValue(raw: string, field: ExamField): string {
	let value = stripAffixes(raw, field);
	if (!value) return '';
	value = value.replace(/[−–]/g, '-');
	if (field.input === 'acuity') {
		value = value.replace(/^20\s*\/\s*/i, '');
		return /^(cf|hm|lp|nlp)$/i.test(value) ? value.toUpperCase() : value;
	}
	if (field.input === 'time') return formatTime(value);
	if (field.input === 'bp') {
		const match = value.match(/^(\d{2,3})\s*[-/ ]\s*(\d{2,3})$/);
		return match ? `${Number(match[1])}/${Number(match[2])}` : value;
	}
	if (field.input === 'prism') {
		const match = value.match(/^(\d+(?:\.\d+)?)\s*(?:Δ|d|pd)?\s*(BI|BO|BU|BD)$/i);
		return match ? `${Number(match[1])}Δ ${match[2].toUpperCase()}` : value;
	}
	if (field.input === 'coverDeviation') {
		const { magnitude, direction } = coverDeviationParts(value);
		if (direction === 'Ortho') return 'Ortho';
		if (!/^\d+(?:\.\d+)?$/.test(magnitude)) return value;
		return combineCoverDeviation(String(Math.min(999, Number(magnitude))), direction);
	}
	if (field.input === 'integer' && field.max !== undefined) {
		const score = value.match(/^(\d+)\s*\/\s*(\d+)$/);
		if (score && Number(score[2]) === field.max) value = score[1];
	}
	if (!['axis', 'power', 'number', 'integer', 'cupDisc'].includes(field.input ?? '')) return value;
	if (field.input === 'power' && /^(plano|pl)$/i.test(value)) return 'Plano';
	if (field.input === 'power') value = value.replace(/\s*d$/i, '').trim();
	if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)) return value;
	let number = Number(value);
	if (field.input === 'axis') {
		if (number === 0) number = 180;
		return String(Math.min(180, Math.max(1, Math.round(number)))).padStart(3, '0');
	}
	if (field.input === 'cupDisc') return Math.min(1, Math.max(0, number)).toFixed(2);
	if (field.min !== undefined) number = Math.max(field.min, number);
	if (field.max !== undefined) number = Math.min(field.max, number);
	if (field.input === 'integer') return String(Math.round(number));
	if (field.input === 'power') return `${number > 0 ? '+' : ''}${number.toFixed(2)}`;
	return field.decimals === undefined ? String(number) : number.toFixed(field.decimals);
}
