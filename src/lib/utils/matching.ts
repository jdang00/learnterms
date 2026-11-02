// Matching questions, shared by the quiz, practice tests, grading and the editor. Pure.
//
// Storage: each option's text starts with `prompt:` or `answer:`. Answers without a prompt are
// distractors. `correctAnswers` holds `promptToken::answerToken` pairs, where a token is an option
// id or a legacy option index and an answer token may list alternatives as `a|b`. Older questions
// store answer ids aligned with prompt order instead. A student's selection is `promptId::answerId`.
import { shuffledWithSeed } from './seededShuffle';

export type MatchingOption = { id: string; text: string };
export type MatchingQuestion = {
	_id?: string;
	options?: MatchingOption[] | null;
	correctAnswers?: string[] | null;
};
/** Prompt id → accepted answer ids. The first id is the canonical answer; the rest share its text. */
export type MatchingKey = Map<string, string[]>;

const PREFIX = /^\s*(prompt|answer):\s*/i;

export function matchingRole(text: string): 'prompt' | 'answer' | null {
	const role = PREFIX.exec(String(text ?? ''))?.[1]?.toLowerCase();
	return role === 'prompt' || role === 'answer' ? role : null;
}

/** The text a student sees, without the `prompt:`/`answer:` prefix. */
export function matchingLabel(text: string): string {
	return String(text ?? '')
		.replace(PREFIX, '')
		.trim();
}

export function encodePrompt(text: string) {
	return `prompt:${text}`;
}

export function encodeAnswer(text: string) {
	return `answer:${text}`;
}

export function matchingSides(options: MatchingOption[] | null | undefined) {
	const prompts: MatchingOption[] = [];
	const answers: MatchingOption[] = [];
	for (const option of options ?? []) {
		const role = matchingRole(option.text);
		if (role === 'prompt') prompts.push(option);
		else if (role === 'answer') answers.push(option);
	}
	return { prompts, answers };
}

/** Case- and whitespace-insensitive text, so duplicate answers grade as the same answer. */
export function answerTextKey(text: string): string {
	return matchingLabel(text).toLowerCase().replace(/\s+/g, ' ');
}

export function pairToken(promptId: string, answerId: string) {
	return `${promptId}::${answerId}`;
}

export function parsePairToken(value: string): { promptToken: string; answerToken: string } | null {
	const raw = String(value ?? '').trim();
	const sep = raw.indexOf('::');
	if (sep <= 0) return null;
	const promptToken = raw.slice(0, sep).trim();
	const answerToken = raw.slice(sep + 2).trim();
	if (!promptToken || !answerToken) return null;
	return { promptToken, answerToken };
}

