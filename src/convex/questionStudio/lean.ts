import { STAGE_MODELS } from '../aiModels';
import { blindSolve, probeOptionsOnly } from './agent/audit';
import { CUE_FEEDBACK } from './checks';
import {
	ADVISOR_RULE,
	REFERENCE_LEARN_DRAFT_RULES,
	REFERENCE_LEARN_REPLACEMENT_RULES,
	draftSystem,
	editorSystem
} from './prompts';
import {
	draftPrompt,
	reviewPasses,
	reviewPrompt,
	structuralIssues,
	type DuplicateContext,
	type QualityCall,
	type QualityCaller,
	type QualityCallResult,
	type QualitySlot,
	type StagePolicy
} from './quality';
import { questionTypeDefinitions } from './questionTypes';
import {
	learnBatchSchema,
	learnReferenceReviewSchema,
	type QualityDraft,
	type QualityReview
} from './schemas';
import { LEARN_DRAFTING_EFFORT } from './shared';

export type LeanOptions = {
	stages?: StagePolicy;
	/** editor: one reviewer call that fixes instead of rejecting; solve: Haiku blind solve only. */
	gate: 'editor' | 'solve' | 'none';
	/** Lets the drafter consult this model once inside its own request. */
	advisor?: QualityCall['advisor'];
	/** Twin options-only probes. Editor gate: cued slots go to the editor flagged. Solve gate:
	 * cued slots go to the repair round, and only when one can follow. */
	preCue?: boolean;
	avoid?: DuplicateContext;
	/** Checked once after the gate; true allows one repair round for failed slots. */
	canRepair?: () => boolean;
};

/**
 * Experimental: one draft call gated by an editor call or a Haiku blind solve. Failed solve-gated
 * slots get one repair from the same drafter when `canRepair` allows. Drafts cite excerpt IDs
 * only and the backend attaches the exact text.
 */
