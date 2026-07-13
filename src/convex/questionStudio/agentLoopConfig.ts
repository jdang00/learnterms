import type { ReasoningOrder } from './shared';

// Agent loop tuning surface. Ported from dev/agent-question-system/.
// Everything the loop can be tuned by lives in this file.

export type CognitiveTemplateId =
	| 'recall.definition'
	| 'recall.threshold'
	| 'recognition.feature'
	| 'recognition.feature_set'
	| 'discrimination.compare'
	| 'mechanism.causal'
	| 'diagnosis.case'
	| 'interpretation.test'
	| 'management.next_step'
	| 'safety.contraindication'
	| 'sequence.timeline'
	| 'negative.exception';

export const COGNITIVE_TEMPLATE_CARDS: Record<CognitiveTemplateId, string> = {
	'recall.definition': [
		'Use when the learner should retrieve a term, structure, abbreviation, or named concept.',
		'Stem: give a precise definition or description; keep it short.',
		'Options: same vocabulary family; one exact term is best.',
		'Rationale: add the memory hook or boundary that makes the term useful.',
		'Stem patterns: "Which term refers to [definition]?" / "What is the name for [structure/finding/process]?"'
	].join('\n'),
	'recall.threshold': [
		'Use when the learner needs a cutoff, range, dose, timeline, formula, or criterion.',
		'Stem: name the measurement and include units.',
		'Options: nearby plausible values with consistent units.',
		'Rationale: explain what the threshold changes or how it is used.',
		'Stem patterns: "Which value is the usual cutoff for [criterion]?" / "Which range is expected for [measurement] in [context]?"'
	].join('\n'),
	'recognition.feature': [
		'Use when one feature, sign, finding, or association identifies the concept.',
		'Stem: name the category being recognized.',
		'Options: adjacent-topic features, not random facts.',
		'Rationale: explain why the feature belongs.',
		'Stem patterns: "Which finding is most associated with [condition]?" / "Which feature best identifies [entity]?"'
	].join('\n'),
	'recognition.feature_set': [
		'Use when category boundaries matter across several features. Convert to single-best: ask for the best defining feature or strongest example.',
		'Stem: name the category; ask for the single best defining feature.',
		'Options: features from the category and near-neighbor categories.',
		'Rationale: group why the defining feature wins over the others.',
		'Stem patterns: "Which option is the best defining feature of [category]?" / "Which statement best captures what [items] have in common?"'
	].join('\n'),
	'discrimination.compare': [
		'Use when the learner must separate near-neighbor diseases, tests, treatments, pathways, or categories.',
		'Stem: name the comparison axis explicitly.',
		'Options: common confusions that share surface features.',
		'Rationale: draw the boundary between the near-neighbors explicitly.',
		'Stem patterns: "Which finding best differentiates [A] from [B]?" / "Which feature makes [A] more likely than [B]?"'
	].join('\n'),
	'mechanism.causal': [
		'Use when the learner must know why a finding, effect, or outcome happens.',
		'Stem: ask why/how, not only what.',
		'Options: plausible but wrong causal stories.',
		'Rationale: trace cause -> intermediate -> outcome.',
		'Stem patterns: "Which mechanism explains [phenomenon]?" / "Why does [cause] lead to [outcome]?"'
	].join('\n'),
	'diagnosis.case': [
		'Use when the learner must infer a diagnosis from a compact presentation.',
		'Stem: include signal clues and only relevant negatives; every detail earns its place.',
		'Options: common look-alikes.',
		'Rationale: map each decisive clue to the diagnosis.',
		'Stem patterns: "A patient has [signal findings]. Which diagnosis is most likely?" / "Given [history/exam/test result], which condition best explains the presentation?"'
	].join('\n'),
	'interpretation.test': [
		'Use for text-described measurements, labs, fields, exam findings, or test results. Never require hidden media or images.',
		'Stem: include the measured data being interpreted.',
		'Options: plausible interpretations of the same data.',
		'Rationale: name the cue that supports the interpretation.',
		'Stem patterns: "Which interpretation is most consistent with [measurement/result]?" / "What does [test result] most strongly suggest?"'
	].join('\n'),
	'management.next_step': [
		'Use when the learner must choose treatment, referral, monitoring, counseling, or follow-up.',
		'Stem: include the constraints that change the action.',
		'Options: actions that would be reasonable if a key detail changed.',
		'Rationale: explain why the chosen action fits the constraints.',
		'Stem patterns: "What is the most appropriate next step?" / "Which treatment is most appropriate given [constraint]?"'
	].join('\n'),
	'safety.contraindication': [
		'Use when the learner must identify what to avoid or what risk matters most.',
		'Stem: make the safety frame explicit.',
		'Options: less urgent or wrong-context risks.',
		'Rationale: explain the harm being avoided without overstating risk.',
		'Stem patterns: "Which factor is a contraindication to [action]?" / "Which adverse effect should be monitored with [medication/intervention]?"'
	].join('\n'),
	'sequence.timeline': [
		'Use for one-step order, next-step, first-event, or stage-timing decisions.',
		'Stem: name the process or timeline.',
		'Options: plausible adjacent stages or steps.',
		'Rationale: explain why the order matters.',
		'Stem patterns: "Which step should occur first in [process]?" / "Which event occurs next after [stage]?"'
	].join('\n'),
	'negative.exception': [
		'Disabled by default. Use only when identifying the exception is itself the learning objective.',
		'Stem: make NOT or EXCEPT visually clear; avoid double negatives.',
		'Options: true members of the category plus the one exception.',
		'Rationale: state the positive rule and why the exception is outside it.',
		'Stem patterns: "Which option is NOT expected in [condition]?" / "Which action would NOT be appropriate in [scenario]?"'
	].join('\n')
};

export const REASONING_ORDER_TEMPLATE_MAP: Record<ReasoningOrder, CognitiveTemplateId[]> = {
	first: ['recall.definition', 'recall.threshold', 'recognition.feature'],
	second: [
		'mechanism.causal',
		'interpretation.test',
		'discrimination.compare',
		'sequence.timeline',
		'recognition.feature_set'
	],
	third: [
		'diagnosis.case',
		'management.next_step',
		'safety.contraindication',
		'discrimination.compare',
		'interpretation.test'
	]
};

export function defaultTemplateForOrder(
	order: ReasoningOrder,
	slotIndex: number
): CognitiveTemplateId {
	const pool = REASONING_ORDER_TEMPLATE_MAP[order];
	return pool[slotIndex % pool.length];
}

export function cognitiveTemplateCard(id: string): string {
	if (id in COGNITIVE_TEMPLATE_CARDS) {
		return COGNITIVE_TEMPLATE_CARDS[id as CognitiveTemplateId];
	}
	return COGNITIVE_TEMPLATE_CARDS['recognition.feature'];
}
