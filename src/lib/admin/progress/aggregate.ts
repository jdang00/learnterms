import type { FunctionReturnType } from 'convex/server';
import type { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
	DAY_MS,
	HOUR_MS,
	changePercent,
	engagementFor,
	localDayKey,
	percent,
	startOfLocalDay,
	type Engagement
} from './utils';
import { LIVE_MS, windowStart } from './viz';

// Pure aggregation for the progress dashboard. The state class feeds Convex results in;
// these functions merge the live and closed windows and shape what each view reads.

export type StudentRow = FunctionReturnType<typeof api.progress.getStudentsWithProgress>[number];
export type Activity = FunctionReturnType<typeof api.progress.getCohortActivityHistory>;
export type LiveActivity = FunctionReturnType<typeof api.progress.getCohortLiveActivity>;
export type StudyRows = FunctionReturnType<typeof api.moduleActivity.getRecentModuleActivity>;
export type StudyRow = StudyRows['rows'][number];
export type Curriculum = FunctionReturnType<typeof api.progress.getCurriculumActivity>;
export type ModuleWindow = 'now' | 'today' | 'week';

export const WINDOW_DAYS = 14;

export type ModuleSummary = {
	moduleId: Id<'module'>;
	classId: Id<'class'>;
	title: string;
	emoji: string | null;
	className: string;
	order: number;
	status: string;
	totalQuestions: number;
	flags: number;
	/** Students who have ever tried a question here. */
	reach: number;
	lastActivityAt: number | null;
	/** Most recent first: who studied it in the last week. */
	recent: { userId: Id<'users'>; at: number }[];
	counts: Record<ModuleWindow, number>;
	/** First attempts per local day, oldest first, today last. */
	daily: number[];
};

export function indexBy<T>(items: T[], key: (item: T) => string) {
	return new Map(items.map((item) => [key(item), item]));
}

const pairKey = (row: { userId: string; moduleId: string }) => `${row.userId}:${row.moduleId}`;

/** Latest answer wins when the same student-module pair appears in both windows. */
export function mergeStudyRows(...sources: StudyRow[][]) {
	const merged = new Map<string, StudyRow>();
	for (const rows of sources) {
		for (const row of rows) {
			const existing = merged.get(pairKey(row));
			if (!existing || (row.lastActivityAt ?? 0) >= (existing.lastActivityAt ?? 0))
				merged.set(pairKey(row), row);
		}
	}
	return merged;
}

/** Keys (pair, module, student) whose row moved forward since the previous live result. */
export function changedKeys(previous: Map<string, number> | null, rows: StudyRow[]) {
	const seen = new Map<string, number>();
	const changed: string[] = [];
	for (const row of rows) {
		const at = row.lastActivityAt ?? 0;
		seen.set(pairKey(row), at);
		if (previous && at > (previous.get(pairKey(row)) ?? 0))
			changed.push(pairKey(row), row.moduleId, row.userId);
	}
	return { seen, changed };
}

export function latestByUser(rows: Iterable<StudyRow>) {
	const latest = new Map<string, StudyRow>();
	for (const row of rows) {
		const existing = latest.get(row.userId);
		if (!existing || (row.lastActivityAt ?? 0) > (existing.lastActivityAt ?? 0))
			latest.set(row.userId, row);
	}
	return latest;
}

/** Who answered in each module in the last 15 minutes. */
export function liveByModule(rows: Iterable<StudyRow>, now: number) {
	const result = new Map<string, Id<'users'>[]>();
	for (const row of rows) {
		if (!row.lastActivityAt || now - row.lastActivityAt > LIVE_MS) continue;
		result.set(row.moduleId, [...(result.get(row.moduleId) ?? []), row.userId]);
	}
	return result;
}

/** Joins the closed history window with the live current hour. */
export function mergeActivity(past: Activity, current: LiveActivity) {
	const sessionKey = (s: Activity['sessions'][number]) =>
		`${s.kind}:${s.userId}:${s.moduleId ?? s.classId}:${s.startedAt}`;
	const seen = new Set<string>();
	const sessions = [...current.sessions, ...past.sessions]
		.sort((a, b) => b.at - a.at)
		.filter((s) => (seen.has(sessionKey(s)) ? false : (seen.add(sessionKey(s)), true)))
		.slice(0, 40);
	const moduleHours = new Map<string, { at: number; tries: number }[]>();
	for (const window of [past, current]) {
		for (const module of window.modules) {
			const list = moduleHours.get(module.moduleId) ?? [];
			for (const bucket of module.hours)
				list.push({ at: window.since + bucket.hour * HOUR_MS, tries: bucket.tries });
			moduleHours.set(module.moduleId, list);
		}
	}
	const scored = past.quizzes.scored + current.quizzes.scored;
	return {
		truncated: past.truncated || current.truncated,
		students: current.students,
		sessions,
		moduleHours,
		hourStamps: [past, current].flatMap((window) =>
			window.hours.map((bucket) => ({ ...bucket, at: window.since + bucket.hour * HOUR_MS }))
		),
		quizzes: {
			started: past.quizzes.started + current.quizzes.started,
			submitted: past.quizzes.submitted + current.quizzes.submitted,
			averageScore: scored
				? Math.round((past.quizzes.scoreTotal + current.quizzes.scoreTotal) / scored)
				: null
		}
	};
}
export type MergedActivity = ReturnType<typeof mergeActivity>;
type HourStamp = MergedActivity['hourStamps'][number];

