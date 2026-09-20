<script lang="ts">
	import QuestionStudioDestinationPicker from './QuestionStudioDestinationPicker.svelte';
	import QuestionStudioSetupDialogs from './QuestionStudioSetupDialogs.svelte';
	import {
		Check,
		ChevronDown,
		ChevronRight,
		ListChecks,
		MessageSquareText,
		Network,
		Sparkles
	} from 'lucide-svelte';
	import { fly, slide } from 'svelte/transition';
	import QuestionStudioPagePicker from './QuestionStudioPagePicker.svelte';
	import QuestionStudioContextMeter from './QuestionStudioContextMeter.svelte';
	import type { SourcePreviewBatch } from './sourceContext';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { SourceMode } from '../../convex/questionStudio/pageSelection';
	import QuestionStudioCountStepper from './QuestionStudioCountStepper.svelte';
	import QuestionStudioSourceAttachment from './QuestionStudioSourceAttachment.svelte';
	import type { Doc, Id } from '../../convex/_generated/dataModel';
	import type { ClassWithSemester } from '$lib/types';
	import type { QuestionType, TopicMapItem } from './questionStudioTypes';
	import { questionTypes, questionTypeDefinitions } from './questionStudioTypes';

	interface Props {
		cohortId?: Id<'cohort'> | null;
		cohortLoading: boolean;
		selectedDocumentId?: Id<'contentLib'> | null;
		selectedSourceSummary?: string;
		currentSemester: string;
		semesters?: Doc<'semester'>[];
		selectedClass: ClassWithSemester | null;
		selectedModuleId: Id<'module'> | null;
		selectedModuleTitle: string;
		searchedClasses: ClassWithSemester[];
		searchedModules: Doc<'module'>[];
		classOpen?: boolean;
		moduleOpen?: boolean;
		classSearch?: string;
		moduleSearch?: string;
		sourceMode?: SourceMode;
		onSelectSourceMode: (mode: SourceMode) => void;
		selectedPageNumbers?: number[];
		sourceIndexedAt?: number;
		topics: TopicMapItem[];
		selectedTopicIds: Set<string>;
		detailTopic?: TopicMapItem | null;
		counts: Record<QuestionType, number>;
		totalRequested: number;
		guidanceNotes?: string;
		hasStudioContext: boolean;
		isTopicMapLoading: boolean;
		canGenerate: boolean;
		isGenerating: boolean;
		maxQuestions: number;
		onSelectSemester: (name: string) => void;
		onSelectClass: (classItem: ClassWithSemester) => void;
		onSelectModule: (moduleItem: Doc<'module'>) => void;
		onToggleTopic: (topicId: string) => void;
		onSetAllTopics: (selected: boolean) => void;
		onSetCount: (type: QuestionType, value: number) => void;
		onSetTotal: (value: number) => void;
		onGenerate: () => void;
	}

	let {
		cohortId = null,
		cohortLoading,
		selectedDocumentId = $bindable<Id<'contentLib'> | null>(null),
		selectedSourceSummary = $bindable(''),
		currentSemester,
		semesters,
		selectedClass,
		selectedModuleId,
		selectedModuleTitle,
		searchedClasses,
		searchedModules,
		classOpen = $bindable(false),
		moduleOpen = $bindable(false),
		classSearch = $bindable(''),
		moduleSearch = $bindable(''),
		sourceMode = 'topics',
		onSelectSourceMode,
		selectedPageNumbers = $bindable<number[]>([]),
		sourceIndexedAt = $bindable<number | undefined>(),
		topics,
		selectedTopicIds,
		detailTopic = $bindable<TopicMapItem | null>(null),
		counts,
		totalRequested,
		guidanceNotes = $bindable(''),
		hasStudioContext,
		isTopicMapLoading,
		canGenerate,
		isGenerating,
		maxQuestions,
		onSelectSemester,
		onSelectClass,
		onSelectModule,
		onToggleTopic,
		onSetAllTopics,
		onSetCount,
		onSetTotal,
		onGenerate
	}: Props = $props();

	const client = useConvexClient();
	let sourcePreview = $state<SourcePreviewBatch | null>(null);
	let sourcePreviewError = $state('');
	let sourceLoading = $state(false);
	let sourceReload = $state(0);
	const contextPageNumbers = $derived(
		sourceMode === 'pages'
			? selectedPageNumbers
			: [
					...new Set(
						topics
							.filter((topic) => selectedTopicIds.has(topic.topicId))
							.flatMap((topic) => topic.pageNumbers)
					)
				]
	);
	$effect(() => {
		const documentId = selectedDocumentId;
		void sourceReload;
		sourcePreview = null;
		sourcePreviewError = '';
		sourceLoading = Boolean(documentId);
		if (!documentId) return;
		let cancelled = false;
		void client
			.action(api.questionStudio.getSourcePages, { documentId })
			.then((result) => {
				if (!cancelled) sourcePreview = result;
			})
			.catch(() => {
				if (!cancelled) sourcePreviewError = 'Could not measure the source. Try loading it again.';
			})
			.finally(() => {
				if (!cancelled) sourceLoading = false;
			});
		return () => {
			cancelled = true;
		};
	});

	let topicsOpen = $state(false);
	let topicSearch = $state('');

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (topicsOpen) topicsOpen = false;
		else if (mixOpen) mixOpen = false;
	}
	let mixOpen = $state(false);
	let notesOpen = $state(false);

	const selectedTopics = $derived(topics.filter((topic) => selectedTopicIds.has(topic.topicId)));
	const allTopicsSelected = $derived(topics.length > 0 && selectedTopics.length === topics.length);
	const readyToTune = $derived(
		hasStudioContext && (sourceMode === 'pages' ? sourceIndexedAt !== undefined : topics.length > 0)
	);
	const mixSummary = $derived(
		questionTypes
			.filter((type) => counts[type] > 0)
			.map((type) => `${counts[type]} ${questionTypeDefinitions[type].label}`)
			.join(' · ') || 'No questions yet'
	);
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="card border border-base-300 bg-base-100 shadow-sm" in:fly={{ y: 16, duration: 280 }}>
	<div class="card-body gap-0 p-5 sm:p-7">
		<div class="flex items-center gap-3">
			<span
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
			>
				<Sparkles size={19} />
			</span>
			<div class="min-w-0">
				<h1 class="text-base font-semibold leading-tight">New question run</h1>
				<p class="text-xs text-base-content/55">
					Point the agent at a source, say where drafts should land, and how many you want.
				</p>
			</div>
		</div>

		<div class="mt-5 flex flex-wrap items-center justify-between gap-2">
			<span class="text-xs font-medium text-base-content/55">Choose context by</span>
			<div
				class="join rounded-full border border-base-300 bg-base-200 p-1"
				role="group"
				aria-label="Choose context by"
			>
				{#each ['topics', 'pages'] as mode (mode)}
					<button
						type="button"
						class="btn btn-sm rounded-full border-0 {sourceMode === mode
							? 'bg-base-100 text-primary shadow-sm'
							: 'btn-ghost text-base-content/60'}"
						aria-pressed={sourceMode === mode}
						onclick={() => onSelectSourceMode(mode as SourceMode)}
						>{mode === 'topics' ? 'Topics' : 'Pages'}</button
					>
				{/each}
			</div>
		</div>

		<section class="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
			<span class="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-base-content/40">
				Source
			</span>
			<QuestionStudioSourceAttachment
				{cohortId}
				{cohortLoading}
				bind:selectedDocumentId
				bind:selectedSourceSummary
			/>
			{#if selectedDocumentId && hasStudioContext && sourceMode === 'topics'}
				{#if topics.length > 0}
					<span class="flex items-center gap-1.5 text-xs text-success">
						<Check size={13} />
						{topics.length} topics mapped
					</span>
				{:else}
					<span class="flex items-center gap-1.5 text-xs text-base-content/50">
						{#if isTopicMapLoading}<span class="loading loading-spinner loading-xs"></span>{/if}
						{isTopicMapLoading ? 'Loading topics…' : 'No topic map available'}
					</span>
				{/if}
			{/if}
		</section>

		<QuestionStudioDestinationPicker
			{currentSemester}
			{semesters}
			{selectedClass}
			{selectedModuleId}
			{selectedModuleTitle}
			{searchedClasses}
			{searchedModules}
			bind:classOpen
			bind:moduleOpen
			bind:classSearch
			bind:moduleSearch
			{onSelectSemester}
			{onSelectClass}
			{onSelectModule}
		/>

		{#if sourceMode === 'pages' && selectedDocumentId && sourcePreview}
			{#key selectedDocumentId}
				<QuestionStudioPagePicker
					documentId={selectedDocumentId}
					initialSource={sourcePreview}
					onSourceReloaded={(result) => (sourcePreview = result)}
					bind:selectedPageNumbers
					bind:sourceIndexedAt
				/>
			{/key}
		{/if}

		{#if selectedDocumentId}
			<QuestionStudioContextMeter
				pageStats={sourcePreview?.pageCharacterCounts}
				selectedPageNumbers={contextPageNumbers}
				loading={sourceLoading}
				error={sourcePreviewError}
			/>
			{#if sourcePreviewError}<button
					type="button"
					class="btn btn-ghost btn-xs mt-1"
					onclick={() => sourceReload++}>Reload source</button
				>{/if}
		{/if}

		<section class="mt-6 border-t border-base-300 pt-6" class:opacity-40={!readyToTune}>
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-base-content/40">
						Questions to generate
					</p>
					<div class="mt-1.5 flex items-center gap-3">
						<QuestionStudioCountStepper
							value={totalRequested}
							min={1}
							max={maxQuestions}
							size="lg"
							ariaLabel="questions"
							disabled={!readyToTune || isGenerating}
							onChange={onSetTotal}
						/>
						<span class="text-sm text-base-content/45">
							question{totalRequested === 1 ? '' : 's'}
						</span>
					</div>
				</div>

				<button
					class="btn btn-primary w-full gap-2 rounded-full px-6 sm:w-auto"
					disabled={!canGenerate || isGenerating}
					onclick={onGenerate}
				>
					<Sparkles size={15} />
					Generate {totalRequested} question{totalRequested === 1 ? '' : 's'}
				</button>
			</div>

			<div class="mt-5 grid gap-2 {sourceMode === 'topics' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}">
				{#if sourceMode === 'topics'}
					<button
						type="button"
						class="flex w-full flex-col gap-1 rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-left transition hover:border-primary/50 hover:bg-base-200/40 disabled:opacity-60"
						disabled={!readyToTune}
						onclick={() => {
							topicSearch = '';
							topicsOpen = true;
						}}
					>
						<span
							class="flex w-full items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-base-content/40"
						>
							<Network size={12} />
							Topics
							<ChevronRight size={13} class="ml-auto text-base-content/30" />
						</span>
						<span class="truncate text-sm font-medium">
							{allTopicsSelected
								? `All ${topics.length} topics`
								: `${selectedTopics.length} of ${topics.length} topics`}
						</span>
					</button>
				{/if}

				<button
					type="button"
					class="flex w-full flex-col gap-1 rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-left transition hover:border-primary/50 hover:bg-base-200/40 disabled:opacity-60"
					disabled={!readyToTune}
					onclick={() => (mixOpen = true)}
				>
					<span
						class="flex w-full items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-base-content/40"
					>
						<ListChecks size={12} />
						Question mix
						<ChevronRight size={13} class="ml-auto text-base-content/30" />
					</span>
					<span class="truncate text-sm font-medium">{mixSummary}</span>
				</button>

				<button
					type="button"
					class="flex w-full flex-col gap-1 rounded-2xl border bg-base-100 px-4 py-3 text-left transition hover:border-primary/50 hover:bg-base-200/40 disabled:opacity-60 {notesOpen ||
					guidanceNotes.trim()
						? 'border-primary/50'
						: 'border-base-300'}"
					disabled={!readyToTune}
					onclick={() => (notesOpen = !notesOpen)}
				>
					<span
						class="flex w-full items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-base-content/40"
					>
						<MessageSquareText size={12} />
						Focus notes
						<ChevronDown size={13} class="ml-auto text-base-content/30" />
					</span>
					<span
						class="truncate text-sm font-medium {guidanceNotes.trim()
							? ''
							: 'text-base-content/40'}"
					>
						{guidanceNotes.trim() || 'None — the agent decides'}
					</span>
				</button>
			</div>

			{#if notesOpen}
				<div transition:slide={{ duration: 180 }}>
					<textarea
						class="textarea textarea-bordered mt-2 w-full rounded-xl text-sm"
						rows="2"
						placeholder="e.g. Focus on key definitions and common points of confusion."
						bind:value={guidanceNotes}
					></textarea>
				</div>
			{/if}

			<p class="mt-4 text-xs leading-relaxed text-base-content/45">
				{#if !selectedDocumentId}
					Attach a source document to get started.
				{:else if !selectedModuleId}
					Choose the class and module these questions should be saved into.
				{:else if sourceMode === 'pages' && selectedPageNumbers.length === 0}
					Add at least one page to your context.
				{:else if sourceMode === 'topics' && topics.length === 0}
					No topics are ready yet. Choose Pages to select your own context, or prepare this source
					in the Content Library.
				{:else if sourceMode === 'topics' && selectedTopics.length === 0}
					Select at least one topic for the agent to write from.
				{:else}
					Every draft is checked against your source before it reaches you. Unsupported slots come
					back empty with a reason rather than invented. Nothing is published until you say so.
				{/if}
			</p>
		</section>
	</div>
</div>

<QuestionStudioSetupDialogs
	bind:topicsOpen
	bind:mixOpen
	bind:topicSearch
	bind:detailTopic
	{topics}
	{selectedTopicIds}
	{sourcePreview}
	{contextPageNumbers}
	{sourceLoading}
	{sourcePreviewError}
	{sourceMode}
	{counts}
	{totalRequested}
	{maxQuestions}
	{isGenerating}
	{onToggleTopic}
	{onSetAllTopics}
	{onSetCount}
/>
