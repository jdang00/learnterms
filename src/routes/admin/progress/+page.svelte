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
		ExternalLink,
		ChevronRight,
		Shield,
		PenTool,
		Zap
	} from 'lucide-svelte';
	import StudentDetailModal from '$lib/admin/StudentDetailModal.svelte';

	let { data }: { data: PageData } = $props();
	const userData = data.userData;
	const client = useConvexClient();
	const isDev = $derived(userData?.role === 'dev');
	const isAdmin = $derived(userData?.role === 'dev' || userData?.role === 'admin');

	async function updateRole(userId: Id<'users'>, role: string) {
		await client.mutation(api.users.updateUserRoleAndPlan, {
			userId,
			role: role === '' ? null : role as 'admin' | 'curator'
		});
	}

	async function updatePlan(userId: Id<'users'>, plan: string) {
		await client.mutation(api.users.updateUserRoleAndPlan, {
			userId,
			plan: plan === '' ? null : plan as 'pro' | 'free'
		});
	}

	// Modal state
	let isStudentModalOpen = $state(false);
	let selectedStudentId = $state<Id<'users'> | null>(null);

	const selectedStudent = $derived(
		selectedStudentId && studentsWithProgress.data
			? studentsWithProgress.data.find((s) => s._id === selectedStudentId) ?? null
			: null
	);

	function openStudentModal(student: (typeof filteredStudents)[number]) {
		selectedStudentId = student._id;
		isStudentModalOpen = true;
	}

	function closeStudentModal() {
		isStudentModalOpen = false;
		selectedStudentId = null;
	}

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

	// Semester filter state
	let selectedSemesterId = $state<Id<'semester'> | undefined>(undefined);

	// Get available semesters for the cohort
	const semesters = userData?.cohortId
		? useQuery(api.progress.getSemestersForCohort, {
				cohortId: userData.cohortId as Id<'cohort'>
			})
		: { data: undefined, isLoading: false, error: null };

	// Get top flagged questions (filtered by semester if selected)
	const topFlaggedQuestions = $derived(
		userData?.cohortId
			? useQuery(api.progress.getTopFlaggedQuestions, {
					cohortId: userData.cohortId as Id<'cohort'>,
					semesterId: selectedSemesterId,
					limit: 10
				})
			: { data: undefined, isLoading: false, error: null }
	);

	// Search and filter state
	let searchQuery = $state('');

	// Strip HTML tags from question stem for display
	function stripHtml(html: string): string {
		return html.replace(/<[^>]*>/g, '').trim();
	}

	// Truncate text to a max length
	function truncate(text: string, maxLength: number = 100): string {
		const stripped = stripHtml(text);
		if (stripped.length <= maxLength) return stripped;
		return stripped.slice(0, maxLength) + '...';
	}

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
			<h1 class="text-2xl sm:text-3xl font-bold text-base-content">Class Progress</h1>
			<p class="text-base-content/70">
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
				<div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
					<h2 class="card-title text-lg">
						<Flag size={20} class="text-warning" />
						Top Flagged Questions
					</h2>
					<!-- Semester Filter -->
					{#if semesters.data && semesters.data.length > 1}
						<select
							class="select select-bordered select-sm w-full sm:w-auto"
							bind:value={selectedSemesterId}
						>
							<option value={undefined}>All Semesters</option>
							{#each semesters.data as semester}
								<option value={semester._id}>{semester.name}</option>
							{/each}
						</select>
					{/if}
				</div>

				{#if topFlaggedQuestions.isLoading}
					<div class="flex items-center justify-center py-8">
						<span class="loading loading-spinner loading-md"></span>
					</div>
				{:else if topFlaggedQuestions.error}
					<div class="alert alert-error text-sm">
						Failed to load flagged questions
					</div>
				{:else if !topFlaggedQuestions.data || topFlaggedQuestions.data.length === 0}
					<div class="text-center py-8 text-base-content/60">
						<Flag size={32} class="mx-auto mb-2 opacity-50" />
						<p>No flagged questions yet</p>
						<p class="text-sm mt-1">Questions flagged by students will appear here</p>
					</div>
				{:else}
					<div class="space-y-3 max-h-96 overflow-y-auto">
						{#each topFlaggedQuestions.data as question, index}
							<div class="flex items-start gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors">
								<div class="flex-shrink-0 w-8 h-8 rounded-full bg-warning/20 text-warning flex items-center justify-center font-semibold text-sm">
									{question.flagCount}
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-sm font-medium line-clamp-2" title={stripHtml(question.stem)}>
										{truncate(question.stem, 120)}
									</p>
									<div class="flex items-center gap-2 mt-1 text-xs text-base-content/60">
										<span class="badge badge-ghost badge-xs">{question.className}</span>
										<span>·</span>
										<span>{question.moduleTitle}</span>
									</div>
								</div>
								<a
									href={`/classes/${question.classId}/modules/${question.moduleId}`}
									class="btn btn-ghost btn-xs btn-circle flex-shrink-0"
									title="View question"
								>
									<ExternalLink size={14} />
								</a>
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
								<th>Access</th>
								<th>Last Sign-In</th>
								<th>Joined</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each filteredStudents as student (student._id)}
								<tr
									class="hover cursor-pointer"
									onclick={() => openStudentModal(student)}
								>
									<td>
										<div class="flex items-center gap-3">
											{#if student.imageUrl}
												<div class="avatar">
													<div class="w-10 h-10 rounded-full">
														<img src={student.imageUrl} alt={student.name} />
													</div>
												</div>
											{:else}
												<div class="avatar placeholder">
													<div class="bg-neutral text-neutral-content w-10 rounded-full">
														<span class="text-sm">
															{student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
														</span>
													</div>
												</div>
											{/if}
											<div>
												<div class="font-medium">
													{student.name}
												</div>
												{#if student.email}
													<div class="text-xs text-base-content/60">{student.email}</div>
												{/if}
											</div>
										</div>
									</td>
									<td>
										<div class="flex items-center gap-2">
											{#if student.role === 'dev'}
												<div class="tooltip" data-tip="Developer">
													<span class="badge badge-warning badge-sm px-2 gap-1 cursor-help">
														<Shield size={12} /> dev
													</span>
												</div>
											{:else if student.role === 'admin'}
												<div class="tooltip" data-tip="Admin">
													<span class="badge badge-primary badge-sm px-2 gap-1 cursor-help">
														<Shield size={12} /> admin
													</span>
												</div>
											{:else if student.role === 'curator'}
												<div class="tooltip" data-tip="Curator">
													<span class="badge badge-info badge-sm px-2 gap-1 cursor-help">
														<PenTool size={12} /> curator
													</span>
												</div>
											{:else}
												<span class="text-xs text-base-content/40 italic">Student</span>
											{/if}

											{#if student.plan === 'pro'}
												<div class="tooltip" data-tip="Pro Plan">
													<span class="badge badge-secondary badge-sm px-2 gap-1 cursor-help">
														<Zap size={12} fill="currentColor" /> pro
													</span>
												</div>
											{/if}
										</div>
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
									<td>
										<ChevronRight size={16} class="text-base-content/40" />
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

<!-- Student Detail Modal -->
{#if userData?.cohortId}
	<StudentDetailModal
		isOpen={isStudentModalOpen}
		onClose={closeStudentModal}
		student={selectedStudent}
		cohortId={userData.cohortId as Id<'cohort'>}
		currentUserRole={userData.role}
		currentUserClerkId={userData.clerkUserId}
		{isDev}
		{isAdmin}
		{updateRole}
		{updatePlan}
	/>
{/if}
