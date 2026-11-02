import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type {
	BetaMessageParam,
	BetaTool,
	BetaToolResultBlockParam
} from '@anthropic-ai/sdk/resources/beta/messages/messages';
import type { z } from 'zod/v4';
import { STAGE_MODELS } from '../../aiModels';
import { CUE_FEEDBACK } from '../checks';
import { stemSimilarity } from '../duplicates';
import { formatExemplar, type ExemplarSource } from '../exemplars';
import {
	cachedSourceEvidence,
	normalizedEvidence,
	structuralIssues,
	type DuplicateContext,
	type QualityCaller,
	type QualityCallResult,
	type QualityDraft,
	type QualitySlot,
	type StagePolicy
} from '../quality';
import { clipToSchemaBounds, type AgentTurnRequest, type AgentTurnResult } from '../provider';
import type { StoredMarkdownPage } from '../shared';
import { auditItems, blindSolve, probeOptionsOnly } from './audit';
import { agentSystem } from './prompts';
import { findExamplesInput, itemsInput, probeInput, submitInput, type AgentItem } from './schemas';

export type AgentTurnCaller = (request: AgentTurnRequest) => Promise<AgentTurnResult>;
export type AgentBatchOptions = {
	turn: AgentTurnCaller;
	call: QualityCaller;
	exemplars?: ExemplarSource;
	avoid?: DuplicateContext;
	sourcePages?: StoredMarkdownPage[];
	stages?: StagePolicy;
	/** solve: a cheap blind solve gates the key (default). audit: a full blind audit, for A/B. */
	verification?: 'solve' | 'audit';
	maxTurns?: number;
	/** Checked before every turn after the first; production passes its deadline. */
	canContinue?: () => boolean;
	timeoutMs?: () => number | undefined;
};

// Strict decoding compiles a grammar per tool; only submit_items needs it. The others validate in code.
const tool = (name: string, description: string, schema: z.ZodType, strict = false): BetaTool => ({
	name,
	description,
	...(strict ? { strict: true } : {}),
	input_schema: betaZodOutputFormat(schema).schema as BetaTool['input_schema']
});
const TOOLS = [
	tool(
		'find_examples',
		'Retrieve strong curator-written questions of a type with student response statistics. Use them for structure and voice only.',
		findExamplesInput
	),
	tool(
		'check_items',
		'Run the deterministic item checks: evidence citations, blueprint consistency, option construction, rationale length and duplicates.',
		itemsInput
	),
	tool(
		'probe_items',
		'Ask a test-wise reader to pick the key from the options alone. Use at most once or twice per batch.',
		probeInput
	),
	tool(
		'submit_items',
		'Submit finished items and abstentions. Each item is checked and its key verified independently; rejected items come back once with reasons.',
		submitInput,
		true
	)
];

function toDraft(item: AgentItem, slot: QualitySlot): QualityDraft {
	return {
		slotId: item.slotId,
		stem: item.stem,
		options: item.options,
		answerIndex: item.answerIndex,
		rationale: item.rationale,
		evidence: item.citationIds.map((citationId) => ({
			citationId,
			quote: slot.evidence.find((chunk) => chunk.citationId === citationId)?.text ?? ''
		}))
	};
}

export function blueprintIssues(item: AgentItem, slot: QualitySlot): string[] {
	const issues: string[] = [];
	const wrong = item.options
		.filter((_, index) => index !== item.answerIndex)
		.map(normalizedEvidence);
	const planned = item.blueprint.confusions.map((c) => normalizedEvidence(c.option));
	if (wrong.some((option) => !planned.includes(option)))
		issues.push('The three wrong options must be exactly the blueprint confusions.');
	const allowed = new Set(slot.evidence.map((chunk) => chunk.citationId));
	if (item.blueprint.confusions.some((c) => c.citationId && !allowed.has(c.citationId)))
		issues.push('A confusion cites an excerpt that is not assigned to this slot.');
	if (item.blueprint.confusions.some((c) => c.excludedBy.trim().length < 8))
		issues.push('Each confusion needs the fact that excludes it.');
	if (slot.questionType === 'criticalThinking' && item.blueprint.relationships.length < 2)
		issues.push(
			'A Critical-thinking item must combine at least two relationships: one narrows the options and one separates the finalists.'
		);
	return issues;
}

