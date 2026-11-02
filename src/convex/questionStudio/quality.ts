import { z } from 'zod/v4';
import { hasAnswerLetterReference, hasSourceFraming } from './presentation';
import { questionTypeDefinitions, type QuestionType } from './questionTypes';
import {
	FAST_LEARN_REVIEW_SYSTEM,
	REFERENCE_LEARN_DRAFT_RULES,
	REFERENCE_LEARN_REPLACEMENT_RULES,
	draftSystem,
	reviewSystem
} from './prompts';
import { probeOptionsOnly } from './agent/audit';
import {
	cachedSourceEvidence,
	evidenceForObjective,
	normalizedEvidence,
	withCachedSource
} from './evidence';
export { cachedSourceEvidence, evidenceForObjective, normalizedEvidence, withCachedSource };
import { CUE_FEEDBACK, itemWritingIssues, typeIssues } from './checks';
import {
	draftSchema,
	learnBatchSchema,
	learnReferenceReviewSchema,
	learnReviewSchema,
	reviewSchema,
	type QualityDraft,
	type QualityReview
} from './schemas';
import type { SourceCitation, StoredMarkdownPage } from './shared';
import { STAGE_MODELS, type ClaudeModel } from '../aiModels';

export const HARNESS_VERSION = 'question-types-v36';
export const thinkingLevels = ['low', 'medium', 'high'] as const;
export type ThinkingLevel = (typeof thinkingLevels)[number];
export type EvidenceChunk = SourceCitation & { text: string };
export type QualitySlot = {
	slotId: string;
	topicId: string;
	topicTitle: string;
	objective: string;
	questionType: QuestionType;
	focusPreference?: string;
	evidence: EvidenceChunk[];
	/** Formatted curator exemplars for this slot's type and objective (structure only). */
	examples?: string[];
};

export {
	draftSchema,
	learnBatchSchema,
	learnReferenceReviewSchema,
	learnReviewSchema,
	reviewSchema
} from './schemas';
export type { QualityDraft, QualityReview } from './schemas';

export function structuralIssues(draft: QualityDraft, slot: QualitySlot): string[] {
	const issues: string[] = [];
	if (draft.slotId !== slot.slotId) issues.push('Unknown or mismatched question slot.');
	if (new Set(draft.options.map(normalizedEvidence)).size !== 4)
		issues.push('Options must be distinct.');
	if (!slot.evidence.length) issues.push('No source evidence is available.');
	for (const citation of draft.evidence) {
		const chunk = slot.evidence.find((c) => c.citationId === citation.citationId);
		if (!chunk || !normalizedEvidence(chunk.text).includes(normalizedEvidence(citation.quote)))
			issues.push(
				`Evidence quote is not in the supplied excerpt: ${citation.citationId}: ${JSON.stringify(citation.quote)}. Copy a short exact passage.`
			);
	}
	if ([draft.stem, draft.rationale, ...draft.options].some(hasSourceFraming))
		issues.push('Remove source framing from student-facing text.');
	if (hasAnswerLetterReference(draft.rationale))
		issues.push('Explain answers by content, not option letters; answers are shuffled.');
	return [...issues, ...itemWritingIssues(draft), ...typeIssues(draft.stem, slot.questionType)];
}

export function reviewPasses(draft: QualityDraft, review: QualityReview | undefined) {
	return Boolean(
		review &&
		review.slotId === draft.slotId &&
		review.bestAnswerIndex === draft.answerIndex &&
		review.grounded &&
		review.singleBestAnswer &&
		review.plausibleDistractors &&
		review.typeMatches
	);
}

function scopedSlots(slots: QualitySlot[]) {
	return slots.map(({ slotId, objective, focusPreference, evidence, examples }) => ({
		slotId,
		objective,
		...(focusPreference ? { focusPreference } : {}),
		...(examples?.length ? { curatorExamples: examples } : {}),
		evidence: evidence.map(({ citationId, text }) => ({ citationId, text }))
	}));
}

export type DuplicateContext = { existing?: string[]; reserved?: string[] };

