import { expect, test } from 'bun:test';
import {
	countBlanks,
	expectedAnswerCount,
	inferQuestionType,
	parsePastedQuestion,
	plainTextToHtml,
	splitInlineAnswers
} from '../src/lib/utils/questionAuthoring';

test('infers the question type from the stem', () => {
	expect(inferQuestionType('Match each nerve with its muscle')?.type).toBe('matching');
	expect(inferQuestionType('Matching: drugs and classes')?.reason).toBe("Starts with 'Matching'");
	expect(inferQuestionType('Matchbox')).toBeNull();
	expect(inferQuestionType('The ___ is avascular.')?.type).toBe('fill_in_the_blank');
	expect(inferQuestionType('True or false: the lens is avascular')?.type).toBe('true_false');
	expect(inferQuestionType('T/F The lens is avascular')?.type).toBe('true_false');
	expect(inferQuestionType('Select all that apply to glaucoma')?.type).toBe('multiple_choice');
	expect(inferQuestionType('Explain why myopes see well up close')?.type).toBe('free_response');
	expect(inferQuestionType('Which nerve innervates the lateral rectus?')).toBeNull();
});

test('counts blanks and requested answers', () => {
	expect(countBlanks('The ___ and the ____ are [blank]')).toBe(3);
	expect(expectedAnswerCount('Choose TWO of the following')).toBe(2);
	expect(expectedAnswerCount('Select 3 findings')).toBe(3);
	expect(expectedAnswerCount('Which two drugs')).toBe(2);
	expect(expectedAnswerCount('Select the best answer')).toBeNull();
});

test('splits inline answers', () => {
	expect(splitInlineAnswers(' cornea | the cornea |')).toEqual(['cornea', 'the cornea']);
});

test('splits a pasted multiple choice question', () => {
	const parsed = parsePastedQuestion(
		[
			'12. Which nerve innervates the lateral rectus?',
			'A. Oculomotor',
			'B) Trochlear',
			'(c) Abducens',
			'D. Facial',
			'Answer: C',
			'Rationale: CN VI abducts the eye.',
			'LR6SO4.'
		].join('\n')
	);
	expect(parsed).toEqual({
		type: 'multiple_choice',
		stem: 'Which nerve innervates the lateral rectus?',
		options: ['Oculomotor', 'Trochlear', 'Abducens', 'Facial'],
		correct: [2],
		fitbAnswers: [],
		pairs: [],
		rationale: 'CN VI abducts the eye.\nLR6SO4.'
	});
});

test('reads starred options, multi-letter keys and wrapped options', () => {
	const starred = parsePastedQuestion('Pick one\na. first\n*b. second\nc. third *');
	expect(starred?.correct).toEqual([1, 2]);

	const multi = parsePastedQuestion(
		'Select all that apply\nA. one\nB. two\ncontinued\nC. three\nCorrect answer: A and C'
	);
	expect(multi?.options).toEqual(['one', 'two continued', 'three']);
	expect(multi?.correct).toEqual([0, 2]);

	expect(parsePastedQuestion('Q\nA. one\nB. two\nAnswer: B. two')?.correct).toEqual([1]);
});

test('does not treat a stem starting with "A" as an option', () => {
	const parsed = parsePastedQuestion('A patient presents with ptosis.\nA. CN III\nB. CN IV');
	expect(parsed?.stem).toBe('A patient presents with ptosis.');
	expect(parsed?.options).toEqual(['CN III', 'CN IV']);
});

test('recognizes true/false, fill in the blank and matching pastes', () => {
	const tf = parsePastedQuestion('True or false: the lens is avascular.\nAnswer: True');
	expect(tf?.type).toBe('true_false');
	expect(tf?.stem).toBe('the lens is avascular.');
	expect(tf?.correct).toEqual([0]);

	const tfOptions = parsePastedQuestion('The lens is avascular.\nA. True\nB. False\nAnswer: B');
	expect(tfOptions?.type).toBe('true_false');
	expect(tfOptions?.correct).toEqual([1]);

	const fitb = parsePastedQuestion('The ___ is avascular.\nAnswer: cornea; the cornea');
	expect(fitb?.type).toBe('fill_in_the_blank');
	expect(fitb?.fitbAnswers).toEqual(['cornea', 'the cornea']);

	const tabs = parsePastedQuestion('CN III\tptosis\nCN IV\tvertical diplopia');
	expect(tabs?.type).toBe('matching');
	expect(tabs?.stem).toBe('Match each item with its pair.');
	expect(tabs?.pairs).toEqual([
		{ prompt: 'CN III', answer: 'ptosis' },
		{ prompt: 'CN IV', answer: 'vertical diplopia' }
	]);

	const arrows = parsePastedQuestion(
		'Match the drug to its class\n1. Timolol -> a. Beta blocker\n2. Latanoprost → b. PGA'
	);
	expect(arrows?.pairs).toEqual([
		{ prompt: 'Timolol', answer: 'Beta blocker' },
		{ prompt: 'Latanoprost', answer: 'PGA' }
	]);
});

test('leaves unstructured text alone', () => {
	expect(parsePastedQuestion('Just a sentence about the cornea.')).toBeNull();
	expect(parsePastedQuestion('Line one\nLine two = something')).toBeNull();
});

test('converts plain text to escaped paragraphs', () => {
	expect(plainTextToHtml('a < b\n\nc')).toBe('<p>a &lt; b</p><p>c</p>');
});
