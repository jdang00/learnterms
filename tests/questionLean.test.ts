import { expect, test } from 'bun:test';
import { runLeanBatch } from '../src/convex/questionStudio/lean';
import type { QualityCall, QualitySlot } from '../src/convex/questionStudio/quality';

const excerpt =
	'Fibrin-platelet emboli come from carotid plaque and look dull, elongated and highly mobile. Cholesterol emboli glisten. Calcific emboli are large, round and chalk-like.';
const slot: QualitySlot = {
	slotId: 'q1',
	topicId: 't1',
	topicTitle: 'Retinal emboli',
	objective: 'Distinguish retinal emboli by appearance',
	questionType: 'learn',
	evidence: [
		{
			citationId: 'p1c0',
			pageNumber: 1,
			noteFile: 'test',
			chunkTitle: 'Emboli',
			chunkIndex: 0,
			text: excerpt
		}
	]
};
const question = {
	slotId: 'q1',
	stem: 'Which appearance distinguishes a fibrin-platelet retinal embolus?',
	options: [
		'Dull, elongated and highly mobile',
		'Highly reflective and yellow-copper',
		'Large, round and chalk-like',
		'Glistening, elongated and mobile'
	],
	answerIndex: 0,
	rationale:
		'Fibrin-platelet emboli are platelet aggregates from carotid plaque, so they look dull, elongated and highly mobile. Cholesterol emboli glisten, and calcific emboli are large, round and chalk-like, so neither matches.',
	evidence: [{ citationId: 'p1c0' }]
};
const usage = { latencyMs: 1, inputTokens: 10, outputTokens: 10, reasoningTokens: 0 };
const review = (overrides: Record<string, unknown> = {}) => ({
	reviews: [
		{
			slotId: 'q1',
			bestAnswerIndex: 0,
			grounded: true,
			singleBestAnswer: true,
			plausibleDistractors: true,
			typeMatches: true,
			reasons: ['Glistening emboli are the closest alternative.'],
			defensibleAnswerIndices: [0],
			teachingRationale: true,
			replacement: null,
			...overrides
		}
	]
});
const caller =
	(responses: Partial<Record<QualityCall['stage'], unknown>>, seen: QualityCall[]) =>
	async (request: QualityCall) => {
		seen.push(request);
		return { ...usage, finishReason: 'end_turn', object: responses[request.stage] };
	};

test('the editor accepts a draft and the backend attaches the exact excerpt', async () => {
	const seen: QualityCall[] = [];
	const result = await runLeanBatch(
		[slot],
		caller({ draft: { questions: [question], abstentions: [] }, review: review() }, seen),
		{ gate: 'editor' }
	);
	expect(result.accepted).toHaveLength(1);
	expect(result.accepted[0].draft.evidence[0].quote).toBe(excerpt);
	expect(seen.map((call) => [call.stage, call.cache])).toEqual([
		['draft', false],
		['review', false]
	]);
	expect(seen[0].advisor).toBeUndefined();
});

test('an editor replacement is used, and a second defensible option rejects it', async () => {
	const replacement = { ...question, stem: 'Which retinal embolus looks dull and elongated?' };
	const fixed = await runLeanBatch(
		[slot],
		caller(
			{ draft: { questions: [question], abstentions: [] }, review: review({ replacement }) },
			[]
		),
		{ gate: 'editor' }
	);
	expect(fixed.accepted[0].draft.stem).toBe(replacement.stem);
	expect(fixed.corrections).toHaveLength(1);
	const ambiguous = await runLeanBatch(
		[slot],
		caller(
			{
				draft: { questions: [question], abstentions: [] },
				review: review({ defensibleAnswerIndices: [0, 3] })
			},
			[]
		),
		{ gate: 'editor' }
	);
	expect(ambiguous.accepted).toHaveLength(0);
	expect(ambiguous.rejected[0].reasons.join(' ')).toContain('exactly one defensible answer');
});

test('pre-edit cue probes flag the slot for the editor without revealing the key', async () => {
	const seen: QualityCall[] = [];
	await runLeanBatch(
		[slot],
		caller(
			{
				draft: { questions: [question], abstentions: [] },
				probe: { picks: [{ slotId: 'q1', index: 0 }] },
				review: review()
			},
			seen
		),
		{ gate: 'editor', preCue: true }
	);
	expect(seen.map((call) => call.stage)).toEqual(['draft', 'probe', 'probe', 'review']);
	const editor = seen.at(-1)!;
	expect(JSON.parse(editor.prompt).optionsOnlyCues).toEqual(['q1']);
	expect(editor.prompt).not.toContain('answerIndex');
	expect(editor.system).toContain('optionsOnlyCues');
});

test('the solve gate rejects a key the blind solver does not reach', async () => {
	const seen: QualityCall[] = [];
	const result = await runLeanBatch(
		[slot],
		caller(
			{
				draft: { questions: [question], abstentions: [] },
				audit: { solves: [{ slotId: 'q1', index: 3, defensibleIndices: [3] }] }
			},
			seen
		),
		{ gate: 'solve', advisor: 'claude-opus-5-5' }
	);
	expect(result.accepted).toHaveLength(0);
	expect(result.rejected[0].reasons[0]).toContain('Glistening');
	expect(seen[0].advisor).toBe('claude-opus-5-5');
	expect(seen[0].system).toContain('advisor');
});

test('a cued key goes back to the same drafter once, and only when a repair can follow', async () => {
	const seen: QualityCall[] = [];
	const responses = {
		draft: { questions: [question], abstentions: [] },
		repair: { questions: [question], abstentions: [] },
		probe: { picks: [{ slotId: 'q1', index: 0 }] },
		audit: { solves: [{ slotId: 'q1', index: 0, defensibleIndices: [0] }] }
	};
	const result = await runLeanBatch([slot], caller(responses, seen), {
		gate: 'solve',
		preCue: true,
		stages: { draft: { model: 'claude-opus-5-5' } },
		canRepair: () => true
	});
	expect(seen.map((call) => call.stage)).toEqual([
		'draft',
		'audit',
		'probe',
		'probe',
		'repair',
		'audit'
	]);
	const [draft, , , , repair] = seen;
	expect(repair.model).toBe('claude-opus-5-5');
	expect(repair.system).toBe(draft.system);
	expect(JSON.parse(repair.prompt).repair.failures[0].reasons.join(' ')).toContain('options alone');
	expect(result.accepted).toHaveLength(1);

	const noRepair: QualityCall[] = [];
	const kept = await runLeanBatch([slot], caller(responses, noRepair), {
		gate: 'solve',
		preCue: true
	});
	expect(noRepair.map((call) => call.stage)).toEqual(['draft', 'audit']);
	expect(kept.accepted).toHaveLength(1);
});
