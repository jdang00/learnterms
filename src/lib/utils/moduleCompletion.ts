import { evaluateMatching } from './matching';
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
export function answerStatus(question: GradableQuestion, selected: string[] = []): AnswerStatus {
	// Free responses only receive a result from the authenticated server grader.
	if (question.type === 'free_response') return 'unanswered';
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
			isMastered: record?.masteredAt !== undefined,
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
	const mastered = results.filter((r) => r.isMastered).length;
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
