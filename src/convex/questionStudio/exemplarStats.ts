/**
 * Pure scoring for the exemplar bank: response statistics, quality, tiers and
 * retrieval ranking. Shared by the offline builder (scripts/ai-eval/exemplars) and the Convex
 * rebuild migration, so both produce the same bank.
 */
import type { Exemplar, ExemplarTier } from './exemplars';
import type { QuestionType } from './questionTypes';
import { type ExemplarText, type RubricResult, scoreRubric } from './exemplarText';

/** Discrimination needs this many first-attempt responders with a module rest score. */
export const MIN_DISCRIMINATION_RESPONDERS = 15;
/** Below this, first-attempt stats are too noisy to show a drafter. */
export const MIN_STATS_RESPONDERS = 8;
export const FUNCTIONAL_DISTRACTOR_SHARE = 0.05;

// ---------------------------------------------------------------------------
// Response statistics

export type Response = { userId: string; selected: string[]; correct: boolean };
export type RestScore = { correct: number; total: number };

export type ItemStats = {
	responders: number;
	difficulty: number;
	optionShares: number[];
	functionalDistractors: number;
	discrimination?: number;
	discriminationResponders: number;
};

/** Pearson correlation of a dichotomous item score with a continuous score. */
export function pointBiserial(item: boolean[], score: number[]): number | undefined {
	const n = item.length;
	if (n < 2 || score.length !== n) return undefined;
	const mean = score.reduce((sum, value) => sum + value, 0) / n;
	const variance = score.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n;
	const p = item.filter(Boolean).length / n;
	if (variance === 0 || p === 0 || p === 1) return undefined;
	const correctScores = score.filter((_, index) => item[index]);
	const wrongScores = score.filter((_, index) => !item[index]);
	const meanCorrect = correctScores.reduce((sum, value) => sum + value, 0) / correctScores.length;
	const meanWrong = wrongScores.reduce((sum, value) => sum + value, 0) / wrongScores.length;
	return ((meanCorrect - meanWrong) / Math.sqrt(variance)) * Math.sqrt(p * (1 - p));
}

/**
 * Difficulty (share correct), per-option selection shares and corrected point-biserial
 * discrimination. `restScores` holds each learner's module totals including this item; the item
 * is subtracted so the criterion is accuracy on the rest of the module.
 */
export function computeItemStats(input: {
	optionIds: string[];
	correctId: string;
	responses: Response[];
	restScores?: Map<string, RestScore>;
	minRestItems?: number;
}): ItemStats | null {
	const responses = input.responses.filter((response) => response.selected.length > 0);
	if (responses.length === 0) return null;
	const counts = input.optionIds.map(
		(id) => responses.filter((response) => response.selected.includes(id)).length
	);
	const optionShares = counts.map((count) => count / responses.length);
	const correctCount = responses.filter((response) => response.correct).length;
	const functionalDistractors = input.optionIds.filter(
		(id, index) => id !== input.correctId && optionShares[index] >= FUNCTIONAL_DISTRACTOR_SHARE
	).length;

	const items: boolean[] = [];
	const scores: number[] = [];
	for (const response of responses) {
		const total = input.restScores?.get(response.userId);
		if (!total) continue;
		const restTotal = total.total - 1;
		if (restTotal < (input.minRestItems ?? 3)) continue;
		items.push(response.correct);
		scores.push((total.correct - (response.correct ? 1 : 0)) / restTotal);
	}
	const discrimination =
		items.length >= MIN_DISCRIMINATION_RESPONDERS ? pointBiserial(items, scores) : undefined;
	return {
		responders: responses.length,
		difficulty: correctCount / responses.length,
		optionShares,
		functionalDistractors,
		discrimination,
		discriminationResponders: items.length
	};
}

/** Per-learner module totals over first attempts, keyed `${moduleId}:${userId}`. */
export function moduleTotals(
	firstAttempts: Iterable<{ userId: string; moduleId: string; correct: boolean }>
) {
	const totals = new Map<string, RestScore>();
	for (const attempt of firstAttempts) {
		const key = `${attempt.moduleId}:${attempt.userId}`;
		const total = totals.get(key) ?? { correct: 0, total: 0 };
		total.total += 1;
		if (attempt.correct) total.correct += 1;
		totals.set(key, total);
	}
	return totals;
}

export function restScoresForModule(totals: Map<string, RestScore>, moduleId: string) {
	const prefix = `${moduleId}:`;
	const scores = new Map<string, RestScore>();
	for (const [key, value] of totals) {
		if (key.startsWith(prefix)) scores.set(key.slice(prefix.length), value);
	}
	return scores;
}

