// Claude Haiku labels for question type and shape, cached in tmp/exemplar-bank/labels.json.
// Heuristic labels stay the fallback; model labels replace them when present.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { CLAUDE_HAIKU } from '../../../src/convex/aiModels';
import { EXEMPLAR_SHAPES } from '../../../src/convex/questionStudio/exemplarText';
import { questionTypes } from '../../../src/convex/questionStudio/questionTypes';
import { BANK_DIR, textHash } from './embeddings';

const LABELS_PATH = join(BANK_DIR, 'labels.json');
const LEDGER_PATH = join(BANK_DIR, 'ledger.jsonl');
/** Claude Haiku 5.5 list price per million tokens. */
const PRICE = { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 };
export const LABEL_BUDGET_USD = 1;
const BATCH = 20;

export type Label = {
	questionType: (typeof questionTypes)[number];
	shape: (typeof EXEMPLAR_SHAPES)[number];
	informal?: boolean;
	dependsOnUnseen?: boolean;
};
type Item = {
	id: string;
	stem: string;
	options: string[];
	correctIndex: number;
	rationale: string;
};

const SYSTEM = `You label curator-written multiple-choice questions from optometry and pharmacy courses.

questionType (what the learner must do):
- learn: recall or explain one fact, relationship, definition, mechanism or distinction. No patient scenario, or a one-line scenario that only decorates recall.
- clinical: apply knowledge to a patient scenario or clinical finding; the patient details are needed to answer.
- criticalThinking: combine at least two relationships: one narrows the options and a second separates the finalists (infer a diagnosis then apply a patient constraint; choose between parallel causes using timing or a measurement; multi-step calculation or data interpretation). Several matching signs of one diagnosis are not enough.

shape (the item's structure):
- mechanism-effect: what a drug, receptor, structure or process does, or why something happens.
- test-purpose: which test, measurement, instrument or procedure fits a purpose, or what a test measures.
- threshold-use: a number, range, dose, time or cutoff, ideally tied to a decision.
- diagnosis-from-findings: findings given, the diagnosis or condition is the answer.
- contraindication: what to avoid or what is unsafe for this patient or situation.
- constraint-application: choose a treatment, management or next step under a stated constraint or context.
- parallel-causes: choose between competing causes or explanations of a presentation.
- other: definitions, classifications, epidemiology, facts and anything else.

informal: true when the stem or rationale uses jokes, sarcasm, personal anecdotes, slang, asides to the reader ("yeah me neither", "don't lie to me"), or references to a professor, lecture or class. Plain clinical teaching prose is false.

dependsOnUnseen: true when answering or understanding needs something not shown: an image, figure, table, chart, a previous question, or lecture-specific content the item names but does not state.

Label each item by id. Return every id exactly once.`;

const LabelsSchema = z.object({
	labels: z.array(
		z.object({
			id: z.string(),
			questionType: z.enum(questionTypes),
			shape: z.enum(EXEMPLAR_SHAPES),
			informal: z.boolean(),
			dependsOnUnseen: z.boolean()
		})
	)
});

function loadLabels(): Record<string, Label & { hash: string }> {
	return existsSync(LABELS_PATH) ? JSON.parse(readFileSync(LABELS_PATH, 'utf8')) : {};
}

function spentOn(model: string) {
	if (!existsSync(LEDGER_PATH)) return 0;
	return readFileSync(LEDGER_PATH, 'utf8')
		.split('\n')
		.filter(Boolean)
		.map((line) => JSON.parse(line) as { model: string; costUsd: number })
		.filter((row) => row.model === model)
		.reduce((sum, row) => sum + row.costUsd, 0);
}

function anthropicKey() {
	const fromEnv = process.env.ANTHROPIC_API_KEY?.trim();
	if (fromEnv) return fromEnv;
	const result = Bun.spawnSync(['bunx', 'convex', 'env', 'get', 'ANTHROPIC_API_KEY'], {
		stdout: 'pipe',
		stderr: 'pipe'
	});
	const key = result.stdout.toString().trim();
	if (!key) throw new Error('ANTHROPIC_API_KEY is not available from env or the dev deployment');
	return key;
}

const itemHash = (item: Item) =>
	textHash(`labels-v2\n${item.stem}\n${item.options.join('\n')}\n${item.rationale}`);

/** Returns cached or freshly requested labels for every item it could label within budget. */
export async function labelItems(items: Item[]): Promise<Map<string, Label>> {
	const labels = loadLabels();
	const pending = items.filter((item) => labels[item.id]?.hash !== itemHash(item));
	if (pending.length) {
		const client = new Anthropic({ apiKey: anthropicKey() });
		for (let start = 0; start < pending.length; start += BATCH) {
			if (spentOn(CLAUDE_HAIKU) >= LABEL_BUDGET_USD * 0.95) {
				console.warn('Label budget reached; remaining items keep heuristic labels');
				break;
			}
			const batch = pending.slice(start, start + BATCH);
			const body = batch
				.map(
					(item) =>
						`<item id="${item.id}">\n${item.stem}\n${item.options
							.map((option, index) => `${index === item.correctIndex ? '*' : '-'} ${option}`)
							.join('\n')}\nRationale: ${item.rationale}\n</item>`
				)
				.join('\n');
			const response = await client.messages.parse({
				model: CLAUDE_HAIKU,
				max_tokens: 6000,
				thinking: { type: 'disabled' },
				output_config: { effort: 'low', format: zodOutputFormat(LabelsSchema) },
				system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
				messages: [{ role: 'user', content: body }]
			});
			const usage = response.usage;
			const costUsd =
				((usage.input_tokens ?? 0) * PRICE.input +
					(usage.output_tokens ?? 0) * PRICE.output +
					(usage.cache_read_input_tokens ?? 0) * PRICE.cacheRead +
					(usage.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite) /
				1e6;
			appendFileSync(
				LEDGER_PATH,
				`${JSON.stringify({ at: new Date().toISOString(), label: 'labels', model: CLAUDE_HAIKU, inputs: batch.length, inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, costUsd })}\n`
			);
			const byId = new Map(batch.map((item) => [item.id, item]));
			for (const label of response.parsed_output?.labels ?? []) {
				const item = byId.get(label.id);
				if (!item) continue;
				labels[label.id] = { ...label, hash: itemHash(item) };
			}
			writeFileSync(LABELS_PATH, JSON.stringify(labels));
			console.log(
				`labeled ${Math.min(start + BATCH, pending.length)}/${pending.length} ($${spentOn(CLAUDE_HAIKU).toFixed(4)})`
			);
		}
	}
	const result = new Map<string, Label>();
	for (const item of items) {
		const label = labels[item.id];
		if (label?.hash === itemHash(item)) {
			const { hash: _hash, ...rest } = label;
			result.set(item.id, rest);
		}
	}
	return result;
}
