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
		TrendingUp
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


	// Search state
	let searchQuery = $state('');

	// Filter students based on search
	const filteredStudents = $derived(
		studentsWithProgress.data?.filter((student) => {
			const query = searchQuery.toLowerCase();
			return (
				student.name.toLowerCase().includes(query) ||
				student.email?.toLowerCase().includes(query) ||
				student.firstName?.toLowerCase().includes(query) ||
				student.lastName?.toLowerCase().includes(query)
			);
		}) ?? []
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
		<div>
			<h1 class="text-3xl font-bold text-base-content">Class Progress</h1>
			<p class="text-base text-base-content/70">
				{userData?.schoolName} - {userData?.cohortName}
			</p>
		</div>
	</div>

	<!-- Stats Overview -->
	{#if cohortStats.isLoading}
		<div class="stats stats-vertical sm:stats-horizontal shadow-sm border border-base-300 w-full mb-8 animate-pulse rounded-xl">
			<div class="stat"><div class="stat-value">...</div></div>
			<div class="stat"><div class="stat-value">...</div></div>
			<div class="stat"><div class="stat-value">...</div></div>
			<div class="stat"><div class="stat-value">...</div></div>
		</div>
	{:else if cohortStats.error}
		<div class="alert alert-error mb-8 rounded-xl">Failed to load stats: {cohortStats.error.message}</div>
	{:else}
		<div class="stats stats-vertical sm:stats-horizontal shadow-sm border border-base-300 w-full mb-8 rounded-xl">
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
		<div class="card bg-base-100 shadow-sm border border-base-300 rounded-xl">
			<div class="card-body">
				<h2 class="card-title text-lg mb-4">
					<BookOpen size={20} />
					Completion by Module
				</h2>
				<div class="text-center py-8 text-base-content/60">
					<BookOpen size={32} class="mx-auto mb-2 opacity-50" />
					<p>Module progress coming soon</p>
				</div>
			</div>
		</div>

		<!-- Top Flagged Questions -->
		<div class="card bg-base-100 shadow-sm border border-base-300 rounded-xl">
			<div class="card-body">
				<h2 class="card-title text-lg mb-4">
					<Flag size={20} class="text-warning" />
					Top Flagged Questions
				</h2>
				<div class="text-center py-8 text-base-content/60">
					<Flag size={32} class="mx-auto mb-2 opacity-50" />
					<p>Flagged questions coming soon</p>
				</div>
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
					{#if cohortStats.data}
						<span class="badge badge-ghost">{cohortStats.data.totalStudents}</span>
					{/if}
				</h2>
				<input
					type="text"
					placeholder="Search by name or email..."
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