export function splitAnswerToken(answerToken: string): string[] {
	return String(answerToken ?? '')
		.split('|')
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

/** Resolves an option id, a renamed id (`legacyIdMap`) or a legacy index to an option id. */
export function resolveOptionToken(
	token: string,
	options: MatchingOption[],
	legacyIdMap?: Map<string, string>
): string | null {
	const raw = String(token ?? '').trim();
	if (!raw) return null;
	if (legacyIdMap?.has(raw)) return legacyIdMap.get(raw)!;
	if (options.some((option) => option.id === raw)) return raw;
	if (/^\d+$/.test(raw)) {
		const index = Number(raw);
		if (index < options.length) return options[index]?.id ?? null;
	}
	return null;
}

function parsePairs(values: string[], options: MatchingOption[]) {
	const { prompts, answers } = matchingSides(options);
	const promptIds = new Set(prompts.map((option) => option.id));
	const answerIds = new Set(answers.map((option) => option.id));
	const pairs: Array<{ promptId: string; answerIds: string[] }> = [];
	for (const value of values) {
		const parsed = parsePairToken(value);
		if (!parsed) continue;
		const promptId = resolveOptionToken(parsed.promptToken, options);
		if (!promptId || !promptIds.has(promptId)) continue;
		const ids = splitAnswerToken(parsed.answerToken)
			.map((token) => resolveOptionToken(token, options))
			.filter((id): id is string => Boolean(id) && answerIds.has(id!));
		if (ids.length > 0) pairs.push({ promptId, answerIds: ids });
	}
	return pairs;
}

export function matchingKey(question: MatchingQuestion): MatchingKey {
	const options = question.options ?? [];
	const { prompts, answers } = matchingSides(options);
	const answerIds = new Set(answers.map((option) => option.id));
	const raw = (question.correctAnswers ?? []).map(String);

	const direct = new Map<string, string[]>();
	if (raw.some((value) => value.includes('::'))) {
		for (const pair of parsePairs(raw, options)) {
			direct.set(pair.promptId, [...(direct.get(pair.promptId) ?? []), ...pair.answerIds]);
		}
	} else {
		prompts.forEach((prompt, index) => {
			const answerId = index < raw.length ? resolveOptionToken(raw[index], options) : null;
			if (answerId && answerIds.has(answerId)) direct.set(prompt.id, [answerId]);
		});
	}

	const idsByText = new Map<string, string[]>();
	for (const answer of answers) {
		const key = answerTextKey(answer.text);
		idsByText.set(key, [...(idsByText.get(key) ?? []), answer.id]);
	}
	const textById = new Map(answers.map((answer) => [answer.id, answerTextKey(answer.text)]));

	const key: MatchingKey = new Map();
	for (const [promptId, ids] of direct) {
		const accepted = [...ids];
		for (const id of ids) {
			for (const same of idsByText.get(textById.get(id) ?? '') ?? []) {
				if (!accepted.includes(same)) accepted.push(same);
			}
		}
		key.set(promptId, [...new Set(accepted)]);
	}
	return key;
}

/** One `promptId::answerId` per keyed prompt; zips prompts and answers when nothing is keyed. */
export function correctPairs(question: MatchingQuestion): string[] {
	const key = matchingKey(question);
	if (key.size > 0) return [...key].map(([promptId, ids]) => pairToken(promptId, ids[0]));
	const { prompts, answers } = matchingSides(question.options);
	return prompts.slice(0, answers.length).map((prompt, i) => pairToken(prompt.id, answers[i].id));
}

/** The student's answer per prompt. Invalid pairs are dropped; a later pair for a prompt wins. */
export function selectionsByPrompt(
	question: MatchingQuestion,
	selected: string[] | null | undefined
): Map<string, string> {
	const out = new Map<string, string>();
	for (const pair of parsePairs(selected ?? [], question.options ?? [])) {
		out.set(pair.promptId, pair.answerIds[0]);
	}
	return out;
}

/**
 * Correct when every keyed prompt has one of its accepted answers and every prompt without an
 * answer is left blank. A question with no key at all is never correct.
 */
export function evaluateMatching(
	question: MatchingQuestion,
	selected: string[] | null | undefined
): boolean {
	const { prompts } = matchingSides(question.options);
	const key = matchingKey(question);
	if (prompts.length === 0 || key.size === 0) return false;
	const chosen = selectionsByPrompt(question, selected);
	return prompts.every((prompt) => {
		const accepted = key.get(prompt.id);
		const picked = chosen.get(prompt.id);
		return accepted ? picked !== undefined && accepted.includes(picked) : picked === undefined;
	});
}

/** Matches `answerId` to `promptId`, taking it from any prompt that already had it. */
export function setMatch(selected: string[], promptId: string, answerId: string): string[] {
	const kept = selected.filter((value) => {
		const parsed = parsePairToken(value);
		return parsed && parsed.promptToken !== promptId && parsed.answerToken !== answerId;
	});
	return [...kept, pairToken(promptId, answerId)];
}

export function clearMatch(selected: string[], promptId: string): string[] {
	return selected.filter((value) => parsePairToken(value)?.promptToken !== promptId);
}

/**
 * Answers in a stable shuffled order for this question. Never the authored order, and never
 * starting with the answers in prompt order, which would give the key away.
 */
export function shuffledAnswers(question: MatchingQuestion): MatchingOption[] {
	const { prompts, answers } = matchingSides(question.options);
	if (answers.length <= 1) return answers;
	const key = matchingKey(question);
	const seed = [
		question._id ?? '',
		prompts.map((option) => option.id).join(','),
		answers.map((option) => option.id).join(','),
		(question.correctAnswers ?? []).join(',')
	].join('|');

	const out = shuffledWithSeed(answers, seed);
	const startsWith = (ids: Array<string | undefined>) =>
		ids.length > 0 && ids.every((id, i) => out[i]?.id === id);
	const inPromptOrder = prompts.map((prompt) => key.get(prompt.id)?.[0]);
	if (startsWith(answers.map((option) => option.id)) || startsWith(inPromptOrder)) {
		return [...out.slice(1), out[0]];
	}
	return out;
}

/**
 * One editor row. Both sides set is a pair, a prompt alone has no answer (left blank to be
 * correct), and an answer alone is a distractor.
 */
export type MatchingRowDraft = { prompt: string | null; answer: string | null };

const blankRow = (row?: MatchingRowDraft) => !row?.prompt?.trim() && !row?.answer?.trim();

/** Editor rows: prompts with their keyed answers in order, then distractors. */
export function matchingDraft(question: MatchingQuestion): MatchingRowDraft[] {
	const { prompts, answers } = matchingSides(question.options);
	const key = matchingKey(question);
	const labelById = new Map(answers.map((answer) => [answer.id, matchingLabel(answer.text)]));
	const paired = new Set<string>();
	const rows: MatchingRowDraft[] = prompts.map((prompt) => {
		const answerId = key.get(prompt.id)?.find((id) => !paired.has(id));
		if (answerId) paired.add(answerId);
		return {
			prompt: matchingLabel(prompt.text),
			answer: answerId ? labelById.get(answerId)! : null
		};
	});
	for (const answer of answers) {
		if (!paired.has(answer.id)) rows.push({ prompt: null, answer: matchingLabel(answer.text) });
	}
	return rows;
}

/** Fills the first row missing that side, or adds a row. */
export function addMatchingSide(rows: MatchingRowDraft[], side: 'prompt' | 'answer') {
	const index = rows.findIndex((row) => row[side] === null);
	if (index === -1) {
		return [
			...rows,
			side === 'prompt' ? { prompt: '', answer: null } : { prompt: null, answer: '' }
		];
	}
	return rows.map((row, i) => (i === index ? { ...row, [side]: '' } : row));
}

/** Clears one side of a row without shifting the others; a row with neither side is dropped. */
export function removeMatchingSide(
	rows: MatchingRowDraft[],
	index: number,
	side: 'prompt' | 'answer'
) {
	return rows
		.map((row, i) => (i === index ? { ...row, [side]: null } : row))
		.filter((row) => row.prompt !== null || row.answer !== null);
}

/** Options and pair key for saving the rows, or the problem that blocks saving. */
export function encodeMatchingDraft(rows: MatchingRowDraft[]) {
	const filled = rows.map((row) => ({
		prompt: row.prompt?.trim() ?? '',
		answer: row.answer?.trim() ?? ''
	}));
	const prompts = filled.filter((row) => row.prompt);
	const answers = filled.filter((row) => row.answer);
	if (!filled.some((row) => row.prompt && row.answer)) return { error: 'Add at least one pair' };
	return {
		options: [
			...prompts.map((row) => ({ text: encodePrompt(row.prompt) })),
			...answers.map((row) => ({ text: encodeAnswer(row.answer) }))
		],
		correctAnswers: prompts.flatMap((row, i) =>
			row.answer ? [`${i}::${prompts.length + answers.indexOf(row)}`] : []
		)
	};
}

/**
 * Inserts a two-column spreadsheet paste (prompt, tab, answer per line) at `index`, replacing that
 * row when it is blank. Null when the text is not two or more tab-separated lines.
 */
export function insertPastedPairs(
	rows: MatchingRowDraft[],
	index: number,
	text: string
): MatchingRowDraft[] | null {
	const lines = text.split(/\r?\n/).filter((line) => line.trim());
	if (lines.length < 2 || !lines.every((line) => line.includes('\t'))) return null;
	const pasted = lines.map((line) => {
		const [prompt, ...rest] = line.split('\t');
		return { prompt: prompt.trim(), answer: rest.join(' ').trim() };
	});
	const next = [...rows];
	next.splice(index, blankRow(next[index]) ? 1 : 0, ...pasted);
	return next.filter((row, i) => !blankRow(row) || i < index);
}

/** A, B, … Z, then AA, AB… for very large answer banks. */
export function answerLetter(index: number): string {
	let n = index;
	let out = '';
	do {
		out = String.fromCharCode(65 + (n % 26)) + out;
		n = Math.floor(n / 26) - 1;
	} while (n >= 0);
	return out;
}

export type MatchStatus = 'correct' | 'incorrect' | 'unanswered';
export type MatchResult = {
	/** The prompt's option id. */
	id: string;
	prompt: string;
	chosen?: string;
	chosenId?: string;
	correct?: string;
	correctId?: string;
	status: MatchStatus;
};

/** Per-prompt outcome of a selection, for solution and review screens. */
export function matchResults(
	question: MatchingQuestion,
	selected: string[] | null | undefined
): MatchResult[] {
	const { prompts, answers } = matchingSides(question.options);
	const labelById = new Map(answers.map((answer) => [answer.id, matchingLabel(answer.text)]));
	const key = matchingKey(question);
	const chosen = selectionsByPrompt(question, selected);
	return prompts.map((prompt) => {
		const chosenId = chosen.get(prompt.id);
		const accepted = key.get(prompt.id) ?? [];
		return {
			id: prompt.id,
			prompt: matchingLabel(prompt.text),
			chosen: chosenId ? labelById.get(chosenId) : undefined,
			chosenId,
			correct: accepted[0] ? labelById.get(accepted[0]) : undefined,
			correctId: accepted[0],
			status:
				accepted.length === 0
					? chosenId
						? 'incorrect'
						: 'correct'
					: !chosenId
						? 'unanswered'
						: accepted.includes(chosenId)
							? 'correct'
							: 'incorrect'
		};
	});
}
