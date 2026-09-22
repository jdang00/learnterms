import { describe, expect, test } from 'bun:test';
import {
	answerStatus,
	summarizeModule,
	type GradableQuestion
} from '../src/lib/utils/moduleCompletion';
import type { Id } from '../src/convex/_generated/dataModel';
const question = (
	id: string,
	type = 'multiple_choice',
	correctAnswers = ['a'],
	options = [
		{ id: 'a', text: 'Alpha' },
		{ id: 'b', text: 'Beta' }
	]
): GradableQuestion => ({ _id: id as Id<'question'>, type, correctAnswers, options });

const checked = (questionId: string, latestCorrect: boolean, masteredAt?: number) => ({
	questionId,
	latestCorrect,
	checkedAt: 1,
	cleanRecallCount: masteredAt ? 2 : 0,
	masteredAt
});

describe('module completion and mastery', () => {
	test('completion is distinct from correctness, counts only current questions', () => {
		const questions = [question('one'), question('two'), question('three')];
		expect(
			summarizeModule(questions, {
				one: checked('one', true),
				two: checked('two', false),
				old: checked('old', true)
			})
		).toMatchObject({
			total: 3,
			correct: 1,
			incorrect: 1,
			unanswered: 1,
			completion: 67,
			mastery: 0,
			isComplete: false,
			isMastered: false
		});
		expect(
			summarizeModule(questions, {
				one: checked('one', true),
				two: checked('two', false),
				three: checked('three', true)
			})
		).toMatchObject({
			isComplete: true,
			isMastered: false
		});
		expect(
			summarizeModule(questions, {
				one: checked('one', true),
				two: checked('two', true),
				three: checked('three', true)
			})
		).toMatchObject({
			isComplete: true,
			isAllCorrect: true,
			isMastered: false
		});
	});
	test('empty modules and blank answers never earn mastery', () => {
		expect(summarizeModule([], {})).toMatchObject({
			completion: 0,
			mastery: 0,
			isComplete: false,
			isMastered: false
		});
		expect(answerStatus(question('one'), ['  '])).toBe('unanswered');
		expect(answerStatus(question('one', 'multiple_choice', []), ['a'])).toBe('incorrect');
	});
	test('multi-select requires the exact answer set', () => {
		const q = question('one', 'multiple_choice', ['a', 'b']);
		expect(answerStatus(q, ['b', 'a'])).toBe('correct');
		expect(answerStatus(q, ['a'])).toBe('incorrect');
		expect(answerStatus(q, ['a', 'b', 'b'])).toBe('incorrect');
	});
	test('flags are independent and saved selections alone never count', () => {
		const qs = [question('one')];
		const summary = summarizeModule(qs, { one: checked('one', true, 1) }, ['one']);
		expect(summary.isMastered).toBe(true);
		expect(summary.results[0]).toMatchObject({ status: 'mastered', flagged: true });
		expect(summarizeModule(qs, {}).isComplete).toBe(false);
	});
	test('fill in the blank uses accepted alternatives, normalization, case and regex rules', () => {
		const q = (text: string) => question('one', 'fill_in_the_blank', ['a'], [{ id: 'a', text }]);
		expect(
			answerStatus(q('exact:Optic nerve | flags=ignore_punct,normalize_ws'), ['  Óptic   nerve! '])
		).toBe('correct');
		expect(answerStatus(q('exact_cs:RNFL'), ['rnfl'])).toBe('incorrect');
		expect(answerStatus(q('contains:nerve'), ['optic nerve'])).toBe('correct');
		expect(answerStatus(q('regex:^\\d+$'), ['123'])).toBe('correct');
		expect(answerStatus(q('regex:['), ['123'])).toBe('incorrect');
	});
	test('matching handles equivalent answers and rejects incomplete or missing keys', () => {
		const options = [
			{ id: 'p1', text: 'prompt:One' },
			{ id: 'p2', text: 'prompt:Two' },
			{ id: 'a', text: 'answer:Same' },
			{ id: 'b', text: 'answer: same ' }
		];
		const q = question('one', 'matching', ['p1::a', 'p2::b'], options);
		expect(answerStatus(q, ['p1::b', 'p2::a'])).toBe('correct');
		expect(answerStatus(q, ['p1::a'])).toBe('incorrect');
		expect(answerStatus({ ...q, correctAnswers: [] }, ['p1::a'])).toBe('incorrect');
		expect(answerStatus({ ...q, correctAnswers: ['p1::a'] }, ['p1::a'])).toBe('incorrect');
	});
});
