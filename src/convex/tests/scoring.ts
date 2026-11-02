// Grading and presentation rules for practice-test attempts. Pure: no database access.
import type { Doc } from '../_generated/dataModel';
import { correctPairs, evaluateMatching } from '../../lib/utils/matching';

export type AttemptItem = Doc<'quizAttemptItems'>;
export type QuestionSnapshot = AttemptItem['questionSnapshot'];

export function normalizeQuestionType(type: string): string {
	return String(type || '')
		.trim()
		.toLowerCase();
}

export function clampInt(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function exactSetMatch(correctAnswers: string[], userAnswers: string[]) {
	const sortedCorrect = [...correctAnswers].sort();
	const sortedUser = [...userAnswers].sort();
	return (
		sortedCorrect.length === sortedUser.length &&
		sortedCorrect.every((value, idx) => value === sortedUser[idx])
	);
}

export type FitbMode = 'exact' | 'exact_cs' | 'contains' | 'regex';

export function isFitbMode(s: string): s is FitbMode {
	return s === 'exact' || s === 'exact_cs' || s === 'contains' || s === 'regex';
}

export function normalizeForFlags(
	text: string,
	ignorePunct: boolean,
	normalizeWs: boolean,
	toLower: boolean
) {
	let out = String(text || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
	if (toLower) out = out.toLowerCase();
	if (ignorePunct) out = out.replace(/[^a-z0-9\s]/gi, '');
	if (normalizeWs) out = out.replace(/\s+/g, ' ');
	return out.trim();
}

export function looksUnsafeRegexPattern(pattern: string): boolean {
	if (pattern.length > 200) return true;
	// Heuristic for catastrophic backtracking patterns like (.+)+ or (a*){2,}
	if (
		/\((?:[^()\\]|\\.)*(?:\+|\*|\{\d+(?:,\d*)?\})(?:[^()\\]|\\.)*\)\s*(?:\+|\*|\{\d+(?:,\d*)?\})/.test(
			pattern
		)
	) {
		return true;
	}
	// Heuristic for repeated wildcard groups such as (.*.*)+
	if (
		/\((?:[^()\\]|\\.)*(?:\.\*|\.\+)(?:[^()\\]|\\.)*(?:\.\*|\.\+)(?:[^()\\]|\\.)*\)/.test(pattern)
	) {
		return true;
	}
	return false;
}

export function safeRegex(pattern: string): RegExp | null {
	if (looksUnsafeRegexPattern(pattern)) return null;
	try {
		return new RegExp(pattern);
	} catch {
		return null;
	}
}

export function evaluateFitb(questionSnapshot: QuestionSnapshot, userText: string): boolean {
	const options = questionSnapshot.options || [];
	const encodedAnswers = (questionSnapshot.correctAnswers || [])
		.map((id) => options.find((o) => o.id === id)?.text)
		.filter((t): t is string => Boolean(t));

	for (const encoded of encodedAnswers) {
		const [before, flagsPart] = String(encoded || '').split(' | flags=');
		const firstColon = before.indexOf(':');
		let mode: FitbMode = 'exact';
		let value = before;
		if (firstColon > -1) {
			const maybe = before.slice(0, firstColon);
			if (isFitbMode(maybe)) {
				mode = maybe;
				value = before.slice(firstColon + 1);
			}
		}
		const ignorePunct = (flagsPart || '').includes('ignore_punct');
		const normalizeWs = (flagsPart || '').includes('normalize_ws');
		if (mode === 'regex') {
			const re = safeRegex(value);
			if (re && re.test(userText)) return true;
			continue;
		}
		const lowerInsensitive = mode !== 'exact_cs';
		const normalizedUser = normalizeForFlags(userText, ignorePunct, normalizeWs, lowerInsensitive);
		const normalizedValue = normalizeForFlags(value, ignorePunct, normalizeWs, lowerInsensitive);
		if (mode === 'contains') {
			if (normalizedUser.includes(normalizedValue)) return true;
		} else if (normalizedUser === normalizedValue) {
			return true;
		}
	}

	return false;
}

export function isFitbType(type: string) {
	return normalizeQuestionType(type) === 'fill_in_the_blank';
}

export function isMatchingType(type: string) {
	return normalizeQuestionType(type) === 'matching';
}

export function isAnswered(item: AttemptItem) {
	if (isFitbType(item.questionSnapshot.type)) {
		const text = item.response.textResponse ?? item.response.selectedOptions[0] ?? '';
		return String(text).trim().length > 0;
	}
	return (item.response.selectedOptions || []).length > 0;
}

export function scoreAttemptItem(item: AttemptItem) {
	const pointsPossible = item.score.pointsPossible ?? 1;
	let isCorrect = false;
	let unanswered = false;

	if (!isAnswered(item)) {
		unanswered = true;
		isCorrect = false;
	} else if (isFitbType(item.questionSnapshot.type)) {
		const text = item.response.textResponse ?? item.response.selectedOptions[0] ?? '';
		isCorrect = evaluateFitb(item.questionSnapshot, String(text));
	} else if (isMatchingType(item.questionSnapshot.type)) {
		isCorrect = evaluateMatching(item.questionSnapshot, item.response.selectedOptions);
	} else {
		isCorrect = exactSetMatch(
			item.questionSnapshot.correctAnswers || [],
			item.response.selectedOptions || []
		);
	}

	return {
		isCorrect,
		unanswered,
		pointsEarned: isCorrect ? pointsPossible : 0,
		pointsPossible
	};
}

export function computeAttemptCounters(items: AttemptItem[]) {
	let visitedCount = 0;
	let answeredCount = 0;
	let flaggedCount = 0;
	for (const item of items) {
		if (item.response.visitedAt !== undefined) visitedCount++;
		if (isAnswered(item)) answeredCount++;
		if (item.response.isFlagged) flaggedCount++;
	}
	return { visitedCount, answeredCount, flaggedCount };
}

export function decodeFitbDisplayText(raw: string): string {
	const [before] = String(raw || '').split(' | flags=');
	const firstColon = before.indexOf(':');
	if (firstColon > -1) {
		const maybe = before.slice(0, firstColon);
		if (isFitbMode(maybe)) return before.slice(firstColon + 1);
	}
	return before;
}

export function buildCorrectAnswerDisplay(item: AttemptItem) {
	if (isFitbType(item.questionSnapshot.type)) {
		const optionMap = new Map(item.questionSnapshot.options.map((o) => [o.id, o.text]));
		return (item.questionSnapshot.correctAnswers || [])
			.map((id) => optionMap.get(id) ?? id)
			.map((s) => decodeFitbDisplayText(s));
	}

	if (isMatchingType(item.questionSnapshot.type)) {
		return correctPairs(item.questionSnapshot);
	}

	return item.questionSnapshot.correctAnswers || [];
}

export function redactAttemptItemForRunner(item: AttemptItem) {
	const orderedOptions =
		item.optionOrder && item.optionOrder.length > 0
			? item.optionOrder
					.map((id) => item.questionSnapshot.options.find((o) => o.id === id))
					.filter((o): o is { id: string; text: string } => Boolean(o))
			: item.questionSnapshot.options;

	return {
		_id: item._id,
		attemptId: item.attemptId,
		questionId: item.questionId,
		moduleId: item.moduleId,
		order: item.order,
		question: {
			type: item.questionSnapshot.type,
			stem: item.questionSnapshot.stem,
			examFindings: item.questionSnapshot.examFindings,
			examFindingsStyle: item.questionSnapshot.examFindingsStyle,
			options: orderedOptions,
			correctAnswerCount: (item.questionSnapshot.correctAnswers || []).length
		},
		response: item.response
	};
}