/** The earliest response per learner and question. */
export function earliestPerLearner<T extends { userId: string; questionId: string; at: number }>(
	events: Iterable<T>
) {
	const first = new Map<string, T>();
	for (const event of events) {
		const key = `${event.userId}:${event.questionId}`;
		const current = first.get(key);
		if (!current || event.at < current.at) first.set(key, event);
	}
	return first;
}

// ---------------------------------------------------------------------------
// Quality

export type EvidenceBasis = 'first-attempt' | 'none';

export type QualityInput = {
	rubric: RubricResult;
	firstAttempt: ItemStats | null;
};

export type QualityResult = {
	score: number;
	psychometric: number;
	basis: EvidenceBasis;
	evidence: ItemStats | null;
	gatesPassed: boolean;
	failedGates: string[];
};

const DIFFICULTY_BAND: [number, number] = [0.35, 0.9];
/** Psychometric credit assumed for unmeasured items: below a typical measured item. */
const UNMEASURED_PRIOR = 0.35;

/** How much the first-attempt evidence counts: full at 15 responders, half from 8. */
export function evidenceWeight(stats: ItemStats | null) {
	if (!stats) return 0;
	if (stats.responders >= MIN_DISCRIMINATION_RESPONDERS) return 1;
	if (stats.responders >= MIN_STATS_RESPONDERS) return 0.5;
	return 0;
}

export function psychometricScore(stats: ItemStats) {
	const [low, high] = DIFFICULTY_BAND;
	const difficulty = stats.difficulty;
	const difficultyScore =
		difficulty >= low && difficulty <= high
			? 1
			: difficulty >= low - 0.15 && difficulty <= high + 0.06
				? 0.4
				: 0;
	const functionalScore =
		stats.functionalDistractors >= 2 ? 1 : stats.functionalDistractors === 1 ? 0.4 : 0;
	if (stats.discrimination === undefined) return 0.5 * difficultyScore + 0.5 * functionalScore;
	const d = stats.discrimination;
	const discriminationScore = d > 0.15 ? 1 : d > 0.05 ? 0.4 : 0;
	return 0.35 * difficultyScore + 0.35 * functionalScore + 0.3 * discriminationScore;
}

/**
 * Rubric carries 75% and psychometrics 25%. Unmeasured items get a below-average psychometric
 * prior, so they can enter on the rubric alone but rank under well-measured items.
 */
export function scoreQuality(input: QualityInput & { dependsOnUnseen?: boolean }): QualityResult {
	const { rubric } = input;
	const weight = evidenceWeight(input.firstAttempt);
	const evidence = weight > 0 ? input.firstAttempt : null;
	const psychometric = evidence ? psychometricScore(evidence) : 0;
	const failedGates: string[] = [];
	if (rubric.distractorsAddressed < 1) failedGates.push('rationale-skips-distractors');
	if (!rubric.completeQuestion) failedGates.push('incomplete-question');
	if (!rubric.noAllNone) failedGates.push('all-none-option');
	if (!rubric.noLetters) failedGates.push('option-letters');
	if (!rubric.plainRegister) failedGates.push('local-voice');
	if (input.dependsOnUnseen) failedGates.push('depends-on-unseen');
	if (evidence) {
		if (evidence.discrimination !== undefined && evidence.discrimination < 0)
			failedGates.push('negative-discrimination');
		if (evidence.difficulty < 0.2) failedGates.push('too-hard-or-miskeyed');
		if (weight === 1 && evidence.difficulty > 0.97) failedGates.push('too-easy');
		if (weight === 1 && evidence.functionalDistractors === 0)
			failedGates.push('no-functional-distractors');
	}
	return {
		score: 0.75 * rubric.score + 0.25 * (weight * psychometric + (1 - weight) * UNMEASURED_PRIOR),
		psychometric,
		basis: evidence ? 'first-attempt' : 'none',
		evidence,
		gatesPassed: failedGates.length === 0,
		failedGates
	};
}

/** One or two short clauses on why the item is worth imitating. */
export function exemplarNotes(
	rubric: RubricResult,
	quality: QualityResult,
	optionCount: number,
	withRationale = true
) {
	const clauses = withRationale
		? [
				rubric.distractorsAddressed >= optionCount - 1
					? 'rationale answers every distractor'
					: `rationale answers ${rubric.distractorsAddressed} of ${optionCount - 1} distractors`
			]
		: [];
	const stats = quality.evidence;
	if (stats && stats.functionalDistractors >= 2)
		clauses.push(`${stats.functionalDistractors} distractors drew at least 5% of first attempts`);
	if (stats?.discrimination !== undefined && stats.discrimination > 0.15)
		clauses.push('separates stronger from weaker students');
	return clauses.join('; ');
}