/** Rank existing questions for this batch; never let them crowd out reserved objectives. */
export function selectDuplicateContext(
	slots: QualitySlot[],
	existing: Array<{ stem: string; topicTitle?: string }>,
	reserved: string[] = []
): DuplicateContext {
	const terms = new Set(
		slots.flatMap(
			(slot) =>
				`${slot.topicTitle} ${slot.objective} ${slot.evidence.map((chunk) => chunk.text).join(' ')}`
					.toLowerCase()
					.match(/[a-z0-9]{4,}/g) ?? []
		)
	);
	return {
		existing: existing
			.map((question, index) => ({
				stem: question.stem,
				index,
				score: [...terms].reduce(
					(score, term) =>
						score +
						Number(`${question.topicTitle ?? ''} ${question.stem}`.toLowerCase().includes(term)),
					0
				)
			}))
			.filter((question) => question.score > 0)
			.sort((a, b) => b.score - a.score || a.index - b.index)
			.slice(0, 12)
			.map((question) => question.stem),
		reserved: [...new Set(reserved)]
	};
}

export function draftPrompt(slots: QualitySlot[], avoid: DuplicateContext = {}, repair?: unknown) {
	return JSON.stringify({
		instruction: 'Return one question or explicit abstention for each assignment.',
		avoidExistingQuestions: avoid.existing ?? [],
		reservedObjectives: avoid.reserved ?? [],
		assignments: scopedSlots(slots),
		...(repair ? { repair } : {})
	});
}

export function reviewPrompt(
	slots: QualitySlot[],
	questions: QualityDraft[],
	referenceOnly = false
) {
	return JSON.stringify({
		assignments: scopedSlots(slots),
		// Do not send the proposed key or the writer's self-assessment to the reviewer.
		questions: questions.map(({ slotId, stem, options, rationale, evidence }) => ({
			slotId,
			stem,
			options,
			rationale,
			evidence: referenceOnly ? evidence.map(({ citationId }) => ({ citationId })) : evidence
		}))
	});
}

export type QualityCall = {
	stage: 'draft' | 'review' | 'repair' | 'review_repair' | 'audit' | 'audit_repair' | 'probe';
	system: string;
	prompt: string;
	schema: z.ZodType;
	thinking: ThinkingLevel;
	/** runQualityBatch fills this from STAGE_MODELS or its override. */
	model?: ClaudeModel;
	/** A stronger model the drafter may consult once mid-request (server-side advisor tool). */
	advisor?: ClaudeModel;
	/** Per-document source sent after the stable `system` instructions, as its own block. */
	context?: string;
	/** Also cache `context`; set only when a same-model call can reuse it. `system` always caches,
	 * since every call of a stage and type shares it. */
	cache?: boolean;
	maxOutputTokens: number;
	timeoutMs?: number;
	sessionId?: string;
	metadata?: Record<string, string>;
	repairFailures?: Array<{ slotId: string; reasons: string[] }>;
};
export type StagePolicy = Partial<
	Record<'draft' | 'review' | 'repair', { model?: ClaudeModel; effort?: ThinkingLevel }>
>;
export type QualityCallResult = {
	object: unknown;
	/** The model that served the response, which differs from the request after a fallback. */
	model?: string;
	latencyMs: number;
	inputTokens: number;
	outputTokens: number;
	reasoningTokens: number;
	cachedInputTokens?: number;
	cacheWriteTokens?: number;
	costUsd?: number;
	costEstimated?: boolean;
	requestId?: string;
	responseId?: string;
	httpStatus?: number;
	serviceTier?: string;
	finishReason: string;
};
export type QualityCaller = (call: QualityCall) => Promise<QualityCallResult>;