export async function runLeanBatch(
	slots: QualitySlot[],
	call: QualityCaller,
	options: LeanOptions
) {
	const questionType = slots[0].questionType;
	if (slots.some((slot) => slot.questionType !== questionType))
		throw new Error('A worker must have exactly one question type');
	const learn = questionType === 'learn';
	const calls: Array<QualityCallResult & { stage: QualityCall['stage'] }> = [];
	const invoke = async (request: QualityCall) => {
		const result = await call({ cache: false, ...request });
		calls.push({ ...result, stage: request.stage });
		return result;
	};
	const withEvidence = <T extends { slotId: string; evidence: Array<{ citationId: string }> }>(
		question: T
	): T & QualityDraft =>
		({
			...question,
			evidence: question.evidence.map(({ citationId }) => ({
				citationId,
				quote:
					slots
						.find((slot) => slot.slotId === question.slotId)
						?.evidence.find((chunk) => chunk.citationId === citationId)?.text ?? ''
			}))
		}) as T & QualityDraft;
	const accepted: Array<{ slot: QualitySlot; draft: QualityDraft; review?: QualityReview }> = [];
	const rejected: Array<{ slotId: string; reasons: string[] }> = [];
	const corrections: Array<{ slotId: string; reasons: string[] }> = [];
	const issuesFor = (slot: QualitySlot, draft: QualityDraft) => structuralIssues(draft, slot);
	const edit = async (pending: QualitySlot[], drafts: Map<string, QualityDraft>) => {
		if (!pending.length) return;
		const draftList = pending.map((slot) => drafts.get(slot.slotId)!);
		const cued = new Set<string>();
		if (options.preCue) {
			const runs = await Promise.all([1, 2].map(() => probeOptionsOnly(draftList, invoke)));
			for (const draft of draftList)
				if (runs.every((r) => r.some((p) => p.slotId === draft.slotId && p.keyGuessed)))
					cued.add(draft.slotId);
		}
		const response = await invoke({
			stage: 'review',
			model:
				options.stages?.review?.model ??
				(learn ? STAGE_MODELS.review : STAGE_MODELS.scenarioReview),
			thinking: options.stages?.review?.effort ?? (learn ? 'medium' : 'high'),
			system: editorSystem(questionType, options.preCue),
			prompt: JSON.stringify({
				replacementInstructions: REFERENCE_LEARN_REPLACEMENT_RULES,
				...JSON.parse(reviewPrompt(pending, draftList, true)),
				avoidExistingQuestions: options.avoid?.existing ?? [],
				localCheckFailures: pending.flatMap((slot) => {
					const issues = issuesFor(slot, drafts.get(slot.slotId)!);
					return issues.length ? [{ slotId: slot.slotId, issues }] : [];
				}),
				...(options.preCue ? { optionsOnlyCues: [...cued] } : {})
			}),
			schema: learnReferenceReviewSchema,
			maxOutputTokens: learn ? 10000 : 12000
		});
		const reviews = learnReferenceReviewSchema.parse(response.object).reviews;
		for (const slot of pending) {
			const matches = reviews.filter((r) => r.slotId === slot.slotId);
			const review = matches.length === 1 ? matches[0] : undefined;
			const draft = review?.replacement
				? withEvidence(review.replacement)
				: drafts.get(slot.slotId)!;
			if (review?.replacement) corrections.push({ slotId: slot.slotId, reasons: review.reasons });
			const issues = issuesFor(slot, draft);
			if (!review?.teachingRationale)
				issues.push('The rationale did not pass the teaching explanation check.');
			const indices = review?.defensibleAnswerIndices ?? [];
			if (indices.length !== 1 || indices[0] !== draft.answerIndex)
				issues.push('The option audit did not establish exactly one defensible answer.');
			if (!issues.length && reviewPasses(draft, review)) accepted.push({ slot, draft, review });
			else
				rejected.push({
					slotId: slot.slotId,
					reasons: [...issues, ...(review?.reasons ?? ['Missing or duplicate review.'])]
				});
		}
	};
	const draftModel = options.stages?.draft?.model ?? STAGE_MODELS.draft;
	const draftEffort =
		options.stages?.draft?.effort ??
		(learn ? LEARN_DRAFTING_EFFORT : questionTypeDefinitions[questionType].draftingEffort);
	/** Structural checks, then the Haiku blind solve when gated; returns the failures. */
	const check = async (
		targets: QualitySlot[],
		drafts: Map<string, QualityDraft>,
		canFix: boolean
	) => {
		const failures: Array<{ slotId: string; reasons: string[] }> = [];
		const valid = targets.filter((slot) => {
			const issues = issuesFor(slot, drafts.get(slot.slotId)!);
			if (issues.length) failures.push({ slotId: slot.slotId, reasons: issues });
			return !issues.length;
		});
		const solved =
			options.gate === 'solve' && valid.length
				? await blindSolve(
						valid.map((slot) => {
							const draft = drafts.get(slot.slotId)!;
							return {
								slot,
								item: { ...draft, citationIds: draft.evidence.map((e) => e.citationId) }
							};
						}),
						invoke
					)
				: new Map<string, string[]>();
		// A cue only matters when a repair can still fix it; otherwise it would just cost yield.
		const cued = new Set<string>();
		if (options.preCue && options.gate === 'solve' && canFix && valid.length) {
			const items = valid.map((slot) => drafts.get(slot.slotId)!);
			const runs = await Promise.all([1, 2].map(() => probeOptionsOnly(items, invoke)));
			for (const item of items)
				if (runs.every((r) => r.some((p) => p.slotId === item.slotId && p.keyGuessed)))
					cued.add(item.slotId);
		}
		for (const slot of valid) {
			const reasons = [
				...(solved.get(slot.slotId) ?? []),
				...(cued.has(slot.slotId) ? [CUE_FEEDBACK] : [])
			];
			if (reasons.length) failures.push({ slotId: slot.slotId, reasons });
			else accepted.push({ slot, draft: drafts.get(slot.slotId)! });
		}
		return failures;
	};
	try {
		let targets = slots;
		let repair: unknown;
		for (let pass = 0; pass < 2; pass++) {
			const generation = await invoke({
				stage: pass ? 'repair' : 'draft',
				model: draftModel,
				thinking: draftEffort,
				advisor: options.advisor,
				// Identical for draft and repair, so the repair reads the cached instruction prefix.
				system:
					draftSystem(questionType, true) +
					REFERENCE_LEARN_DRAFT_RULES +
					(options.advisor ? ADVISOR_RULE : ''),
				prompt: draftPrompt(targets, options.avoid, repair),
				schema: learnBatchSchema,
				maxOutputTokens: Math.min(16000, 8000 + targets.length * 2000)
			});
			const output = learnBatchSchema.parse(generation.object);
			const drafts = new Map<string, QualityDraft>();
			for (const slot of targets) {
				const matches = output.questions.filter((q) => q.slotId === slot.slotId);
				if (matches.length === 1) drafts.set(slot.slotId, withEvidence(matches[0]));
				else
					rejected.push({
						slotId: slot.slotId,
						reasons: [
							output.abstentions.find((a) => a.slotId === slot.slotId)?.reason ??
								'Missing or duplicate draft.'
						]
					});
			}
			const pending = targets.filter((slot) => drafts.has(slot.slotId));
			if (options.gate === 'editor') {
				await edit(pending, drafts);
				break;
			}
			const canFix = !pass && options.canRepair?.() === true;
			const failures = await check(pending, drafts, canFix);
			if (!failures.length) break;
			if (!canFix) {
				rejected.push(...failures);
				break;
			}
			targets = slots.filter((slot) => failures.some((f) => f.slotId === slot.slotId));
			repair = {
				instruction:
					'Rewrite only these slots from their evidence. Fix each listed problem; abstain when support is absent.',
				failures,
				previousQuestions: failures.map(({ slotId }) => {
					const { evidence, ...draft } = drafts.get(slotId)!;
					return { ...draft, citationIds: evidence.map((e) => e.citationId) };
				})
			};
		}
	} catch (error) {
		const done = new Set(
			[...accepted, ...rejected].map((e) => ('slot' in e ? e.slot.slotId : e.slotId))
		);
		rejected.push(
			...slots
				.filter((slot) => !done.has(slot.slotId))
				.map((slot) => ({
					slotId: slot.slotId,
					reasons: [
						`Provider or format failure: ${error instanceof Error ? error.message : 'unknown error'}`
					]
				}))
		);
	}
	return { accepted, rejected, corrections, calls };
}
