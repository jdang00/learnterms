import type { ConvexClient } from 'convex/browser';
import { useConvexClient, useQuery } from 'convex-svelte';
import { SvelteMap } from 'svelte/reactivity';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
	WINDOW_DAYS,
	buildModules,
	buildStudents,
	changedKeys,
	countEngagement,
	indexBy,
	dailyActivity,
	latestByUser,
	liveByModule,
	localDayStarts,
	mergeActivity,
	mergeStudyRows,
	todayByHour,
	weekHourHeatmap,
	weekOverWeek,
	type Activity,
	type Curriculum,
	type StudentRow,
	type StudyRows
} from './aggregate';
import { DAY_MS, HOUR_MS, startOfLocalDay } from './utils';

export type { ModuleSummary, ModuleWindow } from './aggregate';

/**
 * Live state for /admin/progress. Small reactive slices (the current hour) are subscribed;
 * closed windows (the 14 days and the week before this hour) are fetched once an hour, and the
 * curriculum rollup is a snapshot refreshed each minute. Merging them keeps every number live
 * without re-running the large reads on each answer.
 */
export class ProgressDashboard {
	readonly client = useConvexClient();
	now = $state(Date.now());
	connected = $state(true);
	everConnected = $state(false);
	history = $state<{ key: string; data: Activity } | null>(null);
	historyError = $state<string | null>(null);
	weekRows = $state<{ key: string; data: StudyRows } | null>(null);
	curriculum = $state<Curriculum | null>(null);
	curriculumError = $state<string | null>(null);
	/** When a module, student or student-module pair last received a live answer. */
	readonly pulses = new SvelteMap<string, number>();

	readonly hourStart = $derived(Math.floor(this.now / HOUR_MS) * HOUR_MS);
	readonly since = $derived(this.hourStart - WINDOW_DAYS * DAY_MS);

	readonly liveQuery;
	readonly liveRows;
	readonly flaggedQuery;

	constructor(
		readonly cohortId: () => Id<'cohort'> | undefined,
		readonly studentsQuery: () => {
			data?: StudentRow[];
			error?: Error | null;
			isLoading?: boolean;
		},
		readonly wantsActivity: () => boolean,
		readonly wantsFlags: () => boolean
	) {
		this.liveQuery = useQuery(
			api.progress.getCohortLiveActivity,
			() => {
				const cohortId = this.cohortId();
				return cohortId && this.wantsActivity() ? { cohortId, since: this.hourStart } : 'skip';
			},
			{ keepPreviousData: true }
		);
		this.liveRows = useQuery(
			api.moduleActivity.getRecentModuleActivity,
			() => {
				const cohortId = this.cohortId();
				return cohortId ? { cohortId, since: this.hourStart } : 'skip';
			},
			{ keepPreviousData: true }
		);
		this.flaggedQuery = useQuery(api.progress.getTopFlaggedQuestions, () => {
			const cohortId = this.cohortId();
			return cohortId && this.wantsFlags() ? { cohortId, limit: 6 } : 'skip';
		});

		$effect(() => {
			const update = (state: ReturnType<ConvexClient['connectionState']>) => {
				this.connected = state.isWebSocketConnected;
				this.everConnected = state.hasEverConnected;
			};
			update(this.client.connectionState());
			const unsubscribe = this.client.subscribeToConnectionState(update);
			const timer = setInterval(() => (this.now = Date.now()), 5_000);
			return () => {
				unsubscribe();
				clearInterval(timer);
			};
		});
		$effect(() => this.loadHistory());
		$effect(() => this.loadWeekRows());
		$effect(() => this.pollCurriculum());
		$effect(() => this.trackPulses());
	}

	private loadHistory() {
		const cohortId = this.cohortId();
		if (!cohortId || !this.wantsActivity()) return;
		const until = this.hourStart;
		const since = this.since;
		const key = `${cohortId}:${since}:${until}`;
		if (this.history?.key === key) return;
		let cancelled = false;
		this.client
			.query(api.progress.getCohortActivityHistory, { cohortId, since, until })
			.then((data) => {
				if (cancelled) return;
				this.history = { key, data };
				this.historyError = null;
			})
			.catch((error: unknown) => {
				if (!cancelled) this.historyError = error instanceof Error ? error.message : String(error);
			});
		return () => {
			cancelled = true;
		};
	}

