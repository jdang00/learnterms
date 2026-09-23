<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { BookOpen, Flag, TrendingUp } from 'lucide-svelte';
	import { SvelteSet } from 'svelte/reactivity';

	let { userId, cohortId }: { userId: Id<'users'>; cohortId: Id<'cohort'> } = $props();

	// Fetch detailed stats
	const userStats = useQuery(api.progress.getUserModuleStats, () => ({ userId, cohortId }));

	// Track expanded semesters and classes
	const expandedSemesters = new SvelteSet<string>();
	const expandedClasses = new SvelteSet<string>();

	// Type for class data
	type ClassData = NonNullable<NonNullable<typeof userStats.data>['classes']>[number];

	// Group classes by semester
	const classesBySemester = $derived(() => {
		const data = userStats.data;
		if (!data || 'error' in data || !data.classes) {
			return [] as { semesterName: string; classes: ClassData[] }[];
		}
		const grouped: { semesterName: string; classes: ClassData[] }[] = [];
		for (const cls of data.classes) {
			const semKey = cls.semesterName;
			let group = grouped.find((entry) => entry.semesterName === semKey);
			if (!group) {
				group = { semesterName: semKey, classes: [] };
				grouped.push(group);
			}
			group.classes.push(cls);
		}
		return grouped;
	});

	function toggleSemester(semester: string) {
		if (expandedSemesters.has(semester)) {
			expandedSemesters.delete(semester);
		} else {
			expandedSemesters.add(semester);
		}
	}

	function toggleClass(classId: string) {
		if (expandedClasses.has(classId)) {
			expandedClasses.delete(classId);
		} else {
			expandedClasses.add(classId);
		}
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
		class="stats stats-vertical sm:stats-horizontal shadow-xs border border-base-300 mb-4 rounded-2xl"
	>
		<div class="stat py-3">
			<div class="stat-figure text-primary">
				<TrendingUp size={20} />
			</div>
			<div class="stat-title text-xs">Coverage</div>
			<div class="stat-value text-lg text-primary">{overall.progress}%</div>
		</div>
		<div class="stat py-3">
			<div class="stat-figure text-secondary">
				<BookOpen size={20} />
			</div>
			<div class="stat-title text-xs">Questions tried</div>
			<div class="stat-value text-lg text-secondary">
				{overall.questionsInteracted}
				<span class="text-sm font-normal text-base-content/60">
					/ {overall.totalQuestions}
				</span>
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
		<h4 class="font-semibold mb-3 text-sm text-base-content/70">Progress by Class</h4>

		{#if classesBySemester().length === 0}
			<div class="text-center py-8 text-base-content/60">
				<BookOpen size={32} class="mx-auto mb-2 opacity-50" />
				<p>No classes found</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each classesBySemester() as { semesterName, classes } (semesterName)}
					<!-- Semester Header -->
					<div class="collapse collapse-arrow bg-base-200 rounded-2xl">
						<input
							type="checkbox"
							aria-label={`Expand ${semesterName}`}
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
								{#each classes as cls (cls.classId)}
									<!-- Class -->
									<div
										class="collapse collapse-arrow bg-base-100 border border-base-300 rounded-2xl"
									>
										<input
											type="checkbox"
											aria-label={`Expand ${cls.className}`}
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
															<th class="text-center">Tried</th>
															<th class="text-center">Flagged</th>
														</tr>
													</thead>
													<tbody>
														{#each cls.modules as mod (mod.moduleId)}
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