export async function runAgentBatch(slots: QualitySlot[], options: AgentBatchOptions) {
	if (
		slots.length < 1 ||
		slots.length > 3 ||
		new Set(slots.map((s) => s.slotId)).size !== slots.length
	)
		throw new Error('Invalid number of unique slots');
	const calls: Array<QualityCallResult & { stage: string }> = [];
	const call: QualityCaller = async (request) => {
		const result = await options.call(request);
		calls.push({ ...result, stage: request.stage });
		return result;
	};
	const accepted = new Map<string, QualityDraft>();
	const rejected: Array<{ slotId: string; reasons: string[] }> = [];
	const avoidStems = [...(options.avoid?.existing ?? []), ...(options.avoid?.reserved ?? [])];
	const slotFor = (slotId: string) => slots.find((slot) => slot.slotId === slotId);
	const check = (item: AgentItem) => {
		const slot = slotFor(item.slotId);
		if (!slot) return ['Unknown slot.'];
		const stems = [...avoidStems, ...[...accepted.values()].map((draft) => draft.stem)];
		return [
			...structuralIssues(toDraft(item, slot), slot),
			...blueprintIssues(item, slot),
			...(stems.some((stem) => stemSimilarity(item.stem, stem) >= 0.62)
				? ['This repeats an existing question; test a different concept.']
				: [])
		];
	};
	const shown: string[] = [];
	let probes = 0;
	let submitRounds = 0;
	let done = false;

	const verify = async (entries: Array<{ slot: QualitySlot; item: AgentItem }>) => {
		const items = entries.map((entry) => entry.item);
		// Two independent options-only picks; flag only when both find the key (about 6% by chance).
		const [verdicts, ...probesRun] = await Promise.all([
			options.verification === 'audit'
				? auditItems(entries, call, { stages: options.stages, repair: submitRounds > 1 })
				: blindSolve(entries, call, { repair: submitRounds > 1 }),
			probeOptionsOnly(items, call),
			probeOptionsOnly(items, call)
		]);
		for (const { item } of entries)
			if (probesRun.every((run) => run.find((r) => r.slotId === item.slotId)?.keyGuessed))
				verdicts.set(item.slotId, [...(verdicts.get(item.slotId) ?? []), CUE_FEEDBACK]);
		return verdicts;
	};

	const runTool = async (name: string, raw: unknown): Promise<string> => {
		const input = clipToSchemaBounds(raw);
		if (name === 'find_examples') {
			const query = findExamplesInput.parse(input);
			if (!options.exemplars) return 'No exemplar bank is available; rely on the blueprint rules.';
			const examples = await options.exemplars({ ...query, exclude: shown });
			shown.push(...examples.map((e) => e.id));
			return examples.length
				? examples.map(formatExemplar).join('\n\n')
				: 'No close examples; rely on the blueprint rules.';
		}
		if (name === 'check_items') {
			const { items } = itemsInput.parse(input);
			return items
				.map((item) => {
					const issues = check(item);
					return `${item.slotId}: ${issues.length ? issues.join(' ') : 'no issues.'}`;
				})
				.join('\n');
		}
		if (name === 'probe_items') {
			if (++probes > 2) return 'Probe budget used; submit when checks pass.';
			const results = await probeOptionsOnly(probeInput.parse(input).items, call);
			return results
				.map(
					(r) =>
						`${r.slotId}: ${r.keyGuessed ? 'a test-wise reader picked the key from the options alone; look for length, specificity or wording cues.' : 'the options alone did not give the key away.'}`
				)
				.join('\n');
		}
		if (name === 'submit_items') {
			submitRounds++;
			const submission = submitInput.parse(input);
			const open = slots.filter((slot) => !accepted.has(slot.slotId));
			const failures = new Map<string, string[]>();
			const verifiable: Array<{ slot: QualitySlot; item: AgentItem }> = [];
			for (const slot of open) {
				const items = submission.items.filter((item) => item.slotId === slot.slotId);
				const abstention = submission.abstentions.find((a) => a.slotId === slot.slotId);
				if (items.length !== 1) {
					failures.set(slot.slotId, [abstention?.reason ?? 'No single item was submitted.']);
					continue;
				}
				const issues = check(items[0]);
				if (issues.length) failures.set(slot.slotId, issues);
				else verifiable.push({ slot, item: items[0] });
			}
			if (verifiable.length) {
				const verdicts = await verify(verifiable);
				for (const { slot, item } of verifiable) {
					const reasons = verdicts.get(slot.slotId) ?? ['No verification verdict.'];
					if (reasons.length) failures.set(slot.slotId, reasons);
					else accepted.set(slot.slotId, toDraft(item, slot));
				}
			}
			const retry = [...failures.entries()].filter(
				([slotId]) => !submission.abstentions.some((a) => a.slotId === slotId)
			);
			if (!retry.length || submitRounds >= 2 || options.canContinue?.() === false) {
				rejected.push(...[...failures].map(([slotId, reasons]) => ({ slotId, reasons })));
				done = true;
				return 'Final results recorded.';
			}
			// Abstentions are final; failed items get one revision in this same conversation.
			for (const [slotId, reasons] of failures)
				if (!retry.some(([id]) => id === slotId)) rejected.push({ slotId, reasons });
			return `Accepted: ${[...accepted.keys()].join(', ') || 'none'}.\n${retry
				.map(([slotId, reasons]) => `${slotId} rejected: ${reasons.join(' ')}`)
				.join(
					'\n'
				)}\nRevise only the rejected items from their blueprints, check them, and submit again. This is the last round; abstain if the evidence cannot support a sound item.`;
		}
		return `Unknown tool ${name}.`;
	};

	// Fetch examples up front so the common path is two turns: write and submit, then one fix.
	const examples = options.exemplars
		? await Promise.all(
				slots.map(async (slot) => {
					const found = await options.exemplars!({
						questionType: slot.questionType,
						objective: slot.objective,
						context: slot.evidence[0]?.text.slice(0, 600),
						limit: 2,
						exclude: shown
					}).catch(() => []);
					shown.push(...found.map((e) => e.id));
					return { slotId: slot.slotId, examples: found.map(formatExemplar) };
				})
			)
		: [];
	const model = options.stages?.draft?.model ?? STAGE_MODELS.draft;
	const system = agentSystem(
		slots.map((slot) => slot.questionType),
		cachedSourceEvidence(slots, options.sourcePages)
	);
	const messages: BetaMessageParam[] = [
		{
			role: 'user',
			content: JSON.stringify({
				task: 'Write one question per assignment, or abstain. Follow the work order in your instructions.',
				assignments: slots.map((slot) => ({
					slotId: slot.slotId,
					questionType: slot.questionType,
					objective: slot.objective,
					...(slot.focusPreference ? { focusPreference: slot.focusPreference } : {}),
					citationIds: slot.evidence.map((chunk) => chunk.citationId)
				})),
				...(examples.length ? { curatorExamples: examples } : {}),
				avoidExistingQuestions: options.avoid?.existing ?? [],
				reservedObjectives: options.avoid?.reserved ?? []
			})
		}
	];
	try {
		for (let turn = 0; turn < (options.maxTurns ?? 10) && !done; turn++) {
			if (turn > 0 && options.canContinue?.() === false) break;
			const result = await options.turn({
				stage: 'agent',
				model,
				system,
				messages,
				tools: TOOLS,
				effort: options.stages?.draft?.effort ?? 'medium',
				maxOutputTokens: 12000,
				timeoutMs: options.timeoutMs?.()
			});
			calls.push({ ...result, stage: 'agent' });
			const { message } = result;
			messages.push({ role: 'assistant', content: message.content });
			if (message.stop_reason === 'refusal') throw new Error('The model declined this request.');
			const uses = message.content.filter((block) => block.type === 'tool_use');
			if (!uses.length) {
				messages.push({
					role: 'user',
					content:
						message.stop_reason === 'max_tokens'
							? 'Your turn hit the output limit. Continue with shorter tool calls.'
							: 'Finish by calling submit_items with your items and abstentions.'
				});
				continue;
			}
			const results: BetaToolResultBlockParam[] = [];
			for (const use of uses) {
				try {
					results.push({
						type: 'tool_result',
						tool_use_id: use.id,
						content: await runTool(use.name, use.input)
					});
				} catch (error) {
					results.push({
						type: 'tool_result',
						tool_use_id: use.id,
						is_error: true,
						content: error instanceof Error ? error.message.slice(0, 600) : 'Tool failed.'
					});
				}
			}
			messages.push({ role: 'user', content: results });
		}
	} catch (error) {
		const reason = `Provider or format failure: ${error instanceof Error ? error.message : 'unknown error'}`;
		for (const slot of slots)
			if (!accepted.has(slot.slotId) && !rejected.some((r) => r.slotId === slot.slotId))
				rejected.push({ slotId: slot.slotId, reasons: [reason] });
	}
	for (const slot of slots)
		if (!accepted.has(slot.slotId) && !rejected.some((r) => r.slotId === slot.slotId))
			rejected.push({
				slotId: slot.slotId,
				reasons: ['The agent stopped before finishing this item.']
			});
	return {
		accepted: slots.flatMap((slot) =>
			accepted.has(slot.slotId) ? [{ slot, draft: accepted.get(slot.slotId)! }] : []
		),
		rejected,
		corrections: [] as Array<{ slotId: string; reasons: string[] }>,
		calls
	};
}
