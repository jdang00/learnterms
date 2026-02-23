<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../../../../convex/_generated/api';
	import { ChevronLeft, Clock, Target, Shuffle, Hash, Filter, Play, History, Tags } from 'lucide-svelte';

	type SourceFilter = 'all' | 'flagged' | 'incomplete';
	type QuestionTypeKey = 'multiple_choice' | 'fill_in_the_blank' | 'matching';

	const client = useConvexClient();

	const classId = $derived(page.params.classId as any);

	let sourceFilter = $state<SourceFilter>('all');
	let questionCount = $state(25);
	let selectedModuleIds = $state<string[]>([]);
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
	let selectedTagCollectionIds = $state<string[]>([]);
	let starting = $state(false);
	let createError = $state<string | null>(null);

	const builderQuery = useQuery((api as any).customQuiz.getClassQuizBuilderData, () =>
		classId ? { classId } : 'skip'
	);

	const summaryQuery = useQuery((api as any).customQuiz.getEligibleQuestionPoolSummary, () =>
		classId && selectedModuleIds.length > 0
			? {
					classId,
					moduleIds: selectedModuleIds as any,
					sourceFilter,
					questionTypes: selectedQuestionTypes
				}
			: 'skip'
	);

	const attemptsQuery = useQuery((api as any).customQuiz.getUserAttemptsForClass, () =>
		classId ? { classId } : 'skip'
	);

	const maxQuestions = $derived(builderQuery.data?.limits?.maxQuestionsPerAttempt ?? 100);
	const totalEligible = $derived(summaryQuery.data?.totalEligible ?? 0);
	const effectiveQuestionCount = $derived(
		totalEligible > 0 ? Math.max(1, Math.min(questionCount, totalEligible, maxQuestions)) : 0
	);
	const matchedTagModuleIds = $derived.by(() => {
		const tags = builderQuery.data?.tagCollections ?? [];
		const selected = new Set(selectedTagCollectionIds);
		const moduleIds = new Set<string>();
		for (const tag of tags) {
			if (!selected.has(tag._id)) continue;
			for (const moduleId of tag.moduleIds ?? []) moduleIds.add(moduleId);
		}
		return Array.from(moduleIds);
	});

	function moduleIdsForTagCollectionIds(tagIds: string[]): string[] {
		const tags = builderQuery.data?.tagCollections ?? [];
		const selected = new Set(tagIds);
		const moduleIds = new Set<string>();
		for (const tag of tags) {
			if (!selected.has(tag._id)) continue;
			for (const moduleId of tag.moduleIds ?? []) moduleIds.add(moduleId);
		}
		return Array.from(moduleIds);
	}

	function toggleModule(moduleId: string) {
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

	function toggleTagCollection(tagId: string) {
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
		selectedModuleIds = Array.from(new Set([...selectedModuleIds, ...matched]));
	}

	function typeLabel(type: QuestionTypeKey): string {
		switch (type) {
			case 'multiple_choice': return 'Multiple Choice';
			case 'fill_in_the_blank': return 'Fill in the Blank';
			case 'matching': return 'Matching';
		}
	}

	function friendlyTypeName(raw: string): string {
		switch (raw) {
			case 'multiple_choice': return 'Multiple Choice';
			case 'fill_in_the_blank': return 'Fill in the Blank';
			case 'matching': return 'Matching';
			default: return raw;
		}
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
			const result = await client.mutation((api as any).customQuiz.createCustomQuizAttempt, {
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
			await goto(`/classes/${classId}/tests/${result.attemptId}`);
		} catch (error: any) {
			createError = error?.message ?? 'Something went wrong. Please try again.';
		} finally {
			starting = false;
		}
	}

	function formatAttemptStatus(status: string): string {
		switch (status) {
			case 'in_progress': return 'In Progress';
			case 'submitted': return 'Completed';
			case 'timed_out': return 'Time Expired';
			case 'abandoned': return 'Abandoned';
			default: return status.replace('_', ' ');
		}
	}

	function statusBadgeClass(status: string): string {
		switch (status) {
			case 'in_progress': return 'badge-warning';
			case 'submitted': return 'badge-success';
			case 'timed_out': return 'badge-error';
			default: return 'badge-ghost';
		}
	}
</script>

<main class="flex flex-col h-[calc(100vh-4rem)]">
	<div class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20">
		<div class="max-w-6xl mx-auto space-y-6">
			<div class="flex items-center justify-between gap-3 flex-wrap">
				<div>
					<a
						class="btn btn-ghost btn-sm font-bold rounded-full text-secondary mb-2"
						href="/classes?classId={classId}"
					>
						<ChevronLeft size={16} /> Back to Class
					</a>
					<h1 class="text-2xl sm:text-3xl font-bold">Build Your Test</h1>
					<p class="text-base-content/60 text-sm mt-1">
						Pick your modules, set your preferences, and jump in.
					</p>
				</div>
			</div>

			{#if builderQuery.isLoading}
				<div class="card bg-base-100 border border-base-300 rounded-2xl shadow-sm">
					<div class="card-body">
						<div class="skeleton h-6 w-56"></div>
						<div class="skeleton h-4 w-full mt-2"></div>
						<div class="skeleton h-4 w-5/6 mt-1"></div>
					</div>
				</div>
			{:else if builderQuery.error}
				<div class="alert alert-error rounded-2xl">
					<span>{builderQuery.error.toString()}</span>
				</div>
			{:else if builderQuery.data}
				<div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
					<section class="xl:col-span-2 space-y-6">
						<div class="card bg-base-100 border border-base-300 rounded-2xl shadow-sm">
							<div class="card-body">
								<h2 class="card-title">
									{builderQuery.data.class.name}
									<span class="badge badge-soft badge-primary rounded-full text-xs">{builderQuery.data.class.code}</span>
								</h2>
								<p class="text-sm text-base-content/60">{builderQuery.data.class.description}</p>

								<div class="mt-5">
									<div class="flex items-center justify-between mb-3">
										<h3 class="font-semibold">Choose Modules</h3>
										<div class="flex gap-2">
												<button
													class="btn btn-xs btn-primary btn-soft rounded-full"
													onclick={() => {
														createError = null;
														selectedModuleIds = (builderQuery.data.modules ?? []).map((m: any) => m._id);
													}}
												>
													Select All
												</button>
												<button
													class="btn btn-xs btn-ghost rounded-full"
													onclick={() => {
														createError = null;
														selectedModuleIds = [];
													}}
												>
													Clear
												</button>
										</div>
									</div>

									{#if builderQuery.data.tagCollections && builderQuery.data.tagCollections.length > 0}
										<div class="mb-4 rounded-2xl border border-base-300 bg-base-200/40 p-4">
											<div class="flex items-start justify-between gap-3 flex-wrap">
												<div>
													<div class="text-sm font-semibold flex items-center gap-2">
														<Tags size={14} class="text-base-content/50" />
														Build from Tag Collections
													</div>
														<div class="text-xs text-base-content/50 mt-1">
															Use tags like “Quiz 4” or “Midterm” to auto-select all tagged modules.
														</div>
														<div class="text-xs text-base-content/40 mt-1">
															Clicking a tag immediately checks the matching modules below.
														</div>
													</div>
												<div class="flex gap-2">
													<button
														class="btn btn-xs btn-primary btn-soft rounded-full"
														onclick={() => applyTagCollections('replace')}
														disabled={matchedTagModuleIds.length === 0}
													>
														Use Tags
													</button>
													<button
														class="btn btn-xs btn-ghost rounded-full"
														onclick={() => applyTagCollections('add')}
														disabled={matchedTagModuleIds.length === 0}
													>
														Add Modules
													</button>
														<button
															class="btn btn-xs btn-ghost rounded-full"
															onclick={() => {
																createError = null;
																selectedTagCollectionIds = [];
																selectedModuleIds = [];
															}}
															disabled={selectedTagCollectionIds.length === 0}
														>
															Clear Tags
													</button>
												</div>
											</div>

											<div class="flex flex-wrap gap-2 mt-3">
												{#each builderQuery.data.tagCollections as tag (tag._id)}
													{@const active = selectedTagCollectionIds.includes(tag._id)}
													<button
														class="btn btn-sm rounded-full border transition-all duration-200 {active ? 'btn-primary btn-soft border-primary/40' : 'btn-ghost border-base-300'}"
														onclick={() => toggleTagCollection(tag._id)}
														title={`Modules: ${tag.moduleCount} · Questions: ${tag.questionCount}`}
													>
														{#if tag.color}
															<span class="inline-block w-2 h-2 rounded-full" style={`background:${tag.color}`}></span>
														{/if}
														<span>{tag.name}</span>
														<span class="opacity-60 text-xs">({tag.moduleCount}m · {tag.questionCount}q)</span>
													</button>
												{/each}
											</div>

											{#if selectedTagCollectionIds.length > 0}
												<div class="text-xs text-base-content/50 mt-3">
													Selected tags map to <span class="font-semibold text-base-content/70">{matchedTagModuleIds.length}</span>
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
												{isSelected ? 'border-primary/50 bg-primary/5' : 'border-base-300 hover:border-primary/30'}"
											>
												<div class="flex items-start gap-3">
													<input
														type="checkbox"
														class="checkbox checkbox-primary checkbox-sm mt-1"
														checked={isSelected}
														onchange={() => toggleModule(module._id)}
													/>
													<div class="min-w-0 flex-1">
														<div class="font-medium flex items-center gap-2">
															<span class="text-lg">{module.emoji || '📘'}</span>
															<span class="truncate">{module.title}</span>
														</div>
														<div class="text-xs text-base-content/50 mt-1">
															{module.questionCount} {module.questionCount === 1 ? 'question' : 'questions'}
														</div>
														{#if module.tags && module.tags.length > 0}
															<div class="flex flex-wrap gap-1 mt-2">
																{#each module.tags as tag (tag._id)}
																	<span class="badge badge-soft badge-xs rounded-full border border-base-300">
																		{#if tag.color}
																			<span class="inline-block w-1.5 h-1.5 rounded-full mr-1" style={`background:${tag.color}`}></span>
																		{/if}
																		{tag.name}
																	</span>
																{/each}
															</div>
														{/if}
														{#if module.description}
															<div class="text-xs text-base-content/40 mt-1 line-clamp-2">
																{module.description}
															</div>
														{/if}
													</div>
												</div>
											</label>
										{/each}
									</div>
								</div>
							</div>
						</div>

						<div class="card bg-base-100 border border-base-300 rounded-2xl shadow-sm">
							<div class="card-body space-y-5">
								<h2 class="card-title">Test Settings</h2>

								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<label class="form-control">
										<div class="label">
											<span class="label-text font-medium flex items-center gap-2">
												<Filter size={14} class="text-base-content/50" />
												Question Source
											</span>
										</div>
										<select
											class="select select-bordered rounded-xl"
											bind:value={sourceFilter}
										>
											<option value="all">All questions</option>
											<option value="flagged">Flagged only</option>
											<option value="incomplete">Not yet completed</option>
										</select>
									</label>

									<label class="form-control">
										<div class="label">
											<span class="label-text font-medium flex items-center gap-2">
												<Hash size={14} class="text-base-content/50" />
												Number of Questions
											</span>
										</div>
										<input
											type="number"
											class="input input-bordered rounded-xl"
											min="1"
											max={maxQuestions}
											bind:value={questionCount}
										/>
										<div class="label">
											<span class="label-text-alt text-base-content/40">
												Max {maxQuestions}. Adjusted to match available questions.
											</span>
										</div>
									</label>
								</div>

								<div>
									<div class="text-sm font-medium mb-2">Question Types</div>
									<div class="flex flex-wrap gap-2">
										{#each (['multiple_choice', 'fill_in_the_blank', 'matching'] as QuestionTypeKey[]) as type}
											<button
												class="btn btn-sm rounded-full transition-all duration-200
												{selectedQuestionTypes.includes(type) ? 'btn-primary btn-soft' : 'btn-ghost border border-base-300'}"
												onclick={() => toggleQuestionType(type)}
											>
												{typeLabel(type)}
											</button>
										{/each}
									</div>
								</div>

								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<label class="form-control">
										<div class="label">
											<span class="label-text font-medium flex items-center gap-2">
												<Target size={14} class="text-base-content/50" />
												Passing Score
											</span>
										</div>
										<div class="flex items-center gap-2">
											<input
												type="number"
												class="input input-bordered rounded-xl flex-1"
												min="0"
												max="100"
												bind:value={passThresholdPct}
											/>
											<span class="text-base-content/50 font-medium">%</span>
										</div>
									</label>

									<label class="form-control">
										<div class="label">
											<span class="label-text font-medium flex items-center gap-2">
												<Clock size={14} class="text-base-content/50" />
												Time Limit
											</span>
										</div>
										<div class="flex items-center gap-2">
											<input type="checkbox" class="toggle toggle-primary toggle-sm" bind:checked={timed} />
											<input
												type="number"
												class="input input-bordered rounded-xl flex-1"
												min="1"
												max="1440"
												bind:value={timeLimitMinutes}
												disabled={!timed}
											/>
											<span class="text-base-content/50 text-sm">min</span>
										</div>
										<div class="label">
											<span class="label-text-alt text-base-content/40">Time is always tracked, even without a limit.</span>
										</div>
									</label>
								</div>

								<div class="flex flex-wrap gap-4 pt-1">
									<label class="label cursor-pointer gap-2">
										<input type="checkbox" class="checkbox checkbox-sm checkbox-primary" bind:checked={shuffleQuestions} />
										<span class="label-text flex items-center gap-1.5">
											<Shuffle size={14} class="text-base-content/50" />
											Shuffle questions
										</span>
									</label>
									<label class="label cursor-pointer gap-2">
										<input type="checkbox" class="checkbox checkbox-sm checkbox-primary" bind:checked={shuffleOptions} />
										<span class="label-text flex items-center gap-1.5">
											<Shuffle size={14} class="text-base-content/50" />
											Shuffle answer choices
										</span>
									</label>
								</div>
							</div>
						</div>
					</section>

					<aside class="space-y-4">
						<div class="card bg-base-100 border border-base-300 rounded-2xl shadow-sm sticky top-4">
							<div class="card-body gap-4">
								<!-- Start Test CTA -->
								{#if createError}
									<div class="alert alert-error rounded-xl">
										<span class="text-sm">{createError}</span>
									</div>
								{/if}

								<button
									class="btn btn-primary rounded-full w-full py-4 text-base gap-2 group shadow-lg hover:shadow-xl transition-all duration-200"
									onclick={startTest}
									disabled={starting || builderQuery.isLoading || selectedModuleIds.length === 0 || totalEligible === 0}
								>
									<Play size={20} class="transition-transform group-hover:scale-110" />
									{starting ? 'Setting up...' : 'Start Test'}
								</button>

								<!-- Summary stats -->
								{#if summaryQuery.isLoading}
									<div class="space-y-2">
										<div class="skeleton h-4 w-24"></div>
										<div class="skeleton h-4 w-32"></div>
									</div>
								{:else if summaryQuery.error}
									<div class="text-error text-sm">{summaryQuery.error.toString()}</div>
								{:else}
									<div class="grid grid-cols-3 gap-2 text-sm">
										<div class="rounded-xl border border-base-300 p-2.5 text-center">
											<div class="font-bold text-lg">{effectiveQuestionCount}</div>
											<div class="text-[10px] text-base-content/40">Questions</div>
										</div>
										<div class="rounded-xl border border-base-300 p-2.5 text-center">
											<div class="font-bold text-lg">{timed ? `${timeLimitMinutes}` : '—'}</div>
											<div class="text-[10px] text-base-content/40">{timed ? 'Minutes' : 'Untimed'}</div>
										</div>
										<div class="rounded-xl border border-base-300 p-2.5 text-center">
											<div class="font-bold text-lg">{passThresholdPct}%</div>
											<div class="text-[10px] text-base-content/40">To pass</div>
										</div>
									</div>

										<div class="flex items-center justify-between text-xs text-base-content/50">
											<span>{totalEligible} available from {selectedModuleIds.length} {selectedModuleIds.length === 1 ? 'module' : 'modules'}</span>
										</div>
										{#if selectedModuleIds.length === 0}
											<div class="text-xs text-warning">
												No modules selected. Use tags or pick modules to build a test.
											</div>
										{/if}

										{#if summaryQuery.data?.byType?.length > 0}
										<div class="flex flex-wrap gap-1.5">
											{#each summaryQuery.data.byType as row}
												<div class="badge badge-soft badge-sm rounded-full">
													{friendlyTypeName(row.questionType)}: {row.count}
												</div>
											{/each}
										</div>
									{/if}
								{/if}

								<!-- Recent Attempts (collapsed) -->
								{#if !attemptsQuery.isLoading && attemptsQuery.data && attemptsQuery.data.length > 0}
									<div class="border-t border-base-300 pt-3">
										<details class="group">
											<summary class="flex items-center gap-2 cursor-pointer text-sm font-medium text-base-content/60 hover:text-base-content transition-colors select-none">
												<History size={14} />
												<span>Recent Attempts ({attemptsQuery.data.length})</span>
												<svg class="w-3 h-3 ml-auto transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
											</summary>
											<div class="space-y-2 mt-3">
												{#each attemptsQuery.data.slice(0, 4) as attempt (attempt._id)}
													<a
														class="block border border-base-300 rounded-xl p-2.5 hover:border-primary/40 transition-all duration-200"
														href={`/classes/${classId}/tests/${attempt._id}${attempt.status === 'in_progress' ? '' : '/results'}`}
													>
														<div class="flex justify-between items-center gap-2 text-xs">
															<span class="badge badge-xs badge-soft rounded-full {statusBadgeClass(attempt.status)}">
																{formatAttemptStatus(attempt.status)}
															</span>
															<span class="text-base-content/40">
																{new Date(attempt.startedAt).toLocaleDateString()}
															</span>
														</div>
														<div class="text-xs text-base-content/50 mt-1">
															{attempt.configSnapshot.questionCountActual} questions
															{#if attempt.resultSummary}
																<span class="font-semibold text-base-content/70">· {attempt.resultSummary.scorePct}%</span>
															{/if}
														</div>
													</a>
												{/each}
											</div>
										</details>
									</div>
								{/if}
							</div>
						</div>
					</aside>
				</div>
			{/if}
		</div>
	</div>
</main>
