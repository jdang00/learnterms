import { expect, test } from 'bun:test';
import {
	normalizeSelectedPages,
	selectedSourcePages,
	planPageContext
} from '../src/convex/questionStudio/pageSelection';
import { evidenceForObjective, structuralIssues } from '../src/convex/questionStudio/quality';
import type { StoredMarkdownPage, TopicMapItem } from '../src/convex/questionStudio/shared';

const pages: StoredMarkdownPage[] = [1, 2, 3, 4, 5].map((pageNumber) => ({
	pageNumber,
	text: `Only page ${pageNumber} contains fact number ${pageNumber}.`
}));
const topic: TopicMapItem = {
	topicId: 'planned',
	title: 'Concept',
	summary: 'Selected concept',
	pageNumbers: [2, 3, 5],
	learningObjectives: ['Explain the selected concept'],
	keyTerms: [],
	estimatedQuestionCapacity: 2
};

test('nonadjacent selection excludes intervening pages and rejects missing or invalid pages', () => {
	expect(selectedSourcePages(pages, [5, 2]).map((p) => p.pageNumber)).toEqual([2, 5]);
	for (const invalid of [[], [0], [2.5], [2, 2], [151], [NaN]])
		expect(() => normalizeSelectedPages(invalid)).toThrow();
	expect(() => selectedSourcePages(pages, [6])).toThrow('no longer available');
});

test('page planning sees only selected text, drops invented pages, and isolates worker evidence', async () => {
	const received: number[][] = [];
	const planned = await planPageContext(pages, [2, 5], async (group) => {
		received.push(group.map((p) => p.pageNumber));
		expect(group.map((p) => p.text).join(' ')).not.toContain('fact number 3');
		return [topic, { ...topic, pageNumbers: [3] }];
	});
	expect(received).toEqual([[2, 5]]);
	expect(planned).toHaveLength(1);
	expect(planned[0].pageNumbers).toEqual([2, 5]);
	const evidence = evidenceForObjective(
		selectedSourcePages(pages, [2, 5]),
		planned[0].pageNumbers,
		'concept',
		'notes.pdf'
	);
	expect(evidence.map((e) => e.pageNumber)).toEqual([2, 5]);
	const issues = structuralIssues(
		{
			slotId: 'slot',
			stem: 'Which fact is supported?',
			options: ['one', 'two', 'three', 'four'],
			answerIndex: 1,
			rationale: 'The chosen value matches the concept.',
			evidence: [{ citationId: 'p3c0', quote: 'Only page 3 contains fact number 3.' }],
			reasoningSkill: 'Recall a fact',
			distractorReasons: ['wrong value one', 'wrong value three', 'wrong value four']
		},
		{
			slotId: 'slot',
			topicId: planned[0].topicId,
			topicTitle: 'Concept',
			objective: 'Recall',
			questionType: 'learn',
			evidence
		}
	);
	expect(issues.join(' ')).toContain('not in the supplied excerpt');
});

test('large page selections are planned in bounded groups without dropping later pages', async () => {
	const large = pages.map((p) => ({ ...p, text: p.text.repeat(650) }));
	const received: number[] = [];
	await planPageContext(large, [1, 3, 5], async (group) => {
		received.push(...group.map((p) => p.pageNumber));
		return [];
	});
	expect(received).toEqual([1, 3, 5]);
});
