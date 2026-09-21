import { countTokens } from 'gpt-tokenizer/encoding/o200k_base';
import { z } from 'zod/v4';
import type { QualityCall } from './quality';

/** Include schema/message overhead and a margin for model tokenizer differences.
 * Actual provider usage is reconciled after every billable response, including failures.
 */
export function estimateQualityInputTokens(request: QualityCall): number {
	const text = `${request.system}\n${request.prompt}\n${JSON.stringify(z.toJSONSchema(request.schema))}`;
	return Math.ceil(countTokens(text, { disallowedSpecial: new Set() }) * 1.2) + 512;
}
