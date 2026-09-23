import { z } from 'zod/v4';
import type { QualityCall, QualityCallResult } from './quality';
import { TEXT_MODEL } from '../aiModels';

// Standard GPT-6 Luna pricing, verified 2026-09-22. An estimate, not an invoice.
// https://developers.openai.com/api/docs/models/gpt-6-luna
export function estimateLunaCost(
	input: number,
	output: number,
	cached = 0,
	written = 0,
	serviceTier = 'default'
) {
	const longContext = input > 272_000;
	return (
		((serviceTier === 'priority' || serviceTier === 'fast' ? 2 : 1) *
			((Math.max(0, input - cached - written) * 0.1 + cached * 0.01 + written * 0.125) *
				(longContext ? 2 : 1) +
				output * 0.5 * (longContext ? 1.5 : 1))) /
		1_000_000
	);
}

export class QuestionProviderError extends Error {
	constructor(
		message: string,
		readonly usage: QualityCallResult
	) {
		super(message);
	}
}

/** One accounted request, with no hidden retries. Shared by live generation and evaluation. */
export async function callQualityModel(
	request: QualityCall,
	apiKey: string
): Promise<QualityCallResult> {
	const started = Date.now();
	let measured: QualityCallResult = {
		object: null,
		latencyMs: 0,
		inputTokens: 0,
		outputTokens: 0,
		reasoningTokens: 0,
		finishReason: 'error'
	};
	try {
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			signal: AbortSignal.timeout(Math.max(1, Math.floor(request.timeoutMs ?? 120_000))),
			headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: TEXT_MODEL,
				service_tier: 'default',
				store: true,
				metadata: {
					product: 'LearnTerms',
					feature: 'question_studio',
					stage: request.stage,
					...request.metadata
				},
				...(request.sessionId ? { prompt_cache_key: request.sessionId } : {}),
				messages: [
					{
						role: 'system',
						content: [
							{ type: 'text', text: request.system, prompt_cache_breakpoint: { mode: 'explicit' } }
						]
					},
					{ role: 'user', content: request.prompt }
				],
				reasoning_effort: request.thinking,
				max_completion_tokens: request.maxOutputTokens,
				response_format: {
					type: 'json_schema',
					json_schema: {
						name: 'question_quality',
						strict: true,
						schema: z.toJSONSchema(request.schema)
					}
				}
			})
		});
		measured.requestId = response.headers.get('x-request-id') ?? undefined;
		measured.httpStatus = response.status;
		const data = await response.json();
		const usage = data.usage;
		const choice = data.choices?.[0];
		measured = {
			...measured,
			responseId: data.id,
			serviceTier: data.service_tier ?? 'default',
			inputTokens: usage?.prompt_tokens ?? 0,
			outputTokens: usage?.completion_tokens ?? 0,
			reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens ?? 0,
			cachedInputTokens: usage?.prompt_tokens_details?.cached_tokens ?? 0,
			cacheWriteTokens: usage?.prompt_tokens_details?.cache_write_tokens ?? 0,
			finishReason: choice?.finish_reason ?? 'error'
		};
		if (usage) {
			measured.costUsd = estimateLunaCost(
				measured.inputTokens,
				measured.outputTokens,
				measured.cachedInputTokens,
				measured.cacheWriteTokens,
				measured.serviceTier
			);
			measured.costEstimated = true;
		}
		if (!response.ok || data.error)
			throw new Error(
				`OpenAI request failed (${response.status}): ${data.error?.code ?? data.error?.type ?? 'request_error'}`
			);
		if (choice?.finish_reason !== 'stop')
			throw new Error(`Incomplete question response (${choice?.finish_reason ?? 'missing'})`);
		measured.object = JSON.parse(choice.message.content);
		return { ...measured, latencyMs: Date.now() - started };
	} catch (error) {
		const timedOut = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
		throw new QuestionProviderError(
			timedOut
				? 'Question generation stopped at its time budget.'
				: error instanceof Error
					? error.message
					: 'OpenAI request failed',
			{
				...measured,
				...(timedOut ? { finishReason: 'timeout' } : {}),
				latencyMs: Date.now() - started
			}
		);
	}
}
