import { expect, test } from 'bun:test';
import { blueprintIssues, runAgentBatch } from '../src/convex/questionStudio/agent/batch';
import type { AgentItem } from '../src/convex/questionStudio/agent/schemas';
import type { AgentTurnResult } from '../src/convex/questionStudio/provider';
import type { QualityCall, QualitySlot } from '../src/convex/questionStudio/quality';

const slot: QualitySlot = {
	slotId: 'q1',
	topicId: 't1',
	topicTitle: 'Arithmetic',
	objective: 'Add numbers',
	questionType: 'learn',
	evidence: [
		{
			citationId: 'p1c0',
			pageNumber: 1,
			noteFile: 'test',
			chunkTitle: 'Arithmetic',
			chunkIndex: 0,
			text: 'Two plus two equals four. Three plus two equals five.'
		}
	]
};
const item: AgentItem = {
	slotId: 'q1',
	blueprint: {
		rule: 'Addition combines two quantities into one total.',
		shape: 'mechanism-effect',
		discriminators: ['two plus two'],
		relationships: [],
		confusions: [
			{
				option: 'Five',
				misconception: 'Adds three',
				excludedBy: 'Three plus two is five',
				citationId: 'p1c0'
			},
			{
				option: 'Six',
				misconception: 'Doubles twice',
				excludedBy: 'The sum is four, not six',
				citationId: null
			},
			{
				option: 'Seven',
				misconception: 'Guessing',
				excludedBy: 'The sum is four, not seven',
				citationId: null
			}
		]
	},
	stem: 'What does two plus two equal?',
	options: ['Four', 'Five', 'Six', 'Seven'],
	answerIndex: 0,
	rationale:
		'Addition combines two quantities into one total, so two plus two equals four. Five, six and seven each overshoot that total by one, two or three units, so none of them is the sum.',
	citationIds: ['p1c0']
};

const usage = { latencyMs: 1, inputTokens: 10, outputTokens: 10, reasoningTokens: 0 };
function turnWith(toolCalls: Array<{ name: string; input: unknown }>): AgentTurnResult {
	return {
		...usage,
		object: null,
		finishReason: 'tool_use',
		message: {
			stop_reason: 'tool_use',
			content: toolCalls.map((c, i) => ({
				type: 'tool_use',
				id: `t${i}`,
				name: c.name,
				input: c.input
			}))
		} as unknown as AgentTurnResult['message']
	};
}
const solver =
	(index: number, defensible = [index]) =>
	async (request: QualityCall) => ({
		...usage,
		finishReason: 'end_turn',
		object:
			request.stage === 'probe'
				? { picks: [{ slotId: 'q1', index: 2 }] }
				: { solves: [{ slotId: 'q1', index, defensibleIndices: defensible }] }
	});

test('a checked item that a blind solver confirms is accepted with exact evidence attached', async () => {
	const turns = [
		turnWith([{ name: 'check_items', input: { items: [item] } }]),
		turnWith([{ name: 'submit_items', input: { items: [item], abstentions: [] } }])
	];
	const toolResults: string[] = [];
	const result = await runAgentBatch([slot], {
		turn: async (request) => {
			const last = request.messages.at(-1);
			if (last && Array.isArray(last.content))
				for (const block of last.content)
					if (block.type === 'tool_result') toolResults.push(String(block.content));
			return turns.shift()!;
		},
		call: solver(0)
	});
	expect(toolResults[0]).toBe('q1: no issues.');
	expect(result.accepted).toHaveLength(1);
	expect(result.accepted[0].draft.evidence[0].quote).toBe(slot.evidence[0].text);
	expect(result.calls.map((c) => c.stage).sort()).toEqual([
		'agent',
		'agent',
		'audit',
		'probe',
		'probe'
	]);
});

test('a blind-solve rejection goes back to the agent once and the revision can pass', async () => {
	let solves = 0;
	const turns = [
		turnWith([{ name: 'submit_items', input: { items: [item], abstentions: [] } }]),
		turnWith([{ name: 'submit_items', input: { items: [item], abstentions: [] } }])
	];
	let feedback = '';
	const result = await runAgentBatch([slot], {
		turn: async (request) => {
			const last = request.messages.at(-1);
			if (last && Array.isArray(last.content) && last.content[0]?.type === 'tool_result')
				feedback = String(last.content[0].content);
			return turns.shift()!;
		},
		call: async (request) => solver(solves++ === 0 ? 1 : 0)(request)
	});
	expect(feedback).toContain('q1 rejected');
	expect(feedback).toContain('"Five"');
	expect(result.accepted).toHaveLength(1);
});

test('a second failed submission is final and nothing loops forever', async () => {
	let turns = 0;
	const result = await runAgentBatch([slot], {
		turn: async () => {
			turns++;
			return turnWith([{ name: 'submit_items', input: { items: [item], abstentions: [] } }]);
		},
		call: solver(0, [0, 1])
	});
	expect(turns).toBe(2);
	expect(result.accepted).toHaveLength(0);
	expect(result.rejected[0].reasons.join(' ')).toContain('also defend');
});

test('wrong options must be the blueprint confusions, citing only assigned excerpts', () => {
	expect(blueprintIssues(item, slot)).toEqual([]);
	expect(blueprintIssues({ ...item, options: ['Four', 'Five', 'Six', 'Eight'] }, slot)).toContain(
		'The three wrong options must be exactly the blueprint confusions.'
	);
	const foreign = structuredClone(item);
	foreign.blueprint.confusions[0].citationId = 'p9c0';
	expect(blueprintIssues(foreign, slot)).toContain(
		'A confusion cites an excerpt that is not assigned to this slot.'
	);
});

test('a key that options alone give away twice goes back for revision', async () => {
	const turns = [
		turnWith([{ name: 'submit_items', input: { items: [item], abstentions: [] } }]),
		turnWith([{ name: 'submit_items', input: { items: [item], abstentions: [] } }])
	];
	let feedback = '';
	const result = await runAgentBatch([slot], {
		turn: async (request) => {
			const last = request.messages.at(-1);
			if (last && Array.isArray(last.content) && last.content[0]?.type === 'tool_result')
				feedback = String(last.content[0].content);
			return turns.shift()!;
		},
		call: async (request) => ({
			...usage,
			finishReason: 'end_turn',
			object:
				request.stage === 'probe'
					? { picks: [{ slotId: 'q1', index: 0 }] }
					: { solves: [{ slotId: 'q1', index: 0, defensibleIndices: [0] }] }
		})
	});
	expect(feedback).toContain('options alone');
	expect(result.accepted).toHaveLength(0);
});

test('abstentions are final and the stopping rule covers silent turns', async () => {
	const result = await runAgentBatch([slot], {
		turn: async () =>
			turnWith([
				{
					name: 'submit_items',
					input: { items: [], abstentions: [{ slotId: 'q1', reason: 'Too thin.' }] }
				}
			]),
		call: solver(0)
	});
	expect(result.rejected).toEqual([{ slotId: 'q1', reasons: ['Too thin.'] }]);
});
