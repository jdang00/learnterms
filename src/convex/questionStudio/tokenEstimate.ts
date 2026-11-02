import { countTokens } from 'gpt-tokenizer/encoding/o200k_base';
import { z } from 'zod/v4';
import type { QualityCall } from './quality';

/** Include schema/message overhead and a margin for model tokenizer differences.
 * Actual provider usage is reconciled after every billable response, including failures.
 */
export function estimateQualityInputTokens(request: QualityCall): number {
	const text = `${request.system}\n${request.context ?? ''}\n${request.prompt}\n${JSON.stringify(z.toJSONSchema(request.schema))}`;
	return Math.ceil(countTokens(text, { disallowedSpecial: new Set() }) * 1.2) + 512;
}

/** Agent turns: conversation text plus a margin for tool schemas and tokenizer differences. */
export function estimateTextTokens(text: string): number {
	return Math.ceil(countTokens(text, { disallowedSpecial: new Set() }) * 1.2) + 3000;
}
