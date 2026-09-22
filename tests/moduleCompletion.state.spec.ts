import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { QuizState } from '../src/routes/classes/[classId]/modules/[moduleId]/states.svelte';
import { answerStatus } from '../src/lib/utils/moduleCompletion';
import type { Doc } from '../src/convex/_generated/dataModel';
const configure = (qs: QuizState) => {
	qs.submitAnswer = async (questionId, answers) => {
		const isCorrect =
			answerStatus(qs.questions.find((q) => q._id === questionId)!, answers) === 'correct';
		return {
			isCorrect,
			evidence: {
				questionId,
				latestCorrect: isCorrect,
				checkedAt: Date.now(),
				cleanRecallCount: isCorrect ? 1 : 0
			}
		};
	};
	return qs;
};
const question = (id: string, type = 'multiple_choice') =>
	({
		_id: id,
		type,
		options: [
			{ id: 'a', text: 'exact:alpha' },
			{ id: 'b', text: 'beta' }
		],
		correctAnswers: ['a']
	}) as Doc<'question'>;
beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal('window', globalThis);
});
afterEach(() => {
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

test('the last answer opens completion after feedback even when incorrect and auto-next is off', async () => {
	const qs = configure(new QuizState());
	qs.setQuestions([question('one')]);
	qs.autoNextEnabled = false;
	qs.selectedAnswers = ['b'];
	await qs.checkAnswer(['a'], ['b']);
	expect(qs.showCompletion).toBe(false);
	await vi.advanceTimersByTimeAsync(1800);
	expect(qs.showCompletion).toBe(true);
	expect(qs.getCompletionSummary()).toMatchObject({ isComplete: true, isMastered: false });
	expect(qs.completionCelebration).toBe(true);
});
test('correcting the final remaining answer celebrates all correct and review does not reopen it', async () => {
	const qs = configure(new QuizState());
	qs.setQuestions([question('one'), question('two')]);
	qs.learningEvidence = {
		one: { questionId: 'one', checkedAt: 1, latestCorrect: true, cleanRecallCount: 1 },
		two: { questionId: 'two', checkedAt: 1, latestCorrect: false, cleanRecallCount: 0 }
	};
	qs.completionMilestone = 'complete';
	qs.currentQuestionIndex = 1;
	qs.selectedAnswers = ['a'];
	await qs.checkAnswer(['a'], ['a']);
	await vi.advanceTimersByTimeAsync(1800);
	expect(qs.showCompletion).toBe(true);
	expect(qs.getCompletionSummary().isAllCorrect).toBe(true);
	qs.showCompletion = false;
	qs.autoNextEnabled = false;
	await qs.checkAnswer(['a'], ['a']);
	await vi.advanceTimersByTimeAsync(1800);
	expect(qs.showCompletion).toBe(false);
});
test('end navigation opens an overview without marking skipped questions correct', async () => {
	const qs = configure(new QuizState());
	qs.setQuestions([question('one'), question('two')]);
	qs.currentQuestionIndex = 1;
	expect(qs.canGoNext()).toBe(true);
	await qs.goToNextQuestion();
	expect(qs.showCompletion).toBe(true);
	expect(qs.getCompletionSummary()).toMatchObject({ answered: 0, isMastered: false });
});
test('fill-in-the-blank completion uses the checked text', async () => {
	const qs = configure(new QuizState());
	qs.setQuestions([question('one', 'fill_in_the_blank')]);
	await qs.checkFillInTheBlank('ALPHA');
	await vi.advanceTimersByTimeAsync(1800);
	expect(qs.showCompletion).toBe(true);
	expect(qs.getCompletionSummary().isAllCorrect).toBe(true);
});
test('unanswered filtering keeps the active question stable while answering', () => {
	const qs = configure(new QuizState());
	qs.setQuestions([question('one'), question('two')]);
	qs.toggleShowIncomplete();
	qs.toggleOption('a');
	expect(qs.getCurrentFilteredQuestion()?._id).toBe('one');
	expect(qs.getCompletionSummary().correct).toBe(0);
});

test('checking gives immediate feedback while evidence saves in the background', async () => {
	const qs = configure(new QuizState());
	qs.setQuestions([question('one')]);
	let resolveSave!: (value: {
		isCorrect: boolean;
		evidence: {
			questionId: string;
			checkedAt: number;
			latestCorrect: boolean;
			cleanRecallCount: number;
		};
	}) => void;
	qs.submitAnswer = () =>
		new Promise((resolve) => {
			resolveSave = resolve;
		});
	expect(qs.checkAnswer(['a'], ['a'])).toBe(true);
	expect(qs.checkResult).toBe('Correct!');
	expect(qs.showSolution).toBe(true);
	expect(qs.getCompletionSummary()).toMatchObject({ isAllCorrect: true, isMastered: false });
	qs.hydrateEvidence([{ questionId: 'one', cleanRecallCount: 0 }]);
	expect(qs.getCompletionSummary().isAllCorrect).toBe(true);
	resolveSave({
		isCorrect: true,
		evidence: { questionId: 'one', checkedAt: Date.now(), latestCorrect: true, cleanRecallCount: 1 }
	});
	await qs.flushEvidence();
	expect(qs.learningEvidence.one.cleanRecallCount).toBe(1);
});

test('failed background saves preserve instant feedback and can be retried from progress', async () => {
	const qs = configure(new QuizState());
	qs.setQuestions([question('one')]);
	qs.submitAnswer = async () => {
		throw new Error('offline');
	};
	expect(qs.checkAnswer(['a'], ['a'])).toBe(true);
	await qs.retryBackground();
	expect(qs.checkResult).toBe('Correct!');
	expect(qs.checkError).toBeTruthy();
	configure(qs);
	await qs.flushEvidence();
	expect(qs.checkError).toBe('');
	expect(qs.learningEvidence.one.cleanRecallCount).toBe(1);
});

test('revealing and checking remain immediate and persist in that order', async () => {
	const qs = configure(new QuizState());
	qs.setQuestions([question('one')]);
	const events: string[] = [];
	let revealDone!: () => void;
	qs.revealAnswer = () =>
		new Promise<void>((resolve) => {
			revealDone = () => {
				events.push('revealed');
				resolve();
			};
		});
	const submit = qs.submitAnswer!;
	qs.submitAnswer = async (...args) => {
		events.push('checked');
		return await submit(...args);
	};
	qs.handleSolution();
	expect(qs.showSolution).toBe(true);
	expect(qs.checkAnswer(['a'], ['a'])).toBe(true);
	expect(events).toEqual([]);
	revealDone();
	await qs.flushEvidence();
	expect(events).toEqual(['revealed', 'checked']);
});

test('reset keeps mastery but starts blank and lets auto-next advance through the new run', async () => {
	const qs = new QuizState();
	qs.setQuestions([question('one'), question('two')]);
	qs.learningEvidence = Object.fromEntries(
		['one', 'two'].map((id) => [
			id,
			{
				questionId: id,
				checkedAt: 1,
				latestCorrect: true,
				cleanRecallCount: 2,
				masteredAt: 1
			}
		])
	);
	qs.submitAnswer = async (questionId) => ({
		isCorrect: true,
		evidence: {
			...qs.learningEvidence[questionId],
			checkedAt: Date.now(),
			latestCorrect: true
		}
	});
	const mutation = vi.fn().mockResolvedValue(2);
	await qs.reset('user' as never, 'module' as never, { mutation } as never);
	expect(mutation).toHaveBeenCalledOnce();
	expect(qs.getCompletionSummary()).toMatchObject({
		mastered: 2,
		completion: 0,
		isComplete: false
	});
	expect(qs.selectedAnswers).toEqual([]);
	qs.selectedAnswers = ['a'];
	qs.checkAnswer(['a'], ['a']);
	await vi.advanceTimersByTimeAsync(1800);
	expect(qs.currentQuestionIndex).toBe(1);
	expect(qs.showCompletion).toBe(false);
	qs.selectedAnswers = ['a'];
	qs.checkAnswer(['a'], ['a']);
	await vi.advanceTimersByTimeAsync(1800);
	expect(qs.showCompletion).toBe(true);
	expect(qs.getCompletionSummary()).toMatchObject({ mastered: 2, completion: 100 });
});

test.each(['manual', 'end'])(
	'Back from %s progress preserves the question, answers, filters and feedback',
	async (source) => {
		const qs = new QuizState();
		qs.setQuestions([question('one'), question('two')]);
		qs.currentQuestionIndex = 1;
		qs.showFlagged = true;
		qs.liveFlaggedQuestions = ['one', 'two'] as never;
		qs.selectedAnswers = ['a'];
		qs.eliminatedAnswers = ['b'];
		qs.checkResult = 'Correct!';
		qs.showSolution = true;
		const opened = vi.fn();
		qs.onOpenCompletion = opened;
		if (source === 'manual') qs.openCompletion();
		else await qs.goToNextQuestion();
		expect(qs.showCompletion).toBe(true);
		expect(opened).toHaveBeenCalledOnce();
		qs.closeCompletion();
		expect(qs.showCompletion).toBe(false);
		expect(qs.currentQuestionIndex).toBe(1);
		expect(qs.showFlagged).toBe(true);
		expect(qs.selectedAnswers).toEqual(['a']);
		expect(qs.eliminatedAnswers).toEqual(['b']);
		expect(qs.checkResult).toBe('Correct!');
		expect(qs.showSolution).toBe(true);
	}
);

test('Back after automatic completion stays in the quiz when a late mastery save finishes', async () => {
	const qs = new QuizState();
	qs.setQuestions([question('one')]);
	let finishSave!: () => void;
	qs.submitAnswer = (questionId) =>
		new Promise((resolve) => {
			finishSave = () =>
				resolve({
					isCorrect: true,
					evidence: {
						questionId,
						checkedAt: 1,
						latestCorrect: true,
						cleanRecallCount: 2,
						masteredAt: 1
					}
				});
		});
	qs.selectedAnswers = ['a'];
	qs.checkAnswer(['a'], ['a']);
	await vi.advanceTimersByTimeAsync(1800);
	expect(qs.showCompletion).toBe(true);
	qs.closeCompletion();
	finishSave();
	await qs.flushEvidence();
	await vi.advanceTimersByTimeAsync(1800);
	expect(qs.showCompletion).toBe(false);
	expect(qs.getCompletionSummary().isMastered).toBe(true);
});
