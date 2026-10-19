<script lang="ts">
	import { SelectField } from '$lib/components/ui/select';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../../../../convex/_generated/api';
	import type { Id } from '../../../../../convex/_generated/dataModel';
	import { getErrorText } from '$lib/utils/errorHandling';
	import {
		ChevronLeft,
		CircleAlert,
		Clock,
		Target,
		Shuffle,
		Hash,
		Filter,
		Play,
		History,
		Tags
	} from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Switch } from '$lib/components/ui/switch';

	type SourceFilter = 'all' | 'flagged' | 'incomplete';
	type QuestionTypeKey = 'multiple_choice' | 'fill_in_the_blank' | 'matching';
	const questionTypeOptions: QuestionTypeKey[] = [
		'multiple_choice',
		'fill_in_the_blank',
		'matching'
	];

	const client = useConvexClient();

	const classId = $derived(page.params.classId as Id<'class'>);
	const classDashboardHref = $derived.by(() => {
		const href = resolve('/classes');
		if (!classId) return href;
		const url = new URL(
			href,
			typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
		);
		url.searchParams.set('classId', String(classId));
		return `${url.pathname}${url.search}`;
	});

	let sourceFilter = $state<SourceFilter>('all');
	let questionCount = $state(25);
	let selectedModuleIds = $state<Id<'module'>[]>([]);
	let selectedQuestionTypes = $state<QuestionTypeKey[]>([
		'multiple_choice',
		'fill_in_the_blank',
		'matching'
	]);
	let shuffleQuestions = $state(true);
	let shuffleOptions = $state(true);
	let timed = $state(true);
	let timeLimitMinutes = $state(20);
	let passThresholdPct = $state(70);
	let selectedTagCollectionIds = $state<Id<'tags'>[]>([]);
	let starting = $state(false);
	let createError = $state<string | null>(null);

	const builderQuery = useQuery(api.customQuiz.getClassQuizBuilderData, () =>
		classId ? { classId } : 'skip'
	);

	let summaryDebounceHandle: number | null = null;
	let debouncedSelectedModuleIds = $state<Id<'module'>[]>([]);
	const normalizedSelectedModuleIds = $derived.by(() => uniqueSortedIds(selectedModuleIds));

	function uniqueSortedIds<T extends string>(ids: T[]): T[] {
		const unique: T[] = [];
		for (const id of ids) {
			if (!unique.includes(id)) unique.push(id);
		}
		return unique.sort();
	}

	$effect(() => {
		if (typeof window === 'undefined') {
			debouncedSelectedModuleIds = normalizedSelectedModuleIds;
			return;
		}
		if (summaryDebounceHandle !== null) {
			clearTimeout(summaryDebounceHandle);
		}
		const next = [...normalizedSelectedModuleIds];
		summaryDebounceHandle = window.setTimeout(() => {
			debouncedSelectedModuleIds = next;
			summaryDebounceHandle = null;
		}, 250);
		return () => {
			if (summaryDebounceHandle !== null) {
				clearTimeout(summaryDebounceHandle);
				summaryDebounceHandle = null;
			}
		};
	});

	const summaryQuery = useQuery(api.customQuiz.getEligibleQuestionPoolSummary, () =>
		classId && debouncedSelectedModuleIds.length > 0
			? {
					classId,
					moduleIds: debouncedSelectedModuleIds,
					sourceFilter,
					questionTypes: selectedQuestionTypes
				}
			: 'skip'
	);

	const attemptsQuery = useQuery(api.customQuiz.getUserAttemptsForClass, () =>
		classId ? { classId } : 'skip'
	);

	const maxQuestions = $derived(builderQuery.data?.limits?.maxQuestionsPerAttempt ?? 100);
	const totalEligible = $derived(summaryQuery.data?.totalEligible ?? 0);
	const effectiveQuestionCount = $derived(
		totalEligible > 0 ? Math.max(1, Math.min(questionCount, totalEligible, maxQuestions)) : 0
	);
	const matchedTagModuleIds = $derived.by(() => {
		const tags = builderQuery.data?.tagCollections ?? [];
		const moduleIds: Id<'module'>[] = [];
		for (const tag of tags) {
			if (!selectedTagCollectionIds.includes(tag._id)) continue;
			for (const moduleId of tag.moduleIds ?? []) {
				if (!moduleIds.includes(moduleId)) moduleIds.push(moduleId);
			}
		}
		return moduleIds;
	});

	function moduleIdsForTagCollectionIds(tagIds: Id<'tags'>[]): Id<'module'>[] {
		const tags = builderQuery.data?.tagCollections ?? [];
		const moduleIds: Id<'module'>[] = [];
		for (const tag of tags) {
			if (!tagIds.includes(tag._id)) continue;
			for (const moduleId of tag.moduleIds ?? []) {
				if (!moduleIds.includes(moduleId)) moduleIds.push(moduleId);
			}
		}
		return moduleIds;
	}

	function toggleModule(moduleId: Id<'module'>) {
		createError = null;
		if (selectedModuleIds.includes(moduleId)) {
			selectedModuleIds = selectedModuleIds.filter((id) => id !== moduleId);
		} else {
			selectedModuleIds = [...selectedModuleIds, moduleId];
		}
	}

	function toggleQuestionType(type: QuestionTypeKey) {
		if (selectedQuestionTypes.includes(type)) {
			const next = selectedQuestionTypes.filter((t) => t !== type);
			if (next.length > 0) selectedQuestionTypes = next;
			return;
		}
		selectedQuestionTypes = [...selectedQuestionTypes, type];
	}

	function toggleTagCollection(tagId: Id<'tags'>) {
		createError = null;
		const nextTagIds = selectedTagCollectionIds.includes(tagId)
			? selectedTagCollectionIds.filter((id) => id !== tagId)
			: [...selectedTagCollectionIds, tagId];
		selectedTagCollectionIds = nextTagIds;
		selectedModuleIds = moduleIdsForTagCollectionIds(nextTagIds);
	}

	function applyTagCollections(mode: 'replace' | 'add') {
		const matched = matchedTagModuleIds;
		if (matched.length === 0) return;
		createError = null;
		if (mode === 'replace') {
			selectedModuleIds = matched;
			return;
		}
		selectedModuleIds = uniqueSortedIds([...selectedModuleIds, ...matched]);
	}

	function typeLabel(type: string): string {
		switch (type) {
			case 'multiple_choice':
				return 'Multiple Choice';
			case 'fill_in_the_blank':
				return 'Fill in the Blank';
			case 'matching':
				return 'Matching';
			default:
				return type;
		}
	}

	function safeTagColor(value?: string): string | null {
		if (!value) return null;
		const trimmed = value.trim();
		const isHex = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed);
		const isRgbLike = /^(?:rgb|hsl)a?\([\d\s.,%+-]+\)$/i.test(trimmed);
		return isHex || isRgbLike ? trimmed : null;
	}

	async function startTest() {
		createError = null;
		if (!classId) {
			createError = 'Missing class ID';
			return;
		}
		if (selectedModuleIds.length === 0) {
			createError = 'Pick at least one module to get started.';
			return;
		}
		if (totalEligible <= 0) {
			createError = 'No questions match your current filters. Try adjusting your selections.';
			return;
		}

		starting = true;
		try {
			const result = await client.mutation(api.customQuiz.createCustomQuizAttempt, {
				classId,
				moduleIds: selectedModuleIds,
				questionCount: effectiveQuestionCount,
				sourceFilter,
				questionTypes: selectedQuestionTypes,
				shuffleQuestions,
				shuffleOptions,
				timeLimitSec: timed ? Math.max(1, timeLimitMinutes) * 60 : undefined,
				passThresholdPct
			});
			await goto(
				resolve('/classes/[classId]/tests/[attemptId]', { classId, attemptId: result.attemptId })
			);
		} catch (error: unknown) {
			createError = getErrorText(error) || 'Something went wrong. Please try again.';
		} finally {
			starting = false;
		}
	}

	function formatAttemptStatus(status: string): string {
		switch (status) {
			case 'in_progress':
				return 'In Progress';
			case 'submitted':
				return 'Completed';
			case 'timed_out':
				return 'Time Expired';
			case 'abandoned':
				return 'Abandoned';
			default:
				return status.replace('_', ' ');
		}
	}

	function statusBadgeTone(status: string): 'neutral' | 'warning' | 'success' | 'error' {
		switch (status) {
			case 'in_progress':
				return 'warning';
			case 'submitted':
				return 'success';
			case 'timed_out':
				return 'error';
			default:
				return 'neutral';
		}
	}
