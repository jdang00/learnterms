import { describe, expect, test } from 'bun:test';
import {
	QUESTION_STUDIO_MAPPING_PROVIDER_OPTIONS,
	anthropicProviderOptions,
	LEARN_DRAFTING_EFFORT,
	LEARN_MODEL_BATCH_SIZE
} from '../src/convex/questionStudio/shared';
import { questionTypeDefinitions } from '../src/convex/questionStudio/questionTypes';
describe('Question Studio effort policy', () => {
	test('Sonnet and Opus agent calls opt into server-side fallback; Haiku does not', () => {
		expect(anthropicProviderOptions('claude-opus-5-5', 'medium').anthropic).toMatchObject({
			fallbacks: 'default',
			anthropicBeta: ['server-side-fallback-2026-07-01']
		});
		expect(anthropicProviderOptions('claude-haiku-5-5', 'low').anthropic).not.toHaveProperty(
			'fallbacks'
		);
	});
	test('uses medium reasoning in bounded Learn batches and high for the general type policy', () => {
		expect(LEARN_DRAFTING_EFFORT).toBe('medium');
		expect(LEARN_MODEL_BATCH_SIZE).toBe(2);
		expect(QUESTION_STUDIO_MAPPING_PROVIDER_OPTIONS.anthropic).toEqual({
			thinking: { type: 'adaptive' },
			effort: 'low'
		});
		expect(questionTypeDefinitions.learn.draftingEffort).toBe('high');
		expect(questionTypeDefinitions.clinical.draftingEffort).toBe('high');
		expect(questionTypeDefinitions.criticalThinking.draftingEffort).toBe('high');
	});
});
