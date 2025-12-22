<script lang="ts">
	import type { PageData } from './$types';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import {
		ArrowLeft,
		Users,
		HelpCircle,
		BookOpen,
		Flag,
		TrendingUp,
		ChevronDown
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();
	const userData = data.userData;

	// Real queries - students and stats
	const cohortStats = userData?.cohortId
		? useQuery(api.progress.getCohortProgressStats, {
				cohortId: userData.cohortId as Id<'cohort'>
			})
		: { data: undefined, isLoading: false, error: null };

	const studentsWithProgress = userData?.cohortId
		? useQuery(api.progress.getStudentsWithProgress, {
				cohortId: userData.cohortId as Id<'cohort'>
			})
		: { data: undefined, isLoading: false, error: null };

	// Mock data for module progress and flagged questions (to be wired up later)
	const mockModuleProgress = [
		{ id: '1', name: 'Introduction to Pharmacology', emoji: '💊', completion: 92, students: 45 },
		{ id: '2', name: 'Drug Classifications', emoji: '📋', completion: 78, students: 42 },
		{ id: '3', name: 'Pharmacokinetics', emoji: '🧪', completion: 65, students: 38 },
		{ id: '4', name: 'Pharmacodynamics', emoji: '⚡', completion: 54, students: 35 },
		{ id: '5', name: 'Autonomic Nervous System', emoji: '🧠', completion: 41, students: 28 },
		{ id: '6', name: 'Cardiovascular Drugs', emoji: '❤️', completion: 32, students: 24 },
		{ id: '7', name: 'Antimicrobials', emoji: '🦠', completion: 18, students: 15 },
		{ id: '8', name: 'Pain Management', emoji: '💉', completion: 8, students: 8 }
	];

	const mockFlaggedQuestions = [
		{
			id: '1',
			question: 'Which receptor does epinephrine primarily act on?',
			module: 'Autonomic Nervous System',
			flagCount: 12,
			reason: 'Confusing wording'
		},
		{
			id: '2',
			question: 'Calculate the half-life given the following parameters...',
			module: 'Pharmacokinetics',
			flagCount: 8,
			reason: 'Incorrect answer'
		},
		{
			id: '3',
			question: 'What is the mechanism of action of beta-blockers?',
			module: 'Cardiovascular Drugs',
			flagCount: 6,
			reason: 'Multiple correct answers'
		},
		{
			id: '4',
			question: 'Identify the drug class based on the structure shown.',
			module: 'Drug Classifications',
			flagCount: 5,
			reason: 'Image not loading'
		},
		{
			id: '5',
			question: 'Which antibiotic is contraindicated in pregnancy?',
			module: 'Antimicrobials',
			flagCount: 4,
			reason: 'Outdated information'
		}
	];

	// Search and filter state
	let searchQuery = $state('');
	let selectedClass = $state('All Classes');

	// Filter students based on search
	const filteredStudents = $derived(
		studentsWithProgress.data?.filter((student) =>
			student.name.toLowerCase().includes(searchQuery.toLowerCase())
		) ?? []
	);

	// Format relative time
	function formatLastActive(timestamp: number | null): string {
		if (!timestamp) return 'Never';

		const now = Date.now();
		const diff = now - timestamp;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes} min ago`;
		if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
		if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
		return new Date(timestamp).toLocaleDateString();
	}

	function getProgressColor(progress: number): string {
		if (progress >= 80) return 'progress-success';
		if (progress >= 50) return 'progress-warning';
		return 'progress-error';
	}

	function getProgressBadge(progress: number): string {
		if (progress >= 80) return 'badge-success';
		if (progress >= 50) return 'badge-warning';
		return 'badge-error';
	}
</script>

<div class="min-h-screen p-8 max-w-7xl mx-auto">
	<!-- Header -->
	<a class="btn mb-4 btn-ghost" href="/admin">
		<ArrowLeft size={16} />
		Back
	</a>

	<div class="mb-8">
		<div class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
			<div>
				<h1 class="text-2xl sm:text-3xl font-bold text-base-content">Class Progress</h1>
				<p class="text-base-content/70">
					{userData?.schoolName} - {userData?.cohortName}
				</p>
			</div>

			<!-- Class Selector (for future) -->
			<div class="dropdown dropdown-end">
				<button class="btn btn-outline gap-2">
					{selectedClass}
					<ChevronDown size={16} />
				</button>
				<ul class="dropdown-content menu bg-base-100 rounded-box z-10 w-52 p-2 shadow-lg border border-base-300">
					<li><button onclick={() => selectedClass = 'All Classes'}>All Classes</button></li>
					<li><button onclick={() => selectedClass = 'PHAR 101'}>PHAR 101</button></li>
					<li><button onclick={() => selectedClass = 'PHAR 201'}>PHAR 201</button></li>
				</ul>
			</div>
		</div>
	</div>

	<!-- Stats Overview -->
	{#if cohortStats.isLoading}
		<div class="stats stats-vertical sm:stats-horizontal shadow-sm border border-base-300 w-full mb-8 animate-pulse">
			<div class="stat"><div class="stat-value">...</div></div>
			<div class="stat"><div class="stat-value">...</div></div>
			<div class="stat"><div class="stat-value">...</div></div>
			<div class="stat"><div class="stat-value">...</div></div>
		</div>
	{:else if cohortStats.error}
		<div class="alert alert-error mb-8">Failed to load stats: {cohortStats.error.message}</div>
	{:else}
		<div class="stats stats-vertical sm:stats-horizontal shadow-sm border border-base-300 w-full mb-8">
			<div class="stat">
				<div class="stat-figure text-primary">
					<Users size={24} />
				</div>
				<div class="stat-title">Total Students</div>
				<div class="stat-value text-primary">{cohortStats.data?.totalStudents ?? 0}</div>
				<div class="stat-desc">Enrolled in cohort</div>
			</div>

			<div class="stat">
				<div class="stat-figure text-secondary">
					<HelpCircle size={24} />
				</div>
				<div class="stat-title">Total Questions</div>
				<div class="stat-value text-secondary">{cohortStats.data?.totalQuestions ?? 0}</div>
				<div class="stat-desc">Across all modules</div>
			</div>

			<div class="stat">
				<div class="stat-figure text-accent">
					<BookOpen size={24} />
				</div>
				<div class="stat-title">Modules</div>
				<div class="stat-value text-accent">{cohortStats.data?.totalModules ?? 0}</div>
				<div class="stat-desc">Active learning modules</div>
			</div>

			<div class="stat">
				<div class="stat-figure text-success">
					<TrendingUp size={24} />
				</div>
				<div class="stat-title">Avg. Completion</div>
				<div class="stat-value text-success">{cohortStats.data?.averageCompletion ?? 0}%</div>
				<div class="stat-desc">Class average</div>
			</div>
		</div>
	{/if}

	<!-- Two Column Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		<!-- Completion by Module -->
		<div class="card bg-base-100 shadow-sm border border-base-300">
			<div class="card-body">
				<h2 class="card-title text-lg mb-4">
					<BookOpen size={20} />
					Completion by Module
				</h2>
				<div class="space-y-4">
					{#each mockModuleProgress as module (module.id)}
						<div class="space-y-1">
							<div class="flex justify-between items-center">
								<span class="text-sm font-medium flex items-center gap-2">
									<span>{module.emoji}</span>
									<span class="truncate max-w-[200px]">{module.name}</span>
								</span>
								<span class="text-sm text-base-content/70">
									{module.completion}%
								</span>
							</div>
							<progress
								class="progress {getProgressColor(module.completion)} w-full h-2"
								value={module.completion}
								max="100"
							></progress>
							<div class="text-xs text-base-content/50">
								{module.students} students engaged
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Top Flagged Questions -->
		<div class="card bg-base-100 shadow-sm border border-base-300">
			<div class="card-body">
				<h2 class="card-title text-lg mb-4">
					<Flag size={20} class="text-warning" />
					Top Flagged Questions
				</h2>
				{#if mockFlaggedQuestions.length === 0}
					<div class="text-center py-8 text-base-content/60">
						<Flag size={32} class="mx-auto mb-2 opacity-50" />
						<p>No flagged questions</p>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Question</th>
									<th>Module</th>
									<th>Flags</th>
								</tr>
							</thead>
							<tbody>
								{#each mockFlaggedQuestions as question (question.id)}
									<tr class="hover">
										<td>
											<div class="max-w-[200px]">
												<p class="truncate text-sm">{question.question}</p>
												<p class="text-xs text-base-content/50">{question.reason}</p>
											</div>
										</td>
										<td>
											<span class="badge badge-ghost badge-sm">{question.module}</span>
										</td>
										<td>
											<span class="badge badge-warning badge-sm gap-1">
												<Flag size={10} />
												{question.flagCount}
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Students in Class -->
	<div class="card bg-base-100 shadow-sm border border-base-300 mt-8">
		<div class="card-body">
			<div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
				<h2 class="card-title text-lg">
					<Users size={20} />
					Students in Cohort
					{#if cohortStats.data}
						<span class="badge badge-ghost">{cohortStats.data.totalStudents}</span>
					{/if}
				</h2>
				<input
					type="text"
					placeholder="Search students..."
					class="input input-bordered input-sm w-full sm:w-64"
					bind:value={searchQuery}
				/>
			</div>

			{#if studentsWithProgress.isLoading}
				<div class="flex items-center justify-center py-12">
					<span class="loading loading-spinner loading-lg"></span>
				</div>
			{:else if studentsWithProgress.error}
				<div class="alert alert-error">
					Failed to load students: {studentsWithProgress.error.message}
				</div>
			{:else if filteredStudents.length === 0}
				<div class="text-center py-12 text-base-content/60">
					<Users size={48} class="mx-auto mb-4 opacity-50" />
					{#if searchQuery}
						<p>No students match "{searchQuery}"</p>
					{:else}
						<p>No students in this cohort yet</p>
					{/if}
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th>Student</th>
								<th>Progress</th>
								<th>Questions</th>
								<th>Last Active</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredStudents as student (student._id)}
								<tr class="hover">
									<td>
										<div class="flex items-center gap-3">
											<div class="avatar placeholder">
												<div class="bg-neutral text-neutral-content w-10 rounded-full">
													<span class="text-sm">
														{student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
													</span>
												</div>
											</div>
											<div>
												<div class="font-medium">{student.name}</div>
												<div class="text-xs text-base-content/50">
													{student.questionsMastered} mastered
												</div>
											</div>
										</div>
									</td>
									<td>
										<div class="flex items-center gap-3">
											<progress
												class="progress {getProgressColor(student.progress)} w-20 h-2"
												value={student.progress}
												max="100"
											></progress>
											<span class="badge {getProgressBadge(student.progress)} badge-sm">
												{student.progress}%
											</span>
										</div>
									</td>
									<td>
										<span class="text-sm text-base-content/70">
											{student.questionsInteracted} / {student.totalQuestions}
										</span>
									</td>
									<td>
										<span class="text-sm text-base-content/70">
											{formatLastActive(student.lastActivityAt)}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>
