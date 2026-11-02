import type { FunctionReturnType } from 'convex/server';
import type { api } from '../../convex/_generated/api';
import { matchResults, type MatchStatus } from '#lib/utils/matching.js';

export type AttemptResults = NonNullable<
	FunctionReturnType<typeof api.tests.results.getAttemptResults>
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

export function matchingReview(item: ReviewItem) {
	const rows = matchResults(
		{ options: item.question.options, correctAnswers: item.correctAnswerDisplay ?? [] },
		item.response?.selectedOptions
	);
	const count = (status: MatchStatus) => rows.filter((row) => row.status === status).length;
	return {
		rows,
		total: rows.length,
		correct: count('correct'),
		incorrect: count('incorrect'),
		unanswered: count('unanswered')
	};
}
