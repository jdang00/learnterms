// Independent Opus rubric judge. It never sees which pipeline or author produced an item.
import { z } from 'zod/v4';
import { callClaude, callClaudeBatch, JUDGE_MODEL, pool, type ClaudeCall } from './claude';
import {
	CRITERIA,
	normalizeCriteria,
	scoreCriteria,
	type CriterionKey,
	type JudgeItem,
	type JudgeResult,
	type Overall
} from './criteria';

/** Bump when the prompt or schema changes so cached verdicts are not reused. */
export const JUDGE_VERSION = 'judge-v3';

export const JUDGE_SYSTEM = `You grade multiple-choice questions written for health-professions students (optometry, pharmacology, health policy and similar). You are an independent reviewer. Human-written and machine-written items are mixed together and you are not told which is which; authorship must not affect the grade. Grade what is on the page.

Each item gives its question type, stem, options with the key marked, rationale, and sometimes source excerpts. When excerpts are present, use them to check grounding: the key and the rationale's claims should be supported by the excerpts or by standard textbook knowledge consistent with them. A claim that contradicts the excerpts, or carries a fact about one condition over to another, is inaccurate. Wrong options don't need to appear in the excerpts. Without excerpts, the item was written for a specific course: accept its teaching point when it is a mainstream position, even if a specialist could add nuance or a newer source frames it differently, and fail it only for a clear error that standard references contradict.

Question types:
- learn: one fact, mechanism, distinction or threshold. No vignette needed.
- clinical: a short scenario; the learner applies knowledge to findings.
- criticalThinking: the learner must combine two relationships, such as inferring a diagnosis and then applying a patient constraint, or separating two parallel causes by timing.

Mark each criterion pass, fail or na.
accurate: the key is correct and the single best answer, and the rationale has no factual error, misnomer, or claim that contradicts the excerpts. A misnomer or slip fails this even when the excerpts contain it. A key is contestable only when you'd expect a real share of well-prepared students and faculty to pick another option from the stem as written; a specialist nuance, a test variant, or a guideline that frames it differently doesn't make it contestable.
coverTest: with the options hidden, the stem is a complete question that a knowledgeable learner could answer with one specific answer matching the key. Fail stems that only make sense with the options ("Which statement is supported?", "Which of these is true?"), stems asking which item a classification or list groups together, and stems whose hidden-options answer would be something other than the key. "Which of the following X" is fine when the question is answerable without the list.
necessaryDetail (clinical and criticalThinking only): at least one scenario detail decides the key; removing or changing it would change the answer. Fail decorative vignettes where the answer follows from one named finding alone or from a textbook definition restated as a patient.
withholdLabel (clinical and criticalThinking only): the stem gives findings or context, not the diagnosis, class or defining phrase the learner must infer. Fail when the stem names the answer's category in its defining words or states the mechanism being asked for.
pertinentNegatives: when a wrong option would be right under a common variant presentation, the stem states the finding or qualifier that excludes it. Mark na when no option needs excluding this way.
homogeneousOptions: all options come from one category with the same purpose and target, are parallel in grammar, and are similar in length and specificity. Fail mixed categories (a drug action next to a surgery); a key that is conspicuously longer, more qualified, or the only one echoing the stem's wording; absolute words (only, always, regardless, in every case) that mark the distractors; options that carry their own justification; and feature grids. A grid is a set built by permuting two binary facts so the key can be found by checking each fact separately: painful/painless × ipsilateral/contralateral, or "A is X and B is Y" with its reversal plus "both X" and "both Y". Listing real subtypes (beta-1, beta-2, both), real mechanisms (supply A lost, B lost, both lost), or two parallel causes worded alike is not a grid.
nearMiss: at least one wrong option is a real neighbour that would be correct if one fact changed (same class but a different subtype, the right drug blocked by a stated constraint, the right test for a different purpose). Fail when every wrong option is a throwaway a learner can eliminate without the tested concept. Coming from the same list or differential is not enough: you must be able to name the one fact that, if changed, would make that option the key. If no wrong option has such a fact, fail.
excludableDistractors: every wrong option is ruled out by a stem finding or a real relationship. Fail if any wrong option is excluded only because the source doesn't mention it ("not stated", "not described"), only because the key is true (circular), or can't be clearly excluded at all.
rationale: states the rule or mechanism behind the key, applies it, and gives each wrong option (or group of similar wrong options) a reason, in roughly 35–100 words. Fail rationales that only restate the key, skip most distractors, append a "Takeaway" or summary padding, or run well past 100 words with filler.
noConcededAlternatives: nothing in the item concedes or implies that another option is also correct or acceptable, and a competent clinician reading the stem as written would not choose a second option over the key. An option that becomes right only under an unusual reading or an added assumption doesn't count.
numbersUnits: numbers are tied to a use and carry units, and numeric options don't overlap or nest. na when the item has no numeric content.
twoRelationships (criticalThinking only): answering needs two linked relationships, the first narrowing the options and the second separating the finalists. Fail if the diagnosis or a single fact settles it.
plainRegister: standalone clinical register. No source framing ("the lecture states", "as described", "is supported", "not the stated mechanism"), no item-writing vocabulary in the rationale ("the closest miss", "the near miss", "the closest alternative", "the tempting choice", "distractor"), no jokes, asides or chatty commentary, no option letters.

Overall verdict:
- good: a careful curator would publish it as is. Accurate, one defensible key, a complete stem, at least one real near-miss distractor, and no cue that gives the key away. Minor issues are allowed and don't lower the verdict on their own: a rationale clause missing for one distractor, an informal aside or item-writing vocabulary in the rationale, a few extra words. A threshold or interval that decides management counts as a decision, not a bare statistic. A terminology slip that doesn't change what is taught (a mis-expanded acronym, a drug-class misnomer in one clause) fails accurate but caps the verdict at acceptable rather than making it poor.
- acceptable: correct and unambiguous but a weaker discriminator: a bare recalled label or statistic, one or two weak distractors, a mild cue (length, grid, absolute words), a thin or circular rationale, or a distractor excluded by absence. A curator would keep it after a light edit.
- poor: a wrong or contestable key, a factual error in what the item teaches, a defensible second option, a stem answerable only with the options or framed around the source, a stem that gives the answer away, mostly throwaway or mixed-category distractors, or a clinical or criticalThinking vignette that is decorative.
Grade real teaching value. Don't reward length, polish or confident tone: a terse item with sharp distractors beats a long one with soft distractors.

For each item, first write a short analysis (the closest distractor and what excludes it, any cue, any accuracy problem). Then list every option a competent clinician could defend as the best answer (1-based), the marks, the overall verdict, and up to four one-line reasons naming the decisive problems, or the strengths when the item is good.`;

