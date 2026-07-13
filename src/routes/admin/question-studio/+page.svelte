<script lang="ts">
	import { AlertTriangle } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import QuestionStudioCandidateModal from '$lib/admin/QuestionStudioCandidateModal.svelte';
	import QuestionStudioDestinationStep from '$lib/admin/QuestionStudioDestinationStep.svelte';
	import QuestionStudioDraftingStep from '$lib/admin/QuestionStudioDraftingStep.svelte';
	import QuestionStudioHeader from '$lib/admin/QuestionStudioHeader.svelte';
	import QuestionStudioInspectorPanel from '$lib/admin/QuestionStudioInspectorPanel.svelte';
	import QuestionStudioLoopCards from '$lib/admin/QuestionStudioLoopCards.svelte';
	import QuestionStudioModePicker from '$lib/admin/QuestionStudioModePicker.svelte';
	import QuestionStudioPhaseRail from '$lib/admin/QuestionStudioPhaseRail.svelte';
	import QuestionStudioSourceStep from '$lib/admin/QuestionStudioSourceStep.svelte';
	import QuestionStudioTopicDetailModal from '$lib/admin/QuestionStudioTopicDetailModal.svelte';
	import type {
		CandidateQuestion,
		GenerationMode,
		QuestionStudioModel,
		QuestionStudioPhase,
		ReasoningOrder,
		TopicMapItem
	} from '$lib/admin/questionStudioTypes';
	import {
		DEFAULT_QUESTION_STUDIO_MODEL,
		QUESTION_STUDIO_MODEL_OPTIONS
	} from '$lib/admin/questionStudioTypes';
	import type { Doc, Id } from '../../../convex/_generated/dataModel';
	import { api } from '../../../convex/_generated/api';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { ClassWithSemester } from '$lib/types';
	import { pickDefaultSemesterName, setLastSemesterName } from '$lib/utils/semester';
	import { useClerkContext } from 'svelte-clerk';
	import { onMount } from 'svelte';

	const client = useConvexClient();
	const clerk = useClerkContext();
	const clerkUser = $derived(clerk.user);
	const SELECTION_STORAGE_KEY = 'question-studio-selection';

	type SavedStudioSelection = {
		semesterName: string;
		classId: string;
		moduleId: string;
	};

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
	let topicMapHidden = $state(false);
	let detailTopic = $state<TopicMapItem | null>(null);

	let generationMode = $state<GenerationMode | null>(null);
	let guidanceNotes = $state('');
	let selectedModel = $state<QuestionStudioModel>(DEFAULT_QUESTION_STUDIO_MODEL);

	let topics = $state<TopicMapItem[]>([]);
	let selectedTopicIds = $state<Set<string>>(new Set());
	let candidates = $state<CandidateQuestion[]>([]);
	let selectedCandidateIndexes = $state<Set<number>>(new Set());
	let selectedCandidateIndex = $state<number | null>(null);
	let counts = $state<Record<ReasoningOrder, number>>({ first: 3, second: 4, third: 3 });
	let isGenerating = $state(false);
	let isSaving = $state(false);
	let workflowError = $state('');
	let workflowMessage = $state('');
	let blockedDuplicateCount = $state(0);
	let lastThreadId = $state('');
	let loadedTopicMapId: Id<'questionStudioTopicMaps'> | null = $state(null);
	let activeJobId: Id<'questionStudioJobs'> | null = $state(null);
	let loadedGenerationJobId: Id<'questionStudioJobs'> | null = $state(null);
	let loadedGenerationJobUpdatedAt = $state(0);
	let savedSelection = $state<SavedStudioSelection | null>(null);
	let restoredSelection = $state(false);
	let resumingJobId: Id<'questionStudioJobs'> | null = $state(null);
	let allowServerResume = $state(true);

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

	const currentGenerationJob = useQuery(api.questionStudio.getCurrentGenerationJob, () =>
		clerkUser ? {} : 'skip'
	);

	const activeJob = useQuery(api.questionStudio.getGenerationJob, () =>
		activeJobId ? { jobId: activeJobId } : 'skip'
	);

	const selectedTopics = $derived(topics.filter((topic) => selectedTopicIds.has(topic.topicId)));
	const totalRequested = $derived(counts.first + counts.second + counts.third);
	const hasStudioContext = $derived(Boolean(selectedDocumentId && selectedModuleId));
	const isTopicMapLoading = $derived(Boolean(hasStudioContext && savedTopicMap.isLoading));
	const canGenerate = $derived(
		hasStudioContext && selectedTopics.length > 0 && totalRequested > 0 && totalRequested <= 30
	);
	const canStartNewRun = $derived(
		Boolean(
			activeJob.data &&
			activeJob.data.status !== 'queued' &&
			activeJob.data.status !== 'running' &&
			(candidates.length > 0 ||
				activeJob.data.status === 'ready' ||
				activeJob.data.status === 'failed')
		)
	);

	const agentStatus = $derived.by<{ text: string; working: boolean }>(() => {
		if (isTopicMapLoading) return { text: 'Reading source notes', working: true };
		if (activeJob.data?.status === 'running')
			return { text: activeJob.data.statusText || 'Generating candidates', working: true };
		if (isSaving) return { text: 'Saving selected drafts', working: true };
		if (workflowMessage) return { text: workflowMessage, working: false };
		if (topics.length > 0) return { text: 'Choose topics and generate', working: false };
		if (hasStudioContext) return { text: 'Reading source notes', working: true };
		return { text: 'Attach an indexed source to begin', working: false };
	});

	const phases = $derived.by<QuestionStudioPhase[]>(() => {
		const job = activeJob.data;
		const running = job?.status === 'running';
		const planDone = Boolean(job?.plan);
		const draftDone = (job?.candidates?.length ?? 0) > 0 || candidates.length > 0;
		const reviewDone =
			(job?.reviewCount ?? 0) > 0 || job?.status === 'ready' || candidates.length > 0;
		return [
			{
				key: 'source',
				label: 'Source',
				state: topics.length > 0 ? 'done' : hasStudioContext ? 'active' : 'pending'
			},
			{
				key: 'topics',
				label: 'Topics',
				state: running && !planDone ? 'active' : planDone ? 'done' : 'pending'
			},
			{
				key: 'draft',
				label: 'Questions',
				state: running && planDone && !draftDone ? 'active' : draftDone ? 'done' : 'pending'
			},
			{
				key: 'review',
				label: 'Review',
				state:
					(running && draftDone && (job?.reviewCount ?? 0) === 0) ||
					(running && job?.loop?.pass === 'gate')
						? 'active'
						: reviewDone
							? 'done'
							: 'pending'
			}
		];
	});

	$effect(() => {
		if (semesters.data && !currentSemester) {
			currentSemester = pickDefaultSemesterName(semesters.data);
		}
	});

	$effect(() => {
		if (currentSemester) setLastSemesterName(currentSemester);
	});

	$effect(() => {
		if (selectedClass && currentSemester !== (selectedClass as ClassWithSemester).semester?.name) {
			selectedClass = null;
			selectedModuleId = null;
			selectedModuleTitle = '';
			topics = [];
			resetGenerated();
		}
	});

	$effect(() => {
		if (restoredSelection || !savedSelection || !classes.data) return;
		if (savedSelection.semesterName) currentSemester = savedSelection.semesterName;
		const classItem = ((classes.data ?? []) as ClassWithSemester[]).find(
			(item) => String(item._id) === savedSelection?.classId
		);
		if (classItem) selectedClass = classItem;
		restoredSelection = true;
	});

	$effect(() => {
		if (!restoredSelection || !savedSelection || !modules.data || !selectedClass) return;
		const moduleItem = ((modules.data ?? []) as Doc<'module'>[]).find(
			(item) => String(item._id) === savedSelection?.moduleId
		);
		if (!moduleItem) return;
		selectedModuleId = moduleItem._id;
		selectedModuleTitle = moduleItem.title;
		savedSelection = null;
	});

	$effect(() => {
		const documentId = selectedDocumentId;
		if (lastDocumentId === null) {
			lastDocumentId = documentId;
			return;
		}
		if (documentId !== lastDocumentId) {
			lastDocumentId = documentId;
			if (resumingJobId && activeJobId === resumingJobId) {
				resumingJobId = null;
				return;
			}
			allowServerResume = false;
			resetPlan();
			workflowError = '';
			workflowMessage = '';
			lastThreadId = '';
			loadedTopicMapId = null;
			activeJobId = null;
			loadedGenerationJobId = null;
			loadedGenerationJobUpdatedAt = 0;
		}
	});

	$effect(() => {
		const map = savedTopicMap.data;
		if (!map || map._id === loadedTopicMapId) return;
		topics = map.topics as TopicMapItem[];
		selectedTopicIds = new Set(map.topics.map((topic) => topic.topicId));
		if (!activeJobId) resetGenerated();
		lastThreadId = map.agentThreadId ?? '';
		loadedTopicMapId = map._id;
		workflowMessage = `Loaded ${map.topics.length} saved topics.`;
		workflowError = '';
	});

	$effect(() => {
		const job = currentGenerationJob.data;
		if (!job || activeJobId === job._id) return;
		if (!allowServerResume && !activeJobId) return;
		resumingJobId = job._id;
		activeJobId = job._id;
	});

	$effect(() => {
		const job = activeJob.data;
		if (!job) return;
		if (selectedDocumentId !== job.documentId || selectedModuleId !== job.moduleId) {
			resumingJobId = job._id;
			selectedDocumentId = job.documentId;
			selectedModuleId = job.moduleId;
		}
		if (job.moduleTitle) selectedModuleTitle = job.moduleTitle;
		if (job.moduleClassId && classes.data) {
			const classItem = ((classes.data ?? []) as ClassWithSemester[]).find(
				(item) => String(item._id) === String(job.moduleClassId)
			);
			if (classItem) {
				selectedClass = classItem;
				currentSemester = classItem.semester?.name ?? currentSemester;
			}
		}
		if (!generationMode) generationMode = 'manual';
		if (typeof job.model === 'string' && job.model.trim()) {
			selectedModel = job.model as QuestionStudioModel;
		}
		lastThreadId = job.threadId ?? lastThreadId;
		workflowMessage = job.statusText;
		if (job.status === 'queued' || job.status === 'running') {
			isGenerating = true;
		}
		if (job.candidates && job.updatedAt !== loadedGenerationJobUpdatedAt) {
			const previousCount = candidates.length;
			const previousSelected = selectedCandidateIndexes;
			const incoming = job.candidates as CandidateQuestion[];
			candidates = incoming;
			selectedCandidateIndexes = new Set(
				incoming
					.map((_, index) => (index >= previousCount || previousSelected.has(index) ? index : -1))
					.filter((index) => index >= 0)
			);
			if (selectedCandidateIndex !== null && selectedCandidateIndex >= incoming.length) {
				selectedCandidateIndex = null;
			}
			blockedDuplicateCount = job.blockedDuplicateCount ?? 0;
			loadedGenerationJobUpdatedAt = job.updatedAt;
		}
		if (job.status === 'ready' && job._id !== loadedGenerationJobId) {
			loadedGenerationJobId = job._id;
			isGenerating = false;
		}
		if (job.status === 'failed') {
			workflowError = job.error ?? job.statusText;
			isGenerating = false;
		}
	});

	const filteredClasses = $derived.by<ClassWithSemester[]>(() => {
		const items = (classes.data ?? []) as ClassWithSemester[];
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
		selectedCandidateIndex = null;
		blockedDuplicateCount = 0;
		activeJobId = null;
		loadedGenerationJobId = null;
		loadedGenerationJobUpdatedAt = 0;
	}

	function resetPlan() {
		topics = [];
		selectedTopicIds = new Set();
		loadedTopicMapId = null;
		generationMode = null;
		guidanceNotes = '';
		resetGenerated();
	}

	function selectMode(mode: GenerationMode) {
		allowServerResume = false;
		generationMode = mode;
		if (mode === 'auto') setAllTopics(true);
	}

	function saveStudioSelection() {
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(
				SELECTION_STORAGE_KEY,
				JSON.stringify({
					semesterName: currentSemester,
					classId: selectedClass ? String(selectedClass._id) : '',
					moduleId: selectedModuleId ? String(selectedModuleId) : ''
				})
			);
		} catch {
			// Ignore local storage failures.
		}
	}

	function selectSemester(name: string) {
		allowServerResume = false;
		currentSemester = name;
		selectedClass = null;
		selectedModuleId = null;
		selectedModuleTitle = '';
		resetPlan();
		saveStudioSelection();
	}

	function selectClass(classItem: ClassWithSemester) {
		allowServerResume = false;
		selectedClass = classItem;
		selectedModuleId = null;
		selectedModuleTitle = '';
		resetPlan();
		classOpen = false;
		saveStudioSelection();
	}

	function selectModule(moduleItem: Doc<'module'>) {
		allowServerResume = false;
		selectedModuleId = moduleItem._id;
		selectedModuleTitle = moduleItem.title;
		resetPlan();
		moduleOpen = false;
		saveStudioSelection();
	}

	function toggleTopic(topicId: string) {
		allowServerResume = false;
		selectedTopicIds = new Set(
			selectedTopicIds.has(topicId)
				? [...selectedTopicIds].filter((id) => id !== topicId)
				: [...selectedTopicIds, topicId]
		);
		resetGenerated();
	}

	function setAllTopics(selected: boolean) {
		allowServerResume = false;
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
		selectedCandidateIndexes = new Set(
			selectedCandidateIndexes.has(index)
				? [...selectedCandidateIndexes].filter((i) => i !== index)
				: [...selectedCandidateIndexes, index]
		);
	}

	function selectAllCandidates(selected: boolean) {
		selectedCandidateIndexes = selected ? new Set(candidates.map((_, index) => index)) : new Set();
	}

	function selectCandidate(index: number) {
		selectedCandidateIndex = index;
	}

	function navigateCandidate(direction: 'prev' | 'next') {
		if (candidates.length === 0) return;
		if (selectedCandidateIndex === null) {
			selectedCandidateIndex = 0;
			return;
		}
		const next = direction === 'next' ? selectedCandidateIndex + 1 : selectedCandidateIndex - 1;
		if (next < 0 || next >= candidates.length) return;
		selectedCandidateIndex = next;
	}

	async function generateCandidates() {
		if (!selectedDocumentId || !selectedModuleId || !canGenerate) return;
		const model = selectedModel.trim() || DEFAULT_QUESTION_STUDIO_MODEL;
		selectedModel = model;
		allowServerResume = true;
		isGenerating = true;
		workflowError = '';
		resetGenerated();
		try {
			const jobId = await client.mutation(api.questionStudio.createGenerationJob, {
				documentId: selectedDocumentId,
				moduleId: selectedModuleId,
				requestedCount: totalRequested,
				model
			});
			activeJobId = jobId;
			workflowMessage = 'Queued candidate generation.';
			void client
				.action(api.questionStudio.generateCandidates, {
					documentId: selectedDocumentId,
					moduleId: selectedModuleId,
					topics: selectedTopics,
					counts,
					model,
					focusNotes: generationMode === 'guided' ? guidanceNotes.trim() : undefined,
					jobId
				})
				.catch((error) => {
					workflowError = error instanceof Error ? error.message : 'Failed to generate questions';
					isGenerating = false;
				});
		} catch (error) {
			workflowError = error instanceof Error ? error.message : 'Failed to generate questions';
			isGenerating = false;
		}
	}

	async function startNewRun() {
		allowServerResume = false;
		isGenerating = false;
		workflowError = '';
		try {
			await client.mutation(api.questionStudio.clearCurrentGenerationJob, {});
			resetGenerated();
			workflowMessage = 'Ready for a new run.';
		} catch (error) {
			workflowError = error instanceof Error ? error.message : 'Failed to clear current run';
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
			selectedCandidateIndex = null;
			workflowMessage = `Saved ${result.insertedCount} draft questions to ${selectedModuleTitle}.`;
		} catch (error) {
			workflowError = error instanceof Error ? error.message : 'Failed to save questions';
		} finally {
			isSaving = false;
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
			return;
		if (candidates.length === 0) return;
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			navigateCandidate('prev');
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			navigateCandidate('next');
		}
	}

	onMount(() => {
		try {
			const raw = localStorage.getItem(SELECTION_STORAGE_KEY);
			if (raw) savedSelection = JSON.parse(raw) as SavedStudioSelection;
			else restoredSelection = true;
		} catch {
			restoredSelection = true;
		}
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
</script>

<div class="qs-shell relative isolate flex h-screen flex-col overflow-hidden bg-base-100">
	<div class="mx-auto flex w-full max-w-[1800px] flex-1 flex-col p-4 sm:p-6 min-h-0">
		<QuestionStudioHeader />

		<div class="flex min-h-0 flex-1 flex-col gap-4 xl:grid xl:grid-cols-12">
			<section
				class="flex min-h-0 flex-1 flex-col rounded-2xl border border-base-300 bg-base-100 shadow-xs xl:col-span-8 xl:flex-none"
			>
				<QuestionStudioPhaseRail {phases} />

				<div class="qs-canvas relative min-h-0 flex-1 overflow-y-auto rounded-b-2xl bg-base-200">
					<div class="qs-grid pointer-events-none absolute inset-0"></div>
					<div class="relative mx-auto w-full max-w-4xl space-y-3 p-4 sm:p-6">
						{#if workflowError}
							<div class="alert alert-error rounded-2xl text-sm" in:fade={{ duration: 200 }}>
								<AlertTriangle size={16} />
								<span>{workflowError}</span>
							</div>
						{/if}

						{#if activeJob.data?.loop?.enabled}
							<QuestionStudioLoopCards job={activeJob.data} />
						{/if}

						<QuestionStudioDestinationStep
							{currentSemester}
							semesters={semesters.data}
							{selectedClass}
							{selectedModuleId}
							{selectedModuleTitle}
							{filteredClasses}
							{searchedClasses}
							modules={modules.data as Doc<'module'>[] | undefined}
							{searchedModules}
							bind:classOpen
							bind:moduleOpen
							bind:classSearch
							bind:moduleSearch
							onSelectSemester={selectSemester}
							onSelectClass={selectClass}
							onSelectModule={selectModule}
						/>

						{#if selectedModuleId}
							<QuestionStudioSourceStep
								cohortId={convexUser.data?.cohortId as Id<'cohort'> | null | undefined}
								cohortLoading={convexUser.isLoading}
								bind:selectedDocumentId
								bind:selectedSourceSummary
								{hasStudioContext}
								topicsLength={topics.length}
								{isTopicMapLoading}
							/>
						{/if}

						{#if selectedDocumentId && topics.length > 0 && !generationMode}
							<QuestionStudioModePicker onSelectMode={selectMode} />
						{/if}

						{#if generationMode && topics.length > 0}
							<QuestionStudioDraftingStep
								bind:generationMode
								bind:guidanceNotes
								bind:topicMapHidden
								bind:detailTopic
								{topics}
								{selectedTopicIds}
								{counts}
								bind:selectedModel
								modelOptions={QUESTION_STUDIO_MODEL_OPTIONS}
								{totalRequested}
								{canGenerate}
								{canStartNewRun}
								{isGenerating}
								{isSaving}
								agentStatusText={agentStatus.text}
								showGeneratingState={isGenerating || activeJob.data?.status === 'running'}
								{candidates}
								{selectedCandidateIndexes}
								{selectedCandidateIndex}
								{blockedDuplicateCount}
								onToggleTopic={toggleTopic}
								onSetAllTopics={setAllTopics}
								onChangeCount={changeCount}
								onGenerateCandidates={generateCandidates}
								onStartNewRun={startNewRun}
								onSelectCandidate={selectCandidate}
								onToggleCandidate={toggleCandidate}
								onSelectAllCandidates={selectAllCandidates}
								onSaveSelected={saveSelected}
							/>
						{/if}
					</div>
				</div>
			</section>

			<QuestionStudioInspectorPanel
				activeJob={activeJob.data}
				{hasStudioContext}
				topicsLength={topics.length}
				{canStartNewRun}
				onStartNewRun={startNewRun}
			/>
		</div>
	</div>
</div>

<QuestionStudioCandidateModal
	{candidates}
	{selectedCandidateIndexes}
	bind:selectedCandidateIndex
	onToggleCandidate={toggleCandidate}
	onNavigateCandidate={navigateCandidate}
/>

<QuestionStudioTopicDetailModal bind:detailTopic />

<style>
	/* Grid texture for the agent workspace surface */
	.qs-grid {
		background:
			linear-gradient(
					to right,
					color-mix(in oklab, var(--color-base-content) 10%, transparent) 1px,
					transparent 1px
				)
				0 0 / 38px 38px,
			linear-gradient(
					to bottom,
					color-mix(in oklab, var(--color-base-content) 10%, transparent) 1px,
					transparent 1px
				)
				0 0 / 38px 38px;
		opacity: 0.6;
		mask-image: linear-gradient(to bottom, black 0%, black 55%, transparent 100%);
		-webkit-mask-image: linear-gradient(to bottom, black 0%, black 55%, transparent 100%);
	}
</style>
