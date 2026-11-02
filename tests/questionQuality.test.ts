import { estimateQualityInputTokens } from '../src/convex/questionStudio/tokenEstimate';
import { expect, test } from 'bun:test';
import {
	evidenceForObjective,
	structuralIssues,
	runQualityBatch,
	draftPrompt,
	selectDuplicateContext,
	reviewPrompt,
	cachedSourceEvidence,
	withCachedSource,
	draftSchema,
	learnReviewSchema,
	type QualitySlot,
	type QualityDraft
} from '../src/convex/questionStudio/quality';
import { draftSystem } from '../src/convex/questionStudio/prompts';
import {
	callQualityModel,
	QuestionProviderError,
	estimateClaudeCost,
	measureClaudeUsage,
	clipToSchemaBounds
} from '../src/convex/questionStudio/provider';
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
	rationale:
		'Addition combines two quantities into one total, so two plus two equals four. Five, six and seven each overshoot that total by one, two or three units, so none of them is the sum.',
	evidence: [{ citationId: 'p7c0', quote: 'Two plus two equals four.' }]
};

test('source prefixes stay identical across tasks and repairs without expanding assignment evidence', () => {
	const pages = [
		{ pageNumber: 7, text: slot.evidence[0].text },
		{ pageNumber: 8, text: 'Unassigned fact stays outside the assignment.' }
	];
	const source = cachedSourceEvidence([slot], pages);
	const request = {
		stage: 'draft' as const,
		system: draftSystem('learn'),
		prompt: draftPrompt([slot]),
		schema: draftSchema,
		thinking: 'high' as const,
		maxOutputTokens: 8000
	};
	const first = withCachedSource(request, source, 'stable-session');
	const second = withCachedSource(
		{
			...request,
			prompt: draftPrompt(
				[{ ...slot, slotId: 'another-slot' }],
				{},
				{ failures: ['Fix ambiguity'] }
			)
		},
		source,
		'stable-session'
	);
	expect(first.system).toBe(request.system);
	expect(first.context).toBe(second.context);
	expect(first.context).toContain(slot.evidence[0].text);
	expect(first.prompt).not.toContain(slot.evidence[0].text);
	const payload = JSON.parse(first.prompt.split('\n').at(-1)!);
	expect(payload.assignments[0].evidence).toEqual([{ citationId: 'p7c0' }]);
	expect(payload.assignments[0].evidence).not.toContainEqual({ citationId: 'p8c0' });
	expect(() =>
		withCachedSource(request, [{ citationId: 'p7c0', text: 'Different source revision' }])
	).toThrow('mismatch');
});

function claudeResponse(body: Record<string, unknown>, headers: Record<string, string> = {}) {
	return new Response(
		JSON.stringify({
			id: 'msg_test',
			type: 'message',
			role: 'assistant',
			model: 'claude-sonnet-5-5',
			content: [],
			stop_reason: 'end_turn',
			stop_details: null,
			...body
		}),
		{ headers: { 'content-type': 'application/json', 'request-id': 'req_test', ...headers } }
	);
}

