<script lang="ts">
	import type { PageData } from './$types';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { pushState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Activity,
		ArrowLeft,
		ArrowUpRight,
		BookOpen,
		ChevronRight,
		CircleHelp,
		Compass,
		LayoutDashboard,
		Search,
		Sparkles,
		Target,
		Users
	} from 'lucide-svelte';
	import StudentDetailModal from '$lib/admin/StudentDetailModal.svelte';
	import CuratorGenerationRuns from '$lib/admin/CuratorGenerationRuns.svelte';
	import StudentAvatar from '$lib/admin/progress/StudentAvatar.svelte';
	import Explorer from '$lib/admin/progress/Explorer.svelte';
	import { percent, relativeTime } from '$lib/admin/progress/utils';

	let { data }: { data: PageData } = $props();
	const user = $derived(data.userData);
	const cohortId = $derived(user?.cohortId as Id<'cohort'> | undefined);
	const client = useConvexClient();
	const views = [
		{ id: 'overview', label: 'Overview', icon: LayoutDashboard },
		{
			id: 'curriculum',
			label: 'Classes',
			icon: BookOpen
		},
		{ id: 'students', label: 'Students', icon: Users },
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
	let now = $state(Date.now());
	let connected = $state(false);
	let everConnected = $state(false);
	let selectedStudentId = $state<Id<'users'> | null>(null);

	onMount(() => {
		const updateConnection = (state: ReturnType<typeof client.connectionState>) => {
			connected = state.isWebSocketConnected;
			everConnected = state.hasEverConnected;
		};
		updateConnection(client.connectionState());
		const unsubscribe = client.subscribeToConnectionState(updateConnection);
		const timer = setInterval(() => (now = Date.now()), 60000);
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

	const studentsQuery = useQuery(api.progress.getStudentsWithProgress, () =>
		cohortId ? { cohortId, includeSubscription: false } : 'skip'
	);
	// This query is a ranked sample, not an aggregate over the whole curriculum.
	const moduleQuery = useQuery(api.progress.getModuleCompletionStats, () =>
		cohortId && view === 'overview' ? { cohortId, limit: 6 } : 'skip'
	);
	const students = $derived(
		(studentsQuery.data ?? []).map((student) => ({
			...student,
			progress: percent(student.questionsInteracted, student.totalQuestions)
		}))
	);
	const measuredStudents = $derived(students.filter((student) => student.statsAvailable === true));
	const notStarted = $derived(
		measuredStudents.filter((student) => student.questionsInteracted === 0).length
	);
	const started = $derived(measuredStudents.filter((s) => s.questionsInteracted > 0).length);
	const active = $derived(
		measuredStudents.filter((s) => (s.lastActivityAt ?? 0) >= now - 7 * 86400000).length
	);
	const quiet = $derived(
		measuredStudents.filter(
			(s) => s.questionsInteracted > 0 && (s.lastActivityAt ?? 0) < now - 30 * 86400000
		).length
	);
	const median = $derived.by(() => {
		const values = measuredStudents.map((s) => s.progress).sort((a, b) => a - b);
		const mid = Math.floor(values.length / 2);
		return values.length
			? Math.round(values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2)
			: 0;
	});
	const bands = $derived([
		{
			id: 'none',
			label: 'Not started',
			detail: 'No questions tried',
			color: 'bg-base-300',
			text: 'text-base-content',
			count: notStarted
		},
		{
			id: 'early',
			label: 'Under 25%',
			detail: 'Started · <25% tried',
			color: 'bg-info',
			text: 'text-info',
			count: measuredStudents.filter((s) => s.questionsInteracted > 0 && s.progress < 25).length
		},
		{
			id: 'building',
			label: '25–74%',
			detail: 'Question bank tried',
			color: 'bg-primary',
			text: 'text-primary',
			count: measuredStudents.filter(
				(s) => s.questionsInteracted > 0 && s.progress >= 25 && s.progress < 75
			).length
		},
		{
			id: 'strong',
			label: '75–100%',
			detail: 'Question bank tried',
			color: 'bg-success',
			text: 'text-success',
			count: measuredStudents.filter((s) => s.questionsInteracted > 0 && s.progress >= 75).length
		}
	]);
	const filters = $derived([
		{ id: 'all', label: 'All students', count: students.length },
		{ id: 'active', label: 'Active this week', count: active },
		{ id: 'quiet', label: 'Quiet for 30+ days', count: quiet },
		{ id: 'none', label: 'Not started', count: notStarted },
		...bands
			.filter((b) => b.id === filter && b.id !== 'none')
			.map((b) => ({ id: b.id, label: `${b.label} coverage`, count: b.count }))
	]);
	const filteredStudents = $derived(
		students
			.filter((s) => {
				const matches = `${s.name} ${s.email ?? ''} ${s.username ?? ''}`
					.toLowerCase()
					.includes(search.toLowerCase());
				if (!matches) return false;
				if (filter !== 'all' && !s.statsAvailable) return false;
				if (filter === 'active') return (s.lastActivityAt ?? 0) >= now - 7 * 86400000;
				if (filter === 'quiet')
					return s.questionsInteracted > 0 && (s.lastActivityAt ?? 0) < now - 30 * 86400000;
				if (filter === 'none') return s.questionsInteracted === 0;
				if (filter === 'early') return s.questionsInteracted > 0 && s.progress < 25;
				if (filter === 'building')
					return s.questionsInteracted > 0 && s.progress >= 25 && s.progress < 75;
				if (filter === 'strong') return s.questionsInteracted > 0 && s.progress >= 75;
				return true;
			})
			.sort((a, b) =>
				sort === 'name'
					? a.name.localeCompare(b.name)
					: sort === 'coverage'
						? b.progress - a.progress || a.name.localeCompare(b.name)
						: (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0) || a.name.localeCompare(b.name)
			)
	);
	const recentStudents = $derived(
		[...measuredStudents]
			.filter((s) => s.lastActivityAt)
			.sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0))
			.slice(0, 5)
	);
	const selectedStudent = $derived(students.find((s) => s._id === selectedStudentId) ?? null);
	async function updateRole(userId: Id<'users'>, role: 'dev' | 'admin' | 'curator' | null) {
		await client.mutation(api.users.updateUserRole, { userId, role });
	}
	function openStudent(id: Id<'users'>) {
		selectedStudentId = id;
	}
</script>

<svelte:head
	><title>Class Progress · LearnTerms</title><meta
		name="description"
		content="Explore live cohort participation, student coverage, and question-level insights."
	/></svelte:head
>

<div class="progress-workspace mx-auto max-w-[1800px] p-4 text-base-content sm:p-6">
	<div class="min-w-0">
		<header class="mb-6 flex flex-col items-start gap-5">
			<div class="flex min-w-0 items-center gap-3">
				<a class="btn btn-ghost btn-circle" href={resolve('/admin')} aria-label="Back to admin"
					><ArrowLeft size={20} /></a
				>
				<div class="min-w-0">
					<h1 class="text-2xl font-bold tracking-tight">Class progress</h1>
					<p class="mt-1 text-sm text-base-content/60">{user?.cohortName} · {user?.schoolName}</p>
				</div>
			</div>
			<nav
				class="flex max-w-full gap-1 overflow-x-auto rounded-full border border-base-300 bg-base-200 p-1"
				aria-label="Progress views"
			>
				{#each views as item}<button
						class="btn btn-sm shrink-0 rounded-full border-0 px-4 {view === item.id
							? 'bg-base-100 text-primary shadow-sm'
							: 'btn-ghost text-base-content/65'}"
						aria-pressed={view === item.id}
						onclick={() => navigate({ view: item.id === 'overview' ? null : item.id })}
						><item.icon size={16} class="hidden sm:block" />{item.label}</button
					>{/each}
			</nav>
		</header>
		{#if !cohortId}<div class="alert alert-warning">No cohort is assigned to your account.</div>
		{:else}
			{#if !connected && everConnected}<div class="alert alert-warning mb-5" role="status">
					Connection interrupted. Displayed data may be out of date; updates resume automatically
					when reconnected.
				</div>{/if}

			{#if view === 'overview'}
				{#if studentsQuery.error}<div class="alert alert-error mb-5" role="alert">
						Cohort insights could not load. {studentsQuery.error?.message}
					</div>{/if}
				<div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
					{#each [{ label: 'Students in cohort', value: students.length, suffix: '', note: 'Cohort members', icon: Users, filter: 'all', tone: 'text-base-content' }, { label: 'Active this week', value: measuredStudents.length ? active : '—', suffix: '', note: measuredStudents.length ? `${percent(active, measuredStudents.length)}% of tracked students` : 'Last 7 days', icon: Activity, filter: 'active', tone: 'text-primary' }, { label: 'Median coverage', value: measuredStudents.length ? median : '—', suffix: measuredStudents.length ? '%' : '', note: 'Share of questions tried', icon: Target, filter: 'all', tone: 'text-success' }, { label: 'Not started', value: measuredStudents.length ? notStarted : '—', suffix: '', note: 'No questions tried yet', icon: Compass, filter: 'none', tone: 'text-base-content' }] as metric}<button
							class="group rounded-2xl border border-base-300 bg-base-100 p-4 text-left transition hover:border-primary sm:p-5"
							disabled={!studentsQuery.data}
							onclick={() => showStudents(metric.filter)}
							><span class="flex items-center justify-between gap-2 text-sm text-base-content/65"
								>{metric.label}<metric.icon size={18} class="hidden shrink-0 sm:block" /></span
							>{#if !studentsQuery.data}<span class="skeleton my-4 block h-12 w-20"
								></span>{:else}<span
									class="my-3 block text-5xl font-semibold tracking-tighter tabular-nums {metric.tone}"
									>{metric.value}<span class="text-3xl">{metric.suffix}</span></span
								>{/if}<span
								class="flex items-center justify-between gap-2 text-xs text-base-content/55"
								>{metric.note}<ArrowUpRight size={14} class="shrink-0 text-primary" /></span
							></button
						>{/each}
				</div>
				<div class="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
					<div class="space-y-5">
						<section class="rounded-2xl border border-base-300 bg-base-100 p-5 sm:p-6">
							<div class="flex items-start justify-between gap-3">
								<div>
									<h2 class="text-xl font-semibold">Coverage distribution</h2>
								</div>
								<span class="badge badge-ghost"
									>{studentsQuery.data ? `${measuredStudents.length} with stats` : 'Loading'}</span
								>
							</div>
							<p class="mt-2 text-sm text-base-content/60">
								Students by share of the question bank tried.
							</p>
							{#if studentsQuery.isLoading}<div
									class="skeleton mt-6 h-32"
								></div>{:else if !measuredStudents.length}<p
									class="py-12 text-center text-base-content/60"
								>
									No coverage summary yet.
								</p>{:else}<div
									class="mt-6 flex h-12 gap-1 overflow-hidden rounded-xl"
									aria-label="Coverage distribution"
								>
									{#each bands.filter((b) => b.count > 0) as band}<button
											class="min-w-3 transition hover:opacity-75 {band.color}"
											style="flex: {band.count} 1 0%"
											aria-label="{band.label}: {band.count} students"
											title="{band.label}: {band.count} students"
											onclick={() => showStudents(band.id)}
										></button>{/each}
								</div>
								<div class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
									{#each bands as band}<button
											class="rounded-xl p-2 text-left hover:bg-base-200"
											onclick={() => showStudents(band.id)}
											><span class="flex items-center gap-2 text-xs text-base-content/65"
												><span class="h-2 w-2 rounded-full {band.color}"></span>{band.label}</span
											><strong class="mt-2 block text-3xl font-semibold tabular-nums"
												>{band.count}<span class="ml-2 text-xs font-normal text-base-content/45"
													>{percent(band.count, measuredStudents.length)}%</span
												></strong
											><span class="mt-1 block text-[11px] leading-relaxed text-base-content/55"
												>{band.detail}</span
											></button
										>{/each}
								</div>{/if}
							<details class="mt-5 border-t border-base-300 pt-4">
								<summary
									class="flex cursor-pointer list-none items-center gap-2 text-xs text-base-content/60"
									><CircleHelp size={14} />How to read these numbers<ChevronRight
										size={14}
										class="ml-auto"
									/></summary
								>
								<p class="mt-3 text-sm leading-relaxed text-base-content/60">
									Coverage is the share of questions tried, not an exam score. Participation means a
									student has tried a question; coverage counts student–question pairs tried. A low
									percentage may simply reflect new or optional content. Activity windows use the
									student’s last recorded activity.
								</p>
							</details>
						</section>
						<section class="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
							<header class="flex flex-wrap items-end justify-between gap-3 p-5 sm:p-6">
								<div>
									<h2 class="text-xl font-semibold">Least explored modules</h2>
									<p class="mt-2 text-sm text-base-content/60">
										{moduleQuery.data
											? `Lowest coverage · ${moduleQuery.data.modules.length} of ${moduleQuery.data.totalModules} modules`
											: 'Loading module coverage…'}
									</p>
								</div>
								<button
									class="btn rounded-full btn-ghost btn-sm"
									onclick={() => navigate({ view: 'curriculum' })}
									>Explore all <ArrowUpRight size={15} /></button
								>
							</header>
							{#if moduleQuery.error}<div class="alert alert-error m-5" role="alert">
									Module insights could not load.
								</div>{:else if moduleQuery.isLoading}<div class="space-y-3 p-5">
									{#each [1, 2, 3] as row}<div class="skeleton h-16"></div>{/each}
								</div>{:else}{#each moduleQuery.data?.modules ?? [] as module (module.moduleId)}<button
										class="group flex w-full items-center gap-3 border-t border-base-300 px-5 py-4 text-left hover:bg-base-200/60 sm:px-6"
										onclick={() => showModule(module.classId, module.moduleId)}
										><span
											class="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-base-200 text-xl sm:flex"
											>{module.moduleEmoji ?? '📚'}</span
										><span class="min-w-0 flex-1"
											><strong class="block truncate text-sm">{module.moduleTitle}</strong><span
												class="mt-1 block truncate text-xs text-base-content/55"
												>{module.className} · {module.totalQuestions} questions</span
											><span class="mt-1 block text-xs text-base-content/60"
												>{module.activeStudents}/{module.totalStudents} students{module.questionsFlagged
													? ` · ${module.questionsFlagged} flags`
													: ''}</span
											></span
										><span class="w-20 shrink-0"
											><span class="mb-1 block text-right text-sm font-semibold tabular-nums"
												>{module.completion}%</span
											><progress
												class="progress progress-primary h-1.5 w-full"
												value={module.completion}
												max="100"
												aria-label="Question coverage"
											></progress><span class="block text-right text-[10px] text-base-content/50"
												>coverage</span
											></span
										><ChevronRight
											size={18}
											class="shrink-0 text-base-content/35 group-hover:text-primary"
										/></button
									>{:else}<p class="p-8 text-center text-base-content/60">
										No modules available yet.
									</p>{/each}{/if}
						</section>
					</div>
					<div class="space-y-5">
						<section class="rounded-2xl bg-primary p-5 text-primary-content sm:p-6">
							<h2 class="text-xl font-semibold">Participation</h2>

							<div class="mt-5 space-y-2">
								<button
									class="flex w-full items-center gap-3 rounded-xl border border-primary-content/20 p-4 text-left hover:bg-primary-content/10"
									disabled={!studentsQuery.data}
									onclick={() => showStudents('none')}
									><span class="text-3xl font-semibold tabular-nums"
										>{measuredStudents.length ? notStarted : '—'}</span
									><span class="flex-1 text-sm">Not started</span><ArrowUpRight size={18} /></button
								><button
									class="flex w-full items-center gap-3 rounded-xl border border-primary-content/20 p-4 text-left hover:bg-primary-content/10"
									disabled={!studentsQuery.data}
									onclick={() => showStudents('quiet')}
									><span class="text-3xl font-semibold tabular-nums"
										>{measuredStudents.length ? quiet : '—'}</span
									><span class="flex-1 text-sm"
										>Inactive for 30+ days<span class="block text-xs opacity-65"
											>Previously started studying</span
										></span
									><ArrowUpRight size={18} /></button
								>
							</div>
						</section>
						<section class="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
							<header class="flex items-center justify-between p-5">
								<div>
									<h2 class="text-xl font-semibold">Recent activity</h2>
								</div>
								<Activity size={19} class="text-success" />
							</header>
							{#if studentsQuery.isLoading}<div
									class="skeleton m-5 h-28"
								></div>{:else}{#each recentStudents as student (student._id)}<button
										class="flex w-full items-center gap-3 border-t border-base-300 px-5 py-4 text-left hover:bg-base-200/60"
										onclick={() => openStudent(student._id)}
										><StudentAvatar name={student.name} imageUrl={student.imageUrl} /><span
											class="min-w-0 flex-1"
											><strong class="block truncate text-sm">{student.name}</strong><span
												class="mt-0.5 block text-xs text-base-content/55"
												>{student.statsAvailable
													? relativeTime(student.lastActivityAt, now)
													: 'Unknown'}</span
											></span
										><span class="text-sm font-medium tabular-nums">{student.progress}%</span
										><ChevronRight size={15} class="text-base-content/40" /></button
									>{:else}<p class="p-5 pt-0 text-sm text-base-content/60">
										Recent learners appear here when activity is recorded.
									</p>{/each}{/if}<button
								class="btn rounded-full btn-ghost w-full rounded-none border-t border-base-300 text-sm"
								onclick={() => showStudents()}>View all students <ChevronRight size={16} /></button
							>
						</section>
						<div class="flex items-start gap-3 px-1 text-sm text-base-content/55">
							<BookOpen size={18} class="mt-0.5 shrink-0" />
							<p>
								{moduleQuery.data
									? `${moduleQuery.data.totalModules} modules to explore.`
									: 'Loading curriculum…'}<span class="mt-1 block text-xs">{user?.schoolName}</span>
							</p>
						</div>
					</div>
				</div>
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
				<section class="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
					<div class="border-b border-base-300 p-5">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div>
								<h2 class="text-xl font-semibold">Students</h2>
								<p class="mt-1 text-sm text-base-content/60">
									{studentsQuery.data
										? `${filteredStudents.length} of ${students.length} students`
										: 'Loading students…'}
								</p>
							</div>
							<div class="flex w-full flex-wrap gap-2 sm:w-auto">
								<label class="input rounded-full min-w-0 flex-1 sm:w-60"
									><Search size={17} class="text-base-content/50" /><input
										type="search"
										placeholder="Name, email, or username…"
										aria-label="Search students"
										bind:value={search}
									/></label
								><select
									class="select rounded-full w-40"
									aria-label="Sort students"
									bind:value={sort}
									><option value="recent">Recently active</option><option value="coverage"
										>Highest coverage</option
									><option value="name">Name A–Z</option></select
								>
							</div>
						</div>
						<div class="mt-5 flex flex-wrap gap-2" aria-label="Student filters">
							{#each filters as option}<button
									class="btn rounded-full btn-sm {filter === option.id
										? 'btn-primary'
										: 'btn-ghost bg-base-200'}"
									aria-pressed={filter === option.id}
									onclick={() => navigate({ filter: option.id === 'all' ? null : option.id })}
									>{option.label}<span class="opacity-60">{option.count}</span></button
								>{/each}
						</div>
					</div>
					{#if studentsQuery.error}<div class="alert alert-error m-5" role="alert">
							Students could not load. {studentsQuery.error.message}
						</div>{:else if studentsQuery.isLoading}<div class="space-y-3 p-5">
							{#each [1, 2, 3, 4] as row}<div class="skeleton h-20"></div>{/each}
						</div>{:else if !filteredStudents.length}<div class="p-12 text-center">
							<Search size={30} class="mx-auto mb-4 text-base-content/40" />
							<h3 class="text-xl font-semibold">
								{students.length ? 'No students in this view' : 'Your cohort is empty'}
							</h3>
							<p class="mt-2 text-sm text-base-content/60">
								{students.length
									? 'Try another group or clear your search.'
									: 'Students will appear here when they join.'}
							</p>
							{#if students.length}<button
									class="btn rounded-full btn-outline mt-5"
									onclick={() => showStudents()}>Show all students</button
								>{/if}
						</div>{:else}<div class="overflow-x-auto">
							<table class="table">
								<thead
									><tr class="text-xs text-base-content/55"
										><th class="pl-5">Student</th><th>Coverage</th><th class="text-right"
											>Questions tried</th
										><th>Last active</th><th class="hidden xl:table-cell">Joined</th><th
											><span class="sr-only">Details</span></th
										></tr
									></thead
								><tbody
									>{#each filteredStudents as student (student._id)}<tr class="hover:bg-base-200/50"
											><td class="py-4 pl-5"
												><button
													class="flex items-center gap-3 text-left"
													onclick={() => openStudent(student._id)}
													><span class="avatar avatar-placeholder"
														><span
															class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-primary/10 font-semibold text-primary"
															>{#if student.imageUrl}<img
																	src={student.imageUrl}
																	alt=""
																	class="h-full w-full object-cover"
																/>{:else}{student.name.slice(0, 1)}{/if}</span
														></span
													><span
														><span class="block font-semibold hover:text-primary"
															>{student.name}</span
														><span class="mt-1 block max-w-56 truncate text-xs text-base-content/55"
															>{student.email ?? student.username ?? 'Student'}</span
														>{#if student.role}<span
																class="badge badge-ghost badge-xs mt-1 capitalize"
																>{student.role}</span
															>{/if}</span
													></button
												></td
											><td
												><div class="min-w-32">
													<div class="mb-1 flex items-baseline gap-2">
														<strong class="text-lg tabular-nums"
															>{student.statsAvailable ? `${student.progress}%` : '—'}</strong
														><span class="text-xs text-base-content/50"
															>{student.statsAvailable
																? `${student.questionsInteracted}/${student.totalQuestions}`
																: ''}</span
														>
													</div>
													{#if student.statsAvailable}<progress
															class="progress h-1.5 w-32 {student.progress >= 75
																? 'progress-success'
																: 'progress-primary'}"
															value={student.progress}
															max="100"
															aria-label="{student.name} coverage"
														></progress>{/if}
												</div></td
											><td class="text-right font-medium tabular-nums"
												>{student.statsAvailable ? student.questionsInteracted : '—'}</td
											><td class="whitespace-nowrap text-sm text-base-content/65"
												>{student.statsAvailable
													? relativeTime(student.lastActivityAt, now)
													: 'Unknown'}</td
											><td class="hidden text-sm text-base-content/55 xl:table-cell"
												>{student.createdAt
													? new Date(student.createdAt).toLocaleDateString()
													: '—'}</td
											><td
												><button
													class="btn rounded-full btn-ghost btn-square"
													aria-label="View progress for {student.name}"
													onclick={() => openStudent(student._id)}
													><ChevronRight size={18} /></button
												></td
											></tr
										>{/each}</tbody
								>
							</table>
						</div>{/if}
				</section>
			{/if}
		{/if}
	</div>
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
		outline-offset: 3px;
	}
	@media (prefers-reduced-motion: reduce) {
		.progress-workspace :global(*) {
			transition: none !important;
			animation: none !important;
		}
	}
</style>