const mark = z.enum(['pass', 'fail', 'na']);
const criteriaShape = Object.fromEntries(CRITERIA.map((key) => [key, mark])) as Record<
	CriterionKey,
	typeof mark
>;
export const judgeSchema = z.object({
	items: z.array(
		z.object({
			ref: z.string(),
			analysis: z.string(),
			defensibleOptions: z.array(z.number().int()),
			criteria: z.object(criteriaShape),
			overall: z.enum(['good', 'acceptable', 'poor']),
			reasons: z.array(z.string())
		})
	)
});
type JudgeOutput = z.infer<typeof judgeSchema>;

const TYPE_LABEL = { learn: 'learn', clinical: 'clinical', criticalThinking: 'criticalThinking' };
const EVIDENCE_CHARS = 6000;

/** Opaque refs (A, B, …) keep ids and file names out of the prompt. */
export function judgePrompt(items: JudgeItem[]) {
	const blocks = items.map((item, i) => {
		const ref = String.fromCharCode(65 + i);
		const options = item.options
			.map((o, j) => `${j + 1}. ${o}${j === item.answerIndex ? '   <- key' : ''}`)
			.join('\n');
		const evidence = item.evidence?.trim()
			? `\nSource excerpts:\n${item.evidence.trim().slice(0, EVIDENCE_CHARS)}`
			: '\nSource excerpts: none';
		return `<item ref="${ref}">\nType: ${TYPE_LABEL[item.questionType]}\nStem: ${item.stem}\nOptions:\n${options}\nRationale: ${item.rationale}${evidence}\n</item>`;
	});
	return `Grade these ${items.length} items independently. Return one entry per ref.\n\n${blocks.join('\n\n')}`;
}

