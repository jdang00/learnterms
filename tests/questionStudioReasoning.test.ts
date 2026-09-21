import { describe, expect, test } from 'bun:test';
import {
	QUESTION_STUDIO_MAPPING_PROVIDER_OPTIONS,
	LEARN_DRAFTING_EFFORT,
	LEARN_MODEL_BATCH_SIZE
} from '../src/convex/questionStudio/shared';
import { questionTypeDefinitions } from '../src/convex/questionStudio/questionTypes';
describe('Question Studio effort policy', () => {
	test('uses medium reasoning in bounded Learn batches and high for the general type policy', () => {
		expect(LEARN_DRAFTING_EFFORT).toBe('medium');
		expect(LEARN_MODEL_BATCH_SIZE).toBe(2);
		expect(QUESTION_STUDIO_MAPPING_PROVIDER_OPTIONS.openai.reasoningEffort).toBe('low');
		expect(questionTypeDefinitions.learn.draftingEffort).toBe('high');
		expect(questionTypeDefinitions.clinical.draftingEffort).toBe('high');
		expect(questionTypeDefinitions.criticalThinking.draftingEffort).toBe('high');
	});
});
