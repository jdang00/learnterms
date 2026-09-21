<script lang="ts">
	import type { PageData } from './$types';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import {
		ArrowLeft,
		Award,
		ChevronRight,
		Flag,
		PenTool,
		Search,
		Shield,
		Sparkles,
		Users,
		Zap
	} from 'lucide-svelte';
	import AdminStatStrip from '$lib/admin/AdminStatStrip.svelte';
	import type { StatItem } from '$lib/admin/adminStatStrip';
	import StudentDetailModal from '$lib/admin/StudentDetailModal.svelte';
	import CuratorModuleAnalytics from '$lib/admin/CuratorModuleAnalytics.svelte';
	import CuratorGenerationRuns from '$lib/admin/CuratorGenerationRuns.svelte';
	import { formatUsd } from '$lib/admin/questionStudioRun';
	import { resolve } from '$app/paths';

	let { data }: { data: PageData } = $props();
	const userData = $derived(data.userData);
	const client = useConvexClient();
	const isDev = $derived(userData?.role === 'dev');
	const isAdmin = $derived(userData?.role === 'dev' || userData?.role === 'admin');
	const cohortId = $derived(userData?.cohortId as Id<'cohort'> | undefined);

	type Tab = 'overview' | 'modules' | 'studio' | 'students';
	const tabs: Array<{ id: Tab; label: string }> = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'modules', label: 'Modules' },
		{ id: 'studio', label: 'Question Studio' },
		{ id: 'students', label: 'Students' }
	];
	let activeTab = $state<Tab>('overview');

	let isStudentModalOpen = $state(false);
	let selectedStudentId = $state<Id<'users'> | null>(null);
	let searchQuery = $state('');
	let studentSort = $state<'progress' | 'name' | 'recent'>('progress');

	async function updateRole(userId: Id<'users'>, role: 'dev' | 'admin' | 'curator' | null) {
		await client.mutation(api.users.updateUserRole, { userId, role });
	}

	const cohortStats = useQuery(api.progress.getCohortProgressStats, () =>
		cohortId ? { cohortId } : 'skip'
	);

	const studentsWithProgress = useQuery(api.progress.getStudentsWithProgress, () =>
		cohortId ? { cohortId, includeSubscription: false } : 'skip'
	);

	const moduleStats = useQuery(api.progress.getModuleCompletionStats, () =>
		cohortId ? { cohortId, limit: 50 } : 'skip'
	);

	const generationHistory = useQuery(api.questionStudio.listCohortGenerationJobs, () =>
		cohortId ? { cohortId, limit: 1 } : 'skip'
	);

	const students = $derived(studentsWithProgress.data ?? []);
	const modules = $derived(moduleStats.data?.modules ?? []);

	const activeLearners = $derived(
		students.filter((student) => student.questionsInteracted > 0).length
	);
	const activeLearnerRate = $derived(
		students.length ? Math.round((activeLearners / students.length) * 100) : 0
	);
	const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
	const activeThisWeek = $derived(
		students.filter((student) => (student.lastActivityAt ?? 0) >= weekAgo).length
	);
	const medianMastery = $derived.by(() => {
		const values = students.map((student) => student.progress).sort((a, b) => a - b);
		if (values.length === 0) return 0;
		const middle = Math.floor(values.length / 2);
		return values.length % 2 === 0
			? Math.round((values[middle - 1] + values[middle]) / 2)
			: values[middle];
	});
	const untouchedModules = $derived(modules.filter((module) => module.activeStudents === 0).length);
	const flaggedTotal = $derived(
		modules.reduce((total, module) => total + module.questionsFlagged, 0)
	);

	const overviewStats = $derived.by<StatItem[]>(() => [
		{
			label: 'Students',
			value: String(cohortStats.data?.totalStudents ?? students.length),
			note: `${activeThisWeek} active this week`
		},
		{
			label: 'Engaged',
			value: `${activeLearnerRate}%`,
			fill: activeLearnerRate / 100,
			note: `${activeLearners} have started`,
			tone: activeLearnerRate < 50 ? 'warning' : undefined
		},
		{
			label: 'Median mastery',
			value: `${medianMastery}%`,
			fill: medianMastery / 100,
			note: 'Per student, cohort-wide'
		},
		{
			label: 'Questions',
			value: String(cohortStats.data?.totalQuestions ?? 0),
			note: `${cohortStats.data?.totalModules ?? 0} modules`
		},
		{
			label: 'Flags open',
			value: String(flaggedTotal),
			tone: flaggedTotal > 0 ? 'warning' : undefined,
			note: flaggedTotal > 0 ? 'Reported by students' : 'Nothing reported'
		},
		{
			label: 'Untouched',
			value: String(untouchedModules),
			note: 'Modules nobody opened',
			tone: untouchedModules > 0 ? 'warning' : undefined
		},
		{
			label: 'Studio spend',
			value: formatUsd(generationHistory.data?.summary.spendThisWeek ?? 0),
			note: `${generationHistory.data?.summary.runsThisWeek ?? 0} runs this week`
		}
	]);

	const studentStats = $derived.by<StatItem[]>(() => [
		{ label: 'In cohort', value: String(students.length) },
		{
			label: 'Active this week',
			value: String(activeThisWeek),
			fill: students.length ? activeThisWeek / students.length : 0
		},
		{ label: 'Never started', value: String(students.length - activeLearners) },
		{ label: 'Median mastery', value: `${medianMastery}%`, fill: medianMastery / 100 }
	]);

	// Modules a curator should look at first: nobody has opened them, they carry flags,
	// or engagement is far behind the rest of the cohort.
	const needsAttention = $derived(
		modules
			.map((module) => ({
				...module,
				reason:
					module.totalQuestions === 0
						? 'No questions yet'
						: module.activeStudents === 0
							? 'Nobody has opened it'
							: module.questionsFlagged > 0
								? `${module.questionsFlagged} flagged question${module.questionsFlagged === 1 ? '' : 's'}`
								: module.completion < 25
									? 'Low engagement'
									: ''
			}))
			.filter((module) => module.reason)
			.sort((a, b) => a.completion - b.completion || b.questionsFlagged - a.questionsFlagged)
			.slice(0, 8)
	);

	const topModules = $derived(
		[...modules]
			.filter((module) => module.totalQuestions > 0)
			.sort((a, b) => b.completion - a.completion)
			.slice(0, 8)
	);

	const filteredStudents = $derived(
		students.filter((student) => {
			const query = searchQuery.toLowerCase();
			if (!query) return true;
			return (
				student.name.toLowerCase().includes(query) ||
				student.email?.toLowerCase().includes(query) ||
				student.username?.toLowerCase().includes(query)
			);
		})
	);

	const sortedStudents = $derived(
		[...filteredStudents].sort((a, b) => {
			if (studentSort === 'name') return a.name.localeCompare(b.name);
			if (studentSort === 'recent') return (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0);
			return b.progress - a.progress;
		})
	);

	const selectedStudent = $derived(
		selectedStudentId
			? (students.find((student) => student._id === selectedStudentId) ?? null)
			: null
	);

	function openStudentModal(studentId: Id<'users'>) {
		selectedStudentId = studentId;
		isStudentModalOpen = true;
	}

	function formatRelativeTime(timestamp: number | null | undefined): string {
		if (!timestamp) return 'Never';
		const diff = Date.now() - timestamp;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);
		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		if (days < 30) return `${Math.floor(days / 7)}w ago`;
		return new Date(timestamp).toLocaleDateString();
	}

	function initials(name: string): string {
		return name
			.split(' ')
			.map((part) => part[0] ?? '')
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}
</script>

