<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';
	import { BookOpen, CheckCircle, Flag, TrendingUp } from 'lucide-svelte';

	let { userId, cohortId }: { userId: Id<'users'>; cohortId: Id<'cohort'> } = $props();

	// Fetch detailed stats
	const userStats = useQuery(api.progress.getUserModuleStats, () => ({ userId, cohortId }));

	// Track expanded semesters and classes
	let expandedSemesters = $state<Set<string>>(new Set());
	let expandedClasses = $state<Set<string>>(new Set());

	// Type for class data
	type ClassData = NonNullable<NonNullable<typeof userStats.data>['classes']>[number];

	// Group classes by semester
	const classesBySemester = $derived(() => {
		const data = userStats.data;
		if (!data || 'error' in data || !data.classes) return new Map<string, ClassData[]>();
		const grouped = new Map<string, ClassData[]>();
		for (const cls of data.classes) {
			const semKey = cls.semesterName;
			if (!grouped.has(semKey)) {
				grouped.set(semKey, []);
			}
			grouped.get(semKey)!.push(cls);
		}
		return grouped;
	});

	function toggleSemester(semester: string) {
		const newSet = new Set(expandedSemesters);
		if (newSet.has(semester)) {
			newSet.delete(semester);
		} else {
			newSet.add(semester);
		}
		expandedSemesters = newSet;
	}

	function toggleClass(classId: string) {
		const newSet = new Set(expandedClasses);
		if (newSet.has(classId)) {
			newSet.delete(classId);
		} else {
			newSet.add(classId);
		}
		expandedClasses = newSet;
	}

	function getProgressColor(progress: number): string {
		if (progress >= 80) return 'progress-success';
		if (progress >= 50) return 'progress-warning';
		if (progress > 0) return 'progress-info';
		return '';
	}
</script>

{#if userStats.isLoading}
	<div class="flex items-center justify-center py-8">
		<span class="loading loading-spinner loading-lg"></span>
	</div>
{:else if userStats.error}
	<div class="alert alert-error">Failed to load stats: {userStats.error.message}</div>
{:else if userStats.data && 'overall' in userStats.data && userStats.data.overall}
	{@const overall = userStats.data.overall}
	<!-- Overall Stats -->
	<div
		class="stats stats-vertical sm:stats-horizontal shadow-sm border border-base-300 mb-4 rounded-2xl"
	>
		<div class="stat py-3">
			<div class="stat-figure text-primary">
				<TrendingUp size={20} />
			</div>
			<div class="stat-title text-xs">Progress</div>
			<div class="stat-value text-lg text-primary">{overall.progress}%</div>
		</div>
		<div class="stat py-3">
			<div class="stat-figure text-secondary">
				<BookOpen size={20} />
			</div>
			<div class="stat-title text-xs">Interacted</div>
			<div class="stat-value text-lg text-secondary">
				{overall.questionsInteracted}
				<span class="text-sm font-normal text-base-content/60">
					/ {overall.totalQuestions}
				</span>
			</div>
		</div>
		<div class="stat py-3">
			<div class="stat-figure text-success">
				<CheckCircle size={20} />
			</div>
			<div class="stat-title text-xs">Mastered</div>
			<div class="stat-value text-lg text-success">
				{overall.questionsMastered}
			</div>
		</div>
		<div class="stat py-3">
			<div class="stat-figure text-warning">
				<Flag size={20} />
			</div>
			<div class="stat-title text-xs">Flagged</div>
			<div class="stat-value text-lg text-warning">
				{overall.questionsFlagged}
			</div>
		</div>
	</div>

	<!-- Semester/Class/Module breakdown -->
	<div class="flex-1 overflow-y-auto">
		<h4 class="font-semibold mb-3 text-sm text-base-content/70 uppercase tracking-wide">
			Progress by Class
		</h4>

		{#if classesBySemester().size === 0}
			<div class="text-center py-8 text-base-content/60">
				<BookOpen size={32} class="mx-auto mb-2 opacity-50" />
				<p>No classes found</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each [...classesBySemester().entries()] as [semesterName, classes]}
					<!-- Semester Header -->
					<div class="collapse collapse-arrow bg-base-200 rounded-2xl">
						<input
							type="checkbox"
							checked={expandedSemesters.has(semesterName)}
							onchange={() => toggleSemester(semesterName)}
						/>
						<div class="collapse-title font-medium flex items-center gap-2 py-2 min-h-0">
							<span class="badge badge-outline badge-sm">{semesterName}</span>
							<span class="text-sm text-base-content/60">
								{classes.length} class{classes.length === 1 ? '' : 'es'}
							</span>
						</div>
						<div class="collapse-content px-2 pb-2">
							<div class="space-y-2 pt-2">
								{#each classes as cls}
									<!-- Class -->
									<div
										class="collapse collapse-arrow bg-base-100 border border-base-300 rounded-2xl"
									>
										<input
											type="checkbox"
											checked={expandedClasses.has(cls.classId)}
											onchange={() => toggleClass(cls.classId)}
										/>
										<div class="collapse-title py-2 min-h-0">
											<div class="flex items-center justify-between pr-4">
												<div>
													<span class="font-medium text-sm">{cls.className}</span>
													<span class="text-xs text-base-content/50 ml-2">{cls.classCode}</span>
												</div>
												<div class="flex items-center gap-3">
													<span class="text-sm font-semibold">{cls.progress}%</span>
													<progress
														class="progress w-20 h-2 {getProgressColor(cls.progress)}"
														value={cls.progress}
														max="100"
													></progress>
												</div>
											</div>
										</div>
										<div class="collapse-content px-0 pb-0">
											<!-- Modules Table -->
											<div class="overflow-x-auto">
												<table class="table table-xs">
													<thead>
														<tr class="text-xs">
															<th>Module</th>
															<th class="text-center">Progress</th>
															<th class="text-center">Interacted</th>
															<th class="text-center">Mastered</th>
															<th class="text-center">Flagged</th>
														</tr>
													</thead>
													<tbody>
														{#each cls.modules as mod}
															<tr class="hover">
																<td>
																	<div class="flex items-center gap-2">
																		{#if mod.moduleEmoji}
																			<span>{mod.moduleEmoji}</span>
																		{/if}
																		<span class="text-sm">{mod.moduleTitle}</span>
																	</div>
																</td>
																<td class="text-center">
																	<div class="flex items-center justify-center gap-2">
																		<progress
																			class="progress w-12 h-1.5 {getProgressColor(mod.progress)}"
																			value={mod.progress}
																			max="100"
																		></progress>
																		<span class="text-xs w-8">{mod.progress}%</span>
																	</div>
																</td>
																<td class="text-center text-xs">
																	{mod.questionsInteracted}/{mod.totalQuestions}
																</td>
																<td class="text-center">
																	{#if mod.questionsMastered > 0}
																		<span class="badge badge-success badge-xs">
																			{mod.questionsMastered}
																		</span>
																	{:else}
																		<span class="text-base-content/30">-</span>
																	{/if}
																</td>
																<td class="text-center">
																	{#if mod.questionsFlagged > 0}
																		<span class="badge badge-warning badge-xs">
																			{mod.questionsFlagged}
																		</span>
																	{:else}
																		<span class="text-base-content/30">-</span>
																	{/if}
																</td>
															</tr>
														{/each}
													</tbody>
												</table>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<div class="text-center py-8 text-base-content/60">
		<BookOpen size={32} class="mx-auto mb-2 opacity-50" />
		<p>No progress data available</p>
	</div>
{/if}
