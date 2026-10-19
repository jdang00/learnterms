import type { FunctionReturnType } from 'convex/server';
import type { api } from '../../convex/_generated/api';

export type AttemptResults = NonNullable<
	FunctionReturnType<typeof api.customQuiz.getAttemptResults>
>;
export type ReviewItem = AttemptResults['reviewItems'][number];
export type ReviewFilter = 'all' | 'flagged' | 'unanswered' | 'incorrect';
export type ReviewEntry = { item: ReviewItem; originalIndex: number };

export function isFitb(type: string) {
	return String(type || '').toLowerCase() === 'fill_in_the_blank';
}

export function isMatching(type: string) {
	return String(type || '').toLowerCase() === 'matching';
}

export function optionTextById(item: ReviewItem, id: string) {
	const raw = String(id ?? '').trim();
	const byId = item.question.options.find((o) => o.id === raw)?.text;
	if (byId) return byId;
	if (/^\d+$/.test(raw)) {
		const index = Number(raw);
		if (Number.isInteger(index) && index >= 0 && index < item.question.options.length) {
			return item.question.options[index]?.text ?? raw;
		}
	}
	return raw;
}

export function answerLabel(text: string) {
	return String(text).replace(/^\s*answer:\s*/i, '');
}

export function promptLabel(text: string) {
	return String(text).replace(/^\s*prompt:\s*/i, '');
}

export function parseMatchingPairs(
	values: string[]
): Array<{ promptId: string; answerId: string }> {
	return (values || [])
		.map((value) => {
			const [promptId, answerToken] = String(value).split('::');
			const answerId = String(answerToken ?? '')
				.split('|')
				.map((part) => part.trim())
				.find((id) => id.length > 0);
			return promptId && answerId ? { promptId, answerId } : null;
		})
		.filter((pair): pair is { promptId: string; answerId: string } => Boolean(pair));
}

export function friendlyTypeName(raw: string): string {
	switch (raw) {
		case 'multiple_choice':
			return 'Multiple Choice';
		case 'fill_in_the_blank':
			return 'Fill in the Blank';
		case 'matching':
			return 'Matching';
		default:
			return raw;
	}
}

export function friendlyStatus(status: string): string {
	switch (status) {
		case 'submitted':
			return 'Completed';
		case 'timed_out':
			return 'Time Expired';
		case 'abandoned':
			return 'Abandoned';
		default:
			return status.replace('_', ' ');
	}
}

function setEq(a: string[], b: string[]) {
	if (a.length !== b.length) return false;
	const as = [...a].sort();
	const bs = [...b].sort();
	return as.every((v, i) => v === bs[i]);
}

export function multiSelectAnalysis(item: ReviewItem) {
	const selected = (item.response?.selectedOptions ?? []) as string[];
	const correct = (item.correctAnswerDisplay ?? []) as string[];
	const correctlySelected = selected.filter((id) => correct.includes(id));
	const incorrectSelected = selected.filter((id) => !correct.includes(id));
	const missedCorrect = correct.filter((id) => !selected.includes(id));
	return {
		isExact: setEq(selected, correct),
		correctlySelectedCount: correctlySelected.length,
		incorrectSelectedCount: incorrectSelected.length,
		missedCorrectCount: missedCorrect.length,
		hasPartialCreditLikePattern:
			correctlySelected.length > 0 && (incorrectSelected.length > 0 || missedCorrect.length > 0)
	};
}

export function isUnansweredItem(item: ReviewItem) {
	return (
		!(item.response?.selectedOptions?.length ?? 0) &&
		!String(item.response?.textResponse ?? '').trim()
	);
}

export function isIncorrectItem(item: ReviewItem) {
	return !isUnansweredItem(item) && item.score?.isCorrect !== true;
}

export function isSkippedItem(item: ReviewItem) {
	return item.score == null || item.score?.isCorrect === undefined || isUnansweredItem(item);
}

export function matchesReviewFilter(item: ReviewItem, filter: ReviewFilter) {
	switch (filter) {
		case 'flagged':
			return item.response?.isFlagged === true;
		case 'unanswered':
			return isUnansweredItem(item);
		case 'incorrect':
			return isIncorrectItem(item);
		default:
			return true;
	}
}

function normalizeAnswerText(text: string) {
	return answerLabel(text).trim().toLowerCase().replace(/\s+/g, ' ');
}

export function matchingReviewRows(item: ReviewItem) {
	const promptOptions = (item.question.options || []).filter((option) =>
		String(option.text).trimStart().toLowerCase().startsWith('prompt:')
	);

	const userByPrompt = new Map(
		parseMatchingPairs(item.response?.selectedOptions ?? []).map((pair) => [
			pair.promptId,
			pair.answerId
		])
	);
	const correctByPrompt = new Map(
		parseMatchingPairs(item.correctAnswerDisplay ?? []).map((pair) => [
			pair.promptId,
			pair.answerId
		])
	);

	return promptOptions.map((prompt) => {
		const userAnswerId = userByPrompt.get(prompt.id) ?? '';
		const correctAnswerId = correctByPrompt.get(prompt.id) ?? '';
		const userAnswerText = userAnswerId
			? answerLabel(optionTextById(item, userAnswerId))
			: 'No answer';
		const correctAnswerText = correctAnswerId
			? answerLabel(optionTextById(item, correctAnswerId))
			: 'No answer key';
		const isAnswered = userAnswerId.length > 0;
		const isCorrect =
			isAnswered &&
			normalizeAnswerText(optionTextById(item, userAnswerId)) ===
				normalizeAnswerText(optionTextById(item, correctAnswerId));
		return {
			promptId: prompt.id,
			promptText: promptLabel(optionTextById(item, prompt.id)),
			userAnswerText,
			correctAnswerText,
			isAnswered,
			isCorrect
		};
	});
}

export function matchingReviewStats(item: ReviewItem) {
	const rows = matchingReviewRows(item);
	const correct = rows.filter((row) => row.isCorrect).length;
	const unanswered = rows.filter((row) => !row.isAnswered).length;
	return {
		total: rows.length,
		correct,
		unanswered,
		incorrect: Math.max(0, rows.length - correct - unanswered)
	};
}
