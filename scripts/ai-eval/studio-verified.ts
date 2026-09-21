import { writeFileSync } from 'node:fs';
import { z } from 'zod/v4';
import { lockEvaluationBudget } from './budget';
import {
	runQualityBatch,
	reviewSchema,
	reviewPrompt,
	reviewSystem,
	reviewPasses,
	selectDuplicateContext,
	evidenceForObjective,
	type QualityCall,
	type QualitySlot
} from '../../src/convex/questionStudio/quality';
import { learnPageTopics } from '../../src/convex/questionStudio/pagePlanning';
import {
	callQualityModel,
	estimateLunaCost,
	QuestionProviderError
} from '../../src/convex/questionStudio/provider';
import { scoreDuplicateRisk } from '../../src/convex/questionStudio/duplicates';
import { callRouter } from './router-call';

const root = 'tmp/studio-matrix';
lockEvaluationBudget(root);
const ledgerPath = `${root}/ledger.json`;
const ledger = await Bun.file(ledgerPath).json();
const persist = () => writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
const proc = Bun.spawn(['bunx', 'convex', 'env', 'get', 'OPENAI_API_KEY'], {
	stdout: 'pipe',
	stderr: 'pipe'
});
const key = (await new Response(proc.stdout).text()).trim();
if ((await proc.exited) || !key) throw new Error('Development key unavailable');
const draftModel = process.env.MATRIX_MODEL;
let routerKey = '';
let modelPricing: { prompt: string; completion: string } | undefined;
if (draftModel) {
	const keyProc = Bun.spawn(['bunx', 'convex', 'env', 'get', 'OPENROUTER_API_KEY'], {
		stdout: 'pipe',
		stderr: 'pipe'
	});
	routerKey = (await new Response(keyProc.stdout).text()).trim();
	if ((await keyProc.exited) || !routerKey) throw new Error('Development router key unavailable');
	modelPricing = (await Bun.file(`${root}/models.json`).json()).find(
		(m: any) => m.id === draftModel
	)?.pricing;
	if (!modelPricing) throw new Error('Model missing from captured catalog');
}
const fixture = await Bun.file(`${root}/fixture-15.json`).json();
const context = await Bun.file(`${root}/context.json`).json();
const count = Number(process.env.MATRIX_COUNT ?? 15);
const repeat = process.env.MATRIX_REPEAT ?? '1';
const variant = process.env.MATRIX_SOURCE ?? 'cardio';
const effort = process.env.MATRIX_EFFORT as 'low' | 'medium' | 'high' | undefined;
const single = process.env.MATRIX_SINGLE === '1';
const runId = `verified-${variant}-${count}-${draftModel?.replaceAll('/', '-') ?? 'luna'}-${effort ?? 'high'}${single ? '-single' : ''}-r${repeat}`;
const path = `${root}/${runId}.json`;
if (await Bun.file(path).exists()) throw new Error('Run already exists');
let pages = fixture.pages;
let existing = context.existingQuestions;
if (variant === 'retina') {
	const manifest = await Bun.file('tmp/ai-eval/manifest.json').json();
	const doc = manifest.find((d: any) => d.name.startsWith('Lecture'));
	pages = (await Bun.file(`tmp/ai-eval/${doc.hash}.pages.json`).json()).filter(
		(p: any) => p.pageNumber >= 63 && p.pageNumber <= 80
	);
	existing = [];
}
const slots: QualitySlot[] = learnPageTopics(pages, count).flatMap((topic) =>
	topic.learningObjectives.map((objective, i) => ({
		slotId: `${topic.topicId}-${i}`,
		topicId: topic.topicId,
		topicTitle: topic.title,
		objective,
		questionType: 'learn' as const,
		evidence: evidenceForObjective(pages, topic.pageNumbers, objective, variant)
	}))
);
async function paid(request: QualityCall) {
	let reservedUsd = estimateLunaCost(
		(request.system.length +
			request.prompt.length +
			JSON.stringify(z.toJSONSchema(request.schema)).length) *
			1.25,
		request.maxOutputTokens
	);
	if (draftModel && request.stage === 'draft')
		reservedUsd =
			(request.system.length + request.prompt.length + 10000) *
				Number(modelPricing!.prompt) *
				1.25 +
			request.maxOutputTokens * Number(modelPricing!.completion);
	if (ledger.reduce((s: number, e: any) => s + (e.costUsd ?? e.reservedUsd), 0) + reservedUsd > 2)
		throw new Error('Matrix $2 ceiling reached');
	const entry: any = { runId, stage: request.stage, reservedUsd, at: new Date().toISOString() };
	ledger.push(entry);
	persist();
	try {
		const outbound = {
			...request,
			...(request.stage === 'draft' && effort ? { thinking: effort } : {}),
			timeoutMs: 60000,
			metadata: { experiment: 'studio-verified-v1', run_id: runId }
		};
		const response =
			draftModel && request.stage === 'draft'
				? await callRouter(outbound, draftModel, routerKey)
				: await callQualityModel(
						{
							...outbound
						},
						key
					);
		Object.assign(entry, { ...response, object: undefined, status: 'completed' });
		persist();
		return response;
	} catch (error) {
		Object.assign(entry, {
			...(error instanceof QuestionProviderError ? error.usage : {}),
			object: undefined,
			status: 'failed_reserved',
			error: String(error)
		});
		persist();
		throw error;
	}
}
console.log('start', runId);
const start = Date.now();
const work = single
	? [slots]
	: [...new Set(slots.map((s) => s.topicId))].map((topicId) =>
			slots.filter((s) => s.topicId === topicId)
		);
