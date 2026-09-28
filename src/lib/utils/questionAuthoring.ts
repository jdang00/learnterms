import { QUESTION_TYPES, type QuestionType } from '../types';

export type TypeSuggestion = { type: QuestionType; reason: string };

const BLANK = /_{3,}|\[blank\]/gi;

export function countBlanks(text: string): number {
	return text.match(BLANK)?.length ?? 0;
}

export function inferQuestionType(text: string): TypeSuggestion | null {
	const stem = text.trimStart();
	if (/^(true\s+or\s+false|t\s*\/\s*f)\b\s*[:.?-]?\s/i.test(stem)) {
		return { type: QUESTION_TYPES.TRUE_FALSE, reason: "Starts with 'True or false'" };
	}
	const match = stem.match(/^(match(?:es|ing)?|pair\s+each)[:.]?\s/i);
	if (match) {
		return { type: QUESTION_TYPES.MATCHING, reason: `Starts with '${match[1]}'` };
	}
	if (countBlanks(stem) > 0) {
		return { type: QUESTION_TYPES.FILL_IN_THE_BLANK, reason: 'Has a blank (___)' };
	}
	if (/\b(select|choose|mark|pick)\s+(all|two|three|four|[2-9])\b/i.test(stem)) {
		return { type: QUESTION_TYPES.MULTIPLE_CHOICE, reason: 'Asks to select several' };
	}
	const verb = stem.match(/^(explain|describe|compare|contrast|discuss|justify|summarize)\s/i);
	if (verb) {
		return { type: QUESTION_TYPES.FREE_RESPONSE, reason: `Starts with '${verb[1]}'` };
	}
	return null;
}

const COUNT_WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5 };

/** The number of answers a stem asks for ("choose two", "select 3"), or null. */
export function expectedAnswerCount(text: string): number | null {
	const match = text.match(/\b(?:select|choose|mark|pick|which)\s+(two|three|four|five|[2-9])\b/i);
	if (!match) return null;
	const word = match[1].toLowerCase();
	return COUNT_WORDS[word] ?? Number(word);
}

/** Splits `{{cornea|the cornea}}` into accepted answers. */
export function splitInlineAnswers(raw: string): string[] {
	return raw
		.split('|')
		.map((answer) => answer.trim())
		.filter(Boolean);
}

export const INLINE_ANSWER = /\{\{([^{}]+)\}\}/;

export type ParsedQuestion = {
	type: QuestionType;
	stem: string;
	options: string[];
	correct: number[];
	fitbAnswers: string[];
	pairs: Array<{ prompt: string; answer: string }>;
	rationale: string;
};

const OPTION_LINE = /^(\*)?\s*\(?([a-h])[.)]\s+(.+?)\s*(\*|\((?:correct|answer)\))?$/i;
const ANSWER_LINE = /^(?:correct\s+)?(?:answer|ans|key)(?:\s+key)?\s*[:.-]\s*(.+)$/i;
const RATIONALE_LINE = /^(?:rationale|explanation|reason(?:ing)?)\s*[:.-]\s*(.*)$/i;
const PAIR_SEPARATOR = /\t+|\s+(?:→|->|—|=)\s+/;
const QUESTION_NUMBER = /^(?:q(?:uestion)?\s*)?\d+\s*[.):]\s+/i;

function normalizeLines(text: string) {
	return text
		.replace(/\r\n?/g, '\n')
		.replace(/\u00a0/g, ' ')
		.split('\n')
		.map((line) => line.replace(/\s+$/, ''));
}

function parseAnswerKey(key: string, options: string[]): number[] {
	const cleaned = key
		.trim()
		.replace(/^([a-h])[.)]\s+.*$/i, '$1')
		.replace(/[.]$/, '');
	const byText = options.findIndex((option) => option.toLowerCase() === cleaned.toLowerCase());
	if (byText !== -1) return [byText];
	const letters = cleaned.match(/\b[a-h]\b/gi);
	if (!letters || cleaned.replace(/\b[a-h]\b|,|&|\/|\band\b|\s/gi, '').length > 0) return [];
	return [...new Set(letters.map((letter) => letter.toLowerCase().charCodeAt(0) - 97))]
		.filter((index) => index < options.length)
		.sort((a, b) => a - b);
}

/**
 * Splits a pasted question ("stem / A. … / B. … / Answer: C / Rationale: …") into fields.
 * Returns null when the text has no structure worth splitting.
 */
