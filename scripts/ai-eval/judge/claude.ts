// One accounted Claude call for the judge and probes, with its own ledger under tmp/ai-eval-judge.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { renameSync } from 'node:fs';
import type { z } from 'zod/v4';
import { lockEvaluationBudget } from '../budget';
import {
	estimateClaudeCost,
	measureClaudeUsage
} from '../../../src/convex/questionStudio/provider';
import { CLAUDE_HAIKU, CLAUDE_OPUS } from '../../../src/convex/aiModels';

export const JUDGE_ROOT = 'tmp/ai-eval-judge';
export const JUDGE_MODEL = CLAUDE_OPUS;
export const PROBE_MODEL = CLAUDE_HAIKU;
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

type Entry = {
	stage: string;
	model: string;
	effort: string;
	maxOutputTokens: number;
	reservedUsd: number;
	actualUsd?: number;
	status?: 'completed' | 'failed' | 'failed_reserved';
	at: string;
};

type Session = {
	key: string;
	totalCeiling: number;
	runCeiling: number;
	startSpend: number;
	ledger: Entry[];
	ledgerPath: string;
};
let session: Session | undefined;
let writes = Promise.resolve();

/** Locks the judge budget root and loads the key. Call once from a CLI before any judge or probe.
 * `totalUsd` caps the whole ledger (every run so far); `runUsd` caps this process alone. */
export async function startJudgeSession({
	totalUsd = Infinity,
	runUsd = 5
}: { totalUsd?: number; runUsd?: number } = {}) {
	if (session) return session;
	lockEvaluationBudget(JUDGE_ROOT);
	const proc = Bun.spawn(['bunx', 'convex', 'env', 'get', 'ANTHROPIC_API_KEY'], {
		stdout: 'pipe',
		stderr: 'pipe'
	});
	const key = (await new Response(proc.stdout).text()).trim();
	if ((await proc.exited) || !key) throw new Error('Development Anthropic key unavailable');
	const ledgerPath = `${JUDGE_ROOT}/anthropic-ledger.json`;
	const file = Bun.file(ledgerPath);
	const ledger: Entry[] = (await file.exists()) ? await file.json() : [];
	const startSpend = ledger.reduce((sum, e) => sum + (e.actualUsd ?? e.reservedUsd), 0);
	session = { key, totalCeiling: totalUsd, runCeiling: runUsd, startSpend, ledger, ledgerPath };
	return session;
}

export const judgeSpend = () =>
	session?.ledger.reduce((sum, e) => sum + (e.actualUsd ?? e.reservedUsd), 0) ?? 0;

const save = () =>
	(writes = writes.then(async () => {
		if (!session) return;
		await Bun.write(`${session.ledgerPath}.tmp`, JSON.stringify(session.ledger, null, 2));
		renameSync(`${session.ledgerPath}.tmp`, session.ledgerPath);
	}));

export type ClaudeCall<T extends z.ZodType> = {
	stage: string;
	model: string;
	effort: 'low' | 'medium' | 'high';
	system: string;
	prompt: string;
	schema: T;
	maxOutputTokens: number;
	timeoutMs?: number;
};

/** Reserves the worst case against the ceiling, calls once (no retries), then books the actual cost. */
export async function callClaude<T extends z.ZodType>(
	call: ClaudeCall<T>
): Promise<{ object: z.infer<T>; costUsd: number }> {
	if (!session) throw new Error('startJudgeSession() first');
	const s = session;
	// Characters bound tokens for English text; price the input as a cold cache write.
	const reservedUsd = estimateClaudeCost(call.model, {
		input: 0,
		cacheWrite: call.system.length + call.prompt.length + 4000,
		output: call.maxOutputTokens
	});
	if (judgeSpend() + reservedUsd > s.totalCeiling)
		throw new Error(
			`$${s.totalCeiling} judge ledger ceiling reached ($${judgeSpend().toFixed(4)})`
		);
	if (judgeSpend() - s.startSpend + reservedUsd > s.runCeiling)
		throw new Error(`$${s.runCeiling} per-run judge ceiling reached`);
	const entry: Entry = {
		stage: call.stage,
		model: call.model,
		effort: call.effort,
		maxOutputTokens: call.maxOutputTokens,
		reservedUsd,
		at: new Date().toISOString()
	};
	s.ledger.push(entry);
	await save();
	try {
		const client = new Anthropic({ apiKey: s.key, maxRetries: 0 });
		const format = betaZodOutputFormat(call.schema);
		const data = await client.beta.messages.create(
			{
				model: call.model,
				max_tokens: call.maxOutputTokens,
				// The rubric is identical on every call; Opus 5.5 reads it back at 0.05x.
				system: [{ type: 'text', text: call.system, cache_control: { type: 'ephemeral' } }],
				messages: [{ role: 'user', content: call.prompt }],
				thinking: { type: 'adaptive' },
				output_config: {
					effort: call.effort,
					format: { type: 'json_schema', schema: format.schema }
				},
				...(call.model === CLAUDE_HAIKU
					? {}
					: { betas: [FALLBACK_BETA], fallbacks: 'default' as const })
			},
			{ signal: AbortSignal.timeout(call.timeoutMs ?? 300_000) }
		);
		const costUsd = measureClaudeUsage(call.model, data.usage).costUsd;
		entry.actualUsd = costUsd;
		if (data.stop_reason !== 'end_turn')
			throw new Error(`${call.stage}: incomplete response (${data.stop_reason ?? 'missing'})`);
		const text = data.content.flatMap((block) => (block.type === 'text' ? [block.text] : []));
		const object = format.parse(text.join('')) as z.infer<T>;
		entry.status = 'completed';
		return { object, costUsd };
	} catch (error) {
		entry.status = entry.actualUsd === undefined ? 'failed_reserved' : 'failed';
		throw error;
	} finally {
		await save();
	}
}

