import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type {
	BetaMessage,
	BetaMessageParam,
	BetaTool,
	BetaUsage
} from '@anthropic-ai/sdk/resources/beta/messages/messages';
import type { QualityCall, QualityCallResult } from './quality';
import { CLAUDE_HAIKU, STAGE_MODELS } from '../aiModels';
import { SERVER_SIDE_FALLBACK_BETA } from './shared';

// Standard API rates per million tokens, verified 2026-10-28. An estimate, not an invoice.
// https://platform.claude.com/docs/en/about-claude/pricing
export const PRICING_DATE = '2026-10-28';
type Rate = { input: number; output: number; cacheRead: number };
const PRICES: Record<string, Rate & { above100k?: Rate }> = {
	'claude-haiku-5-5': {
		input: 0.1,
		output: 0.5,
		cacheRead: 0.01,
		above100k: { input: 0.5, output: 2.5, cacheRead: 0.05 }
	},
	'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2 },
	'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
	// Possible server-side fallback targets.
	'claude-sonnet-5': { input: 2, output: 10, cacheRead: 0.2 },
	'claude-opus-5': { input: 5, output: 25, cacheRead: 0.5 },
	'claude-opus-4-8': { input: 5, output: 25, cacheRead: 0.5 }
};
const CACHE_WRITE_MULTIPLIER = 1.25;

export type ClaudeTokenUsage = {
	/** Uncached input only. */
	input: number;
	output: number;
	cacheRead?: number;
	cacheWrite?: number;
};

/** Unknown models are priced at the most expensive listed rate, never as free. */
export function estimateClaudeCost(model: string, usage: ClaudeTokenUsage) {
	const { input, output, cacheRead = 0, cacheWrite = 0 } = usage;
	const listed = PRICES[model] ?? PRICES['claude-opus-5'];
	const rate =
		listed.above100k && input + cacheRead + cacheWrite > 100_000 ? listed.above100k : listed;
	return (
		(input * rate.input +
			cacheWrite * rate.input * CACHE_WRITE_MULTIPLIER +
			cacheRead * rate.cacheRead +
			output * rate.output) /
		1_000_000
	);
}

/** AI SDK usage from the agent paths. Haiku has no fallback, so one attempt covers it. */
export function estimateAiSdkCost(
	model: string,
	usage: {
		inputTokens?: number;
		outputTokens?: number;
		inputTokenDetails?: {
			noCacheTokens?: number;
			cacheReadTokens?: number;
			cacheWriteTokens?: number;
		};
	}
) {
	if (usage.inputTokens === undefined || usage.outputTokens === undefined) return undefined;
	const cacheRead = usage.inputTokenDetails?.cacheReadTokens ?? 0;
	const cacheWrite = usage.inputTokenDetails?.cacheWriteTokens ?? 0;
	return estimateClaudeCost(model, {
		input: usage.inputTokenDetails?.noCacheTokens ?? usage.inputTokens - cacheRead - cacheWrite,
		output: usage.outputTokens,
		cacheRead,
		cacheWrite
	});
}

/** Sum every iteration when another model took part (a fallback or an advisor), each at its own
 * model's rate; top-level usage covers only the executor's final attempt. */
export function measureClaudeUsage(model: string, usage: BetaUsage) {
	const attempts = usage.iterations?.some((entry) => entry.type !== 'message')
		? usage.iterations.map((entry) => ({
				...entry,
				model: ('model' in entry ? entry.model : undefined) ?? model
			}))
		: [{ ...usage, model }];
	let costUsd = 0;
	let input = 0;
	let cacheRead = 0;
	let cacheWrite = 0;
	let output = 0;
	for (const attempt of attempts) {
		const tokens = {
			input: attempt.input_tokens,
			output: attempt.output_tokens,
			cacheRead: attempt.cache_read_input_tokens ?? 0,
			cacheWrite: attempt.cache_creation_input_tokens ?? 0
		};
		costUsd += estimateClaudeCost(String(attempt.model), tokens);
		input += tokens.input;
		cacheRead += tokens.cacheRead;
		cacheWrite += tokens.cacheWrite;
		output += tokens.output;
	}
	return {
		inputTokens: input + cacheRead + cacheWrite,
		outputTokens: output,
		reasoningTokens: usage.output_tokens_details?.thinking_tokens ?? 0,
		cachedInputTokens: cacheRead,
		cacheWriteTokens: cacheWrite,
		costUsd
	};
}