export function localDayStarts(now: number, days = WINDOW_DAYS) {
	const todayStart = startOfLocalDay(now);
	// The two-hour nudge keeps DST days from landing on the previous midnight.
	return Array.from({ length: days }, (_, i) =>
		startOfLocalDay(todayStart - (days - 1 - i) * DAY_MS + HOUR_MS * 2)
	);
}

const dayIndex = (starts: number[], at: number) => starts.findLastIndex((start) => at >= start);

export function dailyActivity(stamps: HourStamp[], starts: number[], now: number) {
	const todayStart = startOfLocalDay(now);
	const days = starts.map((start) => ({
		start,
		tries: 0,
		users: new Set<string>(),
		isToday: start === todayStart
	}));
	for (const bucket of stamps) {
		const day = days[dayIndex(starts, bucket.at)];
		if (!day) continue;
		day.tries += bucket.tries;
		for (const entry of bucket.users) day.users.add(entry.userId);
	}
	return days.map(({ users, ...day }) => ({ ...day, students: users.size }));
}

/** Questions tried in each hour of today so far, the current hour last. */
export function todayByHour(stamps: HourStamp[], now: number) {
	const start = startOfLocalDay(now);
	const hours = Array<number>(Math.max(1, Math.floor((now - start) / HOUR_MS) + 1)).fill(0);
	for (const bucket of stamps) {
		if (bucket.at < start) continue;
		const index = Math.floor((bucket.at - start) / HOUR_MS);
		if (index < hours.length) hours[index] += bucket.tries;
	}
	return hours;
}

/** Monday-first weekday × hour totals. */
export function weekHourHeatmap(stamps: HourStamp[]) {
	const cells = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
	for (const bucket of stamps) {
		const date = new Date(bucket.at);
		cells[(date.getDay() + 6) % 7][date.getHours()] += bucket.tries;
	}
	return cells;
}

export function weekOverWeek(stamps: HourStamp[], now: number) {
	const cut = startOfLocalDay(now) - 6 * DAY_MS;
	const current = stamps.filter((bucket) => bucket.at >= cut);
	const previous = stamps.filter((bucket) => bucket.at < cut && bucket.at >= cut - 7 * DAY_MS);
	const sum = (list: HourStamp[]) => list.reduce((total, bucket) => total + bucket.tries, 0);
	const uniq = (list: HourStamp[]) =>
		new Set(list.flatMap((bucket) => bucket.users.map((entry) => entry.userId))).size;
	return {
		tries: sum(current),
		triesChange: changePercent(sum(current), sum(previous)),
		learnersChange: changePercent(uniq(current), uniq(previous))
	};
}

/** Cohort roster with the freshest activity from every source. */
export function buildStudents(
	rows: StudentRow[],
	live: MergedActivity | undefined,
	lastModule: Map<string, StudyRow>,
	now: number
) {
	const metrics = new Map((live?.students ?? []).map((entry) => [entry.userId as string, entry]));
	const weekStart = now - 7 * DAY_MS;
	const weekTries = new Map<string, number>();
	for (const bucket of live?.hourStamps ?? []) {
		if (bucket.at < weekStart) continue;
		for (const entry of bucket.users)
			weekTries.set(entry.userId, (weekTries.get(entry.userId) ?? 0) + entry.tries);
	}
	const todayKey = localDayKey(now);
	return rows.map((student) => {
		const metric = metrics.get(student._id);
		const module = lastModule.get(student._id);
		const lastActivityAt =
			Math.max(student.lastActivityAt ?? 0, metric?.lastSeenAt ?? 0, module?.lastActivityAt ?? 0) ||
			null;
		const questionsInteracted = Math.max(
			student.questionsInteracted,
			metric?.questionsInteracted ?? 0
		);
		const streak =
			metric && metric.streakDayKey !== null && metric.streakDayKey >= todayKey - 1
				? metric.streakDays
				: 0;
		return {
			...student,
			lastActivityAt,
			questionsInteracted,
			questionsMastered: Math.max(student.questionsMastered, metric?.questionsMastered ?? 0),
			statsAvailable: student.statsAvailable || metric !== undefined,
			progress: percent(questionsInteracted, student.totalQuestions),
			streak,
			weekTries: weekTries.get(student._id) ?? 0,
			lastModuleId: module?.moduleId ?? null,
			engagement: engagementFor(lastActivityAt, questionsInteracted, now) as Engagement
		};
	});
}
export type DashboardStudent = ReturnType<typeof buildStudents>[number];

