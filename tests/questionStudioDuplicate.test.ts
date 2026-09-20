import { describe, expect, test } from 'bun:test';
import type { Id } from '../src/convex/_generated/dataModel';
import { scoreDuplicateRisk } from '../src/convex/questionStudio/duplicates';
import type { CandidateQuestion } from '../src/convex/questionStudio/shared';

function candidate(stem: string, correctAnswer: string, rationale: string): CandidateQuestion {
	return {
		type: 'multiple_choice',
		stem,
		options: [correctAnswer, 'Distractor A', 'Distractor B', 'Distractor C'],
		correctAnswers: [correctAnswer],
		rationale,
		reasoningOrder: 'first',
		topicId: 'chromatic-aberration',
		topicTitle: 'Chromatic aberration',
		sourcePageNumbers: [1],
		duplicateRisk: 'low',
		similarQuestionIds: [],
		metadata: {
			model: 'openai/gpt-5.6-luna',
			sourceDocumentId: 'document-id' as Id<'contentLib'>
		}
	};
}

describe('Question Studio current-run duplicate scoring', () => {
	test('rejects paraphrases that test the same calculation and answer', () => {
		const first = candidate(
			'In the Emsley model eye, what longitudinal ocular chromatic aberration is expected when total ocular power is +60 D and the Abbe value is 54.7?',
			'Approximately +1.10 D',
			'Longitudinal chromatic aberration is F divided by V, so 60 divided by 54.7 is approximately +1.10 D.'
		);
		const paraphrase = candidate(
			'Using CA = F/V, which ocular chromatic aberration should be calculated for an Emsley eye with F = +60 D and V = 54.7?',
			'Approximately +1.10 D',
			'Dividing the 60 D eye power by the 54.7 Abbe value gives a dioptric chromatic aberration near +1.10 D.'
		);

		expect(scoreDuplicateRisk(paraphrase, [], [first]).risk).toBe('high');
	});

	test('does not reject an unrelated concept merely because the answer text matches', () => {
		const first = candidate(
			'Which value is the calculated longitudinal chromatic aberration of the Emsley model eye?',
			'Approximately +1.10 D',
			'The value follows from ocular power divided by the Abbe value.'
		);
		const unrelated = candidate(
			'Which spectacle prescription best corrects the refractive error described in this clinical case?',
			'Approximately +1.10 D',
			'The prescription is selected from the measured spherical refractive error in the case.'
		);

		expect(scoreDuplicateRisk(unrelated, [], [first]).risk).toBe('low');
	});
});