	private loadWeekRows() {
		const cohortId = this.cohortId();
		if (!cohortId) return;
		const until = this.hourStart;
		const key = `${cohortId}:${until}`;
		if (this.weekRows?.key === key) return;
		let cancelled = false;
		this.client
			.query(api.moduleActivity.getRecentModuleActivity, {
				cohortId,
				since: until - 7 * DAY_MS,
				until
			})
			.then((data) => {
				if (!cancelled) this.weekRows = { key, data };
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}

	// A snapshot each minute: subscribing would re-run the cohort-wide rollup on every answer.
	private pollCurriculum() {
		const cohortId = this.cohortId();
		if (!cohortId) return;
		let cancelled = false;
		const load = () => {
			if (document.hidden) return;
			this.client
				.query(api.progress.getCurriculumActivity, { cohortId })
				.then((data) => {
					if (cancelled) return;
					this.curriculum = data;
					this.curriculumError = null;
				})
				.catch((error: unknown) => {
					if (!cancelled)
						this.curriculumError = error instanceof Error ? error.message : String(error);
				});
		};
		load();
		const timer = setInterval(load, 60_000);
		document.addEventListener('visibilitychange', load);
		return () => {
			cancelled = true;
			clearInterval(timer);
			document.removeEventListener('visibilitychange', load);
		};
	}

	#seen: Map<string, number> | null = null;
	private trackPulses() {
		const rows = this.liveRows.data?.rows;
		if (!rows) return;
		const { seen, changed } = changedKeys(this.#seen, rows);
		const stamp = Date.now();
		for (const key of changed) this.pulses.set(key, stamp);
		this.#seen = seen;
	}

	/** Every student-module pair studied in the last week. */
	readonly studyRows = $derived.by(() =>
		mergeStudyRows(this.weekRows?.data.rows ?? [], this.liveRows.data?.rows ?? [])
	);
	readonly lastAnswerAt = $derived(
		Math.max(0, ...[...this.studyRows.values()].map((row) => row.lastActivityAt ?? 0)) || null
	);
	readonly lastModuleByUser = $derived(latestByUser(this.studyRows.values()));
	readonly liveByModule = $derived(liveByModule(this.studyRows.values(), this.now));

	readonly live = $derived.by(() => {
		const current = this.liveQuery.data;
		const past = this.history?.data;
		return current && past ? mergeActivity(past, current) : undefined;
	});
	readonly dayStarts = $derived(localDayStarts(this.now));
	readonly days = $derived(dailyActivity(this.live?.hourStamps ?? [], this.dayStarts, this.now));
	readonly todayHours = $derived(todayByHour(this.live?.hourStamps ?? [], this.now));
	readonly heatmap = $derived(weekHourHeatmap(this.live?.hourStamps ?? []));
	readonly weekSplit = $derived(weekOverWeek(this.live?.hourStamps ?? [], this.now));

	readonly students = $derived.by(() =>
		buildStudents(this.studentRows(), this.live, this.lastModuleByUser, this.now)
	);
	readonly studentsById = $derived(indexBy(this.students, (s) => s._id));
	readonly engagementCounts = $derived(countEngagement(this.students));
	readonly studyingNow = $derived(this.students.filter((s) => s.engagement === 'live'));
	readonly activeToday = $derived(
		this.students.filter((s) => (s.lastActivityAt ?? 0) >= startOfLocalDay(this.now)).length
	);

	readonly modules = $derived.by(() =>
		buildModules(
			this.curriculum,
			this.studyRows.values(),
			this.live?.moduleHours,
			this.dayStarts,
			this.now
		)
	);
	readonly modulesById = $derived(indexBy(this.modules, (m) => m.moduleId));

	private studentRows() {
		return this.studentsQuery().data ?? [];
	}

	get ready() {
		return !!this.studentsQuery().data;
	}

	get loadError() {
		return (
			this.studentsQuery().error?.message ??
			this.liveQuery.error?.message ??
			this.liveRows.error?.message ??
			this.historyError ??
			this.curriculumError
		);
	}
}
