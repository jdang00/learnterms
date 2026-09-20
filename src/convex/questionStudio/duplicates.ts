import type { Id } from '../_generated/dataModel';
import type { CandidateQuestion, DuplicateRisk, ExistingQuestionSummary } from './shared';
import { normalizeText } from './text';

function tokenize(value: string) {
	const stop = new Set([
		'the',
		'a',
		'an',
		'and',
		'or',
		'of',
		'to',
		'in',
		'for',
		'with',
		'is',
		'are',
		'which',
		'what',
		'best',
		'most',
		'following'
	]);
	return normalizeText(value)
		.split(' ')
		.filter((token) => token.length > 2 && !stop.has(token));
}

function jaccard(a: string[], b: string[]) {
	const left = new Set(a);
	const right = new Set(b);
	if (left.size === 0 || right.size === 0) return 0;
	let intersection = 0;
	for (const token of left) if (right.has(token)) intersection++;
	return intersection / (left.size + right.size - intersection);
}

function stemSimilarity(a: string, b: string) {
	const normalizedA = normalizeText(a);
	const normalizedB = normalizeText(b);
	if (!normalizedA || !normalizedB) return 0;
	if (normalizedA === normalizedB) return 1;
	if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) return 0.92;
	return jaccard(tokenize(normalizedA), tokenize(normalizedB));
}

function answerOverlap(candidate: CandidateQuestion, existing: ExistingQuestionSummary) {
	const candidateAnswer = normalizeText(candidate.correctAnswers.join(' '));
	const existingAnswers = new Set(
		existing.correctAnswers
			.map(
				(answerId) =>
					existing.options.find((option) => option.startsWith(`${answerId}:`)) ?? answerId
			)
			.map(normalizeText)
	);
	if (!candidateAnswer || existingAnswers.size === 0) return 0;
	let best = 0;
	for (const answer of existingAnswers) {
		best = Math.max(best, jaccard(tokenize(candidateAnswer), tokenize(answer)));
	}
	return best;
}

function candidateAnswerSimilarity(left: CandidateQuestion, right: CandidateQuestion) {
	const leftAnswer = tokenize(left.correctAnswers.join(' '));
	const rightAnswer = tokenize(right.correctAnswers.join(' '));
	return jaccard(leftAnswer, rightAnswer);
}

function candidateConceptSimilarity(left: CandidateQuestion, right: CandidateQuestion) {
	const leftConcept = tokenize(`${left.stem} ${left.rationale}`);
	const rightConcept = tokenize(`${right.stem} ${right.rationale}`);
	return jaccard(leftConcept, rightConcept);
}

export function scoreDuplicateRisk(
	candidate: CandidateQuestion,
	existingQuestions: ExistingQuestionSummary[],
	otherCandidates: CandidateQuestion[] = []
): { risk: DuplicateRisk; similarQuestionIds: Id<'question'>[] } {
	let risk: DuplicateRisk = 'low';
	const similarQuestionIds: Id<'question'>[] = [];

	for (const existing of existingQuestions) {
		const stemScore = stemSimilarity(candidate.stem, existing.stem);
		const answerScore = answerOverlap(candidate, existing);
		const rationaleScore = stemSimilarity(
			candidate.rationale,
			existing.rationale ?? existing.searchText ?? ''
		);

		if (stemScore >= 0.78 || (stemScore >= 0.62 && answerScore >= 0.45)) {
			risk = 'high';
			similarQuestionIds.push(existing._id);
			continue;
		}
		if (stemScore >= 0.5 || answerScore >= 0.65 || rationaleScore >= 0.62) {
			if (risk !== 'high') risk = 'medium';
			similarQuestionIds.push(existing._id);
		}
	}

	for (const other of otherCandidates) {
		const stemScore = stemSimilarity(candidate.stem, other.stem);
		const answerScore = candidateAnswerSimilarity(candidate, other);
		const rationaleScore = stemSimilarity(candidate.rationale, other.rationale);
		const conceptScore = candidateConceptSimilarity(candidate, other);
		if (
			stemScore >= 0.78 ||
			(stemScore >= 0.48 && answerScore >= 0.55) ||
			(stemScore >= 0.42 && rationaleScore >= 0.6) ||
			(answerScore >= 0.8 && conceptScore >= 0.3)
		) {
			risk = 'high';
		} else if (
			(stemScore >= 0.5 || rationaleScore >= 0.58 || conceptScore >= 0.42) &&
			risk === 'low'
		) {
			risk = 'medium';
		}
	}

	return { risk, similarQuestionIds: [...new Set(similarQuestionIds)].slice(0, 5) };
}
