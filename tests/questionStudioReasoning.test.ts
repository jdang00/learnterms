import { describe, expect, test } from 'bun:test';
import { QUESTION_STUDIO_MAPPING_PROVIDER_OPTIONS } from '../src/convex/questionStudio/shared';
import { questionTypeDefinitions } from '../src/convex/questionStudio/questionTypes';
describe('Question Studio effort policy', () => {
	test('keeps mapping inexpensive and Learn focused', () => {
		expect(QUESTION_STUDIO_MAPPING_PROVIDER_OPTIONS.openai.reasoningEffort).toBe('low');
		expect(questionTypeDefinitions.learn.draftingEffort).toBe('low');
		expect(questionTypeDefinitions.clinical.draftingEffort).toBe('medium');
		expect(questionTypeDefinitions.criticalThinking.draftingEffort).toBe('medium');
	});
});
