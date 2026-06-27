<script lang="ts">
	import {
		ArrowLeft,
		Check,
		Info,
		ListChecks,
		MessageSquareText,
		Minus,
		Network,
		Plus,
		Save,
		Sparkles,
		Wand2
	} from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import ShimmerText from '$lib/components/ShimmerText.svelte';
	import QuestionStudioCandidateCard from './QuestionStudioCandidateCard.svelte';
	import type {
		CandidateQuestion,
		GenerationMode,
		QuestionStudioModel,
		QuestionStudioModelOption,
		ReasoningOrder,
		TopicMapItem
	} from './questionStudioTypes';

	interface Props {
		generationMode?: GenerationMode | null;
		guidanceNotes?: string;
		topicMapHidden?: boolean;
		detailTopic?: TopicMapItem | null;
		topics: TopicMapItem[];
		selectedTopicIds: Set<string>;
		counts: Record<ReasoningOrder, number>;
		selectedModel?: QuestionStudioModel;
		modelOptions: QuestionStudioModelOption[];
		totalRequested: number;
		canGenerate: boolean;
		canStartNewRun: boolean;
		isGenerating: boolean;
		isSaving: boolean;
		agentStatusText: string;
		showGeneratingState: boolean;
		candidates: CandidateQuestion[];
		selectedCandidateIndexes: Set<number>;
		selectedCandidateIndex: number | null;
		blockedDuplicateCount: number;
		onToggleTopic: (topicId: string) => void;
		onSetAllTopics: (selected: boolean) => void;
		onChangeCount: (order: ReasoningOrder, delta: number) => void;
		onGenerateCandidates: () => void;
		onStartNewRun: () => void;
		onSelectCandidate: (index: number) => void;
		onToggleCandidate: (index: number) => void;
		onSelectAllCandidates: (selected: boolean) => void;
		onSaveSelected: () => void;
	}

	const reasoningOrders: ReasoningOrder[] = ['first', 'second', 'third'];

	let {
		generationMode = $bindable<GenerationMode | null>(null),
		guidanceNotes = $bindable(''),
		topicMapHidden = $bindable(false),
		detailTopic = $bindable<TopicMapItem | null>(null),
		topics,
		selectedTopicIds,
		counts,
		selectedModel = $bindable<QuestionStudioModel>('deepseek/deepseek-v4-flash'),
		modelOptions,
		totalRequested,
		canGenerate,
		canStartNewRun,
		isGenerating,
		isSaving,
		agentStatusText,
		showGeneratingState,
		candidates,
		selectedCandidateIndexes,
		selectedCandidateIndex,
		blockedDuplicateCount,
		onToggleTopic,
		onSetAllTopics,
		onChangeCount,
		onGenerateCandidates,
		onStartNewRun,
		onSelectCandidate,
		onToggleCandidate,
		onSelectAllCandidates,
		onSaveSelected
	}: Props = $props();

	const selectedModelOption = $derived(modelOptions.find((option) => option.id === selectedModel));
	const modelDescriptor = $derived(selectedModelOption?.description ?? 'Custom OpenRouter slug');
</script>

