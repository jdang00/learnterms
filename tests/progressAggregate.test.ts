import { expect, test } from 'bun:test';
import type { Id } from '../src/convex/_generated/dataModel';
import {
	buildModules,
	changedKeys,
	classPulse,
	gridCells,
	liveByModule,
	localDayStarts,
	mergeStudyRows,
	todayByHour,
	type Curriculum,
	type StudyRow
} from '../src/lib/admin/progress/aggregate';
import { recencyFor } from '../src/lib/admin/progress/viz';

const MIN = 60_000;
const now = new Date(2026, 10, 1, 21, 30).getTime();
const user = (id: string) => id as Id<'users'>;
const mod = (id: string) => id as Id<'module'>;
const cls = (id: string) => id as Id<'class'>;
const row = (userId: string, moduleId: string, minutesAgo: number, interacted = 3): StudyRow => ({
	userId: user(userId),
	moduleId: mod(moduleId),
	classId: cls(moduleId.startsWith('a') ? 'classA' : 'classB'),
	questionsInteracted: interacted,
	lastActivityAt: now - minutesAgo * MIN
});

test('the live window overrides the closed week for the same student and module', () => {
	const merged = mergeStudyRows(
		[row('u1', 'a1', 60 * 30, 4), row('u2', 'a1', 60 * 50)],
		[row('u1', 'a1', 2, 9)]
	);
	expect(merged.size).toBe(2);
	expect(merged.get('u1:a1')?.questionsInteracted).toBe(9);
});

test('pulses fire only for rows that moved forward after the first result', () => {
	const first = changedKeys(null, [row('u1', 'a1', 5)]);
	expect(first.changed).toEqual([]);
	const second = changedKeys(first.seen, [row('u1', 'a1', 1), row('u2', 'a2', 1)]);
	expect(second.changed).toEqual(['u1:a1', 'a1', 'u1', 'u2:a2', 'a2', 'u2']);
});

test('modules count students now, today and this week from the merged rows', () => {
	const curriculum = {
		totalStudents: 3,
		classes: [
			{
				classId: cls('classA'),
				name: 'Cornea',
				modules: [
					{
						moduleId: mod('a1'),
						classId: cls('classA'),
						moduleTitle: 'Keratoconus',
						moduleEmoji: '👁️',
						moduleOrder: 0,
						moduleStatus: 'published',
						totalQuestions: 20,
						questionsFlagged: 1,
						activeStudents: 1,
						lastActivityAt: null
					}
				]
			}
		]
	} as unknown as Curriculum;
	const rows = [row('u1', 'a1', 3), row('u2', 'a1', 60 * 5), row('u3', 'a1', 60 * 24 * 3)];
	const starts = localDayStarts(now);
	const hours = new Map([['a1', [{ at: now - 10 * MIN, tries: 4 }]]]);
	const [summary] = buildModules(curriculum, rows, hours, starts, now);
	expect(summary.counts).toEqual({ now: 1, today: 2, week: 3 });
	expect(summary.reach).toBe(3);
	expect(summary.daily.at(-1)).toBe(4);
	expect(summary.recent[0].userId).toBe(user('u1'));

	const live = liveByModule(rows, now);
	expect(live.get('a1')).toEqual([user('u1')]);
	expect(classPulse([summary], live, now).get('classA')).toEqual({ live: 1, today: 2 });
});

test('the class grid keeps only its own live rows and prefers the newest', () => {
	const cells = gridCells(
		[row('u1', 'a1', 60 * 48, 2)],
		[row('u1', 'a1', 1, 5), row('u1', 'b1', 1, 7)],
		'classA'
	);
	expect([...cells.keys()]).toEqual(['u1:a1']);
	expect(cells.get('u1:a1')?.interacted).toBe(5);
});

test('recency buckets and today-by-hour line up with the local day', () => {
	expect(recencyFor(now - 5 * MIN, now)).toBe('now');
	expect(recencyFor(now - 3 * 60 * MIN, now)).toBe('today');
	expect(recencyFor(now - 3 * 24 * 60 * MIN, now)).toBe('week');
	expect(recencyFor(now - 30 * 24 * 60 * MIN, now)).toBe('earlier');
	expect(recencyFor(null, now)).toBe('never');
	const hours = todayByHour([{ at: now - 30 * MIN, tries: 6, hour: 0, users: [] }], now);
	expect(hours).toHaveLength(22);
	expect(hours[21]).toBe(6);
});