const output = await Promise.all(
	work.map(async (assigned) => {
		const topicId = assigned[0].topicId;
		return {
			topicId,
			...(await runQualityBatch(assigned, paid, {
				referenceLearn: !single,
				singlePassLearn: single,
				fastLearnReview: !single,
				allowRepair: false,
				sessionId: `studio-verified:${variant}`,
				avoid: selectDuplicateContext(assigned, existing)
			})),
			doneMs: Date.now() - start
		};
	})
);
const accepted: any[] = [];
const duplicateSlots: string[] = [];
for (const question of output.flatMap((b) => b.accepted)) {
	const candidate = {
		stem: question.draft.stem,
		rationale: question.draft.rationale,
		correctAnswers: [question.draft.options[question.draft.answerIndex]]
	};
	if (
		scoreDuplicateRisk(
			candidate as any,
			existing,
			accepted.map((q) => ({
				stem: q.draft.stem,
				rationale: q.draft.rationale,
				correctAnswers: [q.draft.options[q.draft.answerIndex]]
			})) as any
		).risk === 'high'
	)
		duplicateSlots.push(question.slot.slotId);
	else accepted.push(question);
}
const calls = output.flatMap((b) => b.calls);
const draftWallMs = Date.now() - start;
const localCount = accepted.length;
let wholeReview: unknown;
if (single && accepted.length) {
	const schema = reviewSchema.extend({
		reviews: z.array(reviewSchema.shape.reviews.element).max(15)
	});
	const response = await paid({
		stage: 'review',
		system: `${reviewSystem('learn')}\nReturn EXACTLY one review for EVERY assigned slot. Check duplicates across the whole set, rejecting redundant central facts. Retain disease and population qualifiers from source headings. Keep reasons to one concise sentence.`,
		prompt: reviewPrompt(
			slots,
			accepted.map((q) => q.draft)
		),
		schema,
		thinking: 'medium',
		maxOutputTokens: 8000
	});
	calls.push({ ...response, stage: 'review' });
	wholeReview = schema.parse(response.object);
	const reviews = (wholeReview as z.infer<typeof schema>).reviews;
	for (let i = accepted.length - 1; i >= 0; i--) {
		const matches = reviews.filter((r) => r.slotId === accepted[i].draft.slotId);
		if (matches.length !== 1 || !reviewPasses(accepted[i].draft, matches[0])) accepted.splice(i, 1);
	}
}
const result = {
	runId,
	count,
	source: variant,
	wallMs: Date.now() - start,
	draftWallMs,
	localCount,
	wholeReview,
	acceptedCount: accepted.length,
	accepted,
	duplicateSlots,
	output,
	slots,
	calls: calls.length,
	costUsd: calls.reduce((s, c) => s + (c.costUsd ?? 0), 0),
	costComplete:
		calls.every((c) => c.costUsd !== undefined) &&
		output.every(
			(b) =>
				!b.rejected.some((r) => r.reasons.some((t) => t.startsWith('Provider or format failure:')))
		),
	corrections: output.flatMap((b) => b.corrections).length
};
await Bun.write(path, JSON.stringify(result, null, 2));
console.log(
	JSON.stringify({
		runId,
		count,
		accepted: result.acceptedCount,
		seconds: result.wallMs / 1000,
		cents: result.costUsd * 100,
		corrections: result.corrections,
		duplicates: duplicateSlots,
		calls: calls.length,
		costComplete: result.costComplete
	})
);