/** Runs tasks with bounded concurrency, keeping order; failures become `undefined` plus a log line. */
export async function pool<T, R>(
	items: T[],
	limit: number,
	task: (item: T, index: number) => Promise<R>
): Promise<Array<R | undefined>> {
	const results: Array<R | undefined> = new Array(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const index = next++;
			try {
				results[index] = await task(items[index], index);
			} catch (error) {
				console.error(`  task ${index} failed: ${error instanceof Error ? error.message : error}`);
			}
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

/** Message Batches: every token at half price, results within minutes to hours. Same accounting
 * as callClaude, one ledger entry per request; failures come back as undefined. */
export async function callClaudeBatch<T extends z.ZodType>(
	calls: ClaudeCall<T>[],
	{ pollMs = 15_000 }: { pollMs?: number } = {}
): Promise<Array<{ object: z.infer<T>; costUsd: number } | undefined>> {
	if (!session) throw new Error('startJudgeSession() first');
	const s = session;
	const entries = calls.map((call) => ({
		stage: `${call.stage}_batch`,
		model: call.model,
		effort: call.effort,
		maxOutputTokens: call.maxOutputTokens,
		reservedUsd:
			BATCH_DISCOUNT *
			estimateClaudeCost(call.model, {
				input: 0,
				cacheWrite: call.system.length + call.prompt.length + 4000,
				output: call.maxOutputTokens
			}),
		at: new Date().toISOString()
	})) as Entry[];
	const reserved = entries.reduce((sum, e) => sum + e.reservedUsd, 0);
	if (judgeSpend() + reserved > s.totalCeiling)
		throw new Error(
			`$${s.totalCeiling} judge ledger ceiling reached ($${judgeSpend().toFixed(4)})`
		);
	if (judgeSpend() - s.startSpend + reserved > s.runCeiling)
		throw new Error(`$${s.runCeiling} per-run judge ceiling reached`);
	s.ledger.push(...entries);
	await save();
	const client = new Anthropic({ apiKey: s.key, maxRetries: 2 });
	const formats = calls.map((call) => betaZodOutputFormat(call.schema));
	const started = Date.now();
	const batch = await client.beta.messages.batches.create({
		requests: calls.map((call, i) => ({
			custom_id: `r${i}`,
			params: {
				model: call.model,
				max_tokens: call.maxOutputTokens,
				system: [{ type: 'text', text: call.system, cache_control: { type: 'ephemeral' } }],
				messages: [{ role: 'user', content: call.prompt }],
				thinking: { type: 'adaptive' },
				output_config: {
					effort: call.effort,
					format: { type: 'json_schema', schema: formats[i].schema }
				}
			}
		}))
	});
	let status = batch;
	while (status.processing_status !== 'ended') {
		await new Promise((resolve) => setTimeout(resolve, pollMs));
		status = await client.beta.messages.batches.retrieve(batch.id);
		console.log(
			`  batch ${batch.id}: ${status.request_counts.succeeded + status.request_counts.errored}/${calls.length} done after ${Math.round((Date.now() - started) / 1000)}s`
		);
	}
	console.log(`  batch ended after ${Math.round((Date.now() - started) / 1000)}s`);
	const results: Array<{ object: z.infer<T>; costUsd: number } | undefined> = calls.map(
		() => undefined
	);
	for await (const result of await client.beta.messages.batches.results(batch.id)) {
		const i = Number(result.custom_id.slice(1));
		const entry = entries[i];
		if (result.result.type !== 'succeeded') {
			entry.actualUsd = 0;
			entry.status = 'failed';
			console.error(`  batch request ${i} ${result.result.type}`);
			continue;
		}
		const message = result.result.message;
		const costUsd = BATCH_DISCOUNT * measureClaudeUsage(calls[i].model, message.usage).costUsd;
		entry.actualUsd = costUsd;
		try {
			if (message.stop_reason !== 'end_turn')
				throw new Error(`incomplete response (${message.stop_reason ?? 'missing'})`);
			const text = message.content.flatMap((block) => (block.type === 'text' ? [block.text] : []));
			results[i] = { object: formats[i].parse(text.join('')) as z.infer<T>, costUsd };
			entry.status = 'completed';
		} catch (error) {
			entry.status = 'failed';
			console.error(`  batch request ${i}: ${error instanceof Error ? error.message : error}`);
		}
	}
	// Requests that never reported back keep their reservation.
	await save();
	return results;
}

const BATCH_DISCOUNT = 0.5;
