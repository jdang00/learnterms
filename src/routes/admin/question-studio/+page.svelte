<script lang="ts">
	import {
		AlertTriangle,
		ArrowLeft,
		BookOpen,
		Check,
		ChevronDown,
		FileText,
		FolderOpen,
		Layers,
		Minus,
		Network,
		PanelLeft,
		Plus,
		Save,
		Sparkles
	} from 'lucide-svelte';
	import RagDocumentBrowser from '$lib/admin/RagDocumentBrowser.svelte';
	import type { Doc, Id } from '../../../convex/_generated/dataModel';
	import { api } from '../../../convex/_generated/api';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { ClassWithSemester } from '$lib/types';
	import { pickDefaultSemesterName, setLastSemesterName } from '$lib/utils/semester';
	import { useClerkContext } from 'svelte-clerk';
	import { resolve } from '$app/paths';

	const client = useConvexClient();
	const clerk = useClerkContext();
	const clerkUser = $derived(clerk.user);

	let selectedSourceSummary = $state('');
	let selectedDocumentId: Id<'contentLib'> | null = $state(null);
	let lastDocumentId: Id<'contentLib'> | null = $state(null);
	let selectedClass: ClassWithSemester | null = $state(null);
	let selectedModuleId: Id<'module'> | null = $state(null);
	let selectedModuleTitle = $state('');
	let currentSemester = $state('');
	let classSearch = $state('');
	let moduleSearch = $state('');
	let classOpen = $state(false);
	let moduleOpen = $state(false);
	let sourcesHidden = $state(false);
	let topicMapHidden = $state(false);

	type ReasoningOrder = 'first' | 'second' | 'third';
	type DuplicateRisk = 'low' | 'medium' | 'high';

	type TopicMapItem = {
		topicId: string;
		title: string;
		summary: string;
		pageNumbers: number[];
		learningObjectives: string[];
		keyTerms: string[];
		suggestedOrders: ReasoningOrder[];
		estimatedQuestionCapacity: number;
	};

	type CandidateQuestion = {
		type: 'multiple_choice';
		stem: string;
		options: string[];
		correctAnswers: string[];
		rationale: string;
		reasoningOrder: ReasoningOrder;
		topicId: string;
		topicTitle: string;
		sourcePageNumbers: number[];
		duplicateRisk: DuplicateRisk;
		similarQuestionIds: Id<'question'>[];
		metadata: {
			model: string;
			agentThreadId?: string;
			sourceDocumentId: Id<'contentLib'>;
		};
	};

	let topics = $state<TopicMapItem[]>([]);
	let selectedTopicIds = $state<Set<string>>(new Set());
	let candidates = $state<CandidateQuestion[]>([]);
	let selectedCandidateIndexes = $state<Set<number>>(new Set());
	let counts = $state<Record<ReasoningOrder, number>>({ first: 3, second: 4, third: 3 });
	let isMapping = $state(false);
	let isGenerating = $state(false);
	let isSaving = $state(false);
	let workflowError = $state('');
	let workflowMessage = $state('');
	let blockedDuplicateCount = $state(0);
	let lastThreadId = $state('');
	let loadedTopicMapId: Id<'questionStudioTopicMaps'> | null = $state(null);
	let activeJobId: Id<'questionStudioJobs'> | null = $state(null);
	let loadedGenerationJobId: Id<'questionStudioJobs'> | null = $state(null);

	const convexUser = useQuery(api.users.getUserById, () =>
		clerkUser ? { id: clerkUser.id } : 'skip'
	);

	const semesters = useQuery(api.semester.getAllSemesters, () => (clerkUser ? {} : 'skip'));

	const classes = useQuery(api.class.getUserClasses, () =>
		convexUser.data?.cohortId ? { id: convexUser.data.cohortId as Id<'cohort'> } : 'skip'
	);

	const modules = useQuery(api.module.getClassModules, () =>
		selectedClass ? { id: selectedClass._id } : 'skip'
	);

	const savedTopicMap = useQuery(api.questionStudio.getLatestSavedTopicMap, () =>
		selectedDocumentId && selectedModuleId
			? {
					documentId: selectedDocumentId,
					moduleId: selectedModuleId
				}
			: 'skip'
	);

	const activeJob = useQuery(api.questionStudio.getGenerationJob, () =>
		activeJobId ? { jobId: activeJobId } : 'skip'
	);

	const selectedTopics = $derived(topics.filter((topic) => selectedTopicIds.has(topic.topicId)));
	const totalRequested = $derived(counts.first + counts.second + counts.third);
	const canMap = $derived(Boolean(selectedDocumentId && selectedModuleId));
	const canGenerate = $derived(
		canMap && selectedTopics.length > 0 && totalRequested > 0 && totalRequested <= 30
	);

	$effect(() => {
		if (semesters.data && !currentSemester) {
			currentSemester = pickDefaultSemesterName(semesters.data);
		}
	});

	$effect(() => {
		if (currentSemester) setLastSemesterName(currentSemester);
	});

	$effect(() => {
		if (currentSemester !== (selectedClass as ClassWithSemester)?.semester?.name) {
			selectedClass = null;
			selectedModuleId = null;
			selectedModuleTitle = '';
			topics = [];
			resetGenerated();
		}
	});

	$effect(() => {
		const documentId = selectedDocumentId;
		if (lastDocumentId === null) {
			lastDocumentId = documentId;
			return;
		}
		if (documentId !== lastDocumentId) {
			lastDocumentId = documentId;
			resetPlan();
			workflowError = '';
			workflowMessage = '';
			lastThreadId = '';
			loadedTopicMapId = null;
			activeJobId = null;
			loadedGenerationJobId = null;
		}
	});

	$effect(() => {
		const map = savedTopicMap.data;
		if (!map || map._id === loadedTopicMapId) return;
		topics = map.topics as TopicMapItem[];
		selectedTopicIds = new Set(map.topics.map((topic) => topic.topicId));
		resetGenerated();
		lastThreadId = map.agentThreadId ?? '';
		loadedTopicMapId = map._id;
		workflowMessage = `Loaded ${map.topics.length} saved topics.`;
		workflowError = '';
	});

	$effect(() => {
		const job = activeJob.data;
		if (!job) return;
		lastThreadId = job.threadId ?? lastThreadId;
		workflowMessage = job.statusText;
		if (job.status === 'ready' && job._id !== loadedGenerationJobId && job.candidates) {
			candidates = job.candidates as CandidateQuestion[];
			selectedCandidateIndexes = new Set(candidates.map((_, index) => index));
			blockedDuplicateCount = job.blockedDuplicateCount ?? 0;
			loadedGenerationJobId = job._id;
			isGenerating = false;
		}
		if (job.status === 'failed') {
			workflowError = job.error ?? job.statusText;
			isGenerating = false;
		}
	});

	const filteredClasses = $derived.by<ClassWithSemester[]>(() => {
		const items = ((classes.data ?? []) as ClassWithSemester[]);
		if (!currentSemester) return items;
		return items.filter((classItem) => classItem.semester?.name === currentSemester);
	});

	const searchedClasses = $derived.by<ClassWithSemester[]>(() =>
		filteredClasses.filter(
			(classItem) =>
				classItem.name.toLowerCase().includes(classSearch.toLowerCase()) ||
				(classItem.code?.toLowerCase().includes(classSearch.toLowerCase()) ?? false)
		)
	);

	const searchedModules = $derived.by<Doc<'module'>[]>(() =>
		((modules.data ?? []) as Doc<'module'>[]).filter((moduleItem) =>
			moduleItem.title.toLowerCase().includes(moduleSearch.toLowerCase())
		)
	);

	function resetGenerated() {
		candidates = [];
		selectedCandidateIndexes = new Set();
		blockedDuplicateCount = 0;
		activeJobId = null;
		loadedGenerationJobId = null;
	}

	function resetPlan() {
		topics = [];
		selectedTopicIds = new Set();
		loadedTopicMapId = null;
		resetGenerated();
	}

	function toggleTopic(topicId: string) {
		const next = new Set(selectedTopicIds);
		if (next.has(topicId)) next.delete(topicId);
		else next.add(topicId);
		selectedTopicIds = next;
		resetGenerated();
	}

	function setAllTopics(selected: boolean) {
		selectedTopicIds = selected ? new Set(topics.map((topic) => topic.topicId)) : new Set();
		resetGenerated();
	}

	function changeCount(order: ReasoningOrder, delta: number) {
		const next = Math.max(0, counts[order] + delta);
		const proposed = { ...counts, [order]: next };
		if (proposed.first + proposed.second + proposed.third > 30) return;
		counts = proposed;
	}

	function toggleCandidate(index: number) {
		const next = new Set(selectedCandidateIndexes);
		if (next.has(index)) next.delete(index);
		else next.add(index);
		selectedCandidateIndexes = next;
	}

	function selectAllCandidates(selected: boolean) {
		selectedCandidateIndexes = selected ? new Set(candidates.map((_, index) => index)) : new Set();
	}

	async function mapNotes() {
		if (!selectedDocumentId || !selectedModuleId) return;
		isMapping = true;
		workflowError = '';
		workflowMessage = '';
		resetGenerated();
		try {
			const result = await client.action(api.questionStudio.mapNotes, {
				documentId: selectedDocumentId,
				moduleId: selectedModuleId
			});
			topics = result.topics as TopicMapItem[];
			selectedTopicIds = new Set(topics.map((topic) => topic.topicId));
			lastThreadId = result.threadId;
			loadedTopicMapId = result.topicMapId ?? null;
			workflowMessage = `${result.cached ? 'Loaded saved map' : 'Mapped and saved'} ${topics.length} topics from pages ${result.pageRange.startPage}-${result.pageRange.endPage}.`;
		} catch (error) {
			workflowError = error instanceof Error ? error.message : 'Failed to map notes';
		} finally {
			isMapping = false;
		}
	}

	async function generateCandidates() {
		if (!selectedDocumentId || !selectedModuleId || !canGenerate) return;
		isGenerating = true;
		workflowError = '';
		resetGenerated();
		try {
			const jobId = await client.mutation(api.questionStudio.createGenerationJob, {
				documentId: selectedDocumentId,
				moduleId: selectedModuleId,
				requestedCount: totalRequested
			});
			activeJobId = jobId;
			workflowMessage = 'Queued candidate generation.';
			void client.action(api.questionStudio.generateCandidates, {
				documentId: selectedDocumentId,
				moduleId: selectedModuleId,
				topics: selectedTopics,
				counts,
				jobId
			}).catch((error) => {
				workflowError = error instanceof Error ? error.message : 'Failed to generate questions';
				isGenerating = false;
			});
		} catch (error) {
			workflowError = error instanceof Error ? error.message : 'Failed to generate questions';
			isGenerating = false;
		}
	}

	async function saveSelected() {
		if (!selectedDocumentId || !selectedModuleId || selectedCandidateIndexes.size === 0) return;
		isSaving = true;
		workflowError = '';
		workflowMessage = '';
		try {
			const picked = candidates.filter((_, index) => selectedCandidateIndexes.has(index));
			const result = await client.mutation(api.questionStudio.saveSelectedCandidates, {
				moduleId: selectedModuleId,
				documentId: selectedDocumentId,
				candidates: picked,
				status: 'draft'
			});
			candidates = [];
			selectedCandidateIndexes = new Set();
			workflowMessage = `Saved ${result.insertedCount} draft questions to ${selectedModuleTitle}.`;
		} catch (error) {
			workflowError = error instanceof Error ? error.message : 'Failed to save questions';
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="min-h-screen bg-base-200/30">
	<div class="mx-auto max-w-[1800px] p-4 sm:p-6">
		<div class="mb-6 flex items-center gap-4">
			<a class="btn btn-ghost btn-sm gap-2 rounded-full" href={resolve('/admin')}>
				<ArrowLeft size={16} />
				<span class="hidden sm:inline">Back</span>
			</a>
			<div class="h-6 w-px bg-base-300"></div>
			<div>
				<h1 class="text-xl font-semibold">Question Studio</h1>
				<p class="hidden text-xs text-base-content/60 sm:block">
					Map notes and generate reviewed draft questions
				</p>
			</div>
		</div>

		<div class="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-base-300 bg-base-100 p-3">
			<div class="dropdown">
				<div tabindex="0" role="button" class="btn btn-ghost btn-sm gap-2 rounded-full">
					<FolderOpen size={14} class="text-base-content/60" />
					<span class="text-sm">{currentSemester || 'Semester'}</span>
					<ChevronDown size={12} />
				</div>
				{#if semesters.data}
					<ul class="dropdown-content menu z-10 w-56 rounded-lg border border-base-300 bg-base-100 p-1 shadow-lg">
						{#each semesters.data as semester (semester._id)}
							<li>
								<button
									class="text-sm"
									class:active={currentSemester === semester.name}
									onclick={() => {
										currentSemester = semester.name;
										selectedClass = null;
										selectedModuleId = null;
										selectedModuleTitle = '';
										resetPlan();
									}}
								>
									{semester.name}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<span class="text-base-content/30">/</span>

			<div class="relative">
				<button
					type="button"
					class="btn btn-ghost btn-sm gap-2 rounded-full"
					class:btn-disabled={!currentSemester}
					onclick={() => {
						classOpen = !classOpen;
						classSearch = '';
					}}
				>
					<BookOpen size={14} class="text-base-content/60" />
					<span class="max-w-[140px] truncate text-sm">{selectedClass?.name || 'Class'}</span>
					<ChevronDown size={12} />
				</button>
				{#if classOpen && filteredClasses && filteredClasses.length > 0}
					<div class="fixed inset-0 z-10" onclick={() => (classOpen = false)} role="none"></div>
					<div class="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-base-300 bg-base-100 p-2 shadow-lg">
						<input
							type="text"
							placeholder="Search classes..."
							class="input input-bordered input-sm mb-1 w-full rounded-full"
							bind:value={classSearch}
						/>
						<ul class="max-h-52 overflow-y-auto">
							{#each searchedClasses as c (c._id)}
								<li>
									<button
										type="button"
										class="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-left text-sm hover:bg-base-200"
										class:bg-primary={selectedClass?._id === c._id}
										class:text-primary-content={selectedClass?._id === c._id}
										onclick={() => {
											selectedClass = c as ClassWithSemester;
											selectedModuleId = null;
											selectedModuleTitle = '';
											resetPlan();
											classOpen = false;
										}}
									>
										<span class="truncate">{c.name}</span>
										{#if c.code}
											<span class="badge badge-ghost badge-xs">{c.code}</span>
										{/if}
									</button>
								</li>
							{/each}
							{#if searchedClasses.length === 0}
								<li class="px-3 py-2 text-xs text-base-content/50">No matches</li>
							{/if}
						</ul>
					</div>
				{/if}
			</div>

			<span class="text-base-content/30">/</span>

			<div class="relative">
				<button
					type="button"
					class="btn btn-ghost btn-sm gap-2 rounded-full"
					class:btn-disabled={!selectedClass}
					onclick={() => {
						moduleOpen = !moduleOpen;
						moduleSearch = '';
					}}
				>
					<Layers size={14} class="text-base-content/60" />
					<span class="max-w-[140px] truncate text-sm">{selectedModuleTitle || 'Module'}</span>
					<ChevronDown size={12} />
				</button>
				{#if moduleOpen && modules.data && modules.data.length > 0}
					<div class="fixed inset-0 z-10" onclick={() => (moduleOpen = false)} role="none"></div>
					<div class="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-base-300 bg-base-100 p-2 shadow-lg">
						<input
							type="text"
							placeholder="Search modules..."
							class="input input-bordered input-sm mb-1 w-full rounded-full"
							bind:value={moduleSearch}
						/>
						<ul class="max-h-52 overflow-y-auto">
							{#each searchedModules as m (m._id)}
								<li>
									<button
										type="button"
										class="w-full truncate rounded-sm px-3 py-1.5 text-left text-sm hover:bg-base-200"
										class:bg-primary={selectedModuleId === m._id}
										class:text-primary-content={selectedModuleId === m._id}
										onclick={() => {
											selectedModuleId = m._id;
											selectedModuleTitle = m.title;
											resetPlan();
											moduleOpen = false;
										}}
									>
										{m.title}
									</button>
								</li>
							{/each}
							{#if searchedModules.length === 0}
								<li class="px-3 py-2 text-xs text-base-content/50">No matches</li>
							{/if}
						</ul>
					</div>
				{/if}
			</div>
		</div>

		<div class="flex min-h-[calc(100vh-220px)] flex-col gap-4 xl:flex-row">
			<aside
				class="relative hidden shrink-0 overflow-hidden rounded-lg border border-base-300 bg-base-100 transition-all duration-200 xl:flex xl:flex-col {sourcesHidden
					? 'w-[72px]'
					: 'w-[min(24rem,28vw)]'}"
			>
				<button
					class="btn btn-ghost btn-square btn-sm absolute left-4 top-4 z-10 h-9 w-9 rounded-full"
					onclick={() => (sourcesHidden = !sourcesHidden)}
					aria-label="Toggle sources sidebar"
				>
					<PanelLeft
						size={18}
						class="transition-transform duration-300 {sourcesHidden ? 'rotate-180' : ''}"
					/>
				</button>

				{#if sourcesHidden}
					<div class="mt-16 flex flex-col items-center gap-3 px-3">
						<div class="rounded-full bg-primary/10 p-3 text-primary">
							<FileText size={20} />
						</div>
						{#if selectedDocumentId}
							<span class="h-2 w-2 rounded-full bg-success"></span>
						{/if}
					</div>
				{:else}
					<div class="h-full overflow-hidden pt-10">
						{#if convexUser.isLoading}
							<div class="space-y-2 p-4">
								{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
									<div class="skeleton h-12 w-full"></div>
								{/each}
							</div>
						{:else if convexUser.error}
							<div class="p-4">
								<div class="alert alert-error alert-sm">Error loading user</div>
							</div>
						{:else if convexUser.data && !convexUser.data.cohortId}
							<div class="p-4">
								<div class="alert alert-warning alert-sm">No cohort assigned</div>
							</div>
						{:else if convexUser.data}
							<RagDocumentBrowser
								cohortId={convexUser.data.cohortId as Id<'cohort'>}
								bind:selectedDocumentId
								bind:selectedSourceSummary
							/>
						{/if}
					</div>
				{/if}
			</aside>

			<div class="xl:hidden">
				<div class="max-h-[420px] overflow-hidden rounded-lg border border-base-300 bg-base-100">
					{#if convexUser.isLoading}
						<div class="space-y-2 p-4">
							{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
								<div class="skeleton h-12 w-full"></div>
							{/each}
						</div>
					{:else if convexUser.error}
						<div class="p-4">
							<div class="alert alert-error alert-sm">Error loading user</div>
						</div>
					{:else if convexUser.data && !convexUser.data.cohortId}
						<div class="p-4">
							<div class="alert alert-warning alert-sm">No cohort assigned</div>
						</div>
					{:else if convexUser.data}
						<RagDocumentBrowser
							cohortId={convexUser.data.cohortId as Id<'cohort'>}
							bind:selectedDocumentId
							bind:selectedSourceSummary
						/>
					{/if}
				</div>
			</div>

			<div class="min-w-0 flex-1">
				<div class="h-[calc(100vh-220px)] overflow-hidden rounded-lg border border-base-300 bg-base-100">
					<div class="flex h-full flex-col">
						<div class="border-b border-base-300 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div>
									<h2 class="text-sm font-semibold">Agent Generation</h2>
									<p class="mt-0.5 text-xs text-base-content/50">
										Map source notes, choose coverage, then review draft questions.
									</p>
									{#if selectedClass && selectedModuleId}
										<p class="mt-1 text-xs text-base-content/60">
											{selectedClass.name} → {selectedModuleTitle}
										</p>
									{/if}
									{#if selectedSourceSummary}
										<p class="mt-1 line-clamp-1 text-xs text-base-content/50">
											{selectedSourceSummary.split('\n')[0]}
										</p>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									{#if workflowMessage}
										<span class="hidden max-w-[280px] truncate text-xs text-base-content/50 md:inline">
											{workflowMessage}
										</span>
									{/if}
									{#if lastThreadId}
										<span class="badge badge-ghost badge-sm">agent thread</span>
									{/if}
									<button
										class="btn btn-primary btn-sm gap-2"
										disabled={!canMap || isMapping}
										onclick={mapNotes}
									>
										{#if isMapping}
											<span class="loading loading-spinner loading-xs"></span>
										{:else}
											<Network size={14} />
										{/if}
										{topics.length > 0 ? 'Refresh map' : 'Map notes'}
									</button>
								</div>
							</div>
						</div>

						<div class="flex-1 overflow-y-auto p-4">
							{#if workflowError}
								<div class="alert alert-error mb-4 text-sm">
									<AlertTriangle size={16} />
									<span>{workflowError}</span>
								</div>
							{/if}

							{#if !selectedModuleId}
								<div class="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
									Choose a destination module before mapping notes.
								</div>
							{:else if !selectedDocumentId}
								<div class="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
									Choose an indexed source from the sidebar before mapping notes.
								</div>
							{/if}

							{#if activeJob.data}
								<div class="mb-4 rounded-lg border border-base-300 bg-base-200/30 p-3">
									<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
										<div>
											<h3 class="text-sm font-semibold">Live Run</h3>
											<p class="text-xs text-base-content/50">{activeJob.data.model}</p>
										</div>
										<span
											class="badge badge-sm {activeJob.data.status === 'failed'
												? 'badge-error'
												: activeJob.data.status === 'ready'
													? 'badge-success'
													: 'badge-ghost'}"
										>
											{activeJob.data.status}
										</span>
									</div>
									<div class="space-y-2">
										{#each activeJob.data.events as event (event.at)}
											<div class="flex gap-2 text-xs">
												<span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70"></span>
												<div class="min-w-0">
													<p class="font-medium text-base-content/75">{event.label}</p>
													{#if event.detail}
														<p class="text-base-content/50">{event.detail}</p>
													{/if}
												</div>
											</div>
										{/each}
									</div>
									<div class="mt-3 border-t border-base-300 pt-3">
										<div class="mb-2 flex items-center gap-2">
											<h4 class="text-xs font-semibold text-base-content/70">Plan</h4>
											{#if !activeJob.data.plan && activeJob.data.status === 'running'}
												<span class="loading loading-spinner loading-xs"></span>
											{/if}
										</div>
										{#if activeJob.data.plan}
											<div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
												{#each activeJob.data.plan.topicAllocations as allocation (allocation.topicId)}
													<div class="rounded-md bg-base-100 p-2 text-xs">
														<div class="flex flex-wrap items-center gap-2">
															<span class="font-medium">{allocation.topicTitle}</span>
															<span class="badge badge-ghost badge-xs">{allocation.plannedCount} q</span>
															<span class="badge badge-outline badge-xs">
																{allocation.reasoningOrders.join(', ')}
															</span>
														</div>
														<p class="mt-1 text-base-content/50">
															Pages {allocation.sourcePages.join(', ')} · {allocation.notes}
														</p>
													</div>
												{/each}
											</div>
											{#if activeJob.data.plan.riskNotes.length > 0}
												<div class="mt-2 rounded-md bg-warning/10 p-2 text-xs text-base-content/70">
													<span class="font-medium">Risks:</span>
													{activeJob.data.plan.riskNotes.join(' ')}
												</div>
											{/if}
										{:else}
											<p class="rounded-md bg-base-100 p-2 text-xs text-base-content/50">
												Waiting for DeepSeek to choose coverage and risk notes.
											</p>
										{/if}
									</div>

									<div class="mt-3 border-t border-base-300 pt-3">
										<div class="mb-2 flex items-center gap-2">
											<h4 class="text-xs font-semibold text-base-content/70">Draft</h4>
											{#if activeJob.data.plan && !activeJob.data.candidates && activeJob.data.status === 'running'}
												<span class="loading loading-spinner loading-xs"></span>
											{/if}
										</div>
										{#if activeJob.data.candidates && activeJob.data.candidates.length > 0}
											<div class="rounded-md bg-base-100 p-2 text-xs text-base-content/60">
												{activeJob.data.candidates.length} draft candidates produced.
												{#if activeJob.data.blockedDuplicateCount}
													{activeJob.data.blockedDuplicateCount} high-risk duplicates blocked before review.
												{/if}
											</div>
										{:else if activeJob.data.plan}
											<p class="rounded-md bg-base-100 p-2 text-xs text-base-content/50">
												Drafting candidates from the plan.
											</p>
										{:else}
											<p class="rounded-md bg-base-100 p-2 text-xs text-base-content/40">
												Drafting starts after planning.
											</p>
										{/if}
									</div>

									<div class="mt-3 border-t border-base-300 pt-3">
										<div class="mb-2 flex items-center gap-2">
											<h4 class="text-xs font-semibold text-base-content/70">Review</h4>
											{#if activeJob.data.candidates && !activeJob.data.reviews && activeJob.data.status === 'running'}
												<span class="loading loading-spinner loading-xs"></span>
											{/if}
										</div>
										{#if activeJob.data.reviews && activeJob.data.reviews.length > 0}
											<div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
												{#each activeJob.data.reviews as review (review.candidateIndex)}
													<div class="rounded-md bg-base-100 p-2 text-xs">
														<div class="mb-1 flex flex-wrap items-center gap-2">
															<span class="font-medium">Candidate {review.candidateIndex + 1}</span>
															<span
																class="badge badge-xs {review.verdict === 'reject'
																	? 'badge-error'
																	: review.verdict === 'revise'
																		? 'badge-warning'
																		: 'badge-success'}"
															>
																{review.verdict}
															</span>
															<span class="badge badge-ghost badge-xs">{review.sourceSupport} support</span>
															<span class="badge badge-ghost badge-xs">{review.answerQuality}</span>
														</div>
														<p class="text-base-content/50">{review.reasons.join(' ')}</p>
													</div>
												{/each}
											</div>
										{:else if activeJob.data.candidates}
											<p class="rounded-md bg-base-100 p-2 text-xs text-base-content/50">
												Reviewing source support, answer clarity, and revision/rejection needs.
											</p>
										{:else}
											<p class="rounded-md bg-base-100 p-2 text-xs text-base-content/40">
												Review starts after drafts are ready.
											</p>
										{/if}
									</div>
								</div>
							{/if}

							{#if topics.length > 0}
								<div class="mb-4 rounded-lg border border-base-300">
									<div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-300 p-3">
										<div>
											<h3 class="text-sm font-semibold">Topic Map</h3>
											<p class="text-xs text-base-content/50">
												{selectedTopics.length} of {topics.length} topics selected
											</p>
										</div>
										<div class="flex gap-1">
											<button class="btn btn-ghost btn-xs" onclick={() => (topicMapHidden = !topicMapHidden)}>
												{topicMapHidden ? 'Show' : 'Hide'}
											</button>
											<button class="btn btn-ghost btn-xs" onclick={() => setAllTopics(true)}>All</button>
											<button class="btn btn-ghost btn-xs" onclick={() => setAllTopics(false)}>None</button>
										</div>
									</div>
									{#if !topicMapHidden}
										<div class="divide-y divide-base-300">
											{#each topics as topic (topic.topicId)}
												{@const selected = selectedTopicIds.has(topic.topicId)}
												<button
													type="button"
													class="w-full p-3 text-left transition hover:bg-base-200/60 {selected
														? 'bg-primary/5'
														: ''}"
													onclick={() => toggleTopic(topic.topicId)}
												>
													<div class="flex gap-3">
														<span
															class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border {selected
																? 'border-primary bg-primary text-primary-content'
																: 'border-base-300'}"
														>
															{#if selected}<Check size={12} />{/if}
														</span>
														<div class="min-w-0 flex-1">
															<div class="flex flex-wrap items-center gap-2">
																<p class="text-sm font-medium">{topic.title}</p>
																<span class="badge badge-ghost badge-xs">
																	Pages {topic.pageNumbers.join(', ')}
																</span>
																<span class="badge badge-outline badge-xs">
																	up to {topic.estimatedQuestionCapacity}
																</span>
															</div>
															<p class="mt-1 text-xs leading-relaxed text-base-content/60">
																{topic.summary}
															</p>
															{#if topic.keyTerms.length > 0}
																<p class="mt-2 truncate text-[11px] text-base-content/45">
																	{topic.keyTerms.join(' · ')}
																</p>
															{/if}
														</div>
													</div>
												</button>
											{/each}
										</div>
									{/if}
								</div>

								<div class="mb-4 rounded-lg border border-base-300 p-3">
									<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
										<div>
											<h3 class="text-sm font-semibold">Coverage Mix</h3>
											<p class="text-xs text-base-content/50">
												{totalRequested}/30 questions requested
											</p>
										</div>
										<button
											class="btn btn-secondary btn-sm gap-2"
											disabled={!canGenerate || isGenerating}
											onclick={generateCandidates}
										>
											{#if isGenerating}
												<span class="loading loading-spinner loading-xs"></span>
											{:else}
												<Sparkles size={14} />
											{/if}
											Generate candidates
										</button>
									</div>
									<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
										{#each ['first', 'second', 'third'] as order (order)}
											{@const typedOrder = order as ReasoningOrder}
											<div class="rounded-lg bg-base-200/60 p-2">
												<div class="mb-2 text-xs font-medium capitalize">{order} order</div>
												<div class="flex items-center gap-2">
													<button
														class="btn btn-ghost btn-xs h-8 w-8 p-0"
														onclick={() => changeCount(typedOrder, -1)}
													>
														<Minus size={13} />
													</button>
													<span class="w-8 text-center text-sm font-semibold">{counts[typedOrder]}</span>
													<button
														class="btn btn-ghost btn-xs h-8 w-8 p-0"
														onclick={() => changeCount(typedOrder, 1)}
													>
														<Plus size={13} />
													</button>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							{#if candidates.length > 0}
								<div class="rounded-lg border border-base-300">
									<div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-300 p-3">
										<div>
											<h3 class="text-sm font-semibold">Review Candidates</h3>
											<p class="text-xs text-base-content/50">
												{selectedCandidateIndexes.size} of {candidates.length} selected
												{#if blockedDuplicateCount}
													· {blockedDuplicateCount} high-risk duplicates hidden
												{/if}
											</p>
										</div>
										<div class="flex flex-wrap gap-1">
											<button class="btn btn-ghost btn-xs" onclick={() => selectAllCandidates(true)}>All</button>
											<button class="btn btn-ghost btn-xs" onclick={() => selectAllCandidates(false)}>None</button>
											<button
												class="btn btn-primary btn-xs gap-1"
												disabled={selectedCandidateIndexes.size === 0 || isSaving}
												onclick={saveSelected}
											>
												{#if isSaving}
													<span class="loading loading-spinner loading-xs"></span>
												{:else}
													<Save size={13} />
												{/if}
												Save drafts
											</button>
										</div>
									</div>
									<div class="space-y-3 p-3">
										{#each candidates as candidate, index (index)}
											{@const selected = selectedCandidateIndexes.has(index)}
											<div
												class="rounded-lg border p-3 {selected
													? 'border-primary bg-primary/5'
													: 'border-base-300'}"
											>
												<div class="flex items-start gap-3">
													<button
														class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border {selected
															? 'border-primary bg-primary text-primary-content'
															: 'border-base-300'}"
														onclick={() => toggleCandidate(index)}
													>
														{#if selected}<Check size={12} />{/if}
													</button>
													<div class="min-w-0 flex-1">
														<div class="mb-2 flex flex-wrap items-center gap-2">
															<span class="badge badge-outline badge-xs capitalize">
																{candidate.reasoningOrder} order
															</span>
															<span
																class="badge badge-xs {candidate.duplicateRisk === 'medium'
																	? 'badge-warning'
																	: 'badge-success'}"
															>
																{candidate.duplicateRisk} duplicate risk
															</span>
															<span class="badge badge-ghost badge-xs">
																Pages {candidate.sourcePageNumbers.join(', ')}
															</span>
														</div>
														<p class="text-sm font-medium leading-relaxed">{candidate.stem}</p>
														<div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
															{#each candidate.options as option (option)}
																{@const correct = candidate.correctAnswers.includes(option)}
																<div
																	class="rounded-sm p-2 text-xs {correct
																		? 'bg-success/10 text-success'
																		: 'bg-base-200/70'}"
																>
																	{option}
																</div>
															{/each}
														</div>
														<p class="mt-3 rounded-sm bg-info/10 p-2 text-xs leading-relaxed text-base-content/70">
															{candidate.rationale}
														</p>
														{#if candidate.duplicateRisk === 'medium'}
															<p class="mt-2 text-xs text-warning">
																Similar existing questions: {candidate.similarQuestionIds.join(', ') || 'review wording'}
															</p>
														{/if}
													</div>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