/** Maps the model's refs back to items; items it skipped are omitted. */
export function parseJudgeOutput(
	items: JudgeItem[],
	output: JudgeOutput,
	costUsd: number
): JudgeResult[] {
	const share = costUsd / Math.max(1, items.length);
	return items.flatMap((item, i) => {
		const entry = output.items.find((e) => e.ref.trim() === String.fromCharCode(65 + i));
		if (!entry) return [];
		const criteria = normalizeCriteria(entry.criteria, item.questionType);
		return [
			{
				id: item.id,
				criteria,
				overall: entry.overall as Overall,
				score: scoreCriteria(criteria),
				reasons: entry.reasons.slice(0, 4),
				costUsd: share,
				analysis: entry.analysis,
				defensibleOptions: entry.defensibleOptions.map((n) => n - 1)
			}
		];
	});
}

export type JudgeOptions = {
	batchSize?: number;
	concurrency?: number;
	effort?: 'low' | 'medium' | 'high';
	model?: string;
	system?: string;
	/** Deterministic seed for batch order, so no pipeline's items cluster in one call. */
	seed?: number;
	/** Submit every call as one Message Batch at half price instead of calling live. */
	async?: boolean;
};

export type DetailedJudgeResult = JudgeResult & { analysis: string; defensibleOptions: number[] };

/** Shuffles items across batches, judges each batch in one Opus call, and returns results in input order. */
export async function judgeItems(
	items: JudgeItem[],
	opts: JudgeOptions = {}
): Promise<DetailedJudgeResult[]> {
	const batchSize = opts.batchSize ?? 4;
	const order = shuffled(
		items.map((_, i) => i),
		opts.seed ?? 7
	);
	const batches: JudgeItem[][] = [];
	for (let i = 0; i < order.length; i += batchSize)
		batches.push(order.slice(i, i + batchSize).map((index) => items[index]));
	const request = (batch: JudgeItem[]): ClaudeCall<typeof judgeSchema> => ({
		stage: 'judge',
		model: opts.model ?? JUDGE_MODEL,
		effort: opts.effort ?? 'medium',
		system: opts.system ?? JUDGE_SYSTEM,
		prompt: judgePrompt(batch),
		schema: judgeSchema,
		maxOutputTokens: 4000 + 3000 * batch.length
	});
	const results = opts.async
		? (await callClaudeBatch(batches.map(request))).map((result, i) =>
				result
					? (parseJudgeOutput(batches[i], result.object, result.costUsd) as DetailedJudgeResult[])
					: undefined
			)
		: await pool(batches, opts.concurrency ?? 3, async (batch) => {
				const { object, costUsd } = await callClaude(request(batch));
				return parseJudgeOutput(batch, object, costUsd) as DetailedJudgeResult[];
			});
	const byId = new Map(results.flat().flatMap((r) => (r ? [[r.id, r] as const] : [])));
	return items.flatMap((item) => {
		const hit = byId.get(item.id);
		return hit ? [hit] : [];
	});
}

/** Mulberry32 shuffle; stable for a seed. */
export function shuffled<T>(values: T[], seed: number) {
	let state = seed >>> 0;
	const random = () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const out = [...values];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}
