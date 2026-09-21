<script lang="ts">
	import type { PageData } from './$types';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { FunctionReturnType } from 'convex/server';
	import { onMount } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { pushState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		ArrowDownRight,
		ArrowLeft,
		ArrowUpRight,
		BookOpen,
		ChevronRight,
		CircleHelp,
		ClipboardCheck,
		Flag,
		Flame,
		LayoutDashboard,
		Radio,
		Search,
		Sparkles,
		TrendingUp,
		Users
	} from 'lucide-svelte';
	import StudentDetailModal from '$lib/admin/StudentDetailModal.svelte';
	import CuratorGenerationRuns from '$lib/admin/CuratorGenerationRuns.svelte';
	import StudentAvatar from '$lib/admin/progress/StudentAvatar.svelte';
	import Explorer from '$lib/admin/progress/Explorer.svelte';
	import ActivityBars from '$lib/admin/progress/ActivityBars.svelte';
	import StudyHeatmap from '$lib/admin/progress/StudyHeatmap.svelte';
	import LiveFeed from '$lib/admin/progress/LiveFeed.svelte';
	import {
		DAY_MS,
		HOUR_MS,
		changePercent,
		compactNumber,
		engagementFor,
		engagementMeta,
		localDayKey,
		percent,
		plainText,
		relativeTime,
		startOfLocalDay,
		type Engagement
	} from '$lib/admin/progress/utils';

	let { data }: { data: PageData } = $props();
	const user = $derived(data.userData);
	const cohortId = $derived(user?.cohortId as Id<'cohort'> | undefined);
	const client = useConvexClient();
	const views = [
		{ id: 'overview', label: 'Overview', icon: LayoutDashboard },
		{ id: 'students', label: 'Students', icon: Users },
		{ id: 'curriculum', label: 'Classes', icon: BookOpen },
		{ id: 'studio', label: 'Studio', icon: Sparkles }
	] as const;
	const params = $derived(
		new URLSearchParams(
			(page.state as { progressSearch?: string }).progressSearch ?? page.url.search
		)
	);
	const view = $derived(views.find((v) => v.id === params.get('view'))?.id ?? 'overview');
	const filter = $derived(params.get('filter') ?? 'all');
	let search = $state('');
	let sort = $state('recent');
	let chartMetric = $state<'tries' | 'students'>('tries');
	let now = $state(Date.now());
	let connected = $state(true);
	let everConnected = $state(false);
	let selectedStudentId = $state<Id<'users'> | null>(null);

	onMount(() => {
		const updateConnection = (state: ReturnType<typeof client.connectionState>) => {
			connected = state.isWebSocketConnected;
			everConnected = state.hasEverConnected;
		};
		updateConnection(client.connectionState());
		const unsubscribe = client.subscribeToConnectionState(updateConnection);
		const timer = setInterval(() => (now = Date.now()), 30_000);
		return () => {
			unsubscribe();
			clearInterval(timer);
		};
	});
	function navigate(values: Record<string, string | null>) {
		const url = new URL(page.url);
		url.search = params.toString();
		for (const [key, value] of Object.entries(values)) {
			if (value) url.searchParams.set(key, value);
			else url.searchParams.delete(key);
		}
		pushState(url, { ...page.state, progressSearch: url.search });
	}
	function showStudents(nextFilter = 'all') {
		search = '';
		navigate({ view: 'students', filter: nextFilter === 'all' ? null : nextFilter });
	}
	function showModule(classId: string, moduleId: string) {
		navigate({ view: 'curriculum', class: classId, module: moduleId, semester: null });
	}

	const WINDOW_DAYS = 14;
	const hourStart = $derived(Math.floor(now / HOUR_MS) * HOUR_MS);
	const since = $derived(hourStart - WINDOW_DAYS * DAY_MS);
	const wantsActivity = $derived(view === 'overview' || view === 'students');
	const studentsQuery = useQuery(api.progress.getStudentsWithProgress, () =>
		cohortId ? { cohortId, includeSubscription: false } : 'skip'
	);
	// Only the current hour is reactive; earlier history is a closed window fetched once per hour.
	const liveQuery = useQuery(
		api.progress.getCohortLiveActivity,
		() => (cohortId && wantsActivity ? { cohortId, since: hourStart } : 'skip'),
		{ keepPreviousData: true }
	);
	const flaggedQuery = useQuery(api.progress.getTopFlaggedQuestions, () =>
		cohortId && view === 'overview' ? { cohortId, limit: 6 } : 'skip'
	);
	type History = FunctionReturnType<typeof api.progress.getCohortActivityHistory>;
	let history = $state<{ key: string; data: History } | null>(null);
	let historyError = $state<string | null>(null);
	$effect(() => {
		if (!cohortId || !wantsActivity) return;
		const key = `${cohortId}:${since}:${hourStart}`;
		if (history?.key === key) return;
		let cancelled = false;
		client
			.query(api.progress.getCohortActivityHistory, { cohortId, since, until: hourStart })
			.then((data) => {
				if (!cancelled) {
					history = { key, data };
					historyError = null;
				}
			})
			.catch((error: unknown) => {
				if (!cancelled) historyError = error instanceof Error ? error.message : String(error);
			});
		return () => {
			cancelled = true;
		};
	});

	const live = $derived.by(() => {
		const current = liveQuery.data;
		const past = history?.data;
		if (!current || !past) return undefined;
		const sessionKey = (s: (typeof current.sessions)[number]) =>
			`${s.kind}:${s.userId}:${s.moduleId ?? s.classId}:${s.startedAt}`;
		const seen = new SvelteSet<string>();
		const sessions = [...current.sessions, ...past.sessions]
			.sort((a, b) => b.at - a.at)
			.filter((s) => (seen.has(sessionKey(s)) ? false : (seen.add(sessionKey(s)), true)))
			.slice(0, 40);
		const moduleMap = new SvelteMap<string, (typeof past.modules)[number]>();
		for (const module of [...past.modules, ...current.modules]) {
			const existing = moduleMap.get(module.moduleId);
			moduleMap.set(
				module.moduleId,
				existing
					? {
							...existing,
							tries: existing.tries + module.tries,
							userIds: [...new Set([...existing.userIds, ...module.userIds])]
						}
					: module
			);
		}
		const modules = [...moduleMap.values()]
			.map((module) => ({ ...module, students: module.userIds.length }))
			.sort((a, b) => b.students - a.students || b.tries - a.tries)
			.slice(0, 6);
		const scored = past.quizzes.scored + current.quizzes.scored;
		return {
			truncated: past.truncated || current.truncated,
			students: current.students,
			sessions,
			modules,
			hourStamps: [
				...past.hours.map((bucket) => ({ ...bucket, at: past.since + bucket.hour * HOUR_MS })),
				...current.hours.map((bucket) => ({ ...bucket, at: current.since + bucket.hour * HOUR_MS }))
			],
			quizzes: {
				started: past.quizzes.started + current.quizzes.started,
				submitted: past.quizzes.submitted + current.quizzes.submitted,
				averageScore: scored
					? Math.round((past.quizzes.scoreTotal + current.quizzes.scoreTotal) / scored)
					: null
			}
		};
	});

	const hourStamps = $derived(live?.hourStamps ?? []);
	const weekStart = $derived(now - 7 * DAY_MS);
	const weekTries = $derived.by(() => {
		const tries = new SvelteMap<string, number>();
		for (const bucket of hourStamps) {
			if (bucket.at < weekStart) continue;
			for (const entry of bucket.users)
				tries.set(entry.userId, (tries.get(entry.userId) ?? 0) + entry.tries);
		}
		return tries;
	});
	const lastSessionAt = $derived.by(() => {
		const latest = new SvelteMap<string, number>();
		for (const session of live?.sessions ?? [])
			latest.set(session.userId, Math.max(latest.get(session.userId) ?? 0, session.at));
		return latest;
	});
	const liveById = $derived(new Map((live?.students ?? []).map((entry) => [entry.userId, entry])));
	const todayKey = $derived(localDayKey(now));

	const students = $derived(
		(studentsQuery.data ?? []).map((student) => {
			const metric = liveById.get(student._id);
			const lastActivityAt =
				Math.max(
					student.lastActivityAt ?? 0,
					metric?.lastSeenAt ?? 0,
					lastSessionAt.get(student._id) ?? 0
				) || null;
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
				engagement: engagementFor(lastActivityAt, questionsInteracted, now)
			};
		})
	);
	type Student = (typeof students)[number];
	const studentsById = $derived(
		new Map(students.map((student) => [student._id as string, student]))
	);
	const ready = $derived(!!studentsQuery.data);

	const engagementCounts = $derived.by(() => {
		const counts: Record<Engagement, number> = {
			live: 0,
			active: 0,
			cooling: 0,
			dormant: 0,
			none: 0
		};
		for (const student of students) counts[student.engagement]++;
		return counts;
	});
	const studyingNow = $derived(students.filter((student) => student.engagement === 'live'));
	const activeToday = $derived(
		students.filter((s) => (s.lastActivityAt ?? 0) >= startOfLocalDay(now)).length
	);
	const activeWeek = $derived(engagementCounts.live + engagementCounts.active);
	const onStreak = $derived(students.filter((s) => s.streak >= 2));

	const days = $derived.by(() => {
		const todayStart = startOfLocalDay(now);
		const result = Array.from({ length: WINDOW_DAYS }, (_, i) => {
			const start = startOfLocalDay(todayStart - (WINDOW_DAYS - 1 - i) * DAY_MS + HOUR_MS * 2);
			return { start, tries: 0, users: new Set<string>(), isToday: start === todayStart };
		});
		for (const bucket of hourStamps) {
			const day = result.findLast((entry) => bucket.at >= entry.start);
			if (!day) continue;
			day.tries += bucket.tries;
			for (const entry of bucket.users) day.users.add(entry.userId);
		}
		return result.map(({ users, ...day }) => ({ ...day, students: users.size }));
	});
	const weekSplit = $derived.by(() => {
		const cut = startOfLocalDay(now) - 6 * DAY_MS;
		const current = hourStamps.filter((bucket) => bucket.at >= cut);
		const previous = hourStamps.filter(
			(bucket) => bucket.at < cut && bucket.at >= cut - 7 * DAY_MS
		);
		const sum = (list: typeof hourStamps) =>
			list.reduce((total, bucket) => total + bucket.tries, 0);
		const uniq = (list: typeof hourStamps) =>
			new Set(list.flatMap((bucket) => bucket.users.map((entry) => entry.userId))).size;
		return {
			tries: sum(current),
			triesChange: changePercent(sum(current), sum(previous)),
			learners: uniq(current),
			learnersChange: changePercent(uniq(current), uniq(previous))
		};
	});
	const heatmap = $derived.by(() => {
		const cells = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
		for (const bucket of hourStamps) {
			const date = new Date(bucket.at);
			cells[(date.getDay() + 6) % 7][date.getHours()] += bucket.tries;
		}
		return cells;
	});
	const topLearners = $derived(
		[...students]
			.filter((s) => s.weekTries > 0)
			.sort((a, b) => b.weekTries - a.weekTries || b.streak - a.streak)
			.slice(0, 5)
	);
	const checkIns = $derived(
		students
			.filter((s) => s.engagement === 'cooling')
			.sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0))
			.slice(0, 5)
	);

	const engagementOrder: Engagement[] = ['live', 'active', 'cooling', 'dormant', 'none'];
	const filters = $derived([
		{ id: 'all', label: 'All', count: students.length },
		...engagementOrder.map((id) => ({
			id,
			label: engagementMeta[id].label,
			count: engagementCounts[id]
		})),
		{ id: 'streak', label: 'On a streak', count: onStreak.length }
	]);
	function matchesFilter(student: Student) {
		if (filter === 'all') return true;
		if (filter === 'streak') return student.streak >= 2;
		return student.engagement === filter;
	}
	const filteredStudents = $derived(
		students
			.filter(
				(s) =>
					`${s.name} ${s.email ?? ''} ${s.username ?? ''}`
						.toLowerCase()
						.includes(search.toLowerCase()) && matchesFilter(s)
			)
			.sort((a, b) =>
				sort === 'name'
					? a.name.localeCompare(b.name)
					: sort === 'tried'
						? b.questionsInteracted - a.questionsInteracted || a.name.localeCompare(b.name)
						: sort === 'week'
							? b.weekTries - a.weekTries || a.name.localeCompare(b.name)
							: (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0) || a.name.localeCompare(b.name)
			)
	);
	const selectedStudent = $derived(students.find((s) => s._id === selectedStudentId) ?? null);
	async function updateRole(userId: Id<'users'>, role: 'dev' | 'admin' | 'curator' | null) {
		await client.mutation(api.users.updateUserRole, { userId, role });
	}
	function openStudent(id: Id<'users'>) {
		selectedStudentId = id;
	}
