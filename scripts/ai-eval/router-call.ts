import { z } from 'zod/v4';
import { QuestionProviderError } from '../../src/convex/questionStudio/provider';
import type { QualityCall, QualityCallResult } from '../../src/convex/questionStudio/quality';

/** Benchmark-only model adapter; provider-reported cost includes the selected route. */
export async function callRouter(
	request: QualityCall,
	model: string,
	key: string
): Promise<QualityCallResult> {
	const start = Date.now();
	let measured: QualityCallResult = {
		object: null,
		latencyMs: 0,
		inputTokens: 0,
		outputTokens: 0,
		reasoningTokens: 0,
		finishReason: 'error'
	};
	try {
		const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
			method: 'POST',
			signal: AbortSignal.timeout(request.timeoutMs ?? 60000),
			headers: {
				Authorization: `Bearer ${key}`,
				'Content-Type': 'application/json',
				'HTTP-Referer': 'https://learnterms.com',
				'X-Title': 'LearnTerms development benchmark'
			},
			body: JSON.stringify({
				model,
				messages: [
					{ role: 'system', content: request.system },
					{ role: 'user', content: request.prompt }
				],
				reasoning: { effort: request.thinking },
				max_tokens: request.maxOutputTokens,
				provider: { require_parameters: true },
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
		const data = await response.json();
		const usage = data.usage,
			choice = data.choices?.[0];
		measured = {
			...measured,
			responseId: data.id,
			httpStatus: response.status,
			requestId: response.headers.get('x-request-id') ?? undefined,
			inputTokens: usage?.prompt_tokens ?? 0,
			outputTokens: usage?.completion_tokens ?? 0,
			reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens ?? 0,
			cachedInputTokens: usage?.prompt_tokens_details?.cached_tokens ?? 0,
			finishReason: choice?.finish_reason ?? 'error',
			costUsd: typeof usage?.cost === 'number' ? usage.cost : undefined,
			costEstimated: false
		};
		if (!response.ok || data.error)
			throw new Error(`OpenRouter ${response.status}: ${data.error?.message ?? 'request failed'}`);
		if (choice?.finish_reason !== 'stop')
			throw new Error(`Incomplete response: ${choice?.finish_reason}`);
		measured.object = JSON.parse(choice.message.content);
		return { ...measured, latencyMs: Date.now() - start };
	} catch (error) {
		throw new QuestionProviderError(error instanceof Error ? error.message : String(error), {
			...measured,
			latencyMs: Date.now() - start
		});
	}
}
