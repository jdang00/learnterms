<script lang="ts">
	import type { PageData } from './$types';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { api } from '../../../convex/_generated/api';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ArrowDownRight from '@lucide/svelte/icons/arrow-down-right';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import Flag from '@lucide/svelte/icons/flag';
	import Layers from '@lucide/svelte/icons/layers';
	import Radio from '@lucide/svelte/icons/radio';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Users from '@lucide/svelte/icons/users';
	import ActivityBars from '#lib/admin/progress/ActivityBars.svelte';
	import CohortField from '#lib/admin/progress/CohortField.svelte';
	import CuratorGenerationRuns from '#lib/admin/progress/CuratorGenerationRuns.svelte';
	import LiveFeed from '#lib/admin/progress/LiveFeed.svelte';
	import LiveView from '#lib/admin/progress/LiveView.svelte';
	import LivePill from '#lib/admin/progress/LivePill.svelte';
	import ModuleBoard from '#lib/admin/progress/ModuleBoard.svelte';
	import ModuleJump from '#lib/admin/progress/ModuleJump.svelte';
	import ModuleLens from '#lib/admin/progress/ModuleLens.svelte';
	import ModulesView from '#lib/admin/progress/ModulesView.svelte';
	import StudentAvatar from '#lib/admin/progress/StudentAvatar.svelte';
	import StudentDetailModal from '#lib/admin/progress/StudentDetailModal.svelte';
	import StudentsView from '#lib/admin/progress/StudentsView.svelte';
	import StudyHeatmap from '#lib/admin/progress/StudyHeatmap.svelte';
	import { ProgressDashboard } from '#lib/admin/progress/dashboard.svelte.js';
	import { compactNumber, plainText, relativeTime } from '#lib/admin/progress/utils.js';
	import LiveNumber from '#lib/admin/progress/viz/LiveNumber.svelte';
	import PulseAvatars from '#lib/admin/progress/viz/PulseAvatars.svelte';
	import Sparkline from '#lib/admin/progress/viz/Sparkline.svelte';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { SegmentedControl } from '#lib/components/ui/segmented-control/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';

	let { data }: { data: PageData } = $props();
	const user = $derived(data.userData.data);
	const cohortId = $derived(user?.cohortId as Id<'cohort'> | undefined);
	const views = [
		{ id: 'overview', label: 'Overview', icon: LayoutDashboard },
		{ id: 'live', label: 'Live', icon: Radio },
		{ id: 'modules', label: 'Modules', icon: Layers },
		{ id: 'students', label: 'Students', icon: Users },
		{ id: 'studio', label: 'Studio', icon: Sparkles }
	] as const;
	const params = $derived(
		new URLSearchParams(
			(page.state as { progressSearch?: string }).progressSearch ?? page.url.search
		)
	);
	// `curriculum` is the old name of the modules view; keep old links working.
	const view = $derived(
		params.get('view') === 'curriculum'
			? 'modules'
			: (views.find((v) => v.id === params.get('view'))?.id ?? 'overview')
	);
	const lensModuleId = $derived((params.get('module') as Id<'module'> | null) || null);
	let activity = $state<'days' | 'hours'>('days');
	let selectedStudentId = $state<Id<'users'> | null>(null);

	const dashboard = new ProgressDashboard(
		() => cohortId,
		() => data.students,
		() => view !== 'studio',
		() => view === 'overview'
	);

	function navigate(values: Record<string, string | null>) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local, non-reactive
		const url = new URL(page.url.href);
		url.search = params.toString();
		for (const [key, value] of Object.entries(values)) {
			if (value) url.searchParams.set(key, value);
			else url.searchParams.delete(key);
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- URL derived from page.url
		void goto(url, { shallow: true, state: { ...page.state, progressSearch: url.search } });
	}
	const showStudents = (filter = 'all') =>
		navigate({ view: 'students', filter: filter === 'all' ? null : filter });
	const openModule = (moduleId: Id<'module'>) => navigate({ module: moduleId });
	const openStudent = (id: Id<'users'>) => (selectedStudentId = id);
	const selectedStudent = $derived(
		dashboard.students.find((s) => s._id === selectedStudentId) ?? null
	);
	async function updateRole(userId: Id<'users'>, role: 'dev' | 'admin' | 'curator' | null) {
		await dashboard.client.mutation(api.users.updateUserRole, { userId, role });
	}

	const live = $derived(dashboard.live);
	const todayTries = $derived(dashboard.todayHours.reduce((sum, n) => sum + n, 0));
	const activeWeek = $derived(dashboard.engagementCounts.live + dashboard.engagementCounts.active);
	const checkIns = $derived(
		dashboard.students
			.filter((s) => s.engagement === 'cooling')
			.sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0))
			.slice(0, 5)
	);
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

