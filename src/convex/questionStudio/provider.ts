import { z } from 'zod/v4';
import type { QualityCall, QualityCallResult } from './quality';
import { DEFAULT_TEXT_MODEL } from './shared';

/** One accounted request, with no hidden retries. Shared by live generation and evaluation. */
export async function callQualityModel(
	request: QualityCall,
	apiKey: string
): Promise<QualityCallResult> {
	const started = Date.now();
	const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		signal: AbortSignal.timeout(120_000),
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'X-OpenRouter-Title': 'LearnTerms Question Studio'
		},
		body: JSON.stringify({
			model: DEFAULT_TEXT_MODEL,
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
	if (!response.ok || data.error)
		throw new Error(
			`Question provider failed (${response.status}): ${data.error?.message ?? 'request error'}`
		);
	const choice = data.choices?.[0];
	if (choice?.finish_reason !== 'stop')
		throw new Error(`Incomplete question response (${choice?.finish_reason ?? 'missing'})`);
	const usage = data.usage ?? {};
	return {
		object: JSON.parse(choice.message.content),
		latencyMs: Date.now() - started,
		inputTokens: usage.prompt_tokens ?? 0,
		outputTokens: usage.completion_tokens ?? 0,
		reasoningTokens: usage.completion_tokens_details?.reasoning_tokens ?? 0,
		costUsd: typeof usage.cost === 'number' ? usage.cost : undefined,
		finishReason: choice.finish_reason
	};
}
