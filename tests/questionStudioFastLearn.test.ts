import { expect, test } from 'bun:test';
import { learnPageTopics } from '../src/convex/questionStudio/pagePlanning';
import {
	buildLiveGenerationWork,
	generationWorkerLanes
} from '../src/convex/questionStudio/planning';
import {
	runQualityBatch,
	type QualityCall,
	type QualityDraft,
	type QualitySlot
} from '../src/convex/questionStudio/quality';

const slot: QualitySlot = {
	slotId: 'one',
	topicId: 'math',
	topicTitle: 'Arithmetic',
	objective: 'Recall the sum',
	questionType: 'learn',
	evidence: [
		{
			citationId: 'p3c0',
			pageNumber: 3,
			chunkIndex: 0,
			chunkTitle: 'Sum',
			noteFile: 'test',
			text: 'Two plus two equals four. Three plus two equals five.'
		}
	]
};
const draft: QualityDraft = {
	slotId: 'one',
	stem: 'What does two plus two equal?',
	options: ['Four', 'Five', 'Six', 'Seven'],
	answerIndex: 0,
	rationale: 'Two plus two equals four by addition.',
	evidence: [{ citationId: 'p3c0', quote: 'Two plus two equals four.' }]
};
const review = {
	slotId: 'one',
	defensibleAnswerIndices: [0],
	teachingRationale: true,
	bestAnswerIndex: 0,
	grounded: true,
	singleBestAnswer: true,
	plausibleDistractors: true,
	typeMatches: true,
	reasons: ['The sum is explicit.'],
	replacement: null as QualityDraft | null
};
async function run(reviews: unknown[], original = draft) {
	const requests: QualityCall[] = [];
	const result = await runQualityBatch(
		[slot],
		async (request) => {
			requests.push(request);
			return {
				object:
					request.stage === 'draft' ? { questions: [original], abstentions: [] } : { reviews },
				latencyMs: 1,
				inputTokens: 1,
				outputTokens: 1,
				reasoningTokens: 1,
				finishReason: 'stop'
			};
		},
		{ fastLearnReview: true }
	);
	return { result, requests };
}

test('direct Learn planning assigns all selected pages once and preserves all selected pages in two-question workers', () => {
	const pages = Array.from({ length: 18 }, (_, i) => ({
		pageNumber: i + 3,
		text: `A distinct supported fact for page ${i + 3} with sufficient text.`
	}));
	const topics = learnPageTopics(pages, 15);
	expect(topics.flatMap((t) => t.pageNumbers)).toEqual(pages.map((p) => p.pageNumber));
	const { tasks } = buildLiveGenerationWork(
		topics,
		{ learn: 15, clinical: 0, criticalThinking: 0 },
		{ packByTopic: true, maxPerWorker: 2 }
	);
	expect(tasks).toHaveLength(8);
	expect(generationWorkerLanes(tasks, 8)).toHaveLength(8);
	expect(tasks.map((t) => t.plannedCount)).toEqual([2, 2, 2, 2, 2, 2, 2, 1]);
	expect(tasks.every((t) => t.topicAllocations.length === 1)).toBe(true);
	expect(new Set(tasks.flatMap((t) => t.topicAllocations.map((a) => a.topic.topicId))).size).toBe(
		8
	);
});

test('Learn keeps high-effort drafting and a blind independent screen in two calls', async () => {
	const { result, requests } = await run([review]);
	expect(result.accepted).toHaveLength(1);
	expect(requests.map((r) => [r.stage, r.thinking])).toEqual([
		['draft', 'high'],
		['review', 'medium']
	]);
	expect(JSON.parse(requests[1].prompt).questions[0]).not.toHaveProperty('answerIndex');
});

test('the independent screen can fix an invalid quote without another repair round-trip', async () => {
	const bad = { ...draft, evidence: [{ citationId: 'p3c0', quote: 'Two plus two is four.' }] };
	const { result, requests } = await run([{ ...review, replacement: draft }], bad);
	expect(requests).toHaveLength(2);
	expect(result.corrections).toHaveLength(1);
	expect(JSON.parse(requests[1].prompt).localCheckFailures[0].issues.length).toBeGreaterThan(0);
	expect(result.accepted[0].draft.evidence).toEqual(draft.evidence);
});

test('corrected Learn drafts still reject invented quotes, foreign slots, wrong keys, and failed screens', async () => {
	for (const invalid of [
		{
			...review,
			replacement: {
				...draft,
				evidence: [{ citationId: 'p4c0', quote: 'Two plus two equals four.' }]
			}
		},
		{ ...review, replacement: { ...draft, slotId: 'unassigned' } },
		{ ...review, bestAnswerIndex: 1 },
		{ ...review, grounded: false },
		{ ...review, singleBestAnswer: false }
	])
		expect((await run([invalid])).result.accepted).toHaveLength(0);
	expect((await run([])).result.accepted).toHaveLength(0);
	expect((await run([review, review])).result.accepted).toHaveLength(0);
});