<div class="progress-workspace mx-auto max-w-7xl px-4 pt-6 pb-24 text-foreground sm:px-8">
	<header class="flex flex-wrap items-center justify-between gap-4">
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
				<p class="text-xs text-muted-foreground">{user?.schoolName}</p>
				<h1 class="title-page truncate">{user?.cohortName ?? 'Class progress'}</h1>
			</div>
		</div>
		{#if cohortId}
			<div class="flex items-center gap-2">
				<LivePill
					connected={dashboard.connected}
					everConnected={dashboard.everConnected}
					lastAnswerAt={dashboard.lastAnswerAt}
					now={dashboard.now}
				/>
				<ModuleJump {dashboard} onOpen={openModule} />
			</div>
		{/if}
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
				onclick={() =>
					navigate({ view: item.id === 'overview' ? null : item.id, filter: null, class: null })}
				><item.icon size={15} />{item.label}</Button
			>{/each}
	</nav>

	{#if !cohortId}
		<Alert.Root tone="warning" class="mt-6">
			<Alert.Description>No cohort is assigned to your account.</Alert.Description>
		</Alert.Root>
	{:else}
		{#if dashboard.loadError}<Alert.Root tone="error" class="mt-5" role="alert">
				<Alert.Description>Some insights could not load. {dashboard.loadError}</Alert.Description>
			</Alert.Root>{/if}

		<div class="mt-6">
			{#if view === 'overview'}
				<section
					class="grid gap-x-6 gap-y-4 surface p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] lg:items-center"
					aria-label="Right now"
				>
					<div class="flex items-center gap-4">
						{#if !dashboard.ready}<Skeleton class="h-12 w-40" />{:else}
							<button
								type="button"
								class="min-w-0 rounded-xl text-left"
								onclick={() => showStudents('live')}
							>
								<span class="label-caps block">Studying now</span>
								<LiveNumber
									value={dashboard.studyingNow.length}
									class="text-4xl leading-tight font-semibold {dashboard.studyingNow.length
										? 'text-success-ink'
										: 'text-muted-foreground'}"
								/>
							</button>
							<PulseAvatars people={dashboard.studyingNow} max={7} onStudent={openStudent} />
						{/if}
					</div>
					<div class="min-w-0">
						<div class="flex items-baseline justify-between gap-2">
							<span class="label-caps">Today</span>
							<span class="text-xs text-muted-foreground"
								><span class="font-semibold text-foreground tabular-nums"
									>{compactNumber(todayTries)}</span
								> questions</span
							>
						</div>
						{#if !live}<Skeleton class="mt-1.5 h-10" />{:else}
							<Sparkline
								values={dashboard.todayHours}
								live={dashboard.studyingNow.length > 0}
								class="mt-1.5 h-10 w-full"
								label="Questions tried each hour today"
							/>
						{/if}
					</div>
					<dl
						class="grid grid-cols-2 gap-x-6 gap-y-2 border-muted sm:grid-cols-4 lg:grid-cols-2 lg:border-l lg:pl-6 xl:grid-cols-4"
					>
						<div>
							<dt class="label-caps">Active today</dt>
							<dd class="text-lg font-semibold tabular-nums">
								<LiveNumber value={dashboard.activeToday} /><span
									class="text-sm font-normal text-muted-foreground"
									>/{dashboard.students.length}</span
								>
							</dd>
						</div>
						<div>
							<dt class="label-caps">7 days</dt>
							<dd class="flex items-center gap-1.5 text-lg font-semibold tabular-nums">
								{activeWeek}<span class="-ml-1 text-sm font-normal text-muted-foreground"
									>/{dashboard.students.length}</span
								>{@render delta(dashboard.weekSplit.learnersChange)}
							</dd>
						</div>
						<div>
							<dt class="label-caps">Tried · 7d</dt>
							<dd class="flex items-center gap-1.5 text-lg font-semibold tabular-nums">
								{compactNumber(dashboard.weekSplit.tries)}{live?.truncated ? '+' : ''}
								{@render delta(dashboard.weekSplit.triesChange)}
							</dd>
						</div>
						<div>
							<dt class="label-caps">Tests · 14d</dt>
							<dd class="text-lg font-semibold tabular-nums">
								{live?.quizzes.submitted ?? 0}{#if live?.quizzes.averageScore != null}<span
										class="ml-1 text-sm font-normal text-muted-foreground"
										>avg {live.quizzes.averageScore}%</span
									>{/if}
							</dd>
						</div>
					</dl>
				</section>

				<div class="mt-4 grid gap-4 lg:grid-cols-3">
					<div class="min-w-0 lg:col-span-2">
						<ModuleBoard
							{dashboard}
							onOpen={openModule}
							onStudent={openStudent}
							onAll={() => navigate({ view: 'modules' })}
						/>
					</div>

					<Card.Root class="flex flex-col gap-0 overflow-hidden py-0 lg:row-span-2">
						<header class="flex items-center justify-between gap-3 border-b border-muted px-5 py-4">
							<h2 class="text-base font-semibold">Live activity</h2>
							<Button
								variant="ghost"
								tone="neutral"
								size="xs"
								class="gap-0.5"
								onclick={() => navigate({ view: 'live' })}
								>Results <ChevronRight size={13} /></Button
							>
						</header>
						<div class="max-h-[34rem] min-h-0 flex-1 overflow-y-auto lg:max-h-none lg:basis-0">
							{#if !live || !dashboard.ready}
								<div class="space-y-3 p-5">
									{#each [1, 2, 3, 4, 5] as row (row)}<Skeleton class="h-12" />{/each}
								</div>
							{:else}
								<LiveFeed
									sessions={live.sessions}
									studentsById={dashboard.studentsById}
									now={dashboard.now}
									onStudent={openStudent}
									onModule={openModule}
								/>
							{/if}
						</div>
					</Card.Root>

					<Card.Root class="gap-0 p-5 lg:col-span-2">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<h2 class="text-base font-semibold">Activity</h2>
							<SegmentedControl
								bind:value={activity}
								options={[
									{ value: 'days', label: '14 days' },
									{ value: 'hours', label: 'By hour' }
								]}
								size="xs"
								track="muted"
								activeVariant="raised"
								aria-label="Activity view"
							/>
						</div>
						<div class="mt-4">
							{#if !live}<Skeleton class="h-52" />{:else if activity === 'days'}<ActivityBars
									days={dashboard.days}
									live={dashboard.studyingNow.length > 0}
								/>{:else}<StudyHeatmap cells={dashboard.heatmap} />{/if}
						</div>
					</Card.Root>
				</div>

				<div class="mt-4 grid gap-4 lg:grid-cols-3">
					<Card.Root class="gap-0 p-5">
						<h2 class="mb-3 text-base font-semibold">Students</h2>
						<CohortField {dashboard} onStudent={openStudent} onFilter={showStudents} />
					</Card.Root>

					<Card.Root class="gap-0 p-5">
						<div class="flex items-center justify-between gap-3">
							<h2 class="text-base font-semibold">Worth a check-in</h2>
							{#if dashboard.engagementCounts.cooling > checkIns.length}
								<Button
									variant="ghost"
									tone="neutral"
									size="xs"
									class="shrink-0"
									onclick={() => showStudents('cooling')}
									>All {dashboard.engagementCounts.cooling} <ChevronRight size={13} /></Button
								>
							{/if}
						</div>
						{#if !dashboard.ready}<Skeleton class="mt-4 h-40" />{:else}
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
												<span class="block text-xs text-muted-foreground"
													>{student.questionsInteracted} questions tried</span
												>
											</span>
											<span class="text-xs whitespace-nowrap text-warning-ink"
												>{relativeTime(student.lastActivityAt, dashboard.now)}</span
											>
										</button>
									</li>
								{:else}
									<li class="px-2 py-10 text-center text-sm text-muted-foreground">
										Everyone who started is still active.
									</li>
								{/each}
							</ul>
						{/if}
					</Card.Root>

					<Card.Root class="gap-0 overflow-hidden py-0">
						<h2 class="px-5 pt-5 pb-3 text-base font-semibold">Flagged by students</h2>
						{#if dashboard.flaggedQuery.error}<Alert.Root
								tone="error"
								class="m-5 mt-0"
								role="alert"
							>
								<Alert.Description>Flagged questions could not load.</Alert.Description>
							</Alert.Root>{:else if !dashboard.flaggedQuery.data}<Skeleton
								class="m-5 mt-0 h-40"
							/>{:else}
							{#each dashboard.flaggedQuery.data as question (question._id)}
								<button
									class="group flex w-full items-center gap-3 border-t border-muted px-5 py-3 text-left hover:bg-muted/60"
									onclick={() => openModule(question.moduleId)}
								>
									<Badge variant="soft" tone="warning" size="sm" class="shrink-0 gap-1 tabular-nums"
										><Flag size={11} />{question.flagCount}</Badge
									>
									<span class="min-w-0 flex-1">
										<span class="line-clamp-1 text-sm group-hover:text-primary-ink"
											>{plainText(question.stem)}</span
										>
										<span class="block truncate text-[11px] text-muted-foreground"
											>{question.moduleTitle} · {question.className}</span
										>
									</span>
								</button>
							{:else}
								<p class="border-t border-muted p-8 text-center text-sm text-muted-foreground">
									No flagged questions.
								</p>
							{/each}
						{/if}
					</Card.Root>
				</div>

				<details class="mt-4 px-1 text-xs text-muted-foreground">
					<summary class="flex cursor-pointer list-none items-center gap-2"
						><CircleHelp size={14} />How these numbers work</summary
					>
					<p class="mt-2 max-w-3xl leading-relaxed">
						Charts count first attempts at questions. Re-answering a question updates "last active"
						and who is in a module, but isn't counted again. "Studying now" means an answer in the
						last 15 minutes. Practice test averages include finished and timed-out tests.
						{#if live?.truncated}Activity is sampled from the most recent 4,000 attempts, so totals
							marked "+" are lower bounds.{/if}
					</p>
				</details>
			{:else if view === 'live'}
				<LiveView {dashboard} onOpen={openModule} onStudent={openStudent} />
			{:else if view === 'modules'}
				<ModulesView
					{dashboard}
					classId={params.get('class') ?? ''}
					semesterId={params.get('semester') ?? ''}
					layout={params.get('layout') ?? 'grid'}
					onNavigate={navigate}
					onOpen={openModule}
					onStudent={openStudent}
				/>
			{:else if view === 'studio'}
				<CuratorGenerationRuns {cohortId} />
			{:else}
				<StudentsView
					{dashboard}
					filter={params.get('filter') ?? 'all'}
					onFilter={(value) => navigate({ filter: value === 'all' ? null : value })}
					onStudent={openStudent}
					onModule={openModule}
				/>
			{/if}
		</div>

		<ModuleLens
			{dashboard}
			moduleId={lensModuleId}
			onClose={() => navigate({ module: null })}
			onOpen={openModule}
			onStudent={openStudent}
		/>
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
		}
	}
</style>