</script>

<main class="flex flex-col h-[calc(100dvh-4rem)]">
	<div class="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8 pb-8 xl:pb-20">
		<div class="max-w-6xl mx-auto space-y-6">
			<div class="flex items-center justify-between gap-3 flex-wrap">
				<div>
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<Button
						href={classDashboardHref}
						variant="ghost"
						tone="secondary"
						size="sm"
						class="mb-2 font-bold"
					>
						<ChevronLeft size={16} /> Back to Class
					</Button>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
					<h1 class="font-display text-2xl sm:text-3xl font-bold">Build Your Test</h1>
					<p class="text-foreground/60 text-sm mt-1">
						Pick your modules, set your preferences, and jump in.
					</p>
				</div>
			</div>

			{#if builderQuery.isLoading}
				<Card.Root>
					<Card.Content>
						<Skeleton class="h-6 w-56" />
						<Skeleton class="mt-2 h-4 w-full" />
						<Skeleton class="mt-1 h-4 w-5/6" />
					</Card.Content>
				</Card.Root>
			{:else if builderQuery.error}
				<Alert.Root tone="error">
					<CircleAlert />
					<Alert.Title>{builderQuery.error.toString()}</Alert.Title>
				</Alert.Root>
			{:else if builderQuery.data}
				<div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
					<section class="xl:col-span-2 space-y-6">
						<Card.Root>
							<Card.Content>
								<h2 class="text-lg font-semibold">
									{builderQuery.data.class.name}
									<Badge tone="primary">{builderQuery.data.class.code}</Badge>
								</h2>
								<p class="text-sm text-foreground/60">{builderQuery.data.class.description}</p>

								<div class="mt-5">
									<div class="flex items-center justify-between mb-3">
										<h3 class="font-semibold">Choose Modules</h3>
										<div class="flex gap-2">
											<Button
												variant="soft"
												tone="primary"
												size="xs"
												onclick={() => {
													createError = null;
													selectedModuleIds = (builderQuery.data.modules ?? []).map((m) => m._id);
												}}
											>
												Select All
											</Button>
											<Button
												variant="ghost"
												tone="neutral"
												size="xs"
												onclick={() => {
													createError = null;
													selectedModuleIds = [];
												}}
											>
												Clear
											</Button>
										</div>
									</div>

									{#if builderQuery.data.tagCollections && builderQuery.data.tagCollections.length > 0}
										<div class="mb-4 rounded-2xl border border-border bg-muted/40 p-4">
											<div class="flex items-start justify-between gap-3 flex-wrap">
												<div>
													<div class="text-sm font-semibold flex items-center gap-2">
														<Tags size={14} class="text-foreground/50" />
														Build from Tag Collections
													</div>
													<div class="text-xs text-foreground/50 mt-1">
														Use tags like “Quiz 4” or “Midterm” to auto-select all tagged modules.
													</div>
													<div class="text-xs text-foreground/40 mt-1">
														Clicking a tag immediately checks the matching modules below.
													</div>
												</div>
												<div class="flex gap-2">
													<Button
														variant="soft"
														tone="primary"
														size="xs"
														onclick={() => applyTagCollections('replace')}
														disabled={matchedTagModuleIds.length === 0}
													>
														Use Tags
													</Button>
													<Button
														variant="ghost"
														tone="neutral"
														size="xs"
														onclick={() => applyTagCollections('add')}
														disabled={matchedTagModuleIds.length === 0}
													>
														Add Modules
													</Button>
													<Button
														variant="ghost"
														tone="neutral"
														size="xs"
														onclick={() => {
															createError = null;
															selectedTagCollectionIds = [];
															selectedModuleIds = [];
														}}
														disabled={selectedTagCollectionIds.length === 0}
													>
														Clear Tags
													</Button>
												</div>
											</div>

											<div class="flex flex-wrap gap-2 mt-3">
												{#each builderQuery.data.tagCollections as tag (tag._id)}
													{@const active = selectedTagCollectionIds.includes(tag._id)}
													{@const tagColor = safeTagColor(tag.color)}
													<Button
														variant={active ? 'soft' : 'ghost'}
														tone={active ? 'primary' : 'neutral'}
														size="sm"
														class="border transition-all duration-200 {active
															? 'border-primary/40'
															: 'border-border'}"
														onclick={() => toggleTagCollection(tag._id)}
														title={`Modules: ${tag.moduleCount} · Questions: ${tag.questionCount}`}
													>
														{#if tagColor}
															<span
																class="inline-block w-2 h-2 rounded-full"
																style={`background:${tagColor}`}
															></span>
														{/if}
														<span>{tag.name}</span>
														<span class="opacity-60 text-xs"
															>({tag.moduleCount}m · {tag.questionCount}q)</span
														>
													</Button>
												{/each}
											</div>

											{#if selectedTagCollectionIds.length > 0}
												<div class="text-xs text-foreground/50 mt-3">
													Selected tags map to <span class="font-semibold text-foreground/70"
														>{matchedTagModuleIds.length}</span
													>
													{matchedTagModuleIds.length === 1 ? ' module' : ' modules'}.
												</div>
											{/if}
										</div>
									{/if}

									<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
										{#each builderQuery.data.modules as module (module._id)}
											{@const isSelected = selectedModuleIds.includes(module._id)}
											<label
												class="border-2 rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
												{isSelected ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'}"
											>
												<div class="flex items-start gap-3">
													<Checkbox
														class="mt-1 size-4"
														checked={isSelected}
														onCheckedChange={() => toggleModule(module._id)}
													/>
													<div class="min-w-0 flex-1">
														<div class="font-medium flex items-center gap-2">
															<span class="text-lg">{module.emoji || '📘'}</span>
															<span class="truncate">{module.title}</span>
														</div>
														<div class="text-xs text-foreground/50 mt-1">
															{module.questionCount}
															{module.questionCount === 1 ? 'question' : 'questions'}
														</div>
														{#if module.tags && module.tags.length > 0}
															<div class="flex flex-wrap gap-1 mt-2">
																{#each module.tags as tag (tag._id)}
																	{@const tagColor = safeTagColor(tag.color)}
																	<Badge size="xs" class="border border-border">
																		{#if tagColor}
																			<span
																				class="inline-block w-1.5 h-1.5 rounded-full mr-1"
																				style={`background:${tagColor}`}
																			></span>
																		{/if}
																		{tag.name}
																	</Badge>
																{/each}
															</div>
														{/if}
														{#if module.description}
															<div class="text-xs text-foreground/40 mt-1 line-clamp-2">
																{module.description}
															</div>
														{/if}
													</div>
												</div>
											</label>
										{/each}
									</div>
								</div>
							</Card.Content>
						</Card.Root>

						<Card.Root>
							<Card.Content class="gap-5">
								<h2 class="text-lg font-semibold">Test Settings</h2>

								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<Label class="flex-col items-stretch">
										<span class="flex items-center gap-2">
											<Filter size={14} class="text-foreground/50" />
											Question Source
										</span>
										<SelectField
											value={sourceFilter}
											onValueChange={(v) => (sourceFilter = v as typeof sourceFilter)}
											options={[
												{ value: 'all', label: 'All questions' },
												{ value: 'flagged', label: 'Flagged only' },
												{ value: 'incomplete', label: 'Not yet completed' }
											]}
										/>
									</Label>

									<Label class="flex-col items-stretch">
										<span class="flex items-center gap-2">
											<Hash size={14} class="text-foreground/50" />
											Number of Questions
										</span>
										<Input type="number" min="1" max={maxQuestions} bind:value={questionCount} />
										<span class="text-xs font-normal text-foreground/40">
											Max {maxQuestions}. Adjusted to match available questions.
										</span>
									</Label>
								</div>

								<div>
									<div class="text-sm font-medium mb-2">Question Types</div>
									<p class="text-xs text-foreground/60 mb-2">
										Free response questions are available in module practice.
									</p>
									<div class="flex flex-wrap gap-2">
										{#each questionTypeOptions as type (type)}
											{@const selected = selectedQuestionTypes.includes(type)}
											<Button
												variant={selected ? 'soft' : 'ghost'}
												tone={selected ? 'primary' : 'neutral'}
												size="sm"
												class="transition-all duration-200 {selected ? '' : 'border-border'}"
												onclick={() => toggleQuestionType(type)}
											>
												{typeLabel(type)}
											</Button>
										{/each}
									</div>
								</div>

								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<Label class="flex-col items-stretch">
										<span class="flex items-center gap-2">
											<Target size={14} class="text-foreground/50" />
											Passing Score
										</span>
										<div class="flex items-center gap-2">
											<Input
												type="number"
												class="flex-1"
												min="0"
												max="100"
												bind:value={passThresholdPct}
											/>
											<span class="text-foreground/50 font-medium">%</span>
										</div>
									</Label>

									<Label class="flex-col items-stretch">
										<span class="flex items-center gap-2">
											<Clock size={14} class="text-foreground/50" />
											Time Limit
										</span>
										<div class="flex items-center gap-2">
											<Switch size="sm" bind:checked={timed} />
											<Input
												type="number"
												class="flex-1"
												min="1"
												max="1440"
												bind:value={timeLimitMinutes}
												disabled={!timed}
											/>
											<span class="text-foreground/50 text-sm">min</span>
										</div>
										<span class="text-xs font-normal text-foreground/40"
											>Time is always tracked, even without a limit.</span
										>
									</Label>
								</div>

								<div class="flex flex-wrap gap-4 pt-1">
									<Label class="cursor-pointer gap-2">
										<Checkbox class="size-4" bind:checked={shuffleQuestions} />
										<span class="flex items-center gap-1.5">
											<Shuffle size={14} class="text-foreground/50" />
											Shuffle questions
										</span>
									</Label>
									<Label class="cursor-pointer gap-2">
										<Checkbox class="size-4" bind:checked={shuffleOptions} />
										<span class="flex items-center gap-1.5">
											<Shuffle size={14} class="text-foreground/50" />
											Shuffle answer choices
										</span>
									</Label>
								</div>
							</Card.Content>
						</Card.Root>
					</section>

					<aside class="space-y-4">
						<Card.Root class="sticky top-4">
							<Card.Content class="gap-4">
								<!-- Start Test CTA -->
								{#if createError}
									<Alert.Root tone="error">
										<CircleAlert />
										<Alert.Title>{createError}</Alert.Title>
									</Alert.Root>
								{/if}

								<Button
									size="lg"
									class="w-full group shadow-lg hover:shadow-xl transition-all duration-200 max-xl:hidden"
									onclick={startTest}
									disabled={starting ||
										builderQuery.isLoading ||
										selectedModuleIds.length === 0 ||
										totalEligible === 0}
								>
									<Play size={20} class="transition-transform group-hover:scale-110" />
									{starting ? 'Setting up...' : 'Start Test'}
								</Button>

								<!-- Summary stats -->
								{#if summaryQuery.isLoading}
									<div class="space-y-2">
										<Skeleton class="h-4 w-24" />
										<Skeleton class="h-4 w-32" />
									</div>
								{:else if summaryQuery.error}
									<div class="text-error-ink text-sm">{summaryQuery.error.toString()}</div>
								{:else}
									<div class="grid grid-cols-3 gap-2 text-sm">
										<div class="rounded-xl border border-border p-2.5 text-center">
											<div class="font-bold text-lg">{effectiveQuestionCount}</div>
											<div class="text-[10px] text-foreground/40">Questions</div>
										</div>
										<div class="rounded-xl border border-border p-2.5 text-center">
											<div class="font-bold text-lg">{timed ? `${timeLimitMinutes}` : '—'}</div>
											<div class="text-[10px] text-foreground/40">
												{timed ? 'Minutes' : 'Untimed'}
											</div>
										</div>
										<div class="rounded-xl border border-border p-2.5 text-center">
											<div class="font-bold text-lg">{passThresholdPct}%</div>
											<div class="text-[10px] text-foreground/40">To pass</div>
										</div>
									</div>

									<div class="flex items-center justify-between text-xs text-foreground/50">
										<span
											>{totalEligible} available from {selectedModuleIds.length}
											{selectedModuleIds.length === 1 ? 'module' : 'modules'}</span
										>
									</div>
									{#if selectedModuleIds.length === 0}
										<div class="text-xs text-warning-ink">
											No modules selected. Use tags or pick modules to build a test.
										</div>
									{/if}

									{#if summaryQuery.data?.byType?.length > 0}
										<div class="flex flex-wrap gap-1.5">
											{#each summaryQuery.data.byType as row (row.questionType)}
												<Badge size="sm">
													{typeLabel(row.questionType)}: {row.count}
												</Badge>
											{/each}
										</div>
									{/if}
								{/if}

								<!-- Recent Attempts (collapsed) -->
								{#if !attemptsQuery.isLoading && attemptsQuery.data && attemptsQuery.data.length > 0}
									<div class="border-t border-border pt-3">
										<details class="group">
											<summary
												class="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground/60 hover:text-foreground transition-colors select-none"
											>
												<History size={14} />
												<span>Recent Attempts ({attemptsQuery.data.length})</span>
												<svg
													class="w-3 h-3 ml-auto transition-transform group-open:rotate-180"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													><path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M19 9l-7 7-7-7"
													></path></svg
												>
											</summary>
											<div class="space-y-2 mt-3">
												{#each attemptsQuery.data.slice(0, 4) as attempt (attempt._id)}
													{@const attemptHref =
														attempt.status === 'in_progress' || !attempt.resultSummary
															? resolve('/classes/[classId]/tests/[attemptId]', {
																	classId,
																	attemptId: attempt._id
																})
															: resolve('/classes/[classId]/tests/[attemptId]/results', {
																	classId,
																	attemptId: attempt._id
																})}
													<!-- eslint-disable svelte/no-navigation-without-resolve -->
													<a
														class="block border border-border rounded-xl p-2.5 hover:border-primary/40 transition-all duration-200"
														href={attemptHref}
													>
														<div class="flex justify-between items-center gap-2 text-xs">
															<Badge size="xs" tone={statusBadgeTone(attempt.status)}>
																{formatAttemptStatus(attempt.status)}
															</Badge>
															<span class="text-foreground/40">
																{new Date(attempt.startedAt).toLocaleDateString()}
															</span>
														</div>
														<div class="text-xs text-foreground/50 mt-1">
															{attempt.configSnapshot.questionCountActual} questions
															{#if attempt.resultSummary}
																<span class="font-semibold text-foreground/70"
																	>· {attempt.resultSummary.scorePct}%</span
																>
															{/if}
														</div>
													</a>
													<!-- eslint-enable svelte/no-navigation-without-resolve -->
												{/each}
											</div>
										</details>
									</div>
								{/if}
							</Card.Content>
						</Card.Root>
					</aside>
				</div>
			{/if}
		</div>
	</div>

	{#if builderQuery.data}
		<!-- Below xl the summary column lands under the form, so Start stays pinned here. -->
		<div
			class="flex shrink-0 items-center gap-3 border-t border-border bg-background px-4 pt-3 xl:hidden"
			style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
		>
			<div class="min-w-0 flex-1 text-sm">
				<div class="font-semibold tabular-nums">
					{effectiveQuestionCount}
					{effectiveQuestionCount === 1 ? 'question' : 'questions'}
				</div>
				<div class="text-xs text-foreground/60">
					{timed ? `${timeLimitMinutes} minutes` : 'Untimed'}, {passThresholdPct}% to pass
				</div>
			</div>
			<Button
				size="lg"
				class="shrink-0 gap-2 px-6"
				onclick={startTest}
				disabled={starting ||
					builderQuery.isLoading ||
					selectedModuleIds.length === 0 ||
					totalEligible === 0}
			>
				<Play size={18} />
				{starting ? 'Setting up…' : 'Start test'}
			</Button>
		</div>
	{/if}
</main>