test('citation-ID drafting retains a blind reviewer and never exposes unrelated source pages', async () => {
	const requests: QualityCall[] = [];
	const result = await runQualityBatch(
		[slot],
		async (request) => {
			requests.push(request);
			return {
				object:
					request.stage === 'draft'
						? { questions: [{ ...draft, evidence: [{ citationId: 'p3c0' }] }], abstentions: [] }
						: { reviews: [{ ...review, bestAnswerIndex: 1 }] },
				latencyMs: 1,
				inputTokens: 1,
				outputTokens: 1,
				reasoningTokens: 1,
				finishReason: 'stop'
			};
		},
		{
			referenceLearn: true,
			fastLearnReview: true,
			sessionId: 'test',
			sourcePages: [
				{ pageNumber: 3, text: slot.evidence[0].text },
				{ pageNumber: 99, text: 'Unassigned secret fact.' }
			]
		}
	);
	expect(requests).toHaveLength(2);
	expect(requests.map((r) => [r.stage, r.thinking])).toEqual([
		['draft', 'high'],
		['review', 'medium']
	]);
	expect(requests.every((r) => !r.system.includes('Unassigned secret fact'))).toBe(true);
	expect(requests[1].prompt).not.toContain('"answerIndex"');
	expect(result.accepted).toHaveLength(0);
});

test('the citation-ID path accepts only a structurally valid, independently screened correction', async () => {
	const result = await runQualityBatch(
		[slot],
		async (request) => ({
			object:
				request.stage === 'draft'
					? { questions: [{ ...draft, evidence: [{ citationId: 'foreign' }] }], abstentions: [] }
					: { reviews: [{ ...review, replacement: draft }] },
			latencyMs: 1,
			inputTokens: 1,
			outputTokens: 1,
			reasoningTokens: 1,
			finishReason: 'stop'
		}),
		{ referenceLearn: true, fastLearnReview: true }
	);
	expect(result.calls).toHaveLength(2);
	expect(result.corrections).toHaveLength(1);
	expect(result.accepted[0].draft).toEqual({
		...draft,
		evidence: [{ citationId: 'p3c0', quote: slot.evidence[0].text }]
	});
	expect(result.accepted[0].review).toBeDefined();
});

test('the citation-ID option audit rejects a second defensible answer even when the reviewer claims single-best', async () => {
	for (const defensibleAnswerIndices of [[0, 1], [], [1], [0, 0]]) {
		const result = await runQualityBatch(
			[slot],
			async (request) => ({
				object:
					request.stage === 'draft'
						? { questions: [draft], abstentions: [] }
						: { reviews: [{ ...review, defensibleAnswerIndices }] },
				latencyMs: 1,
				inputTokens: 1,
				outputTokens: 1,
				reasoningTokens: 1,
				finishReason: 'stop'
			}),
			{ referenceLearn: true, fastLearnReview: true }
		);
		expect(result.accepted).toHaveLength(0);
		expect(result.rejected[0].reasons.join(' ')).toContain('option audit');
	}
});

test('the citation-ID path withholds a correct key when its rationale fails the teaching check', async () => {
	const result = await runQualityBatch(
		[slot],
		async (request) => ({
			object:
				request.stage === 'draft'
					? { questions: [draft], abstentions: [] }
					: { reviews: [{ ...review, teachingRationale: false }] },
			latencyMs: 1,
			inputTokens: 1,
			outputTokens: 1,
			reasoningTokens: 1,
			finishReason: 'stop'
		}),
		{ referenceLearn: true, fastLearnReview: true }
	);
	expect(result.accepted).toHaveLength(0);
	expect(result.rejected[0].reasons.join(' ')).toContain('teaching explanation');
});

test('one high-effort Learn call handles 15 slots and attaches exact source text and withholds unknown citation IDs without repair', async () => {
	const slots = Array.from({ length: 15 }, (_, i) => ({ ...slot, slotId: `s${i}` }));
	const requests: QualityCall[] = [];
	const result = await runQualityBatch(
		slots,
		async (request) => {
			requests.push(request);
			return {
				object: {
					questions: slots.map((s, i) => ({
						...draft,
						slotId: s.slotId,
						...(i === 14
							? { evidence: [{ citationId: 'unknown', quote: 'An invented quotation.' }] }
							: {})
					})),
					abstentions: []
				},
				latencyMs: 1,
				inputTokens: 1,
				outputTokens: 1,
				reasoningTokens: 1,
				finishReason: 'stop'
			};
		},
		{ singlePassLearn: true }
	);
	expect(requests.map((r) => [r.stage, r.thinking])).toEqual([['draft', 'high']]);
	expect(result.accepted).toHaveLength(14);
	expect(result.accepted[0].draft.evidence[0].quote).toBe(slot.evidence[0].text);
	expect(result.accepted.every((q) => q.review === undefined)).toBe(true);
	expect(result.rejected).toHaveLength(1);
	const topics = learnPageTopics(
		Array.from({ length: 18 }, (_, i) => ({
			pageNumber: i + 3,
			text: 'A distinct fact with sufficient evidence for a question.'
		})),
		15
	);
	const { tasks } = buildLiveGenerationWork(
		topics,
		{ learn: 15, clinical: 0, criticalThinking: 0 },
		{ packByTopic: true, maxPerWorker: 15 }
	);
	expect(tasks).toHaveLength(1);
	expect(tasks[0].plannedCount).toBe(15);
	expect(tasks[0].topicAllocations).toHaveLength(8);
});
