import type { StudyEvidence } from './studyMastery';
import type { Doc } from '../../convex/_generated/dataModel';
type QuestionOption = { id: string; text: string };
export type GradableQuestion = Pick<Doc<'question'>, '_id' | 'type' | 'options' | 'correctAnswers'>;
export type AnswerStatus = 'mastered' | 'correct' | 'incorrect' | 'unanswered';

export function evaluateFillInTheBlank(q: GradableQuestion, userText: string): boolean {
	const options = (q.options || []) as QuestionOption[];
	const correctIds = (q.correctAnswers || []) as string[];
	const encodedAnswers = correctIds
		.map((id) => options.find((o) => o.id === id)?.text)
		.filter((t): t is string => Boolean(t));

	type FitbMode = 'exact' | 'exact_cs' | 'contains' | 'regex';
	function isFitbMode(s: string): s is FitbMode {
		return s === 'exact' || s === 'exact_cs' || s === 'contains' || s === 'regex';
	}

	function normalizeForFlags(
		text: string,
		ignorePunct: boolean,
		normalizeWs: boolean,
		toLower: boolean
	): string {
		let out = String(text || '')
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '');
		if (toLower) out = out.toLowerCase();
		if (ignorePunct) out = out.replace(/[^a-z0-9\s]/gi, '');
		if (normalizeWs) out = out.replace(/\s+/g, ' ');
		return out.trim();
	}

	function safeRegex(pattern: string): RegExp | null {
		try {
			return new RegExp(pattern);
		} catch {
			return null;
		}
	}

	let isAnyMatch = false;
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
			if (re && re.test(userText)) {
				isAnyMatch = true;
				break;
			}
			continue;
		}
		const lowerInsensitive = mode !== 'exact_cs';
		const u = normalizeForFlags(userText, ignorePunct, normalizeWs, lowerInsensitive);
		const v = normalizeForFlags(value, ignorePunct, normalizeWs, lowerInsensitive);
		if (mode === 'contains') {
			if (u.includes(v)) {
				isAnyMatch = true;
				break;
			}
		} else {
			if (u === v) {
				isAnyMatch = true;
				break;
			}
		}
	}

	return isAnyMatch;
}
export function evaluateMatching(q: GradableQuestion, selectedAnswers: string[]): boolean {
	const options = (q.options || []) as QuestionOption[];
	const promptOptions = options.filter((o) =>
		String(o.text).trimStart().toLowerCase().startsWith('prompt:')
	);
	const answerOptions = options.filter((o) =>
		String(o.text).trimStart().toLowerCase().startsWith('answer:')
	);
	const promptIds = promptOptions.map((o) => o.id);
	const answerIds = answerOptions.map((o) => o.id);

	const normalizeAnswerText = (text: string): string =>
		String(text ?? '')
			.replace(/^\s*answer:\s*/i, '')
			.trim()
			.toLowerCase()
			.replace(/\s+/g, ' ');

	const answerKeyById: Record<string, string> = {};
	const answerIdsByKey: Record<string, string[]> = {};
	for (const answer of answerOptions) {
		const key = normalizeAnswerText(answer.text);
		answerKeyById[answer.id] = key;
		answerIdsByKey[key] = answerIdsByKey[key] ?? [];
		answerIdsByKey[key].push(answer.id);
	}

	const parsePair = (value: string): { promptId: string; answerToken: string } | null => {
		const raw = String(value ?? '').trim();
		const sep = raw.indexOf('::');
		if (sep <= 0) return null;
		const promptId = raw.slice(0, sep).trim();
		const answerToken = raw.slice(sep + 2).trim();
		if (!promptId || !answerToken) return null;
		return { promptId, answerToken };
	};

	const splitAnswerToken = (answerToken: string): string[] =>
		String(answerToken ?? '')
			.split('|')
			.map((part) => part.trim())
			.filter((part) => part.length > 0);

	const resolveOptionTokenToId = (token: string): string | null => {
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
	};

	const normalizeCorrectByPrompt: Record<string, string[]> = {};
	const rawCorrect = (q.correctAnswers || []) as string[];
	const hasPairFormat = rawCorrect.some((value) => String(value).includes('::'));
	const addUnique = (ids: string[], id: string) => {
		if (!ids.includes(id)) ids.push(id);
	};

	if (hasPairFormat) {
		for (const raw of rawCorrect) {
			const parsed = parsePair(raw);
			if (!parsed) continue;
			const resolvedPromptId = resolveOptionTokenToId(parsed.promptId);
			if (!resolvedPromptId || !promptIds.includes(resolvedPromptId)) continue;

			const directIds = splitAnswerToken(parsed.answerToken)
				.map((token) => resolveOptionTokenToId(token))
				.filter((id): id is string => Boolean(id))
				.filter((id) => answerIds.includes(id));
			if (directIds.length === 0) continue;

			const accepted = normalizeCorrectByPrompt[resolvedPromptId] ?? [];
			for (const directId of directIds) {
				addUnique(accepted, directId);
				const key = answerKeyById[directId];
				if (!key) continue;
				const sameMeaning = answerIdsByKey[key];
				if (!sameMeaning) continue;
				for (const equivalentId of sameMeaning) {
					addUnique(accepted, equivalentId);
				}
			}
			normalizeCorrectByPrompt[resolvedPromptId] = accepted;
		}
	} else {
		const n = Math.min(promptOptions.length, rawCorrect.length);
		for (let i = 0; i < n; i++) {
			const promptId = promptOptions[i].id;
			const answerId = resolveOptionTokenToId(String(rawCorrect[i] ?? '').trim());
			if (!answerId || !answerIds.includes(answerId)) continue;

			const accepted = [answerId];
			const key = answerKeyById[answerId];
			if (key) {
				const sameMeaning = answerIdsByKey[key];
				if (sameMeaning) {
					for (const equivalentId of sameMeaning) addUnique(accepted, equivalentId);
				}
			}
			normalizeCorrectByPrompt[promptId] = accepted;
		}
	}

	const userByPrompt: Record<string, string> = {};
	for (const raw of selectedAnswers || []) {
		const parsed = parsePair(raw);
		if (!parsed) continue;
		const answerId = splitAnswerToken(parsed.answerToken)[0];
		if (!answerId || !promptIds.includes(parsed.promptId) || !answerIds.includes(answerId))
			continue;
		userByPrompt[parsed.promptId] = answerId;
	}

	const correctEntries = Object.entries(normalizeCorrectByPrompt);
	if (
		promptIds.length === 0 ||
		correctEntries.length !== promptIds.length ||
		Object.keys(userByPrompt).length !== correctEntries.length
	)
		return false;
	for (const [promptId, acceptedAnswerIds] of correctEntries) {
		const selectedId = userByPrompt[promptId];
		if (!selectedId || !acceptedAnswerIds.includes(selectedId)) return false;
	}

	return true;
}
export function answerStatus(question: GradableQuestion, selected: string[] = []): AnswerStatus {
	if (!selected.some((answer) => answer.trim().length > 0)) return 'unanswered';
	if (question.type === 'fill_in_the_blank')
		return evaluateFillInTheBlank(question, selected[0]) ? 'correct' : 'incorrect';
	if (question.type === 'matching')
		return evaluateMatching(question, selected) ? 'correct' : 'incorrect';
	const expected = [...question.correctAnswers].sort();
	const actual = [...selected].sort();
	return expected.length > 0 &&
		expected.length === actual.length &&
		expected.every((id, i) => id === actual[i])
		? 'correct'
		: 'incorrect';
}
export function summarizeModule(
	questions: GradableQuestion[],
	evidence: Record<string, StudyEvidence>,
	flaggedIds: string[] = []
) {
	const flagged = new Set(flaggedIds);
	const results = questions.map((question) => {
		const record = evidence[question._id];
		const status: AnswerStatus =
			record?.checkedAt === undefined
				? 'unanswered'
				: record.latestCorrect
					? record.masteredAt !== undefined
						? 'mastered'
						: 'correct'
					: 'incorrect';
		return {
			questionId: question._id,
			status,
			flagged: flagged.has(question._id),
			activeAttemptChecks: record?.activeAttemptChecks ?? 0,
			activeAttemptRevealed: record?.activeAttemptRevealed ?? false,
			cleanRecallCount: record?.cleanRecallCount ?? 0,
			firstCleanAt: record?.firstCleanAt,
			checkedAt: record?.checkedAt,
			needsFreshEvidence: record?.needsFreshEvidence ?? false
		};
	});
	const total = results.length;
	const mastered = results.filter((r) => r.status === 'mastered').length;
	const correct = results.filter((r) => r.status === 'correct' || r.status === 'mastered').length;
	const incorrect = results.filter((r) => r.status === 'incorrect').length;
	const answered = correct + incorrect;
	const percent = (n: number) =>
		total ? (n === total ? 100 : Math.min(99, Math.round((n / total) * 100))) : 0;
	return {
		results,
		total,
		correct,
		mastered,
		incorrect,
		answered,
		unanswered: total - answered,
		flagged: results.filter((r) => r.flagged).length,
		completion: percent(answered),
		mastery: percent(mastered),
		isComplete: total > 0 && answered === total,
		isAllCorrect: total > 0 && correct === total,
		isMastered: total > 0 && mastered === total
	};
}
export type ModuleSummary = ReturnType<typeof summarizeModule>;
