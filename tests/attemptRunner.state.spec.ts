import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
	AttemptRunnerState,
	type AttemptIo,
	type AttemptRunnerBundle
} from '../src/lib/tests/attempt.svelte';

const storage = new Map<string, string>();
const localStorage = {
	getItem: (key: string) => storage.get(key) ?? null,
	setItem: (key: string, value: string) => void storage.set(key, value),
	removeItem: (key: string) => void storage.delete(key)
};

function item(id: string, type = 'multiple_choice', response: Record<string, unknown> = {}) {
	return {
		_id: id,
		questionId: `q-${id}`,
		moduleId: 'm1',
		question: {
			type,
			stem: `<p>${id}</p>`,
			options: [
				{ id: 'a', text: 'A' },
				{ id: 'b', text: 'B' }
			]
		},
		response
	} as unknown as AttemptRunnerBundle['items'][number];
}

function bundle(
	items: AttemptRunnerBundle['items'],
	attempt: Partial<AttemptRunnerBundle['attempt']> = {}
) {
	return {
		attempt: {
			_id: 'attempt1',
			classId: 'class1',
			status: 'in_progress',
			elapsedMs: 0,
			className: 'Pharm',
			...attempt
		},
		items
	} as unknown as AttemptRunnerBundle;
}

function setup(data: AttemptRunnerBundle) {
	const io: AttemptIo & { patches: unknown[]; submits: number } = {
		patches: [],
		submits: 0,
		patchResponses: async (args) => void io.patches.push(args),
		submit: async () => void (io.submits += 1),
		heartbeat: async () => undefined
	};
	const runner = new AttemptRunnerState(io, {
		bundle: () => data,
		attemptId: () => data.attempt._id
	});
	runner.hydrateFromBundle();
	return { runner, io };
}

beforeEach(() => {
	vi.useFakeTimers();
	storage.clear();
	vi.stubGlobal('window', { ...globalThis, localStorage, setTimeout, clearTimeout });
	vi.stubGlobal('navigator', { onLine: true });
});
afterEach(() => {
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

test('hydrates server responses and counts answered and flagged questions', () => {
	const { runner } = setup(
		bundle([item('i1', 'multiple_choice', { selectedOptions: ['a'], isFlagged: true }), item('i2')])
	);
	expect(runner.answeredCount).toBe(1);
	expect(runner.flaggedCount).toBe(1);
	expect(runner.unansweredCount).toBe(1);
	expect(runner.navigatorItems.map((n) => n.status)).toEqual(['answered', 'unanswered']);
});

test('toggling an option marks it dirty and flushes one change', async () => {
	const data = bundle([item('i1'), item('i2')]);
	const { runner, io } = setup(data);
	runner.toggleOption(data.items[1], 'b');
	expect(runner.responses.i2.selectedOptions).toEqual(['b']);
	await runner.flushSync();
	expect(io.patches).toHaveLength(1);
	const patch = io.patches[0] as { changes: { itemId: string; selectedOptions: string[] }[] };
	expect(patch.changes).toHaveLength(1);
	expect(patch.changes[0]).toMatchObject({ itemId: 'i2', selectedOptions: ['b'] });
	expect(runner.syncStatus).toBe('synced');
});

test('a fill-in-the-blank text answer counts as answered through the adapter', () => {
	const data = bundle([item('i1', 'fill_in_the_blank')]);
	const { runner } = setup(data);
	runner.uiAdapter.selectedAnswers = ['cornea'];
	expect(runner.responses.i1.textResponse).toBe('cornea');
	expect(runner.answeredCount).toBe(1);
	runner.clearAnswer(data.items[0]);
	expect(runner.answeredCount).toBe(0);
});

test('navigation stays in bounds and requests a scroll', () => {
	const { runner } = setup(bundle([item('i1'), item('i2')]));
	runner.previousQuestion();
	expect(runner.currentIndex).toBe(0);
	runner.nextQuestion();
	runner.nextQuestion();
	expect(runner.currentIndex).toBe(1);
	expect(runner.isLastQuestion).toBe(true);
	expect(runner.scrollRequest).toBe(3);
	runner.jumpToQuestion(5);
	expect(runner.currentIndex).toBe(1);
});

test('the clock runs out and triggers auto submit once', () => {
	const { runner } = setup(bundle([item('i1')], { timeLimitSec: 2 }));
	vi.setSystemTime(0);
	runner.startClock();
	vi.setSystemTime(1000);
	expect(runner.tick()).toBe(false);
	expect(runner.remainingMs).toBe(1000);
	vi.setSystemTime(2000);
	expect(runner.tick()).toBe(true);
	vi.setSystemTime(3000);
	expect(runner.tick()).toBe(false);
	expect(runner.responses.i1.timeSpentMs).toBe(3000);
});

test('submit flushes, calls the backend and clears the local cache', async () => {
	const data = bundle([item('i1')]);
	const { runner, io } = setup(data);
	runner.toggleOption(data.items[0], 'a');
	expect(storage.has('lt:testAttempt:attempt1')).toBe(true);
	await expect(runner.submitAttempt()).resolves.toBe(true);
	expect(io.patches).toHaveLength(1);
	expect(io.submits).toBe(1);
	expect(storage.has('lt:testAttempt:attempt1')).toBe(false);
});

test('a cached draft overrides server answers on hydrate', () => {
	storage.set(
		'lt:testAttempt:attempt1',
		JSON.stringify({
			version: 1,
			attemptId: 'attempt1',
			classId: 'class1',
			currentIndex: 1,
			elapsedMs: 5000,
			responses: { i1: { selectedOptions: ['b'], eliminatedOptions: ['a'], isFlagged: true } },
			pendingTimeDeltas: {},
			updatedAt: 0
		})
	);
	const { runner } = setup(
		bundle([item('i1', 'multiple_choice', { selectedOptions: ['a'] }), item('i2')])
	);
	expect(runner.currentIndex).toBe(1);
	expect(runner.elapsedMsLocal).toBe(5000);
	expect(runner.responses.i1).toMatchObject({
		selectedOptions: ['b'],
		eliminatedOptions: ['a'],
		isFlagged: true
	});
});