test('Claude requests cache the source block, set effort, opt into fallback and report cache usage', async () => {
	const originalFetch = globalThis.fetch;
	let sent: any;
	globalThis.fetch = (async (input: unknown, init: RequestInit) => {
		sent = { url: String(input), body: JSON.parse(String(init.body)), headers: init.headers };
		return claudeResponse({
			content: [{ type: 'text', text: JSON.stringify({ questions: [draft], abstentions: [] }) }],
			usage: {
				input_tokens: 336,
				output_tokens: 1000,
				cache_read_input_tokens: 1536,
				cache_creation_input_tokens: 128,
				output_tokens_details: { thinking_tokens: 600 },
				service_tier: 'standard'
			}
		});
	}) as typeof fetch;
	try {
		const result = await callQualityModel(
			{
				stage: 'draft',
				model: 'claude-sonnet-5-5',
				system: 'Stable evidence',
				prompt: 'Variable assignment',
				schema: draftSchema,
				thinking: 'high',
				maxOutputTokens: 8000
			},
			'test'
		);
		expect(sent.url).toContain('https://api.anthropic.com/v1/messages');
		expect(sent.body.model).toBe('claude-sonnet-5-5');
		expect(sent.body.max_tokens).toBe(8000);
		expect(sent.body.system[0]).toEqual({
			type: 'text',
			text: 'Stable evidence',
			cache_control: { type: 'ephemeral' }
		});
		expect(sent.body.thinking).toEqual({ type: 'adaptive' });
		expect(sent.body.output_config.effort).toBe('high');
		expect(sent.body.output_config.format.type).toBe('json_schema');
		expect(sent.body.fallbacks).toBe('default');
		expect(sent.body.temperature).toBeUndefined();
		expect(new Headers(sent.headers).get('anthropic-beta')).toContain(
			'server-side-fallback-2026-07-01'
		);
		expect(result.inputTokens).toBe(2000);
		expect(result.cachedInputTokens).toBe(1536);
		expect(result.cacheWriteTokens).toBe(128);
		expect(result.reasoningTokens).toBe(600);
		expect(result.costEstimated).toBe(true);
		expect(result.costUsd).toBeCloseTo(
			estimateClaudeCost('claude-sonnet-5-5', {
				input: 336,
				output: 1000,
				cacheRead: 1536,
				cacheWrite: 128
			}),
			10
		);
		expect(result.requestId).toBe('req_test');
		expect(result.responseId).toBe('msg_test');
		expect(result.object).toEqual({ questions: [draft], abstentions: [] });
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('stable instructions always cache; the source block caches only when a reuse can follow', async () => {
	const originalFetch = globalThis.fetch;
	const bodies: any[] = [];
	globalThis.fetch = (async (_input: unknown, init: RequestInit) => {
		bodies.push(JSON.parse(String(init.body)));
		return claudeResponse({
			content: [{ type: 'text', text: JSON.stringify({ questions: [draft], abstentions: [] }) }],
			usage: { input_tokens: 10, output_tokens: 10 }
		});
	}) as typeof fetch;
	try {
		const request = {
			stage: 'draft' as const,
			model: 'claude-sonnet-5-5' as const,
			system: 'Instructions',
			context: 'Source',
			prompt: 'Assignment',
			schema: draftSchema,
			thinking: 'medium' as const,
			maxOutputTokens: 4000
		};
		await callQualityModel(request, 'test');
		await callQualityModel({ ...request, cache: false }, 'test');
		await callQualityModel({ ...request, context: undefined, cache: false }, 'test');
		const ephemeral = { type: 'ephemeral' };
		expect(bodies[0].system).toEqual([
			{ type: 'text', text: 'Instructions', cache_control: ephemeral },
			{ type: 'text', text: 'Source', cache_control: ephemeral }
		]);
		expect(bodies[1].system).toEqual([
			{ type: 'text', text: 'Instructions', cache_control: ephemeral },
			{ type: 'text', text: 'Source' }
		]);
		expect(bodies[2].system).toEqual([
			{ type: 'text', text: 'Instructions', cache_control: ephemeral }
		]);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('diagnostic text and citation lists are clipped to schema bounds; content is untouched', () => {
	const long = 'x'.repeat(900);
	const citation = { citationId: 'p1c0' };
	expect(
		clipToSchemaBounds({
			reviews: [{ reasons: ['a', 'b', 'c', 'd', 'e', 'f', long], stem: long }],
			abstentions: [{ slotId: 'q1', reason: long }],
			questions: [{ rationale: long, evidence: [1, 2, 3, 4, 5].map(() => citation) }]
		})
	).toEqual({
		reviews: [{ reasons: ['a', 'b', 'c', 'd', 'e'], stem: long }],
		abstentions: [{ slotId: 'q1', reason: 'x'.repeat(500) }],
		questions: [{ rationale: long, evidence: [1, 2, 3, 4].map(() => citation) }]
	});
});

test('Haiku requests omit server-side fallback', async () => {
	const originalFetch = globalThis.fetch;
	let body: any;
	globalThis.fetch = (async (_input: unknown, init: RequestInit) => {
		body = JSON.parse(String(init.body));
		return claudeResponse({
			model: 'claude-haiku-5-5',
			content: [{ type: 'text', text: JSON.stringify({ questions: [], abstentions: [] }) }],
			usage: { input_tokens: 10, output_tokens: 10 }
		});
	}) as typeof fetch;
	try {
		await callQualityModel(
			{
				stage: 'review',
				model: 'claude-haiku-5-5',
				system: 's',
				prompt: 'p',
				schema: draftSchema,
				thinking: 'low',
				maxOutputTokens: 100
			},
			'test'
		);
		expect(body.fallbacks).toBeUndefined();
		expect(body.output_config.effort).toBe('low');
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('Claude pricing follows each model, the Haiku long-prompt rate and fallback attempts', () => {
	expect(estimateClaudeCost('claude-opus-5-5', { input: 1_000_000, output: 0 })).toBeCloseTo(4);
	expect(estimateClaudeCost('claude-opus-5-5', { input: 0, output: 1_000_000 })).toBeCloseTo(20);
	expect(
		estimateClaudeCost('claude-sonnet-5-5', { input: 0, output: 0, cacheRead: 1_000_000 })
	).toBeCloseTo(0.2);
	expect(
		estimateClaudeCost('claude-sonnet-5-5', { input: 0, output: 0, cacheWrite: 1_000_000 })
	).toBeCloseTo(2.5);
	expect(estimateClaudeCost('claude-haiku-5-5', { input: 100_000, output: 0 })).toBeCloseTo(0.01);
	expect(estimateClaudeCost('claude-haiku-5-5', { input: 100_001, output: 0 })).toBeCloseTo(
		0.0500005
	);
	expect(
		estimateClaudeCost('claude-haiku-5-5', { input: 0, output: 0, cacheRead: 1_000_000 })
	).toBeCloseTo(0.5 * 0.1);
	// An unknown model is never treated as free.
	expect(estimateClaudeCost('claude-unknown', { input: 1_000_000, output: 0 })).toBeCloseTo(5);
	const measured = measureClaudeUsage('claude-opus-5-5', {
		input_tokens: 1000,
		output_tokens: 500,
		cache_read_input_tokens: 0,
		cache_creation_input_tokens: 0,
		iterations: [
			{
				type: 'message',
				model: 'claude-opus-5-5',
				input_tokens: 1000,
				output_tokens: 0,
				cache_read_input_tokens: 0,
				cache_creation_input_tokens: 0,
				cache_creation: null
			},
			{
				type: 'fallback_message',
				model: 'claude-opus-4-8',
				input_tokens: 1000,
				output_tokens: 500,
				cache_read_input_tokens: 0,
				cache_creation_input_tokens: 0,
				cache_creation: null
			}
		]
	} as unknown as Parameters<typeof measureClaudeUsage>[1]);
	expect(measured.inputTokens).toBe(2000);
	expect(measured.costUsd).toBeCloseTo((1000 * 4 + 1000 * 5 + 500 * 25) / 1_000_000, 10);
	// An Opus advisor bills its own iteration; top-level usage holds only the executor's tokens.
	const advised = measureClaudeUsage('claude-sonnet-5-5', {
		input_tokens: 3000,
		output_tokens: 300,
		cache_read_input_tokens: 0,
		cache_creation_input_tokens: 0,
		iterations: [
			{ type: 'message', input_tokens: 1000, output_tokens: 100 },
			{ type: 'advisor_message', model: 'claude-opus-5-5', input_tokens: 3000, output_tokens: 600 },
			{ type: 'message', input_tokens: 2000, output_tokens: 200 }
		]
	} as unknown as Parameters<typeof measureClaudeUsage>[1]);
	expect(advised.inputTokens).toBe(6000);
	expect(advised.costUsd).toBeCloseTo((3000 * 2 + 300 * 10 + 3000 * 4 + 600 * 20) / 1_000_000, 10);
});
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
	).toEqual([]);
	expect(
		structuralIssues(
			{ ...draft, rationale: 'This observation provides evidence of the relationship.' },
			slot
		)
	).not.toContain('Remove source framing from student-facing text.');
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
		expect(requests.map((request) => request.thinking)).toEqual(['high', 'high']);
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

test('refused and truncated Claude responses retain billable usage and request IDs', async () => {
	const originalFetch = globalThis.fetch;
	for (const [stopReason, finish] of [
		['max_tokens', 'max_tokens'],
		['refusal', 'refusal']
	] as const) {
		globalThis.fetch = (async () =>
			claudeResponse(
				{
					stop_reason: stopReason,
					stop_details: stopReason === 'refusal' ? { type: 'refusal', category: 'bio' } : null,
					content: [{ type: 'text', text: '{"questions": [' }],
					usage: {
						input_tokens: 100,
						output_tokens: 800,
						output_tokens_details: { thinking_tokens: 700 }
					}
				},
				{ 'request-id': 'req-short' }
			)) as unknown as typeof fetch;
		try {
			await callQualityModel(
				{
					stage: 'draft',
					system: 'source',
					prompt: 'question',
					schema: draftSchema,
					thinking: 'high',
					maxOutputTokens: 800
				},
				'test'
			);
			throw new Error('Expected incomplete response');
		} catch (error) {
			expect(error).toBeInstanceOf(QuestionProviderError);
			const usage = (error as QuestionProviderError).usage;
			expect(usage.requestId).toBe('req-short');
			expect(usage.outputTokens).toBe(800);
			expect(usage.reasoningTokens).toBe(700);
			expect(usage.costUsd).toBeGreaterThan(0);
			expect(usage.finishReason).toBe(finish);
			if (stopReason === 'refusal') expect((error as Error).message).toContain('bio');
		} finally {
			globalThis.fetch = originalFetch;
		}
	}
});

test('token reservation includes schema and full output without charging every character as a token', () => {
	const request = {
		stage: 'draft' as const,
		system: 'Source evidence. '.repeat(1000),
		prompt: 'Write a question about the source. <|endoftext|>',
		schema: draftSchema,
		thinking: 'high' as const,
		maxOutputTokens: 6000
	};
	const estimated = estimateQualityInputTokens(request);
	expect(estimated).toBeGreaterThan(3000);
	expect(estimated).toBeLessThan(request.system.length);
	const largeSchema = { ...request, schema: learnReviewSchema };
	expect(estimateQualityInputTokens(largeSchema)).toBeGreaterThan(estimated);
});

test('embolic sources are not confused with documents while document narration is still withheld', () => {
	for (const rationale of [
		'Recognizing this source–composition relationship distinguishes embolic mechanisms.',
		'Recognizing these sources helps identify systemic vascular risk.'
	])
		expect(structuralIssues({ ...draft, rationale }, slot)).not.toContain(
			'Remove source framing from student-facing text.'
		);
	for (const rationale of [
		'The source states that two plus two equals four.',
		'The supplied sources describe the calculation.'
	])
		expect(structuralIssues({ ...draft, rationale }, slot)).toContain(
			'Remove source framing from student-facing text.'
		);
});
