<script lang="ts">
	import { SelectField } from '$lib/components/ui/select';
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
	import ArrowDownRight from '@lucide/svelte/icons/arrow-down-right';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import Flag from '@lucide/svelte/icons/flag';
	import Flame from '@lucide/svelte/icons/flame';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Radio from '@lucide/svelte/icons/radio';
	import Search from '@lucide/svelte/icons/search';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Users from '@lucide/svelte/icons/users';
	import StudentDetailModal from '$lib/admin/progress/StudentDetailModal.svelte';
	import CuratorGenerationRuns from '$lib/admin/progress/CuratorGenerationRuns.svelte';
	import StudentAvatar from '$lib/admin/progress/StudentAvatar.svelte';
	import Explorer from '$lib/admin/progress/Explorer.svelte';
	import ActivityBars from '$lib/admin/progress/ActivityBars.svelte';
	import StudyHeatmap from '$lib/admin/progress/StudyHeatmap.svelte';
	import LiveFeed from '$lib/admin/progress/LiveFeed.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import * as InputGroup from '$lib/components/ui/input-group';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
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
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local, non-reactive
		const url = new URL(page.url);
		url.search = params.toString();
		for (const [key, value] of Object.entries(values)) {
			if (value) url.searchParams.set(key, value);
			else url.searchParams.delete(key);
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- URL derived from page.url
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
	// utils.ts still names the engagement dots as DaisyUI status-* classes.

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
	async function updateRole(userId: Id<'users'>, role: 'dev' | 'admin' | 'curator' | null) {
		await client.mutation(api.users.updateUserRole, { userId, role });
	}
	function openStudent(id: Id<'users'>) {
		selectedStudentId = id;
	}
	const selectedStudent = $derived(students.find((s) => s._id === selectedStudentId) ?? null);
</script>

{#snippet delta(change: number | null)}
	{#if change !== null}
		<Badge
			variant="soft"
			tone={change >= 0 ? 'success' : 'error'}
			size="xs"
			class="gap-0.5 tabular-nums"
			>{#if change >= 0}<ArrowUpRight size={11} />{:else}<ArrowDownRight size={11} />{/if}{Math.abs(
				change
			)}%</Badge
		>
	{/if}
{/snippet}

{#snippet cardHeader(title: string, subtitle: string)}
	<div class="min-w-0">
		<h2 class="text-base font-semibold">{title}</h2>
		<p class="text-xs text-foreground/55">{subtitle}</p>
	</div>
{/snippet}

<div class="progress-workspace mx-auto max-w-7xl px-4 pt-6 pb-24 text-foreground sm:px-8">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div class="flex min-w-0 items-center gap-3">
			<Button
				href={resolve('/admin')}
				variant="ghost"
				tone="neutral"
				shape="circle"
				size="sm"
				aria-label="Back to admin"
			>
				<ArrowLeft size={18} />
			</Button>
			<div class="min-w-0">
				<p class="text-xs text-foreground/55">{user?.schoolName}</p>
				<h1 class="truncate font-display text-2xl font-bold">
					{user?.cohortName ?? 'Class progress'}
				</h1>
			</div>
		</div>
	</header>

	<nav
		class="mt-5 flex w-fit max-w-full flex-nowrap gap-1 overflow-x-auto rounded-full bg-muted p-1"
		aria-label="Progress views"
	>
		{#each views as item (item.id)}<Button
				variant="ghost"
				tone="neutral"
				size="sm"
				class="shrink-0 gap-2 aria-pressed:bg-background aria-pressed:shadow-xs"
				aria-pressed={view === item.id}
				onclick={() => navigate({ view: item.id === 'overview' ? null : item.id, filter: null })}
				><item.icon size={15} />{item.label}</Button
			>{/each}
	</nav>

	{#if !cohortId}
		<Alert.Root tone="warning" class="mt-6">
			<Alert.Description>No cohort is assigned to your account.</Alert.Description>
		</Alert.Root>
	{:else}
		{#if !connected && everConnected}<Alert.Root tone="warning" class="mt-5" role="status">
				<Alert.Description>
					Connection interrupted. Numbers may be out of date until it reconnects.
				</Alert.Description>
			</Alert.Root>{/if}
		{#if studentsQuery.error || liveQuery.error || historyError}<Alert.Root
				tone="error"
				class="mt-5"
				role="alert"
			>
				<Alert.Description>
					Some insights could not load. {studentsQuery.error?.message ??
						liveQuery.error?.message ??
						historyError}
				</Alert.Description>
			</Alert.Root>{/if}

		<div class="mt-6">
			{#if view === 'overview'}
				<section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Key metrics">
					<button
						class="col-span-2 surface p-4 text-left transition hover:border-success lg:col-span-1"
						onclick={() => showStudents('live')}
					>
						<span class="flex items-center justify-between text-xs text-foreground/60"
							>Studying now <Radio size={15} class="text-success" /></span
						>
						{#if !ready}<Skeleton class="mt-3 h-8 w-16" />{:else}
							<span class="mt-2 flex items-end justify-between gap-2">
								<span class="text-3xl font-semibold tabular-nums text-success-ink"
									>{studyingNow.length}</span
								>
								{#if studyingNow.length}
									<span class="flex -space-x-3">
										{#each studyingNow.slice(0, 4) as student (student._id)}
											<StudentAvatar name={student.name} imageUrl={student.imageUrl} size="xs" />
										{/each}
									</span>
								{/if}
							</span>
							<span class="mt-1 block text-xs text-foreground/50"
								>{activeToday} active today · last 15 minutes</span
							>
						{/if}
					</button>
					<button
						class="surface p-4 text-left transition hover:border-primary"
						onclick={() => showStudents('active')}
					>
						<span class="flex items-center justify-between text-xs text-foreground/60"
							>Active this week <Users size={15} class="text-primary" /></span
						>
						{#if !ready}<Skeleton class="mt-3 h-8 w-16" />{:else}
							<span class="mt-2 flex items-baseline gap-2">
								<span class="text-3xl font-semibold tabular-nums">{activeWeek}</span>
								<span class="text-sm text-foreground/45">/ {students.length}</span>
							</span>
							<span class="mt-1 flex items-center gap-1.5 text-xs text-foreground/50"
								>{percent(activeWeek, students.length)}% of cohort {@render delta(
									weekSplit.learnersChange
								)}</span
							>
						{/if}
					</button>
					<Card.Root class="gap-0 p-4">
						<span class="flex items-center justify-between text-xs text-foreground/60"
							>Questions tried · 7d <TrendingUp size={15} class="text-primary" /></span
						>
						{#if !live}<Skeleton class="mt-3 h-8 w-16" />{:else}
							<span class="mt-2 block text-3xl font-semibold tabular-nums"
								>{compactNumber(weekSplit.tries)}{live.truncated ? '+' : ''}</span
							>
							<span class="mt-1 flex items-center gap-1.5 text-xs text-foreground/50"
								>First attempts {@render delta(weekSplit.triesChange)}</span
							>
						{/if}
					</Card.Root>
					<Card.Root class="gap-0 p-4">
						<span class="flex items-center justify-between text-xs text-foreground/60"
							>Practice tests · 14d <ClipboardCheck size={15} class="text-primary" /></span
						>
						{#if !live}<Skeleton class="mt-3 h-8 w-16" />{:else}
							<span class="mt-2 flex items-baseline gap-2">
								<span class="text-3xl font-semibold tabular-nums">{live.quizzes.submitted}</span>
								<span class="text-sm text-foreground/45">finished</span>
							</span>
							<span class="mt-1 block text-xs text-foreground/50"
								>{live.quizzes.averageScore !== null
									? `Average score ${live.quizzes.averageScore}%`
									: `${live.quizzes.started} started`}</span
							>
						{/if}
					</Card.Root>
				</section>

				<div class="mt-4 grid gap-4 lg:grid-cols-3">
					<Card.Root class="gap-0 p-5 lg:col-span-2">
						<div class="flex flex-wrap items-start justify-between gap-3">
							{@render cardHeader('Study activity', 'Last 14 days, by local day')}
							<Tabs.Root
								value={chartMetric}
								onValueChange={(v) => (chartMetric = v as 'tries' | 'students')}
							>
								<Tabs.List aria-label="Chart metric">
									<Tabs.Trigger value="tries">Questions</Tabs.Trigger>
									<Tabs.Trigger value="students">Students</Tabs.Trigger>
								</Tabs.List>
							</Tabs.Root>
						</div>
						<div class="mt-4">
							{#if !live}<Skeleton class="h-52" />{:else}<ActivityBars
									{days}
									metric={chartMetric}
								/>{/if}
						</div>
					</Card.Root>

					<Card.Root class="flex flex-col gap-0 overflow-hidden py-0 lg:row-span-2">
						<header class="flex items-center justify-between gap-3 border-b border-muted p-5 pb-4">
							{@render cardHeader('Live activity', 'Updates as students study')}
						</header>
						<div class="max-h-[34rem] min-h-0 flex-1 overflow-y-auto lg:max-h-none lg:basis-0">
							{#if !live || !ready}
								<div class="space-y-3 p-5">
									{#each [1, 2, 3, 4, 5] as row (row)}<Skeleton class="h-12" />{/each}
								</div>
							{:else}
								<LiveFeed sessions={live.sessions} {studentsById} {now} onStudent={openStudent} />
							{/if}
						</div>
					</Card.Root>

					<Card.Root class="gap-0 p-5 lg:col-span-2">
						{@render cardHeader(
							'When your cohort studies',
							'Questions tried by weekday and hour, last 14 days'
						)}
						<div class="mt-4">
							{#if !live}<Skeleton class="h-44" />{:else}<StudyHeatmap cells={heatmap} />{/if}
						</div>
					</Card.Root>
				</div>

				<div class="mt-4 grid gap-4 lg:grid-cols-3">
					<Card.Root class="gap-0 p-5">
						{@render cardHeader('Engagement', 'Where every student is right now')}
						{#if !ready}<Skeleton class="mt-4 h-40" />{:else}
							<ul class="mt-3 -mx-2">
								{#each engagementOrder as id (id)}
									<li>
										<button
											class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
											onclick={() => showStudents(id)}
										>
											<span class="inline-block size-2 rounded-full {engagementMeta[id].dot}"
											></span>
											<span class="min-w-0 flex-1">
												<span class="block font-medium">{engagementMeta[id].label}</span>
												<span class="block text-xs text-foreground/50"
													>{engagementMeta[id].hint}</span
												>
											</span>
											<span class="font-semibold tabular-nums">{engagementCounts[id]}</span>
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</Card.Root>

					<Card.Root class="gap-0 p-5">
						<div class="flex items-start justify-between gap-3">
							{@render cardHeader('Worth a check-in', 'Studied recently, quiet for over a week')}
							{#if engagementCounts.cooling > checkIns.length}
								<Button
									variant="ghost"
									tone="neutral"
									size="xs"
									class="shrink-0"
									onclick={() => showStudents('cooling')}
									>All {engagementCounts.cooling} <ChevronRight size={13} /></Button
								>
							{/if}
						</div>
						{#if !ready}<Skeleton class="mt-4 h-40" />{:else}
							<ul class="mt-3 -mx-2">
								{#each checkIns as student (student._id)}
									<li>
										<button
											class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
											onclick={() => openStudent(student._id)}
										>
											<StudentAvatar name={student.name} imageUrl={student.imageUrl} size="sm" />
											<span class="min-w-0 flex-1">
												<span class="block truncate text-sm font-medium">{student.name}</span>
												<span class="block text-xs text-foreground/50"
													>{student.questionsInteracted} questions tried so far</span
												>
											</span>
											<span class="text-xs whitespace-nowrap text-warning-ink"
												>{relativeTime(student.lastActivityAt, now)}</span
											>
										</button>
									</li>
								{:else}
									<li class="px-2 py-10 text-center text-sm text-foreground/55">
										Nobody has drifted off. Everyone who started is still active.
									</li>
								{/each}
							</ul>
						{/if}
					</Card.Root>

					<Card.Root class="gap-0 p-5">
						<div class="flex items-start justify-between gap-3">
							{@render cardHeader('Most active this week', 'By questions tried in the last 7 days')}
							{#if onStreak.length}
								<Button
									variant="soft"
									tone="warning"
									size="xs"
									class="shrink-0 gap-1"
									onclick={() => showStudents('streak')}
									><Flame size={12} />{onStreak.length} on streaks</Button
								>
							{/if}
						</div>
						{#if !live || !ready}<Skeleton class="mt-4 h-40" />{:else}
							<ol class="mt-3 -mx-2">
								{#each topLearners as student, i (student._id)}
									<li>
										<button
											class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
											onclick={() => openStudent(student._id)}
										>
											<span class="w-4 text-xs tabular-nums text-foreground/40">{i + 1}</span>
											<StudentAvatar name={student.name} imageUrl={student.imageUrl} size="sm" />
											<span class="min-w-0 flex-1">
												<span class="block truncate text-sm font-medium">{student.name}</span>
												<span class="block text-xs text-foreground/50"
													>{relativeTime(student.lastActivityAt, now)}</span
												>
											</span>
											{#if student.streak >= 2}<span
													class="flex items-center gap-0.5 text-xs font-medium text-warning-ink tabular-nums"
													title="{student.streak}-day streak"
													><Flame size={13} />{student.streak}</span
												>{/if}
											<span class="text-sm font-semibold tabular-nums">{student.weekTries}</span>
										</button>
									</li>
								{:else}
									<li class="px-2 py-10 text-center text-sm text-foreground/55">
										No study sessions this week yet.
									</li>
								{/each}
							</ol>
						{/if}
					</Card.Root>
				</div>

				<div class="mt-4 grid gap-4 lg:grid-cols-2">
					<Card.Root class="gap-0 overflow-hidden py-0">
						<header class="p-5 pb-3">
							{@render cardHeader('Trending modules', 'Most students studying in the last 14 days')}
						</header>
						{#if !live}<Skeleton class="m-5 mt-0 h-40" />{:else}
							{#each live.modules as module (module.moduleId)}
								<button
									class="group flex w-full items-center gap-3 border-t border-muted px-5 py-3 text-left hover:bg-muted/60"
									onclick={() => showModule(module.classId, module.moduleId)}
								>
									<span
										class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg"
										>{module.emoji ?? '📚'}</span
									>
									<span class="min-w-0 flex-1">
										<span class="block truncate text-sm font-medium group-hover:text-primary-ink"
											>{module.title}</span
										>
										<span class="block truncate text-[11px] text-foreground/50"
											>{module.className}</span
										>
									</span>
									<span class="w-20 text-right text-xs leading-tight">
										<span class="block font-semibold tabular-nums">{module.students} students</span>
										<span class="text-foreground/50 tabular-nums">{module.tries} tries</span>
									</span>
								</button>
							{:else}
								<p class="border-t border-muted p-8 text-center text-sm text-foreground/55">
									No module activity in the last two weeks.
								</p>
							{/each}
						{/if}
					</Card.Root>

					<Card.Root class="gap-0 overflow-hidden py-0">
						<header class="p-5 pb-3">
							{@render cardHeader(
								'Flagged by students',
								'Questions students marked for another look'
							)}
						</header>
						{#if flaggedQuery.error}<Alert.Root tone="error" class="m-5 mt-0" role="alert">
								<Alert.Description>Flagged questions could not load.</Alert.Description>
							</Alert.Root>{:else if !flaggedQuery.data}<Skeleton class="m-5 mt-0 h-40" />{:else}
							{#each flaggedQuery.data as question (question._id)}
								<button
									class="group flex w-full items-center gap-3 border-t border-muted px-5 py-3 text-left hover:bg-muted/60"
									onclick={() => showModule(question.classId, question.moduleId)}
								>
									<Badge variant="soft" tone="warning" size="sm" class="shrink-0 gap-1 tabular-nums"
										><Flag size={11} />{question.flagCount}</Badge
									>
									<span class="min-w-0 flex-1">
										<span class="line-clamp-1 text-sm group-hover:text-primary-ink"
											>{plainText(question.stem)}</span
										>
										<span class="block truncate text-[11px] text-foreground/50"
											>{question.moduleTitle} · {question.className}</span
										>
									</span>
									<ChevronRight size={15} class="shrink-0 text-foreground/35" />
								</button>
							{:else}
								<p class="border-t border-muted p-8 text-center text-sm text-foreground/55">
									No flagged questions right now.
								</p>
							{/each}
						{/if}
					</Card.Root>
				</div>

				<details class="mt-4 px-1 text-xs text-foreground/55">
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
				<Card.Root class="gap-0 overflow-hidden py-0">
					<div class="border-b border-muted p-5">
						<div class="flex flex-wrap items-center justify-between gap-3">
							{@render cardHeader(
								'Students',
								ready
									? `${filteredStudents.length} of ${students.length} students`
									: 'Loading students…'
							)}
							<div class="flex w-full flex-wrap gap-2 sm:w-auto">
								<InputGroup.Root class="min-w-0 flex-1 rounded-full sm:w-60">
									<InputGroup.Addon
										><Search size={15} class="text-foreground/50" /></InputGroup.Addon
									>
									<InputGroup.Input
										type="search"
										placeholder="Name, email, or username…"
										aria-label="Search students"
										class="h-8 px-3 text-sm"
										bind:value={search}
									/>
								</InputGroup.Root>
								<SelectField
									size="sm"
									class="w-52"
									aria-label="Sort students"
									value={sort}
									onValueChange={(v) => (sort = v as typeof sort)}
									options={[
										{ value: 'recent', label: 'Recently active' },
										{ value: 'week', label: 'Most active this week' },
										{ value: 'tried', label: 'Most questions tried' },
										{ value: 'name', label: 'Name A–Z' }
									]}
								/>
							</div>
						</div>
						<div class="mt-4 flex flex-wrap gap-1.5" aria-label="Student filters">
							{#each filters as option (option.id)}<Button
									variant={filter === option.id ? 'solid' : 'ghost'}
									tone={filter === option.id ? 'primary' : 'neutral'}
									size="xs"
									class={filter === option.id ? '' : 'bg-muted'}
									aria-pressed={filter === option.id}
									onclick={() => navigate({ filter: option.id === 'all' ? null : option.id })}
									>{#if option.id in engagementMeta}<span
											class="inline-block size-1.5 rounded-full {engagementMeta[
												option.id as Engagement
											].dot}"
										></span>{/if}{option.label}<span class="opacity-60 tabular-nums"
										>{option.count}</span
									></Button
								>{/each}
						</div>
					</div>
					{#if studentsQuery.isLoading}<div class="space-y-2 p-5">
							{#each [1, 2, 3, 4, 5] as row (row)}<Skeleton class="h-12" />{/each}
						</div>{:else if !filteredStudents.length}<div class="p-12 text-center">
							<Search size={26} class="mx-auto mb-3 text-foreground/40" />
							<h3 class="font-semibold">
								{students.length ? 'No students in this view' : 'Your cohort is empty'}
							</h3>
							<p class="mt-1 text-sm text-foreground/60">
								{students.length
									? 'Try another filter or clear your search.'
									: 'Students will appear here when they join.'}
							</p>
							{#if students.length}<Button
									variant="outline"
									tone="neutral"
									size="sm"
									class="mt-4"
									onclick={() => showStudents()}>Show all students</Button
								>{/if}
						</div>{:else}<Table.Root class="text-xs">
							<Table.Header>
								<Table.Row class="text-[11px] text-foreground/50">
									<Table.Head class="pl-5">Student</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head class="text-right">This week</Table.Head>
									<Table.Head class="text-right">All time</Table.Head>
									<Table.Head class="text-right">Streak</Table.Head>
									<Table.Head>Last active</Table.Head>
									<Table.Head><span class="sr-only">Details</span></Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each filteredStudents as student (student._id)}
									{@const meta = engagementMeta[student.engagement]}
									<Table.Row
										class="cursor-pointer hover:bg-muted/50"
										onclick={() => openStudent(student._id)}
									>
										<Table.Cell class="py-2.5 pl-5">
											<span class="flex items-center gap-3">
												<span class="relative"
													><StudentAvatar
														name={student.name}
														imageUrl={student.imageUrl}
														size="sm"
													/>{#if student.engagement === 'live'}<span
															class="absolute -right-0.5 -bottom-0.5 inline-block size-2 rounded-full bg-success ring-2 ring-background"
														></span>{/if}</span
												>
												<span class="min-w-0"
													><span class="block font-medium">{student.name}</span><span
														class="block max-w-56 truncate text-xs text-foreground/50"
														>{student.email ?? student.username ?? 'Student'}</span
													></span
												>{#if student.role}<Badge size="xs" class="capitalize">{student.role}</Badge
													>{/if}
											</span>
										</Table.Cell>
										<Table.Cell>
											<span class="flex items-center gap-2 whitespace-nowrap text-xs"
												><span class="inline-block size-2 rounded-full {meta.dot}"
												></span>{meta.label}</span
											>
										</Table.Cell>
										<Table.Cell class="text-right tabular-nums"
											>{student.weekTries ? student.weekTries : '—'}</Table.Cell
										>
										<Table.Cell class="text-right text-foreground/60 tabular-nums"
											>{student.statsAvailable ? student.questionsInteracted : '—'}</Table.Cell
										>
										<Table.Cell class="text-right">
											{#if student.streak >= 2}<span
													class="inline-flex items-center gap-0.5 text-xs font-medium text-warning-ink tabular-nums"
													><Flame size={13} />{student.streak}d</span
												>{:else}<span class="text-foreground/35">—</span>{/if}
										</Table.Cell>
										<Table.Cell class="whitespace-nowrap text-xs text-foreground/60"
											>{relativeTime(student.lastActivityAt, now)}</Table.Cell
										>
										<Table.Cell class="pr-4">
											<Button
												variant="ghost"
												tone="neutral"
												size="xs"
												shape="circle"
												aria-label="View progress for {student.name}"
												onclick={(event) => {
													event.stopPropagation();
													openStudent(student._id);
												}}><ChevronRight size={15} /></Button
											>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>{/if}
				</Card.Root>
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
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}
	@media (prefers-reduced-motion: reduce) {
		.progress-workspace :global(*) {
			transition: none !important;
			animation: none !important;
		}
	}
</style>