<div class="card border border-base-300 bg-base-100 shadow-xs" in:fly={{ y: 14, duration: 260 }}>
	<div class="card-body gap-0 p-4 sm:p-5">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div class="flex items-center gap-2.5">
				<span
					class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"
				>
					{#if generationMode === 'auto'}
						<Wand2 size={16} />
					{:else if generationMode === 'guided'}
						<MessageSquareText size={16} />
					{:else}
						<ListChecks size={16} />
					{/if}
				</span>
				<div>
					<h2 class="text-sm font-semibold">
						{generationMode === 'auto'
							? 'Cover everything'
							: generationMode === 'guided'
								? 'Guide the focus'
								: 'Hand-pick'}
					</h2>
					<p class="text-xs text-base-content/55">
						{generationMode === 'auto'
							? 'Covering every topic found in your notes'
							: generationMode === 'guided'
								? 'Add focus notes, then generate'
								: 'Pick topics and coverage below'}
					</p>
				</div>
			</div>
			<button
				class="btn btn-ghost btn-sm gap-2 rounded-full"
				onclick={() => (generationMode = null)}
			>
				<ArrowLeft size={14} />
				Change
			</button>
		</div>

		{#if generationMode === 'guided'}
			<section class="mt-5">
				<h3 class="mb-2 text-sm font-semibold">Focus notes</h3>
				<textarea
					class="textarea textarea-bordered w-full rounded-xl text-sm"
					rows="3"
					placeholder="e.g. Emphasize drug interactions and dosing edge cases; keep stems clinical."
					bind:value={guidanceNotes}
				></textarea>
			</section>
		{/if}

		{#if generationMode !== 'auto'}
			<section class="mt-5 border-t border-base-300 pt-5">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
					<div>
						<h3 class="text-sm font-semibold">Topics from your notes</h3>
						<p class="mt-0.5 text-xs text-base-content/50">
							Consider creating questions from these areas.
						</p>
					</div>
					<div class="flex gap-1">
						<button
							class="btn btn-ghost btn-xs rounded-full"
							onclick={() => (topicMapHidden = !topicMapHidden)}
						>
							{topicMapHidden ? 'Show' : 'Hide'}
						</button>
						<button class="btn btn-ghost btn-xs rounded-full" onclick={() => onSetAllTopics(true)}>
							All
						</button>
						<button class="btn btn-ghost btn-xs rounded-full" onclick={() => onSetAllTopics(false)}>
							None
						</button>
					</div>
				</div>
				{#if !topicMapHidden}
					<div class="divide-y divide-base-200">
						{#each topics as topic (topic.topicId)}
							{@const selected = selectedTopicIds.has(topic.topicId)}
							<div class="group flex items-center gap-1">
								<button
									type="button"
									class="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-base-200/50"
									onclick={() => onToggleTopic(topic.topicId)}
								>
									<span
										class="flex h-4 w-4 shrink-0 items-center justify-center rounded border {selected
											? 'border-primary bg-primary text-primary-content'
											: 'border-base-300'}"
									>
										{#if selected}<Check size={10} />{/if}
									</span>
									<p
										class="min-w-0 flex-1 truncate text-sm font-medium {selected
											? ''
											: 'text-base-content/70'}"
									>
										{topic.title}
									</p>
								</button>
								<button
									type="button"
									class="btn btn-ghost btn-xs btn-circle shrink-0 text-base-content/40 opacity-0 transition group-hover:opacity-100"
									title="Topic details"
									onclick={() => (detailTopic = topic)}
								>
									<Info size={14} />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{:else}
			<section class="mt-5 flex items-center gap-3 border-t border-base-300 pt-5">
				<span
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
				>
					<Network size={16} />
				</span>
				<div class="min-w-0">
					<p class="text-sm font-medium">All {topics.length} topics covered</p>
					<p class="text-xs text-base-content/50">Adjust the question mix below, then generate.</p>
				</div>
			</section>
		{/if}

		<section class="mt-5 border-t border-base-300 pt-5">
			<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h3 class="text-sm font-semibold">Coverage mix</h3>
					<p class="mt-0.5 text-xs text-base-content/50">
						{totalRequested}/30 questions requested
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-1.5">
					<label class="form-control w-full min-w-52 sm:w-64">
						<span class="label py-0 pb-1">
							<span class="label-text text-xs text-base-content/55">Model slug</span>
							<span class="label-text-alt text-xs text-base-content/45">
								{modelDescriptor}
							</span>
						</span>
						<input
							class="input input-bordered input-sm rounded-full"
							list="question-studio-model-options"
							placeholder="provider/model-slug"
							bind:value={selectedModel}
							disabled={isGenerating || isSaving}
							spellcheck="false"
						/>
						<datalist id="question-studio-model-options">
							{#each modelOptions as option (option.id)}
								<option value={option.id}>{option.label}</option>
							{/each}
						</datalist>
					</label>
					{#if canStartNewRun}
						<button
							class="btn btn-ghost btn-sm rounded-full"
							disabled={isGenerating || isSaving}
							onclick={onStartNewRun}
						>
							New run
						</button>
					{/if}
					<button
						class="btn btn-secondary btn-sm gap-2 rounded-full"
						disabled={!canGenerate || isGenerating}
						onclick={onGenerateCandidates}
					>
						<Sparkles size={14} />
						{#if isGenerating}
							Generating…
						{:else if candidates.length > 0}
							Generate new run
						{:else}
							Generate candidates
						{/if}
					</button>
				</div>
			</div>
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
				{#each reasoningOrders as order (order)}
					<div class="flex items-center justify-between rounded-xl bg-base-200/60 px-3 py-2.5">
						<span class="text-xs font-medium capitalize text-base-content/70">{order} order</span>
						<div class="flex items-center gap-1.5">
							<button
								class="btn btn-ghost btn-xs h-7 w-7 rounded-full p-0"
								onclick={() => onChangeCount(order, -1)}
							>
								<Minus size={13} />
							</button>
							<span class="w-6 text-center text-sm font-semibold">{counts[order]}</span>
							<button
								class="btn btn-ghost btn-xs h-7 w-7 rounded-full p-0"
								onclick={() => onChangeCount(order, 1)}
							>
								<Plus size={13} />
							</button>
						</div>
					</div>
				{/each}
			</div>
		</section>

		{#if candidates.length > 0}
			<section class="mt-5 border-t border-base-300 pt-5">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
					<div>
						<h3 class="text-sm font-semibold">Candidates</h3>
						<p class="mt-0.5 text-xs text-base-content/50">
							{selectedCandidateIndexes.size} of {candidates.length} selected
							{#if blockedDuplicateCount}
								· {blockedDuplicateCount} hidden by checks
							{/if}
						</p>
						{#if showGeneratingState}
							<ShimmerText text={agentStatusText} tone="primary" class="mt-1 text-xs" />
						{/if}
					</div>
					<div class="flex flex-wrap items-center gap-1">
						<button
							class="btn btn-ghost btn-xs rounded-full"
							onclick={() => onSelectAllCandidates(true)}
						>
							All
						</button>
						<button
							class="btn btn-ghost btn-xs rounded-full"
							onclick={() => onSelectAllCandidates(false)}
						>
							None
						</button>
						<button
							class="btn btn-primary btn-sm gap-1 rounded-full"
							disabled={selectedCandidateIndexes.size === 0 || isSaving}
							onclick={onSaveSelected}
						>
							<Save size={13} />
							{#if isSaving}
								<ShimmerText text="Saving…" class="font-medium" />
							{:else}
								Save drafts
							{/if}
						</button>
					</div>
				</div>
				<div class="space-y-1.5">
					{#each candidates as candidate, index (index)}
						<QuestionStudioCandidateCard
							{candidate}
							{index}
							isActive={selectedCandidateIndex === index}
							isIncluded={selectedCandidateIndexes.has(index)}
							onSelect={() => onSelectCandidate(index)}
							onToggleInclude={() => onToggleCandidate(index)}
						/>
					{/each}
				</div>
			</section>
		{:else if showGeneratingState}
			<section
				class="mt-5 flex flex-col items-center border-t border-base-300 pt-8 pb-2 text-center"
			>
				<span class="loading loading-dots loading-md mb-3 text-primary"></span>
				<ShimmerText text={agentStatusText} tone="primary" class="text-sm font-medium" />
				<p class="mt-1 text-xs text-base-content/45">Follow along in the activity panel.</p>
			</section>
		{/if}
	</div>
</div>