export function parsePastedQuestion(text: string): ParsedQuestion | null {
	const lines = normalizeLines(text);
	const stemLines: string[] = [];
	const options: string[] = [];
	const starred: number[] = [];
	const rationaleLines: string[] = [];
	let answerKey: string | null = null;
	let section: 'stem' | 'options' | 'rationale' = 'stem';

	for (const line of lines) {
		const trimmed = line.trim();
		const answer = trimmed.match(ANSWER_LINE);
		if (answer) {
			answerKey = answer[1];
			if (section === 'options') section = 'rationale';
			continue;
		}
		const rationale = trimmed.match(RATIONALE_LINE);
		if (rationale) {
			section = 'rationale';
			if (rationale[1]) rationaleLines.push(rationale[1]);
			continue;
		}
		if (section === 'rationale') {
			rationaleLines.push(trimmed);
			continue;
		}
		const option = trimmed.match(OPTION_LINE);
		const expected = String.fromCharCode(97 + options.length);
		if (option && option[2].toLowerCase() === expected) {
			section = 'options';
			if (option[1] || option[4]) starred.push(options.length);
			options.push(option[3].trim());
			continue;
		}
		if (section === 'options') {
			if (trimmed) options[options.length - 1] += ` ${trimmed}`;
			continue;
		}
		stemLines.push(trimmed);
	}

	const stemText = stemLines.join('\n').trim().replace(QUESTION_NUMBER, '');
	const rationale = rationaleLines.join('\n').trim();
	const base = { stem: stemText, rationale, options: [], correct: [], fitbAnswers: [], pairs: [] };

	if (options.length >= 2) {
		const correct = starred.length ? starred : answerKey ? parseAnswerKey(answerKey, options) : [];
		const isTrueFalse =
			options.length === 2 &&
			options[0].toLowerCase() === 'true' &&
			options[1].toLowerCase() === 'false';
		return {
			...base,
			type: isTrueFalse ? QUESTION_TYPES.TRUE_FALSE : QUESTION_TYPES.MULTIPLE_CHOICE,
			options: isTrueFalse ? ['True', 'False'] : options,
			correct
		};
	}

	const pairs = parsePairs(stemLines);
	if (pairs) return { ...base, ...pairs, type: QUESTION_TYPES.MATCHING };

	if (!answerKey && !rationale) return null;
	const suggestion = inferQuestionType(stemText);
	if (suggestion?.type === QUESTION_TYPES.TRUE_FALSE && answerKey) {
		const key = answerKey.trim().toLowerCase();
		const correct = key.startsWith('t') ? [0] : key.startsWith('f') ? [1] : [];
		return {
			...base,
			type: QUESTION_TYPES.TRUE_FALSE,
			stem: stemText.replace(/^(true\s+or\s+false|t\s*\/\s*f)\b\s*[:.?-]?\s*/i, ''),
			options: ['True', 'False'],
			correct
		};
	}
	if (countBlanks(stemText) > 0 && answerKey) {
		return {
			...base,
			type: QUESTION_TYPES.FILL_IN_THE_BLANK,
			fitbAnswers: answerKey
				.split(/[|;]/)
				.map((answer) => answer.trim())
				.filter(Boolean)
		};
	}
	return { ...base, type: suggestion?.type ?? QUESTION_TYPES.MULTIPLE_CHOICE };
}

function parsePairs(lines: string[]) {
	const filled = lines.filter(Boolean);
	const firstPair = filled.findIndex((line) => PAIR_SEPARATOR.test(line));
	if (firstPair === -1) return null;
	const pairLines = filled.slice(firstPair);
	if (pairLines.length < 2 || !pairLines.every((line) => PAIR_SEPARATOR.test(line))) return null;
	const intro = filled.slice(0, firstPair).join('\n').replace(QUESTION_NUMBER, '');
	// Tabs are unambiguous (spreadsheet columns); arrows and dashes need a "Match…" intro.
	if (!pairLines.every((line) => line.includes('\t')) && !/^(match|pair)/i.test(intro)) return null;
	return {
		stem: intro || 'Match each item with its pair.',
		pairs: pairLines.map((line) => {
			const [prompt, ...rest] = line.split(PAIR_SEPARATOR);
			return {
				prompt: prompt.replace(/^\d+[.)]\s+/, '').trim(),
				answer: rest
					.join(' ')
					.replace(/^[a-z][.)]\s+/i, '')
					.trim()
			};
		})
	};
}

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export function plainTextToHtml(text: string): string {
	return text
		.split(/\n+/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => `<p>${escapeHtml(line)}</p>`)
		.join('');
}