export function countEngagement(students: { engagement: Engagement }[]) {
	const counts: Record<Engagement, number> = {
		live: 0,
		active: 0,
		cooling: 0,
		dormant: 0,
		none: 0
	};
	for (const student of students) counts[student.engagement]++;
	return counts;
}

/** Every module in the cohort with live counts layered over the curriculum snapshot. */
export function buildModules(
	curriculum: Curriculum | null,
	rows: Iterable<StudyRow>,
	moduleHours: Map<string, { at: number; tries: number }[]> | undefined,
	starts: number[],
	now: number
): ModuleSummary[] {
	const recentByModule = new Map<string, { userId: Id<'users'>; at: number }[]>();
	for (const row of rows) {
		if (!row.lastActivityAt) continue;
		const list = recentByModule.get(row.moduleId) ?? [];
		list.push({ userId: row.userId, at: row.lastActivityAt });
		recentByModule.set(row.moduleId, list);
	}
	const since = {
		now: windowStart('now', now),
		today: windowStart('today', now),
		week: windowStart('week', now)
	};
	return (curriculum?.classes ?? []).flatMap((course) =>
		course.modules.map((module) => {
			const recent = (recentByModule.get(module.moduleId) ?? []).sort((a, b) => b.at - a.at);
			const daily = Array<number>(starts.length).fill(0);
			for (const bucket of moduleHours?.get(module.moduleId) ?? []) {
				const index = dayIndex(starts, bucket.at);
				if (index >= 0) daily[index] += bucket.tries;
			}
			const count = (from: number) => recent.filter((entry) => entry.at >= from).length;
			return {
				moduleId: module.moduleId,
				classId: module.classId,
				title: module.moduleTitle,
				emoji: module.moduleEmoji ?? null,
				className: course.name,
				order: module.moduleOrder,
				status: module.moduleStatus,
				totalQuestions: module.totalQuestions,
				flags: module.questionsFlagged,
				reach: Math.max(module.activeStudents, recent.length),
				lastActivityAt: Math.max(module.lastActivityAt ?? 0, recent[0]?.at ?? 0) || null,
				recent,
				counts: { now: count(since.now), today: count(since.today), week: count(since.week) },
				daily
			};
		})
	);
}

/** Students in each class right now and today, across its modules. */
export function classPulse(
	modules: ModuleSummary[],
	live: Map<string, Id<'users'>[]>,
	now: number
) {
	const todayStart = startOfLocalDay(now);
	const sets = new Map<string, { live: Set<string>; today: Set<string> }>();
	for (const module of modules) {
		const entry = sets.get(module.classId) ?? { live: new Set(), today: new Set() };
		for (const id of live.get(module.moduleId) ?? []) entry.live.add(id);
		for (const visit of module.recent) if (visit.at >= todayStart) entry.today.add(visit.userId);
		sets.set(module.classId, entry);
	}
	return new Map(
		[...sets].map(([classId, entry]) => [
			classId,
			{ live: entry.live.size, today: entry.today.size }
		])
	);
}

export function modulesByClass(modules: ModuleSummary[]) {
	const byClass = new Map<string, { name: string; modules: ModuleSummary[] }>();
	for (const module of modules) {
		const group = byClass.get(module.classId) ?? { name: module.className, modules: [] };
		group.modules.push(module);
		byClass.set(module.classId, group);
	}
	for (const group of byClass.values()) group.modules.sort((a, b) => a.order - b.order);
	return [...byClass.entries()];
}

/** One class's grid cells: the snapshot, overlaid with any newer live row. */
export function gridCells(
	snapshot: StudyRow[],
	live: Iterable<StudyRow>,
	classId: string
): Map<string, { interacted: number; at: number | null }> {
	const latest = mergeStudyRows(
		snapshot,
		[...live].filter((row) => row.classId === classId)
	);
	return new Map(
		[...latest].map(([key, row]) => [
			key,
			{ interacted: row.questionsInteracted, at: row.lastActivityAt }
		])
	);
}
