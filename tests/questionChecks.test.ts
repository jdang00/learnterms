import { expect, test } from 'bun:test';
import {
	hasRubricVocabulary,
	isFeatureGrid,
	itemWritingIssues,
	typeIssues
} from '../src/convex/questionStudio/checks';

const rationale =
	'Fibrin-platelet emboli are platelet aggregates from carotid plaque, so they look dull, elongated and highly mobile. Cholesterol emboli glisten, and calcific emboli are large, round and chalk-like, so neither matches.';
const item = {
	stem: 'Which appearance distinguishes a fibrin-platelet retinal embolus?',
	options: [
		'Dull, elongated and highly mobile',
		'Highly reflective and yellow-copper',
		'Large, round and chalk-like',
		'Glistening, elongated and mobile'
	],
	answerIndex: 0,
	rationale
};

test('a parallel item with a 40–90 word rationale passes', () => {
	expect(itemWritingIssues(item)).toEqual([]);
});

test('rubric vocabulary is caught in student-facing text', () => {
	expect(hasRubricVocabulary('Painless blurring is the closest wrong choice because…')).toBe(true);
	expect(hasRubricVocabulary('The glistening option is the near miss.')).toBe(true);
	expect(hasRubricVocabulary('Stroke is the tempting choice here.')).toBe(true);
	expect(hasRubricVocabulary('The closest vessel to the fovea is spared.')).toBe(false);
});

test('two-feature grids and both/neither sets are flagged', () => {
	expect(
		isFeatureGrid([
			"Painful Horner's syndrome with contralateral neurologic signs",
			"Painless Horner's syndrome with contralateral neurologic signs",
			"Painful Horner's syndrome with ipsilateral neurologic signs",
			"Painless Horner's syndrome with ipsilateral neurologic signs"
		])
	).toBe(true);
	expect(
		isFeatureGrid([
			'Carotid emboli are usually cholesterol, whereas cardiac emboli are usually calcific',
			'Carotid emboli are usually calcific, whereas cardiac emboli are usually cholesterol',
			'Both carotid and cardiac emboli are usually cholesterol',
			'Both carotid and cardiac emboli are usually calcific'
		])
	).toBe(true);
	expect(
		isFeatureGrid([
			'Retinal migraine',
			'Giant cell arteritis with jaw claudication',
			'Internal carotid artery dissection',
			'Angle closure glaucoma'
		])
	).toBe(false);
});

test('a conspicuously long key, all/none options and padded rationales are flagged', () => {
	const issues = itemWritingIssues({
		...item,
		options: [
			'Prompt evaluation, coordinated with cardiology, neurology, and the primary care physician',
			'Observation',
			'None of the above',
			'Referral'
		],
		rationale: `${rationale} ${'Padding words repeat the same idea. '.repeat(20)}`
	});
	expect(issues.some((issue) => issue.includes('conspicuously longer'))).toBe(true);
	expect(issues.some((issue) => issue.includes('none-of-the-above'))).toBe(true);
	expect(issues.some((issue) => issue.startsWith('Rationale is'))).toBe(true);
});

test('type screens catch a patientless Clinical stem and a vignette in Learn', () => {
	const merger =
		"Several solo physicians merge into one clinic and share responsibility for each patient's care. What improvement is most reasonably expected?";
	expect(typeIssues(merger, 'clinical')).toHaveLength(1);
	expect(
		typeIssues(
			'A 9-year-old boy has decreased vision in one eye. Examination shows leaking capillaries. Which diagnosis is most likely?',
			'clinical'
		)
	).toEqual([]);
	expect(
		typeIssues('A 40-year-old man asks about his glasses. Which lens is used?', 'learn')
	).toHaveLength(1);
	expect(
		typeIssues(
			'A child with non-febrile seizures comes to clinic. Which is contraindicated?',
			'learn'
		)
	).toEqual([]);
});

test('classification stems are flagged', () => {
	expect(
		itemWritingIssues({
			...item,
			stem: 'Which of the following is classified as a nonvascular ocular cause of transient monocular vision loss?'
		}).some((issue) => issue.includes('classified or grouped'))
	).toBe(true);
});
