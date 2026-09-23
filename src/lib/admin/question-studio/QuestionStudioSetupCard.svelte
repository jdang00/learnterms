<script lang="ts">
	import QuestionStudioDestinationPicker from './QuestionStudioDestinationPicker.svelte';
	import QuestionStudioSetupDialogs from './QuestionStudioSetupDialogs.svelte';
	import { ChevronDown, Grid2X2, ListChecks, Network, Sparkles } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import QuestionStudioPagePicker from './QuestionStudioPagePicker.svelte';
	import QuestionStudioContextMeter from './QuestionStudioContextMeter.svelte';
	import type { SourcePreviewBatch } from '../source/sourceContext';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { SourceMode } from '../../../convex/questionStudio/pageSelection';
	import QuestionStudioSourceAttachment from './QuestionStudioSourceAttachment.svelte';
	import type { Doc, Id } from '../../../convex/_generated/dataModel';
	import type { ClassWithSemester } from '$lib/types';
	import type { QuestionType, TopicMapItem } from './questionStudioTypes';
	import { questionTypes, questionTypeDefinitions } from './questionStudioTypes';
	import { formatPageSelection } from './pagePickerSelection';
	import { tokenClass } from './questionStudioToken';

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
		if (!documentId) return;
		let cancelled = false;
		void client
			.action(api.questionStudio.context.getSourcePages, { documentId })
			.then((result) => {
				if (!cancelled) sourcePreview = result;
			})
			.catch(() => {
				if (!cancelled) sourcePreviewError = 'Could not read this document.';
			});
		return () => {
			cancelled = true;
		};
	});

	let topicsOpen = $state(false);
	let mixOpen = $state(false);
	let pagesOpen = $state(false);
	let topicSearch = $state('');

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (topicsOpen) topicsOpen = false;
		else if (mixOpen) mixOpen = false;
	}

	function choosePages() {
		if (sourceMode !== 'pages') onSelectSourceMode('pages');
		pagesOpen = true;
	}

	function setTotalFromInput(input: HTMLInputElement) {
		const parsed = Math.floor(Number(input.value));
		const next = Math.max(1, Math.min(Number.isFinite(parsed) ? parsed : 1, maxQuestions));
		onSetTotal(next);
		input.value = String(next);
	}

	const selectedTopics = $derived(topics.filter((topic) => selectedTopicIds.has(topic.topicId)));
	const allTopicsSelected = $derived(topics.length > 0 && selectedTopics.length === topics.length);
	const mixSummary = $derived(
		questionTypes
			.filter((type) => counts[type] > 0)
			.map((type) => `${counts[type]} ${questionTypeDefinitions[type].label.toLowerCase()}`)
			.join(', ')
	);
	const hint = $derived.by(() => {
		if (!selectedDocumentId) return 'Choose a document for the agent to write from.';
		if (!selectedModuleId) return 'Choose the module these drafts should be saved to.';
		if (sourceMode === 'topics' && !isTopicMapLoading && topics.length === 0)
			return "This document hasn't been mapped into topics yet, so choose the pages to use.";
		if (sourceMode === 'pages' && selectedPageNumbers.length === 0)
			return 'Choose at least one page.';
		if (sourceMode === 'topics' && selectedTopics.length === 0) return 'Choose at least one topic.';
		return 'Every draft is checked against your document. Nothing is published until you say so.';
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="card border border-base-300 bg-base-100 shadow-sm" in:fly={{ y: 16, duration: 280 }}>
	<div class="card-body gap-0 px-7 py-8 sm:px-14 sm:py-10">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 class="flex items-center gap-2 text-sm font-medium text-base-content/55">
				<Sparkles size={15} class="text-primary" />
				New question run
			</h2>
			<div
				class="flex rounded-full border border-base-300 bg-base-200 p-1"
				role="group"
				aria-label="Write from"
			>
				{#each ['pages', 'topics'] as const as mode (mode)}
					<button
						type="button"
						class="btn btn-sm rounded-full border-0 {sourceMode === mode
							? 'bg-base-100 text-primary shadow-sm'
							: 'btn-ghost text-base-content/60'}"
						aria-pressed={sourceMode === mode}
						onclick={() => onSelectSourceMode(mode)}
					>
						{mode === 'pages' ? 'Pages' : 'Topics'}
					</button>
				{/each}
			</div>
		</div>

		<div class="setup-sentence mt-8 text-lg text-base-content/80 sm:text-xl">
			Write
			<input
				type="number"
				inputmode="numeric"
				min="1"
				max={maxQuestions}
				aria-label="Number of questions"
				class="input count-token mx-1.5 w-20 rounded-full text-center text-base font-medium"
				value={totalRequested}
				disabled={isGenerating}
				onchange={(event) => setTotalFromInput(event.currentTarget)}
			/>
			question{totalRequested === 1 ? '' : 's'} from
			<QuestionStudioSourceAttachment
				{cohortId}
				{cohortLoading}
				bind:selectedDocumentId
				bind:selectedSourceSummary
			/>
			covering
			{#if !selectedDocumentId}
				<button type="button" class={tokenClass(false)} disabled>
					{#if sourceMode === 'pages'}
						<Grid2X2 size={16} class="shrink-0" />
					{:else}
						<Network size={16} class="shrink-0" />
					{/if}
					its {sourceMode === 'pages' ? 'pages' : 'topics'}
				</button>
			{:else if sourceMode === 'pages'}
				<button
					type="button"
					class={tokenClass(selectedPageNumbers.length > 0)}
					disabled={!sourcePreview}
					onclick={choosePages}
				>
					<Grid2X2 size={16} class="shrink-0 text-base-content/60" />
					<span class="max-w-[14rem] truncate">
						{#if !sourcePreview}
							pages…
						{:else if selectedPageNumbers.length}
							page{selectedPageNumbers.length === 1 ? '' : 's'}
							{formatPageSelection(selectedPageNumbers)}
						{:else}
							pages you choose
						{/if}
					</span>
					<ChevronDown size={15} class="shrink-0 opacity-60" />
				</button>
			{:else if !hasStudioContext}
				<button type="button" class={tokenClass(false)} onclick={choosePages}>
					<Grid2X2 size={16} class="shrink-0" />
					pages you choose
					<ChevronDown size={15} class="shrink-0 opacity-60" />
				</button>
			{:else if isTopicMapLoading}
				<button type="button" class={tokenClass(false)} disabled>
					<Network size={16} class="shrink-0" />
					its topics…
				</button>
			{:else if topics.length === 0}
				<button type="button" class={tokenClass(false)} onclick={choosePages}>
					<Grid2X2 size={16} class="shrink-0" />
					pages you choose
					<ChevronDown size={15} class="shrink-0 opacity-60" />
				</button>
			{:else}
				<button
					type="button"
					class={tokenClass(selectedTopics.length > 0)}
					onclick={() => {
						topicSearch = '';
						topicsOpen = true;
					}}
				>
					<Network size={16} class="shrink-0 text-base-content/60" />
					{allTopicsSelected
						? `all ${topics.length} topics`
						: `${selectedTopics.length} of ${topics.length} topics`}
					<ChevronDown size={15} class="shrink-0 opacity-60" />
				</button>
			{/if}
			and save them to
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
			/>.
		</div>

		{#if sourceMode === 'pages' && selectedDocumentId && sourcePreview}
			{#key selectedDocumentId}
				<QuestionStudioPagePicker
					documentId={selectedDocumentId}
					initialSource={sourcePreview}
					onSourceReloaded={(result) => (sourcePreview = result)}
					bind:selectedPageNumbers
					bind:sourceIndexedAt
					bind:open={pagesOpen}
				/>
			{/key}
		{/if}

		{#if selectedDocumentId}
			<QuestionStudioContextMeter
				pageStats={sourcePreview?.pageCharacterCounts}
				selectedPageNumbers={contextPageNumbers}
				loading={!sourcePreview && !sourcePreviewError}
				error={sourcePreviewError}
			/>
		{/if}

		<textarea
			class="textarea mt-9 w-full resize-none rounded-2xl border-base-300 bg-base-200/40 p-4 text-base leading-relaxed focus:bg-base-100"
			rows="3"
			aria-label="Focus notes for the agent"
			placeholder="Anything to focus on? For example, key definitions and common points of confusion. (Optional)"
			bind:value={guidanceNotes}
		></textarea>

		<p class="mt-5 text-sm leading-relaxed text-base-content/50">
			{#if sourcePreviewError}
				<span class="text-error">{sourcePreviewError}</span>
				<button type="button" class="underline" onclick={() => sourceReload++}>Try again</button>
			{:else}
				{hint}
			{/if}
		</p>

		<div class="mt-7 flex flex-wrap items-center gap-3 border-t border-base-300 pt-7">
			<button
				type="button"
				class="btn gap-2 rounded-full px-4 font-medium"
				disabled={isGenerating}
				onclick={() => (mixOpen = true)}
			>
				<ListChecks size={16} class="text-base-content/60" />
				{mixSummary}
				<ChevronDown size={15} class="opacity-60" />
			</button>
			<button
				class="btn btn-primary ml-auto gap-2 rounded-full px-7"
				disabled={!canGenerate || isGenerating}
				onclick={onGenerate}
			>
				<Sparkles size={16} />
				Generate {totalRequested} question{totalRequested === 1 ? '' : 's'}
			</button>
		</div>
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
	{sourceMode}
	{counts}
	{totalRequested}
	{maxQuestions}
	{isGenerating}
	{onToggleTopic}
	{onSetAllTopics}
	{onSetCount}
/>

<style>
	.setup-sentence {
		line-height: 3;
		word-spacing: 0.06em;
		text-wrap: pretty;
	}
	.count-token {
		appearance: textfield;
		-moz-appearance: textfield;
	}
	.count-token::-webkit-inner-spin-button,
	.count-token::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
</style>