const ADVISOR_BETA = 'advisor-tool-2026-03-01';

function betaOptions(model: string, advisor?: string) {
	const fallback = supportsServerFallback(model);
	const betas = [
		...(fallback ? [SERVER_SIDE_FALLBACK_BETA] : []),
		...(advisor ? [ADVISOR_BETA] : [])
	];
	return {
		...(betas.length ? { betas } : {}),
		...(fallback ? { fallbacks: 'default' as const } : {})
	};
}

/** Haiku has no server-side fallback; Sonnet and Opus can reroute safeguard declines. */
export function supportsServerFallback(model: string) {
	return model !== CLAUDE_HAIKU;
}

export class QuestionProviderError extends Error {
	constructor(
		message: string,
		readonly usage: QualityCallResult
	) {
		super(message);
	}
}

/** Structured outputs don't enforce maxItems or maxLength. Clip diagnostic text and citation
 * lists to the schema bounds instead of failing the whole call; content fields still validate. */
export function clipToSchemaBounds(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(clipToSchemaBounds);
	if (!value || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value).map(([key, entry]) => {
			if (key === 'reasons' && Array.isArray(entry))
				return [key, entry.slice(0, 5).map((reason) => clipText(reason, 500))];
			if (key === 'reason') return [key, clipText(entry, 500)];
			if (key === 'evidence' && Array.isArray(entry))
				return [key, entry.slice(0, 4).map(clipToSchemaBounds)];
			return [key, clipToSchemaBounds(entry)];
		})
	);
}
const clipText = (value: unknown, max: number) =>
	typeof value === 'string' ? value.slice(0, max) : value;

function defaultModel(stage: QualityCall['stage']) {
	return stage === 'draft' || stage === 'repair' ? STAGE_MODELS.draft : STAGE_MODELS.review;
}

/** One accounted request, with no hidden retries. Shared by live generation and evaluation. */
export async function callQualityModel(
	request: QualityCall,
	apiKey: string
): Promise<QualityCallResult> {
	const started = Date.now();
	const model = request.model ?? defaultModel(request.stage);
	let measured: QualityCallResult = {
		object: null,
		model,
		latencyMs: 0,
		inputTokens: 0,
		outputTokens: 0,
		reasoningTokens: 0,
		finishReason: 'error'
	};
	try {
		const client = new Anthropic({ apiKey, maxRetries: 0 });
		const format = betaZodOutputFormat(request.schema);
		const { data, request_id, response } = await client.beta.messages
			.create(
				{
					model,
					max_tokens: request.maxOutputTokens,
					// Instructions and schema are identical across workers, documents and users, so they
					// lead and always cache; the source follows as its own block.
					system: [
						{ type: 'text', text: request.system, cache_control: { type: 'ephemeral' } },
						...(request.context
							? [
									{
										type: 'text' as const,
										text: request.context,
										...(request.cache === false
											? {}
											: { cache_control: { type: 'ephemeral' as const } })
									}
								]
							: [])
					],
					messages: [{ role: 'user', content: request.prompt }],
					thinking: { type: 'adaptive' },
					output_config: {
						effort: request.thinking,
						format: { type: 'json_schema', schema: format.schema }
					},
					...(request.advisor
						? {
								tools: [
									{
										type: 'advisor_20260301' as const,
										name: 'advisor' as const,
										model: request.advisor,
										max_uses: 1,
										max_tokens: 3000
									}
								]
							}
						: {}),
					...betaOptions(model, request.advisor)
				},
				{ signal: AbortSignal.timeout(Math.max(1, Math.floor(request.timeoutMs ?? 120_000))) }
			)
			.withResponse();
		measured = {
			...measured,
			...measureClaudeUsage(model, data.usage),
			model: data.model,
			requestId: request_id ?? undefined,
			responseId: data.id,
			httpStatus: response.status,
			serviceTier: data.usage.service_tier ?? 'standard',
			finishReason: data.stop_reason ?? 'missing',
			costEstimated: true
		};
		if (data.stop_reason === 'refusal')
			throw new Error(
				`The model declined this request (${data.stop_details?.category ?? 'refusal'}).`
			);
		if (data.stop_reason !== 'end_turn')
			throw new Error(`Incomplete question response (${data.stop_reason ?? 'missing'})`);
		const text = data.content.flatMap((block) => (block.type === 'text' ? [block.text] : []));
		measured.object = format.parse(JSON.stringify(clipToSchemaBounds(JSON.parse(text.join('')))));
		return { ...measured, latencyMs: Date.now() - started };
	} catch (error) {
		const timedOut =
			error instanceof Anthropic.APIUserAbortError ||
			error instanceof Anthropic.APIConnectionTimeoutError;
		if (error instanceof Anthropic.APIError && !timedOut) {
			measured.requestId = error.requestID ?? undefined;
			measured.httpStatus = error.status;
		}
		throw new QuestionProviderError(
			timedOut
				? 'Question generation stopped at its time budget.'
				: error instanceof Anthropic.APIError
					? `Anthropic request failed (${error.type ?? error.name}): ${error.message.slice(0, 240)}`
					: error instanceof Error
						? error.message
						: 'Anthropic request failed',
			{
				...measured,
				...(timedOut ? { finishReason: 'timeout' } : {}),
				latencyMs: Date.now() - started
			}
		);
	}
}

