<script lang="ts">
	import { AlertTriangle } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import QuestionStudioCandidateModal from '$lib/admin/QuestionStudioCandidateModal.svelte';
	import QuestionStudioHeader from '$lib/admin/QuestionStudioHeader.svelte';
	import QuestionStudioRunBar from '$lib/admin/QuestionStudioRunBar.svelte';
	import QuestionStudioRunStage from '$lib/admin/QuestionStudioRunStage.svelte';
	import QuestionStudioSetupCard from '$lib/admin/QuestionStudioSetupCard.svelte';
	import QuestionStudioTopicDetailModal from '$lib/admin/QuestionStudioTopicDetailModal.svelte';
	import { buildRunRows, runTelemetry } from '$lib/admin/questionStudioRun';
	import type { CandidateReview } from '$lib/admin/questionStudioRun';
	import type {
		CandidateQuestion,
		QuestionType,
		TopicMapItem
	} from '$lib/admin/questionStudioTypes';
	import { questionTypes } from '$lib/admin/questionStudioTypes';
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
	const MAX_QUESTIONS = 30;
	type SourceMode = 'topics' | 'pages';
	// Pages is the default for curators who haven't picked a mode yet.
	let sourceMode = $state<SourceMode>('pages');
	let preferredSourceMode = $state<SourceMode>('pages');
	let preferenceUserId = $state<string | null>(null);
	let selectedPageNumbers = $state<number[]>([]);
	let sourceIndexedAt = $state<number | undefined>();
	let restoredScopeJobId = $state('');

	type SavedStudioSelection = {
		semesterName: string;
		classId: string;
		moduleId: string;
		counts?: Record<QuestionType, number>;
	};

	/** Last run's mix, so a curator who always asks for the same shape doesn't re-enter it. */
	function readSavedCounts(saved: unknown): Record<QuestionType, number> | null {
		if (!saved || typeof saved !== 'object') return null;
		const raw = saved as Record<string, unknown>;
		const next = { learn: 0, clinical: 0, criticalThinking: 0 } as Record<QuestionType, number>;
		for (const type of questionTypes) {
			const value = Math.floor(Number(raw[type]));
			if (!Number.isFinite(value) || value < 0) return null;
			next[type] = value;
		}
		const total = next.learn + next.clinical + next.criticalThinking;
		return total > 0 && total <= MAX_QUESTIONS ? next : null;
	}

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
	let detailTopic = $state<TopicMapItem | null>(null);
	let guidanceNotes = $state('');

	let topics = $state<TopicMapItem[]>([]);
	let selectedTopicIds = $state<Set<string>>(new Set());
	let candidates = $state<CandidateQuestion[]>([]);
	let selectedCandidateIndexes = $state<Set<number>>(new Set());
	let selectedCandidateIndex = $state<number | null>(null);
	let counts = $state<Record<QuestionType, number>>({
		learn: 10,
		clinical: 0,
		criticalThinking: 0
	});
	let isGenerating = $state(false);
	let isSaving = $state(false);
	let workflowError = $state('');
	let savedDraftsLink = $state<{ classId: string; moduleId: string; query: string } | null>(null);
	let isEditingCandidate = $state(false);
	let lastThreadId = $state('');
	let loadedTopicMapId: Id<'questionStudioTopicMaps'> | null = $state(null);
	let loadedTopicMapUpdatedAt = $state(0);
	let restoredMixJobId = $state('');
	let activeJobId: Id<'questionStudioJobs'> | null = $state(null);
	let loadedGenerationJobId: Id<'questionStudioJobs'> | null = $state(null);
	let loadedGenerationJobUpdatedAt = $state(0);
	let savedSelection = $state<SavedStudioSelection | null>(null);
	let restoredSelection = $state(false);
	let resumingJobId: Id<'questionStudioJobs'> | null = $state(null);
	let allowServerResume = $state(true);

	// Only explicit mode changes update the preference. Restoring a saved run must
	// preserve its own source mode without replacing the user's new-run default.
	$effect(() => {
		const userId = clerkUser?.id ?? null;
		if (userId === preferenceUserId) return;
		preferenceUserId = userId;
		preferredSourceMode = 'pages';
		try {
			const saved = userId && localStorage.getItem(`question-studio-source-mode:${userId}`);
			if (saved === 'pages' || saved === 'topics') preferredSourceMode = saved;
		} catch {
			// Storage can be unavailable in private or restricted browser sessions.
		}
		if (!activeJobId) sourceMode = preferredSourceMode;
	});

	function selectSourceMode(mode: SourceMode) {
		sourceMode = mode;
		preferredSourceMode = mode;
		try {
			if (clerkUser?.id) localStorage.setItem(`question-studio-source-mode:${clerkUser.id}`, mode);
		} catch {
			// Keep the current selection usable even if persistence is unavailable.
		}
	}

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

	// Verdicts only exist once the reviewer has run; they drive the per-question quality panel.
	const jobReviews = useQuery(api.questionStudio.getGenerationJobReviews, () =>
		activeJobId && (activeJob.data?.reviewCount ?? 0) > 0 ? { jobId: activeJobId } : 'skip'
	);

	// The event log is fetched apart from the job snapshot so worker writes don't re-send it.
	const jobActivity = useQuery(api.questionStudio.getGenerationJobActivity, () =>
		activeJobId ? { jobId: activeJobId } : 'skip'
	);

	// Elapsed time and stall detection need a clock that moves on its own.
	let now = $state(Date.now());
	$effect(() => {
		if (
			!isGenerating &&
			activeJob.data?.status !== 'running' &&
			activeJob.data?.status !== 'queued'
		)
			return;
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	const reviews = $derived((jobReviews.data ?? []) as CandidateReview[]);
	const telemetry = $derived(
		runTelemetry({
			job: activeJob.data,
			candidates,
			reviews,
			activity: jobActivity.data,
			now
		})
	);
	const savedIndexes = $derived(new Set(activeJob.data?.savedCandidateIndexes ?? []));
	const selectedTopics = $derived(topics.filter((topic) => selectedTopicIds.has(topic.topicId)));
	const totalRequested = $derived(counts.learn + counts.clinical + counts.criticalThinking);
	const hasStudioContext = $derived(Boolean(selectedDocumentId && selectedModuleId));
	const isTopicMapLoading = $derived(Boolean(hasStudioContext && savedTopicMap.isLoading));
	const canGenerate = $derived(
		hasStudioContext &&
			(sourceMode === 'pages'
				? selectedPageNumbers.length > 0 && sourceIndexedAt !== undefined
				: selectedTopics.length > 0) &&
			totalRequested > 0 &&
			totalRequested <= MAX_QUESTIONS
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

	const inRunMode = $derived(isGenerating || Boolean(activeJob.data));
	const isReady = $derived(activeJob.data?.status === 'ready');
	// Show the first draft the moment it lands so the reading pane fills while the run continues.
	const displayCandidateIndex = $derived(
		selectedCandidateIndex ?? (candidates.length > 0 ? 0 : null)
	);
	const unsavedCount = $derived(
		candidates.map((_, index) => index).filter((index) => !savedIndexes.has(index)).length
	);
	const runRows = $derived(
		buildRunRows({ job: activeJob.data, candidates, reviews, savedIndexes })
	);
	const sourceTitle = $derived(
		selectedSourceSummary
			.split('\n')
			.find((line) => line.startsWith('Document: '))
			?.slice('Document: '.length) ?? ''
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
			selectedPageNumbers = [];
			sourceIndexedAt = undefined;
			resetPlan();
			workflowError = '';
			lastThreadId = '';
			loadedTopicMapId = null;
			activeJobId = null;
			loadedGenerationJobId = null;
			loadedGenerationJobUpdatedAt = 0;
		}
	});

	// Topics hydrate in both modes, so switching to Topics is instant and the chip can
	// always say how many the document has.
	$effect(() => {
		const map = savedTopicMap.data;
		if (!map || (map._id === loadedTopicMapId && map.updatedAt === loadedTopicMapUpdatedAt)) return;
		topics = map.topics as TopicMapItem[];
		selectedTopicIds = new Set(map.topics.map((topic) => topic.topicId));
		if (!activeJobId) resetGenerated();
		lastThreadId = map.agentThreadId ?? '';
		loadedTopicMapId = map._id;
		loadedTopicMapUpdatedAt = map.updatedAt;
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
		if (restoredScopeJobId !== String(job._id)) {
			sourceMode = job.sourceMode ?? 'topics';
			selectedPageNumbers = job.selectedPageNumbers ?? [];
			sourceIndexedAt = job.sourceIndexedAt;
			restoredScopeJobId = String(job._id);
		}
		if (job.requestedCounts && restoredMixJobId !== String(job._id)) {
			counts = { ...job.requestedCounts };
			restoredMixJobId = String(job._id);
		}
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
		lastThreadId = job.threadId ?? lastThreadId;
		if (job.status === 'queued' || job.status === 'running') {
			isGenerating = true;
		}
		if (job.candidates && job.updatedAt !== loadedGenerationJobUpdatedAt) {
			const previousCount = candidates.length;
			const previousSelected = selectedCandidateIndexes;
			const alreadySaved = new Set(job.savedCandidateIndexes ?? []);
			const incoming = job.candidates as CandidateQuestion[];
			candidates = incoming;
			// New drafts arrive pre-selected; saved ones drop out of the selection for good.
			selectedCandidateIndexes = new Set(
				incoming
					.map((_, index) =>
						!alreadySaved.has(index) && (index >= previousCount || previousSelected.has(index))
							? index
							: -1
					)
					.filter((index) => index >= 0)
			);
			if (selectedCandidateIndex !== null && selectedCandidateIndex >= incoming.length) {
				selectedCandidateIndex = null;
			}
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
		activeJobId = null;
		loadedGenerationJobId = null;
		loadedGenerationJobUpdatedAt = 0;
		savedDraftsLink = null;
	}

	function resetPlan() {
		topics = [];
		selectedTopicIds = new Set();
		loadedTopicMapId = null;
		guidanceNotes = '';
		resetGenerated();
	}

	function saveStudioSelection() {
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(
				SELECTION_STORAGE_KEY,
				JSON.stringify({
					semesterName: currentSemester,
					classId: selectedClass ? String(selectedClass._id) : '',
					moduleId: selectedModuleId ? String(selectedModuleId) : '',
					counts
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

	function setCount(type: QuestionType, value: number) {
		const others = totalRequested - counts[type];
		const next = Math.max(0, Math.min(Math.floor(value), MAX_QUESTIONS - others));
		counts = { ...counts, [type]: next };
		saveStudioSelection();
	}

	// The headline number grows or shrinks the largest bucket, so the mix keeps its shape
	// without the curator having to open it.
	function distribute(current: Record<QuestionType, number>, target: number) {
		const next = { ...current };
		let total = next.learn + next.clinical + next.criticalThinking;
		while (total < target) {
			const type = questionTypes.reduce(
				(best, candidate) => (next[candidate] > next[best] ? candidate : best),
				'learn' as QuestionType
			);
			next[type] += 1;
			total += 1;
		}
		while (total > target) {
			const nonEmpty = questionTypes.filter((candidate) => next[candidate] > 0);
			if (nonEmpty.length === 0) break;
			const type = nonEmpty.reduce(
				(best, candidate) => (next[candidate] > next[best] ? candidate : best),
				nonEmpty[0]
			);
			next[type] -= 1;
			total -= 1;
		}
		return next;
	}

	function setTotal(value: number) {
		const target = Math.max(1, Math.min(Math.floor(value), MAX_QUESTIONS));
		if (target === totalRequested) return;
		counts = distribute(counts, target);
		saveStudioSelection();
	}

	function toggleCandidate(index: number) {
		if (isEditingCandidate || isSaving || savedIndexes.has(index)) return;
		selectedCandidateIndexes = new Set(
			selectedCandidateIndexes.has(index)
				? [...selectedCandidateIndexes].filter((i) => i !== index)
				: [...selectedCandidateIndexes, index]
		);
	}

	function selectAllCandidates(selected: boolean) {
		selectedCandidateIndexes = selected
			? new Set(candidates.map((_, index) => index).filter((index) => !savedIndexes.has(index)))
			: new Set();
	}

	function selectCandidate(index: number) {
		if (isEditingCandidate || isSaving) return;
		selectedCandidateIndex = index;
	}

	function navigateCandidate(direction: 'prev' | 'next') {
		if (isEditingCandidate || isSaving) return;
		if (candidates.length === 0) return;
		const current = selectedCandidateIndex ?? displayCandidateIndex;
		if (current === null) {
			selectedCandidateIndex = 0;
			return;
		}
		const next = direction === 'next' ? current + 1 : current - 1;
		if (next < 0 || next >= candidates.length) return;
		selectedCandidateIndex = next;
	}

	async function generateCandidates() {
		if (!selectedDocumentId || !selectedModuleId || !canGenerate) return;
		allowServerResume = true;
		isGenerating = true;
		workflowError = '';
		resetGenerated();
		try {
			const jobId = await client.mutation(api.questionStudio.createGenerationJob, {
				documentId: selectedDocumentId,
				moduleId: selectedModuleId,
				requestedCount: totalRequested,
				sourceMode,
				selectedPageNumbers: sourceMode === 'pages' ? selectedPageNumbers : undefined,
				sourceIndexedAt: sourceMode === 'pages' ? sourceIndexedAt : undefined,
				counts
			});
			activeJobId = jobId;
			void client
				.action(api.questionStudio.generateCandidates, {
					documentId: selectedDocumentId,
					moduleId: selectedModuleId,
					topics: sourceMode === 'pages' ? [] : selectedTopics,
					counts,
					focusNotes: guidanceNotes.trim() || undefined,
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
		if (isEditingCandidate || isSaving) return;
		allowServerResume = false;
		isGenerating = false;
		workflowError = '';
		try {
			await client.mutation(api.questionStudio.clearCurrentGenerationJob, {});
			resetGenerated();
			sourceMode = preferredSourceMode;
		} catch (error) {
			workflowError = error instanceof Error ? error.message : 'Failed to clear current run';
		}
	}

	async function saveSelected() {
		if (isEditingCandidate || isSaving || !activeJobId || !isReady) return;
		if (!selectedDocumentId || !selectedModuleId || selectedCandidateIndexes.size === 0) return;
		const indexes = [...selectedCandidateIndexes].filter((index) => !savedIndexes.has(index));
		if (indexes.length === 0) return;
		isSaving = true;
		const savedJobId = activeJobId;
		const savedModuleId = selectedModuleId;
		const savedClassId = activeJob.data?.moduleClassId ?? selectedClass?._id;
		workflowError = '';
		try {
			const result = await client.mutation(api.questionStudio.saveSelectedCandidates, {
				moduleId: selectedModuleId,
				documentId: selectedDocumentId,
				jobId: activeJobId,
				candidateIndexes: indexes,
				status: 'draft'
			});
			if (savedClassId && result.insertedIds.length)
				savedDraftsLink = {
					classId: String(savedClassId),
					moduleId: String(savedModuleId),
					query: `generationJob=${savedJobId}&review=${result.insertedIds[0]}`
				};
			// The run stays on screen; saved drafts simply stop being selectable.
			selectedCandidateIndexes = new Set(
				[...selectedCandidateIndexes].filter((index) => !indexes.includes(index))
			);
		} catch (error) {
			workflowError = error instanceof Error ? error.message : 'Failed to save questions';
		} finally {
			isSaving = false;
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (
			isEditingCandidate ||
			isSaving ||
			(event.target instanceof HTMLElement &&
				(event.target.isContentEditable || event.target.closest('button, select, a')))
		)
			return;
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
			return;
		if (candidates.length === 0) return;
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			navigateCandidate('prev');
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			navigateCandidate('next');
		} else if (event.key === ' ') {
			if (displayCandidateIndex !== null) {
				event.preventDefault();
				toggleCandidate(displayCandidateIndex);
			}
		} else if (event.key === 'Escape') {
			selectedCandidateIndex = null;
		}
	}

	onMount(() => {
		try {
			const raw = localStorage.getItem(SELECTION_STORAGE_KEY);
			if (raw) {
				savedSelection = JSON.parse(raw) as SavedStudioSelection;
				const savedCounts = readSavedCounts(savedSelection.counts);
				if (savedCounts) counts = savedCounts;
			} else restoredSelection = true;
		} catch {
			restoredSelection = true;
		}
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
</script>

<div
	class="qs-shell relative isolate flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-base-100"
>
	{#if inRunMode}
		<QuestionStudioRunBar
			job={activeJob.data}
			candidateCount={candidates.length}
			className={selectedClass?.name ?? ''}
			moduleTitle={selectedModuleTitle}
			{sourceTitle}
			{counts}
			topicsSelected={selectedTopics.length}
			topicsTotal={topics.length}
			canStartNewRun={canStartNewRun && !isEditingCandidate && !isSaving}
			{unsavedCount}
			onStartNewRun={startNewRun}
		/>

		<div class="qs-canvas relative min-h-0 flex-1 overflow-hidden bg-base-200">
			<div class="qs-grid pointer-events-none absolute inset-0"></div>
			<div class="relative flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4">
				{#if workflowError}
					<div class="alert alert-error shrink-0 rounded-2xl text-sm" in:fade={{ duration: 200 }}>
						<AlertTriangle size={16} />
						<span>{workflowError}</span>
						<button
							class="btn btn-ghost btn-xs ml-auto rounded-full"
							onclick={() => (workflowError = '')}
						>
							Dismiss
						</button>
					</div>
				{/if}

				<QuestionStudioRunStage
					job={activeJob.data}
					rows={runRows}
					{candidates}
					{reviews}
					{selectedCandidateIndexes}
					{savedIndexes}
					displayIndex={displayCandidateIndex}
					canEdit={isReady && !isSaving}
					editing={isEditingCandidate}
					{isSaving}
					{isReady}
					{telemetry}
					activity={jobActivity.data}
					moduleTitle={selectedModuleTitle}
					{savedDraftsLink}
					onEditingChange={(value) => (isEditingCandidate = value)}
					onSelectCandidate={selectCandidate}
					onToggleCandidate={toggleCandidate}
					onSelectAllCandidates={selectAllCandidates}
					onSaveSelected={saveSelected}
					onStartNewRun={startNewRun}
					onNavigateCandidate={navigateCandidate}
				/>
			</div>
		</div>
	{:else}
		<div class="mx-auto flex w-full max-w-[1800px] min-h-0 flex-1 flex-col p-4 sm:p-6">
			<QuestionStudioHeader />

			<section
				class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xs"
			>
				<div class="qs-canvas relative min-h-0 flex-1 overflow-y-auto rounded-2xl bg-base-200">
					<div class="qs-grid pointer-events-none absolute inset-0"></div>
					<div class="relative mx-auto w-full max-w-5xl space-y-3 p-4 sm:p-10">
						{#if workflowError}
							<div class="alert alert-error rounded-2xl text-sm" in:fade={{ duration: 200 }}>
								<AlertTriangle size={16} />
								<span>{workflowError}</span>
								<button
									class="btn btn-ghost btn-xs ml-auto rounded-full"
									onclick={() => (workflowError = '')}
								>
									Dismiss
								</button>
							</div>
						{/if}

						<QuestionStudioSetupCard
							cohortId={convexUser.data?.cohortId as Id<'cohort'> | null | undefined}
							cohortLoading={convexUser.isLoading}
							bind:selectedDocumentId
							bind:selectedSourceSummary
							{currentSemester}
							semesters={semesters.data}
							{selectedClass}
							{selectedModuleId}
							{selectedModuleTitle}
							{searchedClasses}
							{searchedModules}
							bind:classOpen
							bind:moduleOpen
							bind:classSearch
							bind:moduleSearch
							{sourceMode}
							onSelectSourceMode={selectSourceMode}
							bind:selectedPageNumbers
							bind:sourceIndexedAt
							{topics}
							{selectedTopicIds}
							bind:detailTopic
							{counts}
							{totalRequested}
							bind:guidanceNotes
							{hasStudioContext}
							{isTopicMapLoading}
							{canGenerate}
							{isGenerating}
							maxQuestions={MAX_QUESTIONS}
							onSelectSemester={selectSemester}
							onSelectClass={selectClass}
							onSelectModule={selectModule}
							onToggleTopic={toggleTopic}
							onSetAllTopics={setAllTopics}
							onSetCount={setCount}
							onSetTotal={setTotal}
							onGenerate={generateCandidates}
						/>
					</div>
				</div>
			</section>
		</div>
	{/if}
</div>

<div class="lg:hidden">
	<QuestionStudioCandidateModal
		job={activeJob.data}
		{reviews}
		{savedIndexes}
		canEdit={isReady && !isSaving}
		editing={isEditingCandidate}
		onEditingChange={(value) => (isEditingCandidate = value)}
		{candidates}
		{selectedCandidateIndexes}
		bind:selectedCandidateIndex
		onToggleCandidate={toggleCandidate}
		onNavigateCandidate={navigateCandidate}
	/>
</div>

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
