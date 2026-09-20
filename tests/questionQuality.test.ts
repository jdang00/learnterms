import { expect, test } from 'bun:test';
import {
	evidenceForObjective,
	structuralIssues,
	runQualityBatch,
	draftPrompt,
	selectDuplicateContext,
	reviewPrompt,
	type QualitySlot,
	type QualityDraft
} from '../src/convex/questionStudio/quality';
import {
	parseStoredPages,
	parseOcrPages,
	serializePages,
	mappingPageGroups
} from '../src/convex/documentParsing';
import { assertDocumentPermission, assertJobBinding } from '../src/convex/questionStudio/access';
const slot: QualitySlot = {
	slotId: 's1',
	topicId: 't1',
	topicTitle: 'Arithmetic',
	objective: 'Add numbers',
	questionType: 'learn',
	evidence: [
		{
			citationId: 'p7c0',
			pageNumber: 7,
			noteFile: 'test',
			chunkTitle: 'Arithmetic',
			chunkIndex: 0,
			text: 'Two plus two equals four. Three plus two equals five.'
		}
	]
};
const draft: QualityDraft = {
	slotId: 's1',
	stem: 'What does two plus two equal?',
	options: ['Four', 'Five', 'Six', 'Seven'],
	answerIndex: 0,
	rationale: 'Two plus two equals four by addition.',
	evidence: [{ citationId: 'p7c0', quote: 'Two plus two equals four.' }],
	reasoningSkill: 'Direct retrieval of a fact.',
	distractorReasons: ['One too many is five.', 'Two too many is six.', 'Three too many is seven.']
};
test('page rules inside pages do not discard evidence', () => {
	const pages = [
		{ pageNumber: 1, text: 'before\n\n---\n\nafter' },
		{ pageNumber: 2, text: 'second' }
	];
	expect(parseStoredPages(serializePages(pages))).toEqual(pages);
});
test('OCR missing or duplicate pages fails closed', () => {
	expect(() => parseOcrPages({ pages: [{ index: 0, markdown: 'a' }] }, 2)).toThrow();
	expect(() => parseOcrPages({ pages: [{ index: 0 }, { index: 0 }] })).toThrow();
});
test('mapping includes final pages beyond old character cutoff', () => {
	const pages = Array.from({ length: 100 }, (_, i) => ({
		pageNumber: i + 1,
		text: 'x'.repeat(1000)
	}));
	expect(mappingPageGroups(pages).flat()).toEqual(pages);
});
test('objective evidence excludes pages outside selected topic', () => {
	const chunks = evidenceForObjective(
		[
			{ pageNumber: 1, text: 'wrong source' },
			{ pageNumber: 7, text: 'correct source' }
		],
		[7],
		'source',
		'test'
	);
	expect(chunks.map((c) => c.pageNumber)).toEqual([7]);
});
test('invented quotes and citation IDs are rejected', () => {
	expect(structuralIssues(draft, slot)).toEqual([]);
	expect(
		structuralIssues(
			{ ...draft, evidence: [{ citationId: 'p7c0', quote: 'Two plus two equals five.' }] },
			slot
		)
	).not.toEqual([]);
	expect(
		structuralIssues(
			{ ...draft, evidence: [{ citationId: 'p1c0', quote: 'Two plus two equals four.' }] },
			slot
		)
	).not.toEqual([]);
});
test('same-cohort students cannot manage documents; admins cannot cross cohorts', () => {
	expect(() => assertDocumentPermission({ cohortId: 'a' }, 'a', true)).toThrow();
	expect(() => assertDocumentPermission({ role: 'admin', cohortId: 'a' }, 'b', true)).toThrow();
	expect(() =>
		assertDocumentPermission({ role: 'curator', cohortId: 'a' }, 'a', true)
	).not.toThrow();
});
test('job binding rejects foreign owners, destinations and replay', () => {
	const job = {
		createdByUserId: 'u',
		documentId: 'd',
		moduleId: 'm',
		requestedCount: 3,
		status: 'queued'
	};
	expect(() =>
		assertJobBinding(job, 'other', { documentId: 'd', moduleId: 'm', total: 3 })
	).toThrow();
	expect(() =>
		assertJobBinding(job, 'u', { documentId: 'd', moduleId: 'other', total: 3 })
	).toThrow();
	expect(() =>
		assertJobBinding({ ...job, status: 'running' }, 'u', {
			documentId: 'd',
			moduleId: 'm',
			total: 3
		})
	).toThrow();
});
test('false answer passes quote existence but independent answer disagreement blocks it', async () => {
	const result = await runQualityBatch(
		[slot],
		async (call) => ({
			object:
				call.stage === 'draft'
					? { questions: [{ ...draft, answerIndex: 1 }], abstentions: [] }
					: {
							reviews: [
								{
									slotId: 's1',
									bestAnswerIndex: 0,
									grounded: false,
									singleBestAnswer: true,
									plausibleDistractors: true,
									typeMatches: true,
									reasons: ['Key is wrong']
								}
							]
						},
			latencyMs: 1,
			inputTokens: 1,
			outputTokens: 1,
			reasoningTokens: 0,
			finishReason: 'stop'
		}),
		{ allowRepair: false }
	);
	expect(result.accepted).toHaveLength(0);
	expect(result.rejected).toHaveLength(1);
});
test('repair is bounded and cannot turn repeated rejection into acceptance', async () => {
	let calls = 0;
	const result = await runQualityBatch([slot], async (request) => {
		calls++;
		return {
			object: request.stage.includes('review')
				? {
						reviews: [
							{
								slotId: 's1',
								bestAnswerIndex: -1,
								grounded: false,
								singleBestAnswer: false,
								plausibleDistractors: false,
								typeMatches: false,
								reasons: ['Unsupported']
							}
						]
					}
				: { questions: [draft], abstentions: [] },
			latencyMs: 1,
			inputTokens: 1,
			outputTokens: 1,
			reasoningTokens: 0,
			finishReason: 'stop'
		};
	});
	expect(calls).toBe(4);
	expect(result.accepted).toHaveLength(0);
	expect(result.rejected[0].reasons[0]).toBe('Does not meet Learn criteria.');
});
test('physical light sources are not mistaken for document provenance', () => {
	expect(
		structuralIssues({ ...draft, stem: 'Where is the source of the light located?' }, slot)
	).toEqual([]);
});