<div class="mx-auto max-w-[1800px] p-4 sm:p-6">
	<header class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
		<a class="btn btn-ghost btn-sm gap-2 rounded-full" href={resolve('/admin')}>
			<ArrowLeft size={16} />
			<span class="hidden sm:inline">Back</span>
		</a>
		<div class="h-6 w-px bg-base-300"></div>
		<div class="min-w-0">
			<h1 class="text-lg font-semibold leading-tight">Class Progress</h1>
			<p class="truncate text-xs text-base-content/60">
				{userData?.schoolName}
				<span class="mx-1 text-base-content/25">/</span>
				{userData?.cohortName}
			</p>
		</div>

		<div
			class="ml-auto flex rounded-full border border-base-300 bg-base-200 p-1"
			role="tablist"
			aria-label="Class progress views"
		>
			{#each tabs as tab (tab.id)}
				<button
					role="tab"
					aria-selected={activeTab === tab.id}
					class="btn btn-sm rounded-full border-0 {activeTab === tab.id
						? 'bg-base-100 text-primary shadow-sm'
						: 'btn-ghost text-base-content/60'}"
					onclick={() => (activeTab = tab.id)}
				>
					{tab.label}
				</button>
			{/each}
		</div>
	</header>

	{#if !cohortId}
		<div class="alert alert-warning rounded-2xl">No cohort assigned to your account.</div>
	{:else if activeTab === 'overview'}
		<div class="space-y-3">
			<AdminStatStrip
				items={overviewStats}
				loading={cohortStats.isLoading || studentsWithProgress.isLoading}
				ariaLabel="Cohort summary"
			/>

			<div class="grid gap-3 xl:grid-cols-2">
				<section class="rounded-2xl border border-base-300 bg-base-100 shadow-xs">
					<header class="flex items-center gap-2 border-b border-base-300 px-4 py-2.5">
						<h2 class="text-sm font-semibold">Needs attention</h2>
						<span class="text-xs text-base-content/45">
							{needsAttention.length} of {modules.length} modules
						</span>
						<button
							class="btn btn-ghost btn-xs ml-auto rounded-full"
							onclick={() => (activeTab = 'modules')}
						>
							Module analytics
							<ChevronRight size={13} />
						</button>
					</header>
					{#if moduleStats.isLoading}
						<div class="space-y-2 p-4">
							{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
								<div class="skeleton h-8 w-full rounded-lg"></div>
							{/each}
						</div>
					{:else if needsAttention.length === 0}
						<p class="p-6 text-center text-sm text-base-content/50">
							Every module has questions and activity. Nothing needs a look right now.
						</p>
					{:else}
						<ul class="divide-y divide-base-300">
							{#each needsAttention as module (module.moduleId)}
								<li class="flex items-center gap-3 px-4 py-2 text-xs">
									<span class="min-w-0 flex-1">
										<span class="block truncate font-medium">{module.moduleTitle}</span>
										<span class="block truncate text-base-content/45">{module.className}</span>
									</span>
									<span class="shrink-0 text-warning">{module.reason}</span>
									<span class="w-20 shrink-0">
										<span class="flex h-1.5 w-full rounded-full bg-base-300" aria-hidden="true">
											<span
												class="h-full rounded-full bg-primary"
												style="width: {module.completion}%"
											></span>
										</span>
									</span>
									<span class="w-8 shrink-0 text-right tabular-nums text-base-content/55">
										{module.completion}%
									</span>
									<a
										class="shrink-0 text-base-content/35 hover:text-primary"
										aria-label="Open {module.moduleTitle}"
										href={resolve('/admin/[classId]/module/[moduleId]', {
											classId: String(module.classId),
											moduleId: String(module.moduleId)
										})}
									>
										<ChevronRight size={14} />
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</section>

				<section class="rounded-2xl border border-base-300 bg-base-100 shadow-xs">
					<header class="flex items-center gap-2 border-b border-base-300 px-4 py-2.5">
						<h2 class="text-sm font-semibold">Most engaged modules</h2>
						<span class="text-xs text-base-content/45">By completion</span>
					</header>
					{#if moduleStats.isLoading}
						<div class="space-y-2 p-4">
							{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
								<div class="skeleton h-8 w-full rounded-lg"></div>
							{/each}
						</div>
					{:else if topModules.length === 0}
						<p class="p-6 text-center text-sm text-base-content/50">
							No modules with questions yet.
						</p>
					{:else}
						<ul class="divide-y divide-base-300">
							{#each topModules as module (module.moduleId)}
								<li class="flex items-center gap-3 px-4 py-2 text-xs">
									<span class="min-w-0 flex-1">
										<span class="block truncate font-medium">{module.moduleTitle}</span>
										<span class="block truncate text-base-content/45">
											{module.activeStudents} of {module.totalStudents} students,
											{module.totalQuestions} questions
										</span>
									</span>
									{#if module.questionsFlagged > 0}
										<span class="flex shrink-0 items-center gap-1 text-warning">
											<Flag size={11} />
											{module.questionsFlagged}
										</span>
									{/if}
									<span class="w-20 shrink-0">
										<span class="flex h-1.5 w-full rounded-full bg-base-300" aria-hidden="true">
											<span
												class="h-full rounded-full bg-success"
												style="width: {module.completion}%"
											></span>
										</span>
									</span>
									<span class="w-8 shrink-0 text-right tabular-nums text-base-content/55">
										{module.completion}%
									</span>
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<button
					class="group flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-4 text-left shadow-xs transition hover:border-primary/40"
					onclick={() => (activeTab = 'studio')}
				>
					<span class="rounded-xl bg-primary/10 p-2 text-primary"><Sparkles size={18} /></span>
					<span class="min-w-0">
						<span class="block text-sm font-medium">Question Studio</span>
						<span class="block text-xs text-base-content/50">
							{generationHistory.data?.summary.runsThisWeek ?? 0} runs and
							{generationHistory.data?.summary.savedThisWeek ?? 0} questions kept this week
						</span>
					</span>
					<ChevronRight size={16} class="ml-auto text-base-content/30 group-hover:text-primary" />
				</button>
				<a
					class="group flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-4 text-left shadow-xs transition hover:border-primary/40"
					href={resolve('/admin/badges')}
				>
					<span class="rounded-xl bg-accent/10 p-2 text-accent"><Award size={18} /></span>
					<span class="min-w-0">
						<span class="block text-sm font-medium">Badge catalog</span>
						<span class="block text-xs text-base-content/50">
							Manage and review badge definitions
						</span>
					</span>
					<ChevronRight size={16} class="ml-auto text-base-content/30 group-hover:text-primary" />
				</a>
			</div>
		</div>
	{:else if activeTab === 'modules'}
		<CuratorModuleAnalytics {cohortId} />
	{:else if activeTab === 'studio'}
		<CuratorGenerationRuns {cohortId} />
	{:else}
		<div class="space-y-3">
			<AdminStatStrip
				items={studentStats}
				loading={studentsWithProgress.isLoading}
				ariaLabel="Student summary"
			/>

			<section class="rounded-2xl border border-base-300 bg-base-100 shadow-xs">
				<header class="flex flex-wrap items-center gap-2 border-b border-base-300 px-4 py-2.5">
					<h2 class="flex items-center gap-2 text-sm font-semibold">
						<Users size={16} />
						Students
					</h2>
					<span class="text-xs text-base-content/45">
						{sortedStudents.length}
						{sortedStudents.length === 1 ? 'person' : 'people'}
					</span>
					<div class="ml-auto flex items-center gap-2">
						<div class="flex rounded-full border border-base-300 bg-base-200 p-0.5">
							{#each [{ id: 'progress', label: 'Mastery' }, { id: 'recent', label: 'Recent' }, { id: 'name', label: 'Name' }] as const as option (option.id)}
								<button
									class="btn btn-xs rounded-full border-0 {studentSort === option.id
										? 'bg-base-100 text-primary shadow-sm'
										: 'btn-ghost text-base-content/55'}"
									aria-pressed={studentSort === option.id}
									onclick={() => (studentSort = option.id)}
								>
									{option.label}
								</button>
							{/each}
						</div>
						<label class="input input-sm w-full max-w-56 rounded-full">
							<Search size={14} class="text-base-content/40" />
							<input
								type="search"
								class="grow"
								placeholder="Search students"
								bind:value={searchQuery}
							/>
						</label>
					</div>
				</header>

				{#if studentsWithProgress.isLoading}
					<div class="space-y-2 p-4">
						{#each Array.from({ length: 8 }, (_, i) => i) as i (i)}
							<div class="skeleton h-10 w-full rounded-lg"></div>
						{/each}
					</div>
				{:else if studentsWithProgress.error}
					<div class="alert alert-error m-4 rounded-2xl">
						Failed to load students: {studentsWithProgress.error.message}
					</div>
				{:else if sortedStudents.length === 0}
					<div class="py-12 text-center text-sm text-base-content/50">
						{#if searchQuery}
							Nobody matches “{searchQuery}”.
						{:else}
							No students in this cohort yet.
						{/if}
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr class="text-xs text-base-content/50">
									<th>Student</th>
									<th>Access</th>
									<th class="w-56">Mastery</th>
									<th class="text-right">Tried</th>
									<th>Last active</th>
									<th>Joined</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{#each sortedStudents as student (student._id)}
									<tr
										class="cursor-pointer hover:bg-base-200/40"
										onclick={() => openStudentModal(student._id)}
									>
										<td>
											<div class="flex items-center gap-2.5">
												{#if student.imageUrl}
													<div class="avatar">
														<div class="h-8 w-8 rounded-full">
															<img src={student.imageUrl} alt="" />
														</div>
													</div>
												{:else}
													<div class="avatar avatar-placeholder">
														<div class="h-8 w-8 rounded-full bg-neutral text-neutral-content">
															<span class="text-xs">{initials(student.name)}</span>
														</div>
													</div>
												{/if}
												<div class="min-w-0">
													<div class="truncate text-sm font-medium">{student.name}</div>
													{#if student.email}
														<div class="truncate text-xs text-base-content/45">
															{student.email}
														</div>
													{/if}
												</div>
											</div>
										</td>
										<td>
											<div class="flex items-center gap-1.5">
												{#if student.role === 'dev'}
													<span class="badge badge-warning badge-xs gap-1">
														<Shield size={10} /> dev
													</span>
												{:else if student.role === 'admin'}
													<span class="badge badge-primary badge-xs gap-1">
														<Shield size={10} /> admin
													</span>
												{:else if student.role === 'curator'}
													<span class="badge badge-info badge-xs gap-1">
														<PenTool size={10} /> curator
													</span>
												{:else}
													<span class="text-xs text-base-content/40">Student</span>
												{/if}
												{#if student.isPro}
													<span class="badge badge-secondary badge-xs gap-1">
														<Zap size={10} fill="currentColor" /> pro
													</span>
												{/if}
											</div>
										</td>
										<td>
											<div class="flex items-center gap-2">
												<span class="flex h-1.5 w-24 rounded-full bg-base-300" aria-hidden="true">
													<span
														class="h-full rounded-full {student.progress >= 60
															? 'bg-success'
															: 'bg-primary'}"
														style="width: {student.progress}%"
													></span>
												</span>
												<span class="w-8 text-right text-xs tabular-nums text-base-content/60">
													{student.progress}%
												</span>
												<span class="text-xs tabular-nums text-base-content/35">
													{student.questionsMastered}/{student.totalQuestions}
												</span>
											</div>
										</td>
										<td class="text-right text-xs tabular-nums text-base-content/60">
											{student.questionsInteracted}
										</td>
										<td class="text-xs text-base-content/60">
											{formatRelativeTime(student.lastActivityAt)}
										</td>
										<td class="text-xs text-base-content/45">
											{student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '—'}
										</td>
										<td><ChevronRight size={14} class="text-base-content/30" /></td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		</div>
	{/if}
</div>

{#if cohortId}
	<StudentDetailModal
		isOpen={isStudentModalOpen}
		onClose={() => {
			isStudentModalOpen = false;
			selectedStudentId = null;
		}}
		student={selectedStudent}
		{cohortId}
		currentUserRole={userData?.role}
		currentUserClerkId={userData?.clerkUserId}
		{isDev}
		{isAdmin}
		{updateRole}
	/>
{/if}
