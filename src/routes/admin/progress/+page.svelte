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
		TrendingUp,
		ChevronRight,
		Shield,
		PenTool,
		Zap,
		BarChart3,
		LayoutDashboard,
		Award
	} from 'lucide-svelte';
	import StudentDetailModal from '$lib/admin/StudentDetailModal.svelte';
	import CuratorModuleAnalytics from '$lib/admin/CuratorModuleAnalytics.svelte';

	let { data }: { data: PageData } = $props();
	const userData = data.userData;
	const client = useConvexClient();
	const isDev = $derived(userData?.role === 'dev');
	const isAdmin = $derived(userData?.role === 'dev' || userData?.role === 'admin');

	async function updateRole(userId: Id<'users'>, role: 'dev' | 'admin' | 'curator' | null) {
		await client.mutation(api.users.updateUserRole, {
			userId,
			role
		});
	}

	let isStudentModalOpen = $state(false);
	let selectedStudentId = $state<Id<'users'> | null>(null);
	let activeTab = $state<'overview' | 'analytics' | 'students'>('overview');

	function openStudentModal(student: (typeof filteredStudents)[number]) {
		selectedStudentId = student._id;
		isStudentModalOpen = true;
	}

	function closeStudentModal() {
		isStudentModalOpen = false;
		selectedStudentId = null;
	}

	const cohortStats = userData?.cohortId
		? useQuery(api.progress.getCohortProgressStats, {
				cohortId: userData.cohortId as Id<'cohort'>
			})
		: { data: undefined, isLoading: false, error: null };

	const studentsWithProgress = userData?.cohortId
		? useQuery(api.progress.getStudentsWithProgress, {
				cohortId: userData.cohortId as Id<'cohort'>,
				includeSubscription: false
			})
		: { data: undefined, isLoading: false, error: null };

	let searchQuery = $state('');

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

	const activeLearners = $derived(
		studentsWithProgress.data?.filter((student) => student.questionsInteracted > 0).length ?? 0
	);

	const activeLearnerRate = $derived(
		cohortStats.data?.totalStudents
			? Math.round((activeLearners / cohortStats.data.totalStudents) * 100)
			: 0
	);

	const selectedStudent = $derived(
		selectedStudentId && studentsWithProgress.data
			? (studentsWithProgress.data.find((student) => student._id === selectedStudentId) ?? null)
			: null
	);

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