test('source-referencing prose goes to repair without rejecting clinical evidence wording', () => {
	expect(
		structuralIssues(
			{ ...draft, rationale: 'The other answers are not supported in the evidence.' },
			slot
		)
	).toContain('Remove source framing from student-facing text.');
	expect(
		structuralIssues({ ...draft, stem: 'Which answer is listed as the result?' }, slot)
	).toContain('Remove source framing from student-facing text.');
	expect(
		structuralIssues(
			{ ...draft, rationale: 'This observation provides evidence of the relationship.' },
			slot
		)
	).toEqual([]);
});
test('citation checks tolerate Markdown emphasis without changing numerical facts', () => {
	const emphasized = {
		...slot,
		evidence: [
			{ ...slot.evidence[0], text: 'Two plus two equals **four**. The value is *finite*.' }
		]
	};
	expect(structuralIssues(draft, emphasized)).toEqual([]);
	expect(
		structuralIssues(
			{ ...draft, evidence: [{ citationId: 'p7c0', quote: 'Two plus two equals five.' }] },
			emphasized
		)
	).not.toEqual([]);
});

test('failed repair preserves candidates already accepted by review', async () => {
	const secondSlot = { ...slot, slotId: 's2' };
	const result = await runQualityBatch([slot, secondSlot], async (request) => {
		if (request.stage === 'repair') throw new Error('Provider timed out');
		return {
			object:
				request.stage === 'draft'
					? { questions: [draft], abstentions: [{ slotId: 's2', reason: 'Insufficient evidence' }] }
					: {
							reviews: [
								{
									slotId: 's1',
									bestAnswerIndex: 0,
									grounded: true,
									singleBestAnswer: true,
									plausibleDistractors: true,
									typeMatches: true,
									reasons: ['Supported']
								}
							]
						},
			latencyMs: 1,
			inputTokens: 1,
			outputTokens: 1,
			reasoningTokens: 0,
			finishReason: 'stop'
		};
	});
	expect(result.accepted.map((item) => item.slot.slotId)).toEqual(['s1']);
	expect(result.rejected).toEqual([
		{ slotId: 's2', reasons: ['Provider or format failure: Provider timed out'] }
	]);
});