/** Shared by production workers and the offline evaluation. At most four model calls. */
export async function runQualityBatch(
	slots: QualitySlot[],
	call: QualityCaller,
	options: {
		avoid?: DuplicateContext;
		allowRepair?: boolean;
		/** Benchmarks and the bounded Learn pipeline may override the general type policy. */
		draftingEffortOverride?: ThinkingLevel;
		sourcePages?: StoredMarkdownPage[];
		sessionId?: string;
		/** A separate reviewer may correct first-order drafts in its one screening call. */
		fastLearnReview?: boolean;
		/** One high-reasoning Learn call, followed only by local checks. */
		singlePassLearn?: boolean;
		/** Compact citation IDs in the draft; retain the independent Learn reviewer. */
		referenceLearn?: boolean;
		/** Per-stage model and effort; repair inherits draft unless set. Defaults to STAGE_MODELS. */
		stages?: StagePolicy;
		/** Checked before each repair round; production passes its remaining deadline. */
		canRepair?: () => boolean;
		/** Twin cheap options-only probes after review; cued keys go to repair. */
		cueProbe?: boolean;
	} = {}
) {
	if (
		slots.length < 1 ||
		slots.length > (options.singlePassLearn ? 15 : 3) ||
		new Set(slots.map((s) => s.slotId)).size !== slots.length
	)
		throw new Error('Invalid number of unique slots');
	const questionType = slots[0].questionType;
	if (slots.some((slot) => slot.questionType !== questionType))
		throw new Error('A worker must have exactly one question type');
	if ((options.singlePassLearn || options.referenceLearn) && questionType !== 'learn')
		throw new Error('Single-pass generation is Learn only');
	const thinking =
		options.draftingEffortOverride ?? questionTypeDefinitions[questionType].draftingEffort;
	const { avoid = {}, allowRepair = true } = options;
	const calls: Array<QualityCallResult & { stage: QualityCall['stage'] }> = [];
	const source = options.sessionId
		? cachedSourceEvidence(slots, options.referenceLearn ? undefined : options.sourcePages)
		: undefined;
	const invoke = async (request: QualityCall) => {
		const stage = request.stage === 'draft' || request.stage === 'repair' ? 'draft' : 'review';
		const policy = {
			...options.stages?.[stage],
			...(request.stage === 'repair' ? options.stages?.repair : {})
		};
		const routed = {
			...request,
			model:
				request.model ??
				policy.model ??
				(stage === 'review' && questionType !== 'learn'
					? STAGE_MODELS.scenarioReview
					: STAGE_MODELS[stage]),
			thinking: policy.effort ?? request.thinking,
			// Only the general path makes same-model follow-ups (repair, review_repair) that reuse a prefix.
			cache: !options.fastLearnReview && !options.singlePassLearn
		};
		const result = await call(
			source ? withCachedSource(routed, source, options.sessionId) : routed
		);
		calls.push({ ...result, stage: request.stage });
		return result;
	};
	const accepted = new Map<string, { draft: QualityDraft; review?: QualityReview }>();
	const corrections: Array<{ slotId: string; reasons: string[] }> = [];
	const rejected: Array<{ slotId: string; reasons: string[] }> = [];
	let currentSlots = slots;
	let repair:
		| {
				previousQuestions: QualityDraft[];
				failures: Array<{ slotId: string; reasons: string[] }>;
				instruction: string;
		  }
		| undefined;
	const referenceOnly = options.singlePassLearn || options.referenceLearn;
	// Flag only when both probes find the key from the options alone (about 6% by chance).
	// A cue only matters when a repair round can still fix it; otherwise it would just cost yield.
	const cued = async (drafts: QualityDraft[], canFix: boolean) => {
		if (!options.cueProbe || !drafts.length || !canFix) return new Set<string>();
		const probe: QualityCaller = async (request) => {
			const result = await call(request);
			calls.push({ ...result, stage: request.stage });
			return result;
		};
		const runs = await Promise.all([1, 2].map(() => probeOptionsOnly(drafts, probe)));
		const hit = (d: QualityDraft) =>
			runs.every((r) => r.some((p) => p.slotId === d.slotId && p.keyGuessed));
		return new Set(drafts.filter(hit).map((d) => d.slotId));
	};
	const planRepair = (failures: typeof rejected, questions: QualityDraft[]) => {
		currentSlots = slots.filter((s) => failures.some((f) => f.slotId === s.slotId));
		repair = {
			previousQuestions: questions.filter((q) => failures.some((f) => f.slotId === q.slotId)),
			failures,
			instruction:
				'Rewrite only failed slots using their evidence. Fix the specific problems; abstain when support is absent.'
		};
	};
	const outputSchema = referenceOnly ? learnBatchSchema : draftSchema;
	for (let pass = 0; pass < (allowRepair && !options.singlePassLearn ? 2 : 1); pass++) {
		try {
			const generation = await invoke({
				stage: pass ? 'repair' : 'draft',
				repairFailures: repair?.failures,
				system:
					draftSystem(questionType, referenceOnly) +
					(options.referenceLearn ? REFERENCE_LEARN_DRAFT_RULES : ''),
				prompt: draftPrompt(
					currentSlots,
					{
						existing: [
							...(avoid.existing ?? []),
							...[...accepted.values()].map((v) => v.draft.stem)
						],
						reserved: avoid.reserved
					},
					repair
				),
				schema: outputSchema,
				thinking,
				maxOutputTokens: options.singlePassLearn
					? Math.min(16000, 4000 + currentSlots.length * 1200)
					: options.fastLearnReview
						? 10000
						: Math.min(16000, 8000 + currentSlots.length * 2000)
			});
			const parsed = outputSchema.parse(generation.object);
			const output: z.infer<typeof draftSchema> = referenceOnly
				? {
						...parsed,
						questions: parsed.questions.map((question) => ({
							...question,
							evidence: question.evidence.map((citation) => ({
								citationId: citation.citationId,
								quote:
									slots
										.find((slot) => slot.slotId === question.slotId)
										?.evidence.find((chunk) => chunk.citationId === citation.citationId)?.text ?? ''
							}))
						}))
					}
				: draftSchema.parse(parsed);
			const failures: Array<{ slotId: string; reasons: string[] }> = [];
			const repairable = () => !pass && allowRepair && options.canRepair?.() !== false;
			if (options.singlePassLearn) {
				if (output.questions.some((q) => !slots.some((s) => s.slotId === q.slotId)))
					throw new Error('Model returned an unrequested slot');
				for (const slot of slots) {
					const matches = output.questions.filter((q) => q.slotId === slot.slotId);
					const issues =
						matches.length !== 1
							? [
									output.abstentions.find((a) => a.slotId === slot.slotId)?.reason ??
										'Missing or duplicate draft.'
								]
							: structuralIssues(matches[0], slot);
					if (issues.length) rejected.push({ slotId: slot.slotId, reasons: issues });
					else accepted.set(slot.slotId, { draft: matches[0] });
				}
				break;
			}
			if (questionType === 'learn' && options.fastLearnReview) {
				if (output.questions.some((q) => !slots.some((slot) => slot.slotId === q.slotId)))
					throw new Error('Model returned an unrequested slot');
				const reviewable = currentSlots.filter(
					(slot) => output.questions.filter((q) => q.slotId === slot.slotId).length === 1
				);
				for (const slot of currentSlots.filter((slot) => !reviewable.includes(slot))) {
					failures.push({
						slotId: slot.slotId,
						reasons: [
							output.abstentions.find((a) => a.slotId === slot.slotId)?.reason ??
								'Missing or duplicate draft.'
						]
					});
				}
				const screeningSchema = options.referenceLearn
					? learnReferenceReviewSchema
					: learnReviewSchema;
				const response = !reviewable.length
					? undefined
					: await invoke({
							stage: pass ? 'review_repair' : 'review',
							thinking: 'medium',
							maxOutputTokens: 10000,
							schema: screeningSchema,
							system: FAST_LEARN_REVIEW_SYSTEM,
							prompt: JSON.stringify({
								...(options.referenceLearn
									? {
											replacementInstructions: REFERENCE_LEARN_REPLACEMENT_RULES
										}
									: {}),
								...JSON.parse(
									reviewPrompt(
										reviewable,
										output.questions.filter((q) => reviewable.some((s) => s.slotId === q.slotId)),
										options.referenceLearn
									)
								),
								avoidExistingQuestions: avoid.existing ?? [],
								localCheckFailures: reviewable.flatMap((slot) => {
									const issues = structuralIssues(
										output.questions.find((q) => q.slotId === slot.slotId)!,
										slot
									);
									return issues.length ? [{ slotId: slot.slotId, issues }] : [];
								})
							})
						});
				const screened = response ? screeningSchema.parse(response.object).reviews : [];
				const reviews = screened.map((review) => ({
					...review,
					replacement:
						options.referenceLearn && review.replacement
							? {
									...review.replacement,
									evidence: review.replacement.evidence.map((citation) => ({
										citationId: citation.citationId,
										quote:
											slots
												.find((slot) => slot.slotId === review.replacement!.slotId)
												?.evidence.find((chunk) => chunk.citationId === citation.citationId)
												?.text ?? ''
									}))
								}
							: (review.replacement as QualityDraft | null)
				}));
				const flagged = await cued(
					reviewable.map((slot) => {
						const matches = reviews.filter((review) => review.slotId === slot.slotId);
						const own = output.questions.find((q) => q.slotId === slot.slotId)!;
						return (matches.length === 1 ? matches[0].replacement : null) ?? own;
					}),
					repairable()
				);
				for (const slot of reviewable) {
					const matches = reviews.filter((review) => review.slotId === slot.slotId);
					const review = matches.length === 1 ? matches[0] : undefined;
					const draft =
						review?.replacement ?? output.questions.find((q) => q.slotId === slot.slotId)!;
					if (review?.replacement)
						corrections.push({ slotId: slot.slotId, reasons: review.reasons });
					const issues = structuralIssues(draft, slot);
					if (flagged.has(slot.slotId)) issues.push(CUE_FEEDBACK);
					if (options.referenceLearn) {
						if (!review || !('teachingRationale' in review) || review.teachingRationale !== true)
							issues.push('The rationale did not pass the teaching explanation check.');
						const indices =
							review && 'defensibleAnswerIndices' in review
								? (review.defensibleAnswerIndices as number[])
								: [];
						if (indices.length !== 1 || indices[0] !== draft.answerIndex)
							issues.push(
								'The option audit did not establish exactly one defensible answer matching the key.'
							);
					}
					if (!issues.length && reviewPasses(draft, review))
						accepted.set(slot.slotId, { draft, review: review! });
					else
						failures.push({
							slotId: slot.slotId,
							reasons: [
								...issues,
								...(review?.reasons ?? ['Missing or duplicate independent review.'])
							]
						});
				}
				if (!failures.length) break;
				if (!repairable()) {
					rejected.push(...failures);
					break;
				}
				// Repair from the reviewer's replacement when it made one; that is the latest attempt.
				planRepair(
					failures,
					reviewable.map(
						(slot) =>
							reviews.find((r) => r.slotId === slot.slotId)?.replacement ??
							output.questions.find((q) => q.slotId === slot.slotId)!
					)
				);
				continue;
			}
			const seen = new Set<string>();
			const valid: QualityDraft[] = [];
			for (const slot of currentSlots) {
				const matches = output.questions.filter((d) => d.slotId === slot.slotId);
				const draft = matches[0];
				const issues = !draft
					? [
							output.abstentions.find((a) => a.slotId === slot.slotId)?.reason ??
								'Missing question slot.'
						]
					: matches.length !== 1
						? ['Duplicate slot returned.']
						: structuralIssues(draft, slot);
				seen.add(slot.slotId);
				if (issues.length) failures.push({ slotId: slot.slotId, reasons: issues });
				else valid.push(draft);
			}
			if (output.questions.some((q) => !seen.has(q.slotId)))
				throw new Error('Model returned an unrequested slot');
			if (valid.length) {
				const response = await invoke({
					stage: pass ? 'review_repair' : 'review',
					system: reviewSystem(questionType),
					prompt: reviewPrompt(
						currentSlots.filter((s) => valid.some((q) => q.slotId === s.slotId)),
						valid
					),
					schema: reviewSchema,
					thinking: 'high',
					maxOutputTokens: 12000
				});
				const reviews = reviewSchema.parse(response.object).reviews;
				const single = (draft: QualityDraft) => {
					const matches = reviews.filter((r) => r.slotId === draft.slotId);
					return matches.length === 1 ? matches[0] : undefined;
				};
				const flagged = await cued(
					valid.filter((draft) => reviewPasses(draft, single(draft))),
					repairable()
				);
				for (const draft of valid) {
					const review = single(draft);
					if (reviewPasses(draft, review) && !flagged.has(draft.slotId))
						accepted.set(draft.slotId, { draft, review: review! });
					else
						failures.push({
							slotId: draft.slotId,
							reasons: review
								? [
										...(!review.typeMatches
											? [`Does not meet ${questionTypeDefinitions[questionType].label} criteria.`]
											: []),
										...(!review.grounded
											? ['Some claims are not supported by the assigned source.']
											: []),
										...(!review.singleBestAnswer
											? ['The question lacks one defensible best answer.']
											: []),
										...(!review.plausibleDistractors
											? ['The incorrect options need revision.']
											: []),
										...(review.bestAnswerIndex !== draft.answerIndex
											? ['The separate answer check disagrees with the proposed key.']
											: []),
										...(flagged.has(draft.slotId) ? [CUE_FEEDBACK] : []),
										...review.reasons
									]
								: ['Missing or duplicate independent review.']
						});
				}
			}
			if (!failures.length) break;
			if (!repairable()) {
				rejected.push(...failures);
				break;
			}
			planRepair(failures, output.questions);
		} catch (error) {
			rejected.push(
				...currentSlots
					.filter((s) => !accepted.has(s.slotId))
					.map((s) => ({
						slotId: s.slotId,
						reasons: [
							`Provider or format failure: ${error instanceof Error ? error.message : 'unknown error'}`
						]
					}))
			);
			break;
		}
	}
	return {
		accepted: slots.flatMap((s) =>
			accepted.has(s.slotId) ? [{ slot: s, ...accepted.get(s.slotId)! }] : []
		),
		rejected,
		corrections,
		calls
	};
}