<div class="min-h-screen p-4 sm:p-8 max-w-7xl mx-auto">
	<!-- Header -->
	<a class="btn btn-ghost btn-sm mb-3" href="/admin">
		<ArrowLeft size={16} />
		Back
	</a>

	<div class="mb-6">
		<h1 class="text-2xl font-bold text-base-content">Class Progress</h1>
		<p class="text-sm text-base-content/60">
			{userData?.schoolName} &middot; {userData?.cohortName}
		</p>
	</div>

	<!-- Tabs -->
	<div role="tablist" class="tabs tabs-boxed bg-base-200 mb-6 w-fit">
		<button
			role="tab"
			class="tab gap-2 transition-all"
			class:tab-active={activeTab === 'overview'}
			onclick={() => (activeTab = 'overview')}
		>
			<LayoutDashboard size={14} />
			Overview
		</button>
		<button
			role="tab"
			class="tab gap-2 transition-all"
			class:tab-active={activeTab === 'analytics'}
			onclick={() => (activeTab = 'analytics')}
		>
			<BarChart3 size={14} />
			Module Analytics
		</button>
		<button
			role="tab"
			class="tab gap-2 transition-all"
			class:tab-active={activeTab === 'students'}
			onclick={() => (activeTab = 'students')}
		>
			<Users size={14} />
			Students
			{#if cohortStats.data}
				<span class="badge badge-ghost badge-xs">{cohortStats.data.totalStudents}</span>
			{/if}
		</button>
	</div>

	<!-- Tab Content -->
	{#if activeTab === 'overview'}
		<!-- Overview Tab -->
		{#if cohortStats.isLoading}
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{#each Array(4) as _}
					<div class="bg-base-100 rounded-xl border border-base-300 p-5 animate-pulse">
						<div class="skeleton h-4 w-20 mb-2"></div>
						<div class="skeleton h-8 w-16"></div>
					</div>
				{/each}
			</div>
		{:else if cohortStats.error}
			<div class="alert alert-error rounded-xl">
				Failed to load stats: {cohortStats.error.message}
			</div>
		{:else}
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div class="bg-base-100 rounded-xl border border-base-300 p-5 shadow-sm">
					<div class="flex items-center justify-between mb-1">
						<span class="text-xs text-base-content/60 font-medium uppercase tracking-wide"
							>Students</span
						>
						<Users size={16} class="text-primary" />
					</div>
					<div class="text-3xl font-bold text-primary">{cohortStats.data?.totalStudents ?? 0}</div>
					<p class="text-xs text-base-content/50 mt-1">Enrolled in cohort</p>
				</div>

				<div class="bg-base-100 rounded-xl border border-base-300 p-5 shadow-sm">
					<div class="flex items-center justify-between mb-1">
						<span class="text-xs text-base-content/60 font-medium uppercase tracking-wide"
							>Questions</span
						>
						<HelpCircle size={16} class="text-secondary" />
					</div>
					<div class="text-3xl font-bold text-secondary">
						{cohortStats.data?.totalQuestions ?? 0}
					</div>
					<p class="text-xs text-base-content/50 mt-1">Across all modules</p>
				</div>

				<div class="bg-base-100 rounded-xl border border-base-300 p-5 shadow-sm">
					<div class="flex items-center justify-between mb-1">
						<span class="text-xs text-base-content/60 font-medium uppercase tracking-wide"
							>Modules</span
						>
						<BookOpen size={16} class="text-accent" />
					</div>
					<div class="text-3xl font-bold text-accent">{cohortStats.data?.totalModules ?? 0}</div>
					<p class="text-xs text-base-content/50 mt-1">Active learning modules</p>
				</div>

				<div class="bg-base-100 rounded-xl border border-base-300 p-5 shadow-sm">
					<div class="flex items-center justify-between mb-1">
						<span class="text-xs text-base-content/60 font-medium uppercase tracking-wide"
							>Active Learners</span
						>
						<TrendingUp size={16} class="text-success" />
					</div>
					<div class="text-3xl font-bold text-success">{activeLearners}</div>
					<p class="text-xs text-base-content/50 mt-1">{activeLearnerRate}% engagement rate</p>
				</div>
			</div>

			<!-- Quick Actions -->
			<div class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				<button
					class="bg-base-100 rounded-xl border border-base-300 p-4 text-left hover:border-primary/40 hover:shadow-md transition-all group cursor-pointer"
					onclick={() => (activeTab = 'analytics')}
				>
					<div class="flex items-center gap-3">
						<div
							class="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors"
						>
							<BarChart3 size={20} />
						</div>
						<div>
							<p class="font-medium text-sm">Module Analytics</p>
							<p class="text-xs text-base-content/50">Drill into question-level data per module</p>
						</div>
						<ChevronRight
							size={16}
							class="ml-auto text-base-content/30 group-hover:text-primary transition-colors"
						/>
					</div>
				</button>
				<button
					class="bg-base-100 rounded-xl border border-base-300 p-4 text-left hover:border-primary/40 hover:shadow-md transition-all group cursor-pointer"
					onclick={() => (activeTab = 'students')}
				>
					<div class="flex items-center gap-3">
						<div
							class="p-2 rounded-lg bg-secondary/10 text-secondary group-hover:bg-secondary/20 transition-colors"
						>
							<Users size={20} />
						</div>
						<div>
							<p class="font-medium text-sm">Student Roster</p>
							<p class="text-xs text-base-content/50">View individual student progress and roles</p>
						</div>
						<ChevronRight
							size={16}
							class="ml-auto text-base-content/30 group-hover:text-primary transition-colors"
						/>
					</div>
				</button>
				<a
					href="/admin/badges"
					class="bg-base-100 rounded-xl border border-base-300 p-4 text-left hover:border-primary/40 hover:shadow-md transition-all group cursor-pointer"
				>
					<div class="flex items-center gap-3">
						<div
							class="p-2 rounded-lg bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors"
						>
							<Award size={20} />
						</div>
						<div>
							<p class="font-medium text-sm">Badge Catalog</p>
							<p class="text-xs text-base-content/50">Manage and review badge definitions</p>
						</div>
						<ChevronRight
							size={16}
							class="ml-auto text-base-content/30 group-hover:text-primary transition-colors"
						/>
					</div>
				</a>
			</div>
		{/if}
	{:else if activeTab === 'analytics'}
		{#if userData?.cohortId}
			<CuratorModuleAnalytics cohortId={userData.cohortId as Id<'cohort'>} />
		{/if}
	{:else}
		<!-- Students Tab -->
		<div class="bg-base-100 rounded-xl border border-base-300 shadow-sm">
			<div
				class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 border-b border-base-300"
			>
				<h2 class="font-semibold flex items-center gap-2">
					<Users size={18} />
					Students in Cohort
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
				<div class="alert alert-error m-4">
					Failed to load students: {studentsWithProgress.error.message}
				</div>
			{:else if filteredStudents.length === 0}
				<div class="text-center py-12 text-base-content/60">
					<Users size={40} class="mx-auto mb-3 opacity-40" />
					{#if searchQuery}
						<p class="text-sm">No students match "{searchQuery}"</p>
					{:else}
						<p class="text-sm">No students in this cohort yet</p>
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
								<tr class="hover cursor-pointer" onclick={() => openStudentModal(student)}>
									<td>
										<div class="flex items-center gap-3">
											{#if student.imageUrl}
												<div class="avatar">
													<div class="w-9 h-9 rounded-full">
														<img src={student.imageUrl} alt={student.name} />
													</div>
												</div>
											{:else}
												<div class="avatar placeholder">
													<div class="bg-neutral text-neutral-content w-9 h-9 rounded-full">
														<span class="text-xs">
															{student.name
																.split(' ')
																.map((n) => n[0])
																.join('')
																.slice(0, 2)
																.toUpperCase()}
														</span>
													</div>
												</div>
											{/if}
											<div>
												<div class="font-medium text-sm">{student.name}</div>
												{#if student.email}
													<div class="text-xs text-base-content/50">{student.email}</div>
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
									<td class="text-sm text-base-content/70">
										{formatRelativeTime(student.lastSignInAt)}
									</td>
									<td class="text-sm text-base-content/70">
										{student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '—'}
									</td>
									<td>
										<ChevronRight size={14} class="text-base-content/30" />
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>

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
	/>
{/if}