</script>

{#snippet delta(change: number | null)}
	{#if change !== null}
		<span
			class="badge badge-soft badge-xs gap-0.5 tabular-nums {change >= 0
				? 'badge-success'
				: 'badge-error'}"
			>{#if change >= 0}<ArrowUpRight size={11} />{:else}<ArrowDownRight size={11} />{/if}{Math.abs(
				change
			)}%</span
		>
	{/if}
{/snippet}

{#snippet cardHeader(title: string, subtitle: string)}
	<div class="min-w-0">
		<h2 class="text-base font-semibold">{title}</h2>
		<p class="text-xs text-base-content/55">{subtitle}</p>
	</div>
{/snippet}

<svelte:head
	><title>Class Progress · LearnTerms</title><meta
		name="description"
		content="Live cohort activity, engagement, and study insights for curators."
	/></svelte:head
>

<div class="progress-workspace mx-auto max-w-7xl px-4 pt-6 pb-24 text-base-content sm:px-8">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div class="flex min-w-0 items-center gap-3">
			<a class="btn btn-ghost btn-circle btn-sm" href={resolve('/admin')} aria-label="Back to admin"
				><ArrowLeft size={18} /></a
			>
			<div class="min-w-0">
				<p class="text-xs text-base-content/55">{user?.schoolName}</p>
				<h1 class="truncate text-2xl font-bold tracking-tight">
					{user?.cohortName ?? 'Class progress'}
				</h1>
			</div>
		</div>
	</header>

	<nav
		class="tabs tabs-box mt-5 rounded-full w-fit max-w-full flex-nowrap overflow-x-auto"
		aria-label="Progress views"
	>
		{#each views as item (item.id)}<button
				class="tab gap-2 rounded-full {view === item.id ? 'tab-active' : ''}"
				aria-pressed={view === item.id}
				onclick={() => navigate({ view: item.id === 'overview' ? null : item.id, filter: null })}
				><item.icon size={15} />{item.label}</button
			>{/each}
	</nav>

	{#if !cohortId}
		<div class="alert alert-warning mt-6">No cohort is assigned to your account.</div>
	{:else}
		{#if !connected && everConnected}<div class="alert alert-warning alert-soft mt-5" role="status">
				Connection interrupted. Numbers may be out of date until it reconnects.
			</div>{/if}
		{#if studentsQuery.error || liveQuery.error || historyError}<div
				class="alert alert-error alert-soft mt-5"
				role="alert"
			>
				Some insights could not load. {studentsQuery.error?.message ??
					liveQuery.error?.message ??
					historyError}
			</div>{/if}

		<div class="mt-6">
			{#if view === 'overview'}
				<section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Key metrics">
					<button
						class="card card-border col-span-2 bg-base-100 p-4 text-left transition hover:border-success lg:col-span-1"
						onclick={() => showStudents('live')}
					>
						<span class="flex items-center justify-between text-xs text-base-content/60"
							>Studying now <Radio size={15} class="text-success" /></span
						>
						{#if !ready}<span class="skeleton mt-3 h-8 w-16"></span>{:else}
							<span class="mt-2 flex items-end justify-between gap-2">
								<span class="text-3xl font-semibold tabular-nums text-success"
									>{studyingNow.length}</span
								>
								{#if studyingNow.length}
									<span class="avatar-group -space-x-3">
										{#each studyingNow.slice(0, 4) as student (student._id)}
											<StudentAvatar name={student.name} imageUrl={student.imageUrl} size="xs" />
										{/each}
									</span>
								{/if}
							</span>
							<span class="mt-1 block text-xs text-base-content/50"
								>{activeToday} active today · last 15 minutes</span
							>
						{/if}
					</button>
					<button
						class="card card-border bg-base-100 p-4 text-left transition hover:border-primary"
						onclick={() => showStudents('active')}
					>
						<span class="flex items-center justify-between text-xs text-base-content/60"
							>Active this week <Users size={15} class="text-primary" /></span
						>
						{#if !ready}<span class="skeleton mt-3 h-8 w-16"></span>{:else}
							<span class="mt-2 flex items-baseline gap-2">
								<span class="text-3xl font-semibold tabular-nums">{activeWeek}</span>
								<span class="text-sm text-base-content/45">/ {students.length}</span>
							</span>
							<span class="mt-1 flex items-center gap-1.5 text-xs text-base-content/50"
								>{percent(activeWeek, students.length)}% of cohort {@render delta(
									weekSplit.learnersChange
								)}</span
							>
						{/if}
					</button>
					<div class="card card-border bg-base-100 p-4">
						<span class="flex items-center justify-between text-xs text-base-content/60"
							>Questions tried · 7d <TrendingUp size={15} class="text-primary" /></span
						>
						{#if !live}<span class="skeleton mt-3 h-8 w-16"></span>{:else}
							<span class="mt-2 block text-3xl font-semibold tabular-nums"
								>{compactNumber(weekSplit.tries)}{live.truncated ? '+' : ''}</span
							>
							<span class="mt-1 flex items-center gap-1.5 text-xs text-base-content/50"
								>First attempts {@render delta(weekSplit.triesChange)}</span
							>
						{/if}
					</div>
					<div class="card card-border bg-base-100 p-4">
						<span class="flex items-center justify-between text-xs text-base-content/60"
							>Practice tests · 14d <ClipboardCheck size={15} class="text-primary" /></span
						>
						{#if !live}<span class="skeleton mt-3 h-8 w-16"></span>{:else}
							<span class="mt-2 flex items-baseline gap-2">
								<span class="text-3xl font-semibold tabular-nums">{live.quizzes.submitted}</span>
								<span class="text-sm text-base-content/45">finished</span>
							</span>
							<span class="mt-1 block text-xs text-base-content/50"
								>{live.quizzes.averageScore !== null
									? `Average score ${live.quizzes.averageScore}%`
									: `${live.quizzes.started} started`}</span
							>
						{/if}
					</div>
				</section>

				<div class="mt-4 grid gap-4 lg:grid-cols-3">
					<section class="card card-border bg-base-100 p-5 lg:col-span-2">
						<div class="flex flex-wrap items-start justify-between gap-3">
							{@render cardHeader('Study activity', 'Last 14 days, by local day')}
							<div
								class="tabs tabs-box tabs-xs rounded-full"
								role="tablist"
								aria-label="Chart metric"
							>
								<button
									role="tab"
									class="tab rounded-full {chartMetric === 'tries' ? 'tab-active' : ''}"
									aria-selected={chartMetric === 'tries'}
									onclick={() => (chartMetric = 'tries')}>Questions</button
								>
								<button
									role="tab"
									class="tab rounded-full {chartMetric === 'students' ? 'tab-active' : ''}"
									aria-selected={chartMetric === 'students'}
									onclick={() => (chartMetric = 'students')}>Students</button
								>
							</div>
						</div>
						<div class="mt-4">
							{#if !live}<div class="skeleton h-52"></div>{:else}<ActivityBars
									{days}
									metric={chartMetric}
								/>{/if}
						</div>
					</section>

					<section class="card card-border flex flex-col overflow-hidden bg-base-100 lg:row-span-2">
						<header
							class="flex items-center justify-between gap-3 border-b border-base-200 p-5 pb-4"
						>
							{@render cardHeader('Live activity', 'Updates as students study')}
						</header>
						<div class="max-h-[34rem] min-h-0 flex-1 overflow-y-auto lg:max-h-none lg:basis-0">
							{#if !live || !ready}
								<div class="space-y-3 p-5">
									{#each [1, 2, 3, 4, 5] as row (row)}<div class="skeleton h-12"></div>{/each}
								</div>
							{:else}
								<LiveFeed sessions={live.sessions} {studentsById} {now} onStudent={openStudent} />
							{/if}
						</div>
					</section>

					<section class="card card-border bg-base-100 p-5 lg:col-span-2">
						{@render cardHeader(
							'When your cohort studies',
							'Questions tried by weekday and hour, last 14 days'
						)}
						<div class="mt-4">
							{#if !live}<div class="skeleton h-44"></div>{:else}<StudyHeatmap
									cells={heatmap}
								/>{/if}
						</div>
					</section>
				</div>

				<div class="mt-4 grid gap-4 lg:grid-cols-3">
					<section class="card card-border bg-base-100 p-5">
						{@render cardHeader('Engagement', 'Where every student is right now')}
						{#if !ready}<div class="skeleton mt-4 h-40"></div>{:else}
							<ul class="mt-3 -mx-2">
								{#each engagementOrder as id (id)}
									<li>
										<button
											class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-base-200"
											onclick={() => showStudents(id)}
										>
											<span class="status {engagementMeta[id].dot}"></span>
											<span class="min-w-0 flex-1">
												<span class="block font-medium">{engagementMeta[id].label}</span>
												<span class="block text-xs text-base-content/50"
													>{engagementMeta[id].hint}</span
												>
											</span>
											<span class="font-semibold tabular-nums">{engagementCounts[id]}</span>
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</section>

					<section class="card card-border bg-base-100 p-5">
						<div class="flex items-start justify-between gap-3">
							{@render cardHeader('Worth a check-in', 'Studied recently, quiet for over a week')}
							{#if engagementCounts.cooling > checkIns.length}
								<button
									class="btn btn-ghost btn-xs shrink-0 rounded-full"
									onclick={() => showStudents('cooling')}
									>All {engagementCounts.cooling} <ChevronRight size={13} /></button
								>
							{/if}
						</div>
						{#if !ready}<div class="skeleton mt-4 h-40"></div>{:else}
							<ul class="mt-3 -mx-2">
								{#each checkIns as student (student._id)}
									<li>
										<button
											class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-base-200"
											onclick={() => openStudent(student._id)}
										>
											<StudentAvatar name={student.name} imageUrl={student.imageUrl} size="sm" />
											<span class="min-w-0 flex-1">
												<span class="block truncate text-sm font-medium">{student.name}</span>
												<span class="block text-xs text-base-content/50"
													>{student.questionsInteracted} questions tried so far</span
												>
											</span>
											<span class="text-xs whitespace-nowrap text-warning"
												>{relativeTime(student.lastActivityAt, now)}</span
											>
										</button>
									</li>
								{:else}
									<li class="px-2 py-10 text-center text-sm text-base-content/55">
										Nobody has drifted off. Everyone who started is still active.
									</li>
								{/each}
							</ul>
						{/if}
					</section>

					<section class="card card-border bg-base-100 p-5">
						<div class="flex items-start justify-between gap-3">
							{@render cardHeader('Most active this week', 'By questions tried in the last 7 days')}
							{#if onStreak.length}
								<button
									class="badge badge-soft badge-warning badge-sm shrink-0 gap-1"
									onclick={() => showStudents('streak')}
									><Flame size={12} />{onStreak.length} on streaks</button
								>
							{/if}
						</div>
						{#if !live || !ready}<div class="skeleton mt-4 h-40"></div>{:else}
							<ol class="mt-3 -mx-2">
								{#each topLearners as student, i (student._id)}
									<li>
										<button
											class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-base-200"
											onclick={() => openStudent(student._id)}
										>
											<span class="w-4 text-xs tabular-nums text-base-content/40">{i + 1}</span>
											<StudentAvatar name={student.name} imageUrl={student.imageUrl} size="sm" />
											<span class="min-w-0 flex-1">
												<span class="block truncate text-sm font-medium">{student.name}</span>
												<span class="block text-xs text-base-content/50"
													>{relativeTime(student.lastActivityAt, now)}</span
												>
											</span>
											{#if student.streak >= 2}<span
													class="flex items-center gap-0.5 text-xs font-medium text-warning tabular-nums"
													title="{student.streak}-day streak"
													><Flame size={13} />{student.streak}</span
												>{/if}
											<span class="text-sm font-semibold tabular-nums">{student.weekTries}</span>
										</button>
									</li>
								{:else}
									<li class="px-2 py-10 text-center text-sm text-base-content/55">
										No study sessions this week yet.
									</li>
								{/each}
							</ol>
						{/if}
					</section>
				</div>

				<div class="mt-4 grid gap-4 lg:grid-cols-2">
					<section class="card card-border overflow-hidden bg-base-100">
						<header class="p-5 pb-3">
							{@render cardHeader('Trending modules', 'Most students studying in the last 14 days')}
						</header>
						{#if !live}<div class="skeleton m-5 mt-0 h-40"></div>{:else}
							{#each live.modules as module (module.moduleId)}
								<button
									class="group flex w-full items-center gap-3 border-t border-base-200 px-5 py-3 text-left hover:bg-base-200/60"
									onclick={() => showModule(module.classId, module.moduleId)}
								>
									<span
										class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-base-200 text-lg"
										>{module.emoji ?? '📚'}</span
									>
									<span class="min-w-0 flex-1">
										<span class="block truncate text-sm font-medium group-hover:text-primary"
											>{module.title}</span
										>
										<span class="block truncate text-[11px] text-base-content/50"
											>{module.className}</span
										>
									</span>
									<span class="w-20 text-right text-xs leading-tight">
										<span class="block font-semibold tabular-nums">{module.students} students</span>
										<span class="text-base-content/50 tabular-nums">{module.tries} tries</span>
									</span>
								</button>
							{:else}
								<p class="border-t border-base-200 p-8 text-center text-sm text-base-content/55">
									No module activity in the last two weeks.
								</p>
							{/each}
						{/if}
					</section>

					<section class="card card-border overflow-hidden bg-base-100">
						<header class="p-5 pb-3">
							{@render cardHeader(
								'Flagged by students',
								'Questions students marked for another look'
							)}
						</header>
						{#if flaggedQuery.error}<div class="alert alert-error alert-soft m-5 mt-0" role="alert">
								Flagged questions could not load.
							</div>{:else if !flaggedQuery.data}<div class="skeleton m-5 mt-0 h-40"></div>{:else}
							{#each flaggedQuery.data as question (question._id)}
								<button
									class="group flex w-full items-center gap-3 border-t border-base-200 px-5 py-3 text-left hover:bg-base-200/60"
									onclick={() => showModule(question.classId, question.moduleId)}
								>
									<span class="badge badge-soft badge-warning badge-sm shrink-0 gap-1 tabular-nums"
										><Flag size={11} />{question.flagCount}</span
									>
									<span class="min-w-0 flex-1">
										<span class="line-clamp-1 text-sm group-hover:text-primary"
											>{plainText(question.stem)}</span
										>
										<span class="block truncate text-[11px] text-base-content/50"
											>{question.moduleTitle} · {question.className}</span
										>
									</span>
									<ChevronRight size={15} class="shrink-0 text-base-content/35" />
								</button>
							{:else}
								<p class="border-t border-base-200 p-8 text-center text-sm text-base-content/55">
									No flagged questions right now.
								</p>
							{/each}
						{/if}
					</section>
				</div>

				<details class="mt-4 px-1 text-xs text-base-content/55">
					<summary class="flex cursor-pointer list-none items-center gap-2"
						><CircleHelp size={14} />How these numbers work</summary
					>
					<p class="mt-2 max-w-3xl leading-relaxed">
						Activity charts count first attempts at questions; re-answering a question updates "last
						active" but isn't counted again. Practice test averages include finished and timed-out
						tests.
						{#if live?.truncated}Activity is sampled from the most recent 4,000 attempts, so totals
							marked "+" are lower bounds.{/if}
					</p>
				</details>
			{:else if view === 'curriculum'}
				<Explorer
					{cohortId}
					classId={params.get('class') ?? ''}
					moduleId={params.get('module') ?? ''}
					semesterId={params.get('semester') ?? ''}
					{now}
					onNavigate={navigate}
					onStudent={openStudent}
				/>
			{:else if view === 'studio'}
				<CuratorGenerationRuns {cohortId} />
			{:else}
				<section class="card card-border overflow-hidden bg-base-100">
					<div class="border-b border-base-200 p-5">
						<div class="flex flex-wrap items-center justify-between gap-3">
							{@render cardHeader(
								'Students',
								ready
									? `${filteredStudents.length} of ${students.length} students`
									: 'Loading students…'
							)}
							<div class="flex w-full flex-wrap gap-2 sm:w-auto">
								<label class="input input-sm min-w-0 flex-1 rounded-full sm:w-60"
									><Search size={15} class="text-base-content/50" /><input
										type="search"
										placeholder="Name, email, or username…"
										aria-label="Search students"
										bind:value={search}
									/></label
								><select
									class="select select-sm w-44 rounded-full"
									aria-label="Sort students"
									bind:value={sort}
									><option value="recent">Recently active</option><option value="week"
										>Most active this week</option
									><option value="tried">Most questions tried</option><option value="name"
										>Name A–Z</option
									></select
								>
							</div>
						</div>
						<div class="mt-4 flex flex-wrap gap-1.5" aria-label="Student filters">
							{#each filters as option (option.id)}<button
									class="btn btn-xs rounded-full {filter === option.id
										? 'btn-primary'
										: 'btn-ghost bg-base-200'}"
									aria-pressed={filter === option.id}
									onclick={() => navigate({ filter: option.id === 'all' ? null : option.id })}
									>{#if option.id in engagementMeta}<span
											class="status status-xs {engagementMeta[option.id as Engagement].dot}"
										></span>{/if}{option.label}<span class="opacity-60 tabular-nums"
										>{option.count}</span
									></button
								>{/each}
						</div>
					</div>
					{#if studentsQuery.isLoading}<div class="space-y-2 p-5">
							{#each [1, 2, 3, 4, 5] as row (row)}<div class="skeleton h-12"></div>{/each}
						</div>{:else if !filteredStudents.length}<div class="p-12 text-center">
							<Search size={26} class="mx-auto mb-3 text-base-content/40" />
							<h3 class="font-semibold">
								{students.length ? 'No students in this view' : 'Your cohort is empty'}
							</h3>
							<p class="mt-1 text-sm text-base-content/60">
								{students.length
									? 'Try another filter or clear your search.'
									: 'Students will appear here when they join.'}
							</p>
							{#if students.length}<button
									class="btn btn-outline btn-sm mt-4 rounded-full"
									onclick={() => showStudents()}>Show all students</button
								>{/if}
						</div>{:else}<div class="overflow-x-auto">
							<table class="table table-sm">
								<thead
									><tr class="text-[11px] text-base-content/50"
										><th class="pl-5">Student</th><th>Status</th><th class="text-right"
											>This week</th
										><th class="text-right">All time</th><th class="text-right">Streak</th><th
											>Last active</th
										><th><span class="sr-only">Details</span></th></tr
									></thead
								><tbody
									>{#each filteredStudents as student (student._id)}
										{@const meta = engagementMeta[student.engagement]}
										<tr
											class="cursor-pointer hover:bg-base-200/50"
											onclick={() => openStudent(student._id)}
											><td class="py-2.5 pl-5"
												><span class="flex items-center gap-3"
													><span class="relative"
														><StudentAvatar
															name={student.name}
															imageUrl={student.imageUrl}
															size="sm"
														/>{#if student.engagement === 'live'}<span
																class="status status-success absolute -right-0.5 -bottom-0.5 ring-2 ring-base-100"
															></span>{/if}</span
													><span class="min-w-0"
														><span class="block font-medium">{student.name}</span><span
															class="block max-w-56 truncate text-xs text-base-content/50"
															>{student.email ?? student.username ?? 'Student'}</span
														></span
													>{#if student.role}<span class="badge badge-ghost badge-xs capitalize"
															>{student.role}</span
														>{/if}</span
												></td
											><td
												><span class="flex items-center gap-2 whitespace-nowrap text-xs"
													><span class="status {meta.dot}"></span>{meta.label}</span
												></td
											><td class="text-right tabular-nums"
												>{student.weekTries ? student.weekTries : '—'}</td
											><td class="text-right text-base-content/60 tabular-nums"
												>{student.statsAvailable ? student.questionsInteracted : '—'}</td
											><td class="text-right"
												>{#if student.streak >= 2}<span
														class="inline-flex items-center gap-0.5 text-xs font-medium text-warning tabular-nums"
														><Flame size={13} />{student.streak}d</span
													>{:else}<span class="text-base-content/35">—</span>{/if}</td
											><td class="whitespace-nowrap text-xs text-base-content/60"
												>{relativeTime(student.lastActivityAt, now)}</td
											><td class="pr-4"
												><button
													class="btn btn-ghost btn-xs btn-circle"
													aria-label="View progress for {student.name}"
													onclick={(event) => {
														event.stopPropagation();
														openStudent(student._id);
													}}><ChevronRight size={15} /></button
												></td
											></tr
										>{/each}</tbody
								>
							</table>
						</div>{/if}
				</section>
			{/if}
		</div>
	{/if}
</div>

{#if cohortId && selectedStudent}
	<StudentDetailModal
		isOpen={true}
		onClose={() => (selectedStudentId = null)}
		student={selectedStudent}
		{cohortId}
		currentUserRole={user?.role}
		currentUserClerkId={user?.clerkUserId}
		isDev={user?.role === 'dev'}
		isAdmin={user?.role === 'admin' || user?.role === 'dev'}
		{updateRole}
	/>
{/if}

<style>
	.progress-workspace :global(button:focus-visible),
	.progress-workspace :global(summary:focus-visible),
	.progress-workspace :global(a:focus-visible) {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	@media (prefers-reduced-motion: reduce) {
		.progress-workspace :global(*) {
			transition: none !important;
			animation: none !important;
		}
	}
</style>
