// Grading and presentation rules for practice-test attempts. Pure: no database access.
import type { Doc } from '../_generated/dataModel';

export type AttemptItem = Doc<'quizAttemptItems'>;
export type QuestionSnapshot = AttemptItem['questionSnapshot'];

export function normalizeQuestionType(type: string): string {
	return String(type || '')
		.trim()
		.toLowerCase();
}

export function seededHash(input: string): number {
	let h = 2166136261 >>> 0;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

export function mulberry32(seed: number) {
	return function () {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function shuffledWithSeed<T>(items: T[], seedInput: string): T[] {
	const out = [...items];
	const rand = mulberry32(seededHash(seedInput));
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
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

export function matchingRoleFromOptionText(text: string): 'prompt' | 'answer' | null {
	const normalized = String(text ?? '')
		.trimStart()
		.toLowerCase();
	if (normalized.startsWith('prompt:')) return 'prompt';
	if (normalized.startsWith('answer:')) return 'answer';
	return null;
}

export function parseMatchingPair(value: string): { promptId: string; answerToken: string } | null {
	const raw = String(value ?? '').trim();
	const sep = raw.indexOf('::');
	if (sep <= 0) return null;
	const promptId = raw.slice(0, sep).trim();
	const answerToken = raw.slice(sep + 2).trim();
	if (!promptId || !answerToken) return null;
	return { promptId, answerToken };
}

export function splitMatchingAnswerToken(answerToken: string): string[] {
	return String(answerToken ?? '')
		.split('|')
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

export function normalizeMatchingAnswerText(text: string): string {
	return String(text ?? '')
		.replace(/^\s*answer:\s*/i, '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ');
}

export function resolveMatchingOptionTokenToId(
	token: string,
	options: Array<{ id: string; text: string }>
): string | null {
	const raw = String(token ?? '').trim();
	if (!raw) return null;
	if (options.some((opt) => opt.id === raw)) return raw;
	if (/^\d+$/.test(raw)) {
		const index = Number(raw);
		if (Number.isInteger(index) && index >= 0 && index < options.length) {
			return options[index]?.id ?? null;
		}
	}
	return null;
}

export function normalizeMatchingCorrectPairs(questionSnapshot: QuestionSnapshot): string[] {
	const options = questionSnapshot.options || [];
	const promptOptions = options.filter((o) => matchingRoleFromOptionText(o.text) === 'prompt');
	const answerOptions = options.filter((o) => matchingRoleFromOptionText(o.text) === 'answer');
	const answerIdSet = new Set(answerOptions.map((o) => o.id));
	const promptIdSet = new Set(promptOptions.map((o) => o.id));
	const raw = (questionSnapshot.correctAnswers || []).map((s) => String(s));

	// Modern format: promptId::answerId (answer token may include alternatives separated by "|")
	const pairValues = raw
		.map(parseMatchingPair)
		.filter(
			(
				pair
			): pair is {
				promptId: string;
				answerToken: string;
			} => Boolean(pair)
		)
		.map((pair) => ({
			promptId: resolveMatchingOptionTokenToId(pair.promptId, options) ?? '',
			answerId:
				splitMatchingAnswerToken(pair.answerToken)
					.map((token) => resolveMatchingOptionTokenToId(token, options))
					.filter((id): id is string => Boolean(id))
					.find((id) => answerIdSet.has(id)) ?? ''
		}))
		.filter((pair) => promptIdSet.has(pair.promptId) && answerIdSet.has(pair.answerId));
	if (pairValues.length > 0) {
		return Array.from(new Set(pairValues.map((pair) => `${pair.promptId}::${pair.answerId}`)));
	}

	// Legacy format: answer IDs aligned with prompt order
	const promptCount = promptOptions.length;
	if (promptCount > 0 && raw.length > 0) {
		const pairsFromAnswerIds = promptOptions
			.map((prompt, index) => {
				const answerId = raw[index];
				return answerId && answerIdSet.has(answerId) ? `${prompt.id}::${answerId}` : null;
			})
			.filter((pair): pair is string => Boolean(pair));
		if (pairsFromAnswerIds.length > 0) {
			return Array.from(new Set(pairsFromAnswerIds));
		}
	}

	// Last-resort legacy fallback: zip prompt/answer order from the snapshot.
	const zipped: string[] = [];
	const n = Math.min(promptOptions.length, answerOptions.length);
	for (let i = 0; i < n; i++) {
		zipped.push(`${promptOptions[i].id}::${answerOptions[i].id}`);
	}
	return zipped;
}

export function matchingCorrectByPrompt(
	questionSnapshot: QuestionSnapshot
): Map<string, Set<string>> {
	const options = questionSnapshot.options || [];
	const promptOptions = options.filter((o) => matchingRoleFromOptionText(o.text) === 'prompt');
	const answerOptions = options.filter((o) => matchingRoleFromOptionText(o.text) === 'answer');
	const promptIdSet = new Set(promptOptions.map((o) => o.id));
	const answerIdSet = new Set(answerOptions.map((o) => o.id));
	const answerKeyById = new Map(
		answerOptions.map((o) => [o.id, normalizeMatchingAnswerText(o.text)])
	);
	const answerIdsByKey = new Map<string, Set<string>>();
	for (const [id, key] of answerKeyById.entries()) {
		if (!answerIdsByKey.has(key)) answerIdsByKey.set(key, new Set());
		answerIdsByKey.get(key)!.add(id);
	}

	const out = new Map<string, Set<string>>();
	const raw = (questionSnapshot.correctAnswers || []).map((s) => String(s));
	const hasPairFormat = raw.some((value) => value.includes('::'));

	if (hasPairFormat) {
		for (const rawPair of raw) {
			const parsed = parseMatchingPair(rawPair);
			if (!parsed) continue;
			const resolvedPromptId = resolveMatchingOptionTokenToId(parsed.promptId, options);
			if (!resolvedPromptId || !promptIdSet.has(resolvedPromptId)) continue;

			const directAnswerIds = splitMatchingAnswerToken(parsed.answerToken)
				.map((token) => resolveMatchingOptionTokenToId(token, options))
				.filter((id): id is string => Boolean(id))
				.filter((id) => answerIdSet.has(id));
			if (directAnswerIds.length === 0) continue;

			const accepted = out.get(resolvedPromptId) ?? new Set<string>();
			for (const directId of directAnswerIds) {
				accepted.add(directId);
				const key = answerKeyById.get(directId);
				if (!key) continue;
				const sameMeaning = answerIdsByKey.get(key);
				if (!sameMeaning) continue;
				for (const equivalentId of sameMeaning) accepted.add(equivalentId);
			}
			out.set(resolvedPromptId, accepted);
		}
		return out;
	}

	const n = Math.min(promptOptions.length, raw.length);
	for (let i = 0; i < n; i++) {
		const promptId = promptOptions[i].id;
		const answerId = resolveMatchingOptionTokenToId(raw[i], options);
		if (!answerId || !answerIdSet.has(answerId)) continue;

		const accepted = new Set<string>([answerId]);
		const key = answerKeyById.get(answerId);
		if (key) {
			const sameMeaning = answerIdsByKey.get(key);
			if (sameMeaning) {
				for (const equivalentId of sameMeaning) accepted.add(equivalentId);
			}
		}
		out.set(promptId, accepted);
	}
	return out;
}

export function normalizeMatchingUserPairs(
	questionSnapshot: QuestionSnapshot,
	selectedOptions: string[]
): string[] {
	const options = questionSnapshot.options || [];
	const promptIdSet = new Set(
		options.filter((o) => matchingRoleFromOptionText(o.text) === 'prompt').map((o) => o.id)
	);
	const answerIdSet = new Set(
		options.filter((o) => matchingRoleFromOptionText(o.text) === 'answer').map((o) => o.id)
	);

	return Array.from(
		new Set(
			(selectedOptions || [])
				.map(parseMatchingPair)
				.filter(
					(
						pair
					): pair is {
						promptId: string;
						answerToken: string;
					} => Boolean(pair)
				)
				.map((pair) => ({
					promptId: resolveMatchingOptionTokenToId(pair.promptId, options) ?? '',
					answerId:
						splitMatchingAnswerToken(pair.answerToken)
							.map((token) => resolveMatchingOptionTokenToId(token, options))
							.find((id): id is string => Boolean(id)) ?? ''
				}))
				.filter((pair) => promptIdSet.has(pair.promptId) && answerIdSet.has(pair.answerId))
				.map((pair) => `${pair.promptId}::${pair.answerId}`)
		)
	);
}

export function evaluateMatchingSelection(
	questionSnapshot: QuestionSnapshot,
	selectedOptions: string[]
): boolean {
	const correctByPrompt = matchingCorrectByPrompt(questionSnapshot);
	const userPairs = normalizeMatchingUserPairs(questionSnapshot, selectedOptions || []);

	const userByPrompt = new Map<string, string>();
	for (const pair of userPairs) {
		const parsed = parseMatchingPair(pair);
		if (!parsed) continue;
		const answerId = splitMatchingAnswerToken(parsed.answerToken)[0] ?? '';
		if (!answerId) continue;
		userByPrompt.set(parsed.promptId, answerId);
	}

	if (userByPrompt.size !== correctByPrompt.size) return false;
	for (const [promptId, acceptedIds] of correctByPrompt.entries()) {
		const selectedId = userByPrompt.get(promptId);
		if (!selectedId || !acceptedIds.has(selectedId)) return false;
	}
	return true;
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
		isCorrect = evaluateMatchingSelection(
			item.questionSnapshot,
			item.response.selectedOptions || []
		);
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
		return normalizeMatchingCorrectPairs(item.questionSnapshot);
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
