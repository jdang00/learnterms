import type { FunctionReturnType } from 'convex/server';
import type { api } from '../../../convex/_generated/api';

// Pure shaping for the live results page: answer runs, per-minute results, and which
// questions and modules the cohort is answering right now.

type Recent = FunctionReturnType<typeof api.liveResults.getRecentChecks>;
export type Check = Recent['checks'][number];
export type LiveQuestion = Recent['questions'][number];

export const RUN_GAP_MS = 10 * 60_000;
const MINUTE_MS = 60_000;

export type Run = {
	key: string;
	userId: Check['userId'];
	moduleId: Check['moduleId'];
	/** Oldest first. */
	checks: Check[];
	startedAt: number;
	lastAt: number;
	correct: number;
};

/** One run per student per module, split when they pause for more than ten minutes. */
export function buildRuns(checks: Check[]): Run[] {
	const runs: Run[] = [];
	const open = new Map<string, Run>();
	for (const check of [...checks].sort((a, b) => a.checkedAt - b.checkedAt)) {
		const id = `${check.userId}:${check.moduleId}`;
		let run = open.get(id);
		if (!run || check.checkedAt - run.lastAt > RUN_GAP_MS) {
			run = {
				key: `${id}:${check.checkedAt}`,
				userId: check.userId,
				moduleId: check.moduleId,
				checks: [],
				startedAt: check.checkedAt,
				lastAt: check.checkedAt,
				correct: 0
			};
			open.set(id, run);
			runs.push(run);
		}
		run.checks.push(check);
		run.lastAt = check.checkedAt;
		if (check.isCorrect) run.correct++;
	}
	return runs.sort((a, b) => b.lastAt - a.lastAt);
}

/** Correct and incorrect answers per minute, oldest first, the current minute last. */
export function minuteBuckets(checks: Check[], now: number, minutes: number) {
	const end = Math.floor(now / MINUTE_MS) * MINUTE_MS;
	const buckets = Array.from({ length: minutes }, (_, i) => ({
		at: end - (minutes - 1 - i) * MINUTE_MS,
		correct: 0,
		incorrect: 0
	}));
	const first = buckets[0].at;
	for (const check of checks) {
		const index = Math.floor((check.checkedAt - first) / MINUTE_MS);
		if (index < 0 || index >= minutes) continue;
		if (check.isCorrect) buckets[index].correct++;
		else buckets[index].incorrect++;
	}
	return buckets;
}

export function summarize(checks: Check[]) {
	const correct = checks.filter((c) => c.isCorrect).length;
	const firstTry = checks.filter((c) => c.firstTry).length;
	return {
		answers: checks.length,
		correct,
		accuracy: checks.length ? Math.round((correct / checks.length) * 100) : null,
		firstTryRate: checks.length ? Math.round((firstTry / checks.length) * 100) : null,
		students: [...new Set(checks.map((c) => c.userId))]
	};
}

type Heat = { answers: number; correct: number; students: number; lastAt: number };

function heat<K extends string>(checks: Check[], keyOf: (check: Check) => K) {
	const groups = new Map<
		K,
		{ answers: number; correct: number; users: Set<string>; lastAt: number }
	>();
	for (const check of checks) {
		const key = keyOf(check);
		const entry = groups.get(key) ?? { answers: 0, correct: 0, users: new Set(), lastAt: 0 };
		entry.answers++;
		if (check.isCorrect) entry.correct++;
		entry.users.add(check.userId);
		entry.lastAt = Math.max(entry.lastAt, check.checkedAt);
		groups.set(key, entry);
	}
	return [...groups].map(([key, { users, ...entry }]): [K, Heat] => [
		key,
		{ ...entry, students: users.size }
	]);
}

const byActivity = (a: Heat, b: Heat) => b.answers - a.answers || b.lastAt - a.lastAt;

/** Questions answered in the window, busiest first. */
export function questionHeat(checks: Check[], questions: LiveQuestion[]) {
	const byId = new Map(questions.map((q) => [q.questionId as string, q]));
	return heat(checks, (c) => c.questionId as string)
		.flatMap(([id, entry]) => {
			const question = byId.get(id);
			return question ? [{ question, ...entry }] : [];
		})
		.sort(byActivity);
}

/** Modules answered in the window, busiest first. */
export function moduleHeat(checks: Check[]) {
	return heat(checks, (c) => c.moduleId as string)
		.map(([moduleId, entry]) => ({ moduleId, ...entry }))
		.sort(byActivity);
}

/** A question the class keeps missing: enough answers, under half correct. */
export function isStruggling(entry: { answers: number; correct: number; students: number }) {
	return entry.students >= 2 && entry.answers >= 3 && entry.correct / entry.answers < 0.5;
}