export type AgentTurnRequest = {
	model: string;
	system: string;
	messages: BetaMessageParam[];
	tools: BetaTool[];
	effort: QualityCall['thinking'];
	maxOutputTokens: number;
	timeoutMs?: number;
	stage: string;
};
export type AgentTurnResult = QualityCallResult & { message: BetaMessage };

/** One accounted agent turn. Returns refusals and max_tokens stops to the loop instead of throwing. */
export async function callAgentTurn(
	request: AgentTurnRequest,
	apiKey: string
): Promise<AgentTurnResult> {
	const started = Date.now();
	let measured: QualityCallResult = {
		object: null,
		model: request.model,
		latencyMs: 0,
		inputTokens: 0,
		outputTokens: 0,
		reasoningTokens: 0,
		finishReason: 'error'
	};
	try {
		const client = new Anthropic({ apiKey, maxRetries: 0 });
		const { data, request_id, response } = await client.beta.messages
			.create(
				{
					model: request.model,
					max_tokens: request.maxOutputTokens,
					system: [{ type: 'text', text: request.system, cache_control: { type: 'ephemeral' } }],
					// Caches the growing conversation, so each turn reads the previous turns from cache.
					cache_control: { type: 'ephemeral' },
					messages: request.messages,
					tools: request.tools,
					thinking: { type: 'adaptive' },
					output_config: { effort: request.effort },
					...betaOptions(request.model)
				},
				{ signal: AbortSignal.timeout(Math.max(1, Math.floor(request.timeoutMs ?? 180_000))) }
			)
			.withResponse();
		measured = {
			...measured,
			...measureClaudeUsage(request.model, data.usage),
			model: data.model,
			requestId: request_id ?? undefined,
			responseId: data.id,
			httpStatus: response.status,
			serviceTier: data.usage.service_tier ?? 'standard',
			finishReason: data.stop_reason ?? 'missing',
			costEstimated: true
		};
		return { ...measured, message: data, latencyMs: Date.now() - started };
	} catch (error) {
		const timedOut =
			error instanceof Anthropic.APIUserAbortError ||
			error instanceof Anthropic.APIConnectionTimeoutError;
		if (error instanceof Anthropic.APIError && !timedOut) {
			measured.requestId = error.requestID ?? undefined;
			measured.httpStatus = error.status;
		}
		throw new QuestionProviderError(
			timedOut
				? 'Question agent stopped at its time budget.'
				: error instanceof Anthropic.APIError
					? `Anthropic request failed (${error.type ?? error.name}): ${error.message.slice(0, 240)}`
					: error instanceof Error
						? error.message
						: 'Anthropic request failed',
			{
				...measured,
				...(timedOut ? { finishReason: 'timeout' } : {}),
				latencyMs: Date.now() - started
			}
		);
	}
}