test('workers receive only their type policy and use its drafting effort', async () => {
	for (const questionType of ['learn', 'clinical', 'criticalThinking'] as const) {
		const requests: Array<{ stage: string; system: string; thinking: string }> = [];
		await runQualityBatch([{ ...slot, questionType }], async (request) => {
			requests.push(request);
			return {
				object: request.stage.includes('review')
					? {
							reviews: [
								{
									slotId: 's1',
									bestAnswerIndex: 0,
									grounded: true,
									singleBestAnswer: true,
									plausibleDistractors: true,
									typeMatches: true,
									reasons: ['Fits the assigned type.']
								}
							]
						}
					: { questions: [draft], abstentions: [] },
				latencyMs: 0,
				inputTokens: 1,
				outputTokens: 1,
				reasoningTokens: 0,
				finishReason: 'stop'
			};
		});
		expect(requests.map((request) => request.thinking)).toEqual([
			questionType === 'learn' ? 'low' : 'medium',
			'high'
		]);
		for (const request of requests) {
			expect(request.system).not.toMatch(/first.order|second.order|third.order|binocular|phoria/i);
			if (questionType === 'learn')
				expect(request.system).not.toContain('Require combining at least two');
			if (questionType !== 'clinical')
				expect(request.system).not.toContain('Reject decorative vignettes');
		}
	}
});

test('mixed-type assignments cannot leak into a worker', async () => {
	let called = false;
	await expect(
		runQualityBatch([slot, { ...slot, slotId: 's2', questionType: 'clinical' }], async () => {
			called = true;
			throw new Error('must not call');
		})
	).rejects.toThrow('exactly one question type');
	expect(called).toBe(false);
});

test('duplicate context ranks relevant questions and preserves all reserved objectives', () => {
	const existing = [
		...Array.from({ length: 20 }, (_, i) => ({ stem: `Unrelated vocabulary ${i}` })),
		{ stem: 'How do you add numbers in arithmetic?' }
	];
	const reserved = Array.from({ length: 20 }, (_, i) => `Neighboring objective ${i}`);
	const prompt = JSON.parse(
		draftPrompt([slot], selectDuplicateContext([slot], existing, reserved))
	);
	expect(prompt.avoidExistingQuestions).toEqual(['How do you add numbers in arithmetic?']);
	expect(prompt.reservedObjectives).toEqual(reserved);
	expect(prompt.assignments[0]).not.toHaveProperty('topicTitle');
	expect(prompt.assignments[0].evidence[0]).toEqual({
		citationId: 'p7c0',
		text: slot.evidence[0].text
	});
	const review = JSON.parse(reviewPrompt([slot], [draft]));
	expect(review.questions[0]).not.toHaveProperty('answerIndex');
	expect(review.questions[0]).not.toHaveProperty('reasoningSkill');
	expect(review.questions[0]).not.toHaveProperty('distractorReasons');
});

test('repair receives only failed assignments and failed previous drafts', async () => {
	let repairSeen = false;
	await runQualityBatch([slot, { ...slot, slotId: 's2' }], async (request) => {
		if (request.stage === 'repair') {
			const payload = JSON.parse(request.prompt);
			expect(payload.assignments.map((item: { slotId: string }) => item.slotId)).toEqual(['s2']);
			expect(
				payload.repair.previousQuestions.map((item: { slotId: string }) => item.slotId)
			).toEqual(['s2']);
			expect(payload.avoidExistingQuestions).toContain(draft.stem);
			repairSeen = true;
			throw new Error('Stop after inspecting repair');
		}
		return {
			object:
				request.stage === 'draft'
					? { questions: [draft, { ...draft, slotId: 's2' }], abstentions: [] }
					: {
							reviews: ['s1', 's2'].map((slotId) => ({
								slotId,
								bestAnswerIndex: 0,
								grounded: true,
								singleBestAnswer: true,
								plausibleDistractors: true,
								typeMatches: slotId === 's1',
								reasons: ['Check question type.']
							}))
						},
			latencyMs: 0,
			inputTokens: 1,
			outputTokens: 1,
			reasoningTokens: 0,
			finishReason: 'stop'
		};
	});
	expect(repairSeen).toBe(true);
});