/** The Exemplar `stats` block: first attempts only, and only with enough responders. */
export function exemplarStats(firstAttempt: ItemStats | null): Exemplar['stats'] {
	if (!firstAttempt || firstAttempt.responders < MIN_STATS_RESPONDERS) return undefined;
	return {
		responders: firstAttempt.responders,
		difficulty: round(firstAttempt.difficulty),
		...(firstAttempt.discrimination !== undefined
			? { discrimination: round(firstAttempt.discrimination) }
			: {}),
		optionShares: firstAttempt.optionShares.map(round)
	};
}

function round(value: number) {
	return Math.round(value * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// Retrieval

export function embeddingText(input: { stem: string; correctOption: string; subject: string }) {
	return `Subject: ${input.subject}\nQuestion: ${input.stem}\nAnswer: ${input.correctOption}`;
}

export function queryText(input: { objective: string; context?: string }) {
	return input.context?.trim()
		? `${input.objective.trim()}\nContext: ${input.context.trim().slice(0, 1500)}`
		: input.objective.trim();
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>) {
	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}
	return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

export type RankCandidate = {
	id: string;
	subject: string;
	shape: string;
	similarity: number;
	quality: number;
};

/**
 * Maximal marginal relevance over subject and shape: relevance blends similarity with quality, and
 * each pick penalizes later candidates that repeat its subject or shape.
 */
export function selectDiverse<T extends RankCandidate>(
	candidates: T[],
	limit: number,
	/** Picks the best candidate passing this test first, when there is one. */
	anchor?: (candidate: T) => boolean
): T[] {
	const remaining = [...candidates];
	const picked: T[] = [];
	const relevance = (candidate: T) => 0.8 * candidate.similarity + 0.2 * candidate.quality;
	if (anchor && limit > 0) {
		const anchors = remaining.filter(anchor);
		if (anchors.length) {
			const best = anchors.reduce((a, b) => (relevance(b) > relevance(a) ? b : a));
			picked.push(remaining.splice(remaining.indexOf(best), 1)[0]);
		}
	}
	while (picked.length < limit && remaining.length > 0) {
		let bestIndex = 0;
		let bestScore = -Infinity;
		remaining.forEach((candidate, index) => {
			const sameSubject = picked.filter((item) => item.subject === candidate.subject).length;
			const sameShape = picked.filter((item) => item.shape === candidate.shape).length;
			const score = relevance(candidate) - 0.06 * sameSubject - 0.05 * sameShape;
			if (score > bestScore) {
				bestScore = score;
				bestIndex = index;
			}
		});
		picked.push(remaining.splice(bestIndex, 1)[0]);
	}
	return picked;
}

// ---------------------------------------------------------------------------
// Assembly

/** Top tier: passes every gate and clears this quality score. */
export const TOP_TIER_MIN_QUALITY = 0.68;
/** Design tier: fails only the rationale gate. Its stem and options are shown without the rationale. */
export const DESIGN_TIER_MIN_QUALITY = 0.58;
function tierFor(quality: QualityResult): ExemplarTier {
	if (quality.gatesPassed && quality.score >= TOP_TIER_MIN_QUALITY) return 'top';
	const rationaleOnly =
		quality.failedGates.length === 1 && quality.failedGates[0] === 'rationale-skips-distractors';
	return rationaleOnly && quality.score >= DESIGN_TIER_MIN_QUALITY ? 'design' : 'standard';
}

/** Rubric, quality, tier, notes and the Exemplar stats block for one labeled item. */
export function scoreExemplar(
	text: ExemplarText,
	label: { questionType: QuestionType; informal?: boolean; dependsOnUnseen?: boolean },
	firstAttempt: ItemStats | null
) {
	const rubric = scoreRubric({
		...text,
		questionType: label.questionType,
		informal: label.informal
	});
	const quality = scoreQuality({ rubric, firstAttempt, dependsOnUnseen: label.dependsOnUnseen });
	const tier = tierFor(quality);
	return {
		rubric,
		quality,
		tier,
		score: Math.round(quality.score * 1000) / 1000,
		notes: exemplarNotes(rubric, quality, text.options.length, tier !== 'design'),
		stats: exemplarStats(firstAttempt)
	};
}

/** Stable 53-bit FNV-style fingerprint of embedded text, usable in any Convex runtime. */
export function textFingerprint(text: string) {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		h1 = Math.imul(h1 ^ code, 2654435761);
		h2 = Math.imul(h2 ^ code, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
