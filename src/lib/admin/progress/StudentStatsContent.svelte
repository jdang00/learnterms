<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Flag from '@lucide/svelte/icons/flag';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import { SvelteSet } from 'svelte/reactivity';
	import * as Alert from '$lib/components/ui/alert';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { LoadingState } from '$lib/components/ui/spinner';
	import type { Tone } from '$lib/components/ui/tone';

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

	function getProgressTone(progress: number): Tone {
		if (progress >= 80) return 'success';
		if (progress >= 50) return 'warning';
		if (progress > 0) return 'info';
		return 'primary';
	}
</script>

{#if userStats.isLoading}
	<LoadingState />
{:else if userStats.error}
	<Alert.Root tone="error">
		<Alert.Description>Failed to load stats: {userStats.error.message}</Alert.Description>
	</Alert.Root>
{:else if userStats.data && 'overall' in userStats.data && userStats.data.overall}
	{@const overall = userStats.data.overall}
	<!-- Overall Stats -->
	<div
		class="mb-4 flex flex-col divide-y divide-border overflow-hidden surface shadow-xs sm:flex-row sm:divide-x sm:divide-y-0"
	>
		<div class="flex flex-1 items-start justify-between gap-3 px-6 py-3">
			<div>
				<div class="text-xs text-muted-foreground">Coverage</div>
				<div class="text-lg font-semibold text-primary-ink tabular-nums">{overall.progress}%</div>
			</div>
			<TrendingUp size={20} class="text-primary" />
		</div>
		<div class="flex flex-1 items-start justify-between gap-3 px-6 py-3">
			<div>
				<div class="text-xs text-muted-foreground">Questions tried</div>
				<div class="text-lg font-semibold text-secondary-ink tabular-nums">
					{overall.questionsInteracted}
					<span class="text-sm font-normal text-foreground/60">
						/ {overall.totalQuestions}
					</span>
				</div>
			</div>
			<BookOpen size={20} class="text-secondary" />
		</div>
		<div class="flex flex-1 items-start justify-between gap-3 px-6 py-3">
			<div>
				<div class="text-xs text-muted-foreground">Flagged</div>
				<div class="text-lg font-semibold text-warning-ink tabular-nums">
					{overall.questionsFlagged}
				</div>
			</div>
			<Flag size={20} class="text-warning" />
		</div>
	</div>

	<!-- Semester/Class/Module breakdown -->
	<div class="flex-1 overflow-y-auto">
		<h4 class="font-semibold mb-3 text-sm text-foreground/70">Progress by Class</h4>

		{#if classesBySemester().length === 0}
			<div class="text-center py-8 text-foreground/60">
				<BookOpen size={32} class="mx-auto mb-2 opacity-50" />
				<p>No classes found</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each classesBySemester() as { semesterName, classes } (semesterName)}
					{@const semesterOpen = expandedSemesters.has(semesterName)}
					<!-- Semester Header -->
					<Collapsible.Root
						open={semesterOpen}
						onOpenChange={() => toggleSemester(semesterName)}
						class="rounded-2xl bg-muted"
					>
						<Collapsible.Trigger
							aria-label={`Expand ${semesterName}`}
							class="flex w-full items-center gap-2 px-4 py-2 text-left font-medium"
						>
							<Badge variant="outline" size="sm">{semesterName}</Badge>
							<span class="text-sm text-foreground/60">
								{classes.length} class{classes.length === 1 ? '' : 'es'}
							</span>
							<ChevronRight
								size={14}
								class="ms-auto text-foreground/50 transition-transform {semesterOpen
									? 'rotate-90'
									: ''}"
							/>
						</Collapsible.Trigger>
						<Collapsible.Content class="px-2 pb-2">
							<div class="space-y-2 pt-2">
								{#each classes as cls (cls.classId)}
									{@const classOpen = expandedClasses.has(cls.classId)}
									<!-- Class -->
									<Collapsible.Root
										open={classOpen}
										onOpenChange={() => toggleClass(cls.classId)}
										class="surface"
									>
										<Collapsible.Trigger
											aria-label={`Expand ${cls.className}`}
											class="flex w-full items-center justify-between gap-3 px-4 py-2 text-left"
										>
											<span>
												<span class="font-medium text-sm">{cls.className}</span>
												<span class="text-xs text-foreground/50 ml-2">{cls.classCode}</span>
											</span>
											<span class="flex items-center gap-3">
												<span class="text-sm font-semibold">{cls.progress}%</span>
												<Progress
													value={cls.progress}
													max={100}
													tone={getProgressTone(cls.progress)}
													class="w-20 h-2"
												/>
												<ChevronRight
													size={14}
													class="text-foreground/50 transition-transform {classOpen
														? 'rotate-90'
														: ''}"
												/>
											</span>
										</Collapsible.Trigger>
										<Collapsible.Content>
											<!-- Modules Table -->
											<Table.Root class="text-xs">
												<Table.Header>
													<Table.Row class="text-xs">
														<Table.Head>Module</Table.Head>
														<Table.Head class="text-center">Progress</Table.Head>
														<Table.Head class="text-center">Tried</Table.Head>
														<Table.Head class="text-center">Flagged</Table.Head>
													</Table.Row>
												</Table.Header>
												<Table.Body>
													{#each cls.modules as mod (mod.moduleId)}
														<Table.Row class="hover:bg-muted/50">
															<Table.Cell>
																<div class="flex items-center gap-2">
																	{#if mod.moduleEmoji}
																		<span>{mod.moduleEmoji}</span>
																	{/if}
																	<span class="text-sm">{mod.moduleTitle}</span>
																</div>
															</Table.Cell>
															<Table.Cell class="text-center">
																<div class="flex items-center justify-center gap-2">
																	<Progress
																		value={mod.progress}
																		max={100}
																		tone={getProgressTone(mod.progress)}
																		class="w-12 h-1.5"
																	/>
																	<span class="text-xs w-8">{mod.progress}%</span>
																</div>
															</Table.Cell>
															<Table.Cell class="text-center text-xs">
																{mod.questionsInteracted}/{mod.totalQuestions}
															</Table.Cell>

															<Table.Cell class="text-center">
																{#if mod.questionsFlagged > 0}
																	<Badge variant="solid" tone="warning" size="xs">
																		{mod.questionsFlagged}
																	</Badge>
																{:else}
																	<span class="text-foreground/30">-</span>
																{/if}
															</Table.Cell>
														</Table.Row>
													{/each}
												</Table.Body>
											</Table.Root>
										</Collapsible.Content>
									</Collapsible.Root>
								{/each}
							</div>
						</Collapsible.Content>
					</Collapsible.Root>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<div class="text-center py-8 text-foreground/60">
		<BookOpen size={32} class="mx-auto mb-2 opacity-50" />
		<p>No progress data available</p>
	</div>
{/if}
