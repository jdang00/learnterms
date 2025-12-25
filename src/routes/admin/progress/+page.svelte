<script lang="ts">
	import type { PageData } from './$types';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import {
		ArrowLeft,
		Users,
		HelpCircle,
		BookOpen,
		Flag,
		TrendingUp,
		ChevronDown,
		RefreshCw,
		Clock
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();
	const userData = data.userData;
	const client = useConvexClient();

	// Use cached queries instead of expensive live queries
	const cachedStats = userData?.cohortId
		? useQuery(api.progressCache.getCachedCohortStats, {
				cohortId: userData.cohortId as Id<'cohort'>
			})
		: { data: undefined, isLoading: false, error: null };

	const cachedStudents = userData?.cohortId
		? useQuery(api.progressCache.getCachedStudentsWithProgress, {
				cohortId: userData.cohortId as Id<'cohort'>
			})
		: { data: undefined, isLoading: false, error: null };

	const cachedModules = userData?.cohortId
		? useQuery(api.progressCache.getCachedModuleCompletion, {
				cohortId: userData.cohortId as Id<'cohort'>
			})
		: { data: undefined, isLoading: false, error: null };

	const cachedFlagged = userData?.cohortId
		? useQuery(api.progressCache.getCachedFlaggedQuestions, {
				cohortId: userData.cohortId as Id<'cohort'>
			})
		: { data: undefined, isLoading: false, error: null };

	// Track refresh state
	let isRefreshing = $state(false);

	// Initialize cache on mount if needed
	$effect(() => {
		if (userData?.cohortId && cachedStats.data === null) {
			client.mutation(api.progressCache.initializeCacheIfNeeded, {
				cohortId: userData.cohortId as Id<'cohort'>
			});
		}
	});

	// Handle manual refresh
	async function handleRefresh() {
		if (!userData?.cohortId || isRefreshing) return;
		isRefreshing = true;
		try {
			await client.mutation(api.progressCache.manualRefresh, {
				cohortId: userData.cohortId as Id<'cohort'>
			});
		} finally {
			// Keep refreshing state for a bit to show feedback
			setTimeout(() => {
				isRefreshing = false;
			}, 2000);
		}
	}

	// Search state
	let searchQuery = $state('');

	// Filter students based on search
	const filteredStudents = $derived(
		cachedStudents.data?.students?.filter((student) => {
			const query = searchQuery.toLowerCase();
			return (
				student.name.toLowerCase().includes(query) ||
				student.email?.toLowerCase().includes(query) ||
				student.firstName?.toLowerCase().includes(query) ||
				student.lastName?.toLowerCase().includes(query)
			);
		}) ?? []
	);

	// Derived state for refresh status
	const isCurrentlyRefreshing = $derived(
		isRefreshing || cachedStats.data?.refreshStatus === 'refreshing'
	);

	// Format relative time
	function formatRelativeTime(timestamp: number | null | undefined): string {
		if (!timestamp) return 'Never';
		const now = Date.now();
		const diff = now - timestamp;
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

			<div class="flex items-center gap-3">
				<!-- Last Refreshed Indicator -->
				{#if cachedStats.data?.lastRefreshedAt}
					<div class="flex items-center gap-2 text-sm text-base-content/60">
						<Clock size={14} />
						<span>Updated {formatRelativeTime(cachedStats.data.lastRefreshedAt)}</span>
					</div>
				{/if}

				<!-- Refresh Button -->
				<button
					class="btn btn-outline btn-sm gap-2"
					onclick={handleRefresh}
					disabled={isCurrentlyRefreshing}
				>
					<RefreshCw size={14} class={isCurrentlyRefreshing ? 'animate-spin' : ''} />
					{isCurrentlyRefreshing ? 'Refreshing...' : 'Refresh'}
				</button>
			</div>
		</div>
	</div>

	<!-- Stats Overview -->
	{#if cachedStats.isLoading}
		<div class="stats stats-vertical sm:stats-horizontal shadow-sm border border-base-300 w-full mb-8 animate-pulse rounded-xl">
			<div class="stat"><div class="stat-value">...</div></div>
			<div class="stat"><div class="stat-value">...</div></div>
			<div class="stat"><div class="stat-value">...</div></div>
			<div class="stat"><div class="stat-value">...</div></div>
		</div>
	{:else if cachedStats.error}
		<div class="alert alert-error mb-8 rounded-xl">Failed to load stats: {cachedStats.error.message}</div>
	{:else if cachedStats.data === null}
		<!-- Cache doesn't exist yet - show loading state -->
		<div class="stats stats-vertical sm:stats-horizontal shadow-sm border border-base-300 w-full mb-8 animate-pulse rounded-xl">
			<div class="stat">
				<div class="stat-title">Initializing...</div>
				<div class="stat-value text-base-content/30">—</div>
				<div class="stat-desc">First-time setup in progress</div>
			</div>
			<div class="stat"><div class="stat-value text-base-content/30">—</div></div>
			<div class="stat"><div class="stat-value text-base-content/30">—</div></div>
			<div class="stat"><div class="stat-value text-base-content/30">—</div></div>
		</div>
	{:else}
		<div class="stats stats-vertical sm:stats-horizontal shadow-sm border border-base-300 w-full mb-8 rounded-xl">
			<div class="stat">
				<div class="stat-figure text-primary">
					<Users size={24} />
				</div>
				<div class="stat-title">Total Students</div>
				<div class="stat-value text-primary">{cachedStats.data?.totalStudents ?? 0}</div>
				<div class="stat-desc">Enrolled in cohort</div>
			</div>

			<div class="stat">
				<div class="stat-figure text-secondary">
					<HelpCircle size={24} />
				</div>
				<div class="stat-title">Total Questions</div>
				<div class="stat-value text-secondary">{cachedStats.data?.totalQuestions ?? 0}</div>
				<div class="stat-desc">Across all modules</div>
			</div>

			<div class="stat">
				<div class="stat-figure text-accent">
					<BookOpen size={24} />
				</div>
				<div class="stat-title">Modules</div>
				<div class="stat-value text-accent">{cachedStats.data?.totalModules ?? 0}</div>
				<div class="stat-desc">Active learning modules</div>
			</div>

			<div class="stat">
				<div class="stat-figure text-success">
					<TrendingUp size={24} />
				</div>
				<div class="stat-title">Avg. Completion</div>
				<div class="stat-value text-success">{cachedStats.data?.averageCompletion ?? 0}%</div>
				<div class="stat-desc">Class average</div>
			</div>
		</div>
	{/if}

	<!-- Two Column Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		<!-- Completion by Module -->
		<div class="card bg-base-100 shadow-sm border border-base-300 rounded-xl">
			<div class="card-body">
				<h2 class="card-title text-lg mb-4">
					<BookOpen size={20} />
					Completion by Module
				</h2>
				{#if cachedModules.isLoading || cachedModules.data === null}
					<div class="flex flex-col items-center justify-center py-8 text-base-content/60">
						<span class="loading loading-spinner loading-md mb-2"></span>
						<p class="text-sm">Loading module data...</p>
					</div>
				{:else if cachedModules.error}
					<div class="alert alert-error text-sm">
						Failed to load module data
					</div>
				{:else if cachedModules.data.modules.length === 0}
					<div class="text-center py-8 text-base-content/60">
						<BookOpen size={32} class="mx-auto mb-2 opacity-50" />
						<p>No modules found</p>
					</div>
				{:else}
					<div class="space-y-3 max-h-96 overflow-y-auto">
						{#each cachedModules.data.modules.slice(0, 8) as module (module.moduleId)}
							<div class="border border-base-300 rounded-lg p-3 hover:bg-base-200/50 transition-colors">
								<div class="flex items-center justify-between mb-2">
									<div class="flex-1 min-w-0">
										<div class="font-medium text-sm truncate">{module.moduleName}</div>
										<div class="text-xs text-base-content/60">{module.className} • {module.totalQuestions} questions</div>
									</div>
									<div class="text-right ml-3">
										<div class="text-sm font-bold"
											class:text-success={module.averageCompletion >= 70}
											class:text-warning={module.averageCompletion >= 40 && module.averageCompletion < 70}
											class:text-error={module.averageCompletion < 40}
										>
											{module.averageCompletion}%
										</div>
									</div>
								</div>
								<div class="w-full bg-base-300 rounded-full h-1.5">
									<div
										class="h-1.5 rounded-full transition-all"
										class:bg-success={module.averageCompletion >= 70}
										class:bg-warning={module.averageCompletion >= 40 && module.averageCompletion < 70}
										class:bg-error={module.averageCompletion < 40}
										style="width: {module.averageCompletion}%"
									></div>
								</div>
								<div class="flex gap-3 mt-2 text-xs text-base-content/60">
									<span>{module.studentsStarted} started</span>
									<span>•</span>
									<span>{module.studentsCompleted} completed</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Top Flagged Questions -->
		<div class="card bg-base-100 shadow-sm border border-base-300 rounded-xl">
			<div class="card-body">
				<h2 class="card-title text-lg mb-4">
					<Flag size={20} class="text-warning" />
					Top Flagged Questions
				</h2>
				{#if cachedFlagged.isLoading || cachedFlagged.data === null}
					<div class="flex flex-col items-center justify-center py-8 text-base-content/60">
						<span class="loading loading-spinner loading-md mb-2"></span>
						<p class="text-sm">Loading flagged questions...</p>
					</div>
				{:else if cachedFlagged.error}
					<div class="alert alert-error text-sm">
						Failed to load flagged questions
					</div>
				{:else if cachedFlagged.data.questions.length === 0}
					<div class="text-center py-8 text-base-content/60">
						<Flag size={32} class="mx-auto mb-2 opacity-50" />
						<p>No questions flagged yet</p>
						<p class="text-xs mt-1">Students haven't flagged any questions for review</p>
					</div>
				{:else}
					<div class="space-y-3 max-h-96 overflow-y-auto">
						{#each cachedFlagged.data.questions as question (question.questionId)}
							<div class="border border-base-300 rounded-lg p-3 hover:bg-base-200/50 transition-colors">
								<div class="flex items-start gap-3">
									<div class="flex-shrink-0 mt-1">
										<div class="badge badge-warning badge-sm gap-1">
											<Flag size={12} />
											{question.flagCount}
										</div>
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium line-clamp-2 mb-1">{question.stem}</p>
										<div class="text-xs text-base-content/60">
											{question.className} → {question.moduleName}
										</div>
										<div class="flex items-center gap-2 mt-2">
											<div class="text-xs font-medium text-warning">
												{question.flagPercentage}% of students
											</div>
											<span class="text-xs text-base-content/40">•</span>
											<div class="text-xs text-base-content/60">
												{question.flagCount}/{question.totalStudents} flagged
											</div>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Students in Class -->
	<div class="card bg-base-100 shadow-sm border border-base-300 mt-8 rounded-xl">
		<div class="card-body">
			<div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
				<h2 class="card-title text-lg">
					<Users size={20} />
					Students in Cohort
					{#if cachedStats.data}
						<span class="badge badge-ghost">{cachedStats.data.totalStudents}</span>
					{/if}
				</h2>
				<input
					type="text"
					placeholder="Search by name or email..."
					class="input input-bordered input-sm w-full sm:w-64"
					bind:value={searchQuery}
				/>
			</div>

			{#if cachedStudents.isLoading}
				<div class="flex items-center justify-center py-12">
					<span class="loading loading-spinner loading-lg"></span>
				</div>
			{:else if cachedStudents.error}
				<div class="alert alert-error">
					Failed to load students: {cachedStudents.error.message}
				</div>
			{:else if cachedStudents.data === null}
				<div class="flex flex-col items-center justify-center py-12 text-base-content/60">
					<span class="loading loading-spinner loading-lg mb-4"></span>
					<p>Building student data cache...</p>
					<p class="text-sm">This only happens once</p>
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
								<th>Email</th>
								<th>Last Sign-In</th>
								<th>Joined</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredStudents as student (student._id)}
								<tr class="hover">
									<td>
										<div class="flex items-center gap-3">
											{#if student.imageUrl}
												<div class="avatar">
													<div class="w-12 h-12 rounded-full">
														<img src={student.imageUrl} alt={student.name} />
													</div>
												</div>
											{:else}
												<div class="avatar placeholder">
													<div class="bg-neutral text-neutral-content w-12 rounded-full">
														<span class="text-sm">
															{student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
														</span>
													</div>
												</div>
											{/if}
											<div>
												<div class="font-medium">{student.name}</div>
												{#if student.username}
													<div class="text-sm text-base-content/60">@{student.username}</div>
												{/if}
											</div>
										</div>
									</td>
									<td>
										{#if student.email}
											<span class="text-sm">{student.email}</span>
										{:else}
											<span class="text-sm text-base-content/40">—</span>
										{/if}
									</td>
									<td>
										<div class="text-sm">
											{formatRelativeTime(student.lastSignInAt)}
										</div>
									</td>
									<td>
										<div class="text-sm">
											{student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '—'}
										</div>
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
