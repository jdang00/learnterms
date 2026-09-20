<script lang="ts">
	import { Check, Info, ListChecks, Network, X } from 'lucide-svelte';
	import QuestionStudioContextMeter from './QuestionStudioContextMeter.svelte';
	import QuestionStudioCountStepper from './QuestionStudioCountStepper.svelte';
	import type { SourcePreviewBatch } from './sourceContext';
	import type { SourceMode } from '../../convex/questionStudio/pageSelection';
	import type { QuestionType, TopicMapItem } from './questionStudioTypes';
	import { questionTypes, questionTypeDefinitions } from './questionStudioTypes';
	interface Props {
		topicsOpen?: boolean;
		mixOpen?: boolean;
		topicSearch?: string;
		detailTopic?: TopicMapItem | null;
		topics: TopicMapItem[];
		selectedTopicIds: Set<string>;
		sourcePreview: SourcePreviewBatch | null;
		contextPageNumbers: number[];
		sourceLoading: boolean;
		sourcePreviewError: string;
		sourceMode: SourceMode;
		counts: Record<QuestionType, number>;
		totalRequested: number;
		maxQuestions: number;
		isGenerating: boolean;
		onToggleTopic: (topicId: string) => void;
		onSetAllTopics: (selected: boolean) => void;
		onSetCount: (type: QuestionType, value: number) => void;
	}
	let {
		topicsOpen = $bindable(false),
		mixOpen = $bindable(false),
		topicSearch = $bindable(''),
		detailTopic = $bindable<TopicMapItem | null>(null),
		topics,
		selectedTopicIds,
		sourcePreview,
		contextPageNumbers,
		sourceLoading,
		sourcePreviewError,
		sourceMode,
		counts,
		totalRequested,
		maxQuestions,
		isGenerating,
		onToggleTopic,
		onSetAllTopics,
		onSetCount
	}: Props = $props();
	const selectedTopics = $derived(topics.filter((topic) => selectedTopicIds.has(topic.topicId)));
	const searchedTopics = $derived.by(() => {
		const query = topicSearch.trim().toLowerCase();
		if (!query) return topics;
		return topics.filter(
			(topic) =>
				topic.title.toLowerCase().includes(query) ||
				topic.summary?.toLowerCase().includes(query) ||
				topic.keyTerms?.some((term) => term.toLowerCase().includes(query))
		);
	});
</script>

<dialog class="modal" class:modal-open={topicsOpen}>
	<div class="modal-box flex h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl p-0">
		<div class="flex shrink-0 items-center gap-2 border-b border-base-300 px-4 py-3">
			<span
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
			>
				<Network size={15} />
			</span>
			<div class="min-w-0 flex-1">
				<h3 class="text-sm font-semibold leading-tight">Topics from your notes</h3>
				<p class="text-xs text-base-content/50">
					{selectedTopics.length} of {topics.length} selected — the agent writes only from these.
				</p>
			</div>
			<button
				type="button"
				class="btn btn-ghost btn-sm btn-circle"
				aria-label="Close"
				onclick={() => (topicsOpen = false)}
			>
				<X size={16} />
			</button>
		</div>

		<div class="flex shrink-0 items-center gap-2 border-b border-base-300 px-4 py-2">
			<input
				type="text"
				placeholder="Search topics..."
				class="input input-bordered input-sm min-w-0 flex-1 rounded-full"
				bind:value={topicSearch}
			/>
			<button class="btn btn-ghost btn-sm rounded-full" onclick={() => onSetAllTopics(true)}>
				All
			</button>
			<button class="btn btn-ghost btn-sm rounded-full" onclick={() => onSetAllTopics(false)}>
				None
			</button>
		</div>

		<ul class="min-h-0 flex-1 overflow-y-auto p-2">
			{#each searchedTopics as topic (topic.topicId)}
				{@const selected = selectedTopicIds.has(topic.topicId)}
				<li class="flex items-start gap-1">
					<button
						type="button"
						class="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-base-200/60"
						onclick={() => onToggleTopic(topic.topicId)}
					>
						<span
							class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border {selected
								? 'border-primary bg-primary text-primary-content'
								: 'border-base-300'}"
						>
							{#if selected}<Check size={10} />{/if}
						</span>
						<span class="min-w-0 flex-1">
							<span class="flex flex-wrap items-baseline gap-x-2">
								<span class="text-sm font-medium {selected ? '' : 'text-base-content/60'}">
									{topic.title}
								</span>
								{#if topic.pageNumbers.length}
									<span class="text-[11px] text-base-content/35">
										pp. {topic.pageNumbers.slice(0, 4).join(', ')}{topic.pageNumbers.length > 4
											? '…'
											: ''}
									</span>
								{/if}
							</span>
							{#if topic.summary}
								<span class="mt-0.5 block text-xs leading-relaxed text-base-content/45">
									{topic.summary}
								</span>
							{/if}
						</span>
					</button>
					<button
						type="button"
						class="btn btn-ghost btn-xs btn-circle mt-2 shrink-0 text-base-content/35 hover:text-base-content/70"
						title="Topic details"
						aria-label="Topic details"
						onclick={() => (detailTopic = topic)}
					>
						<Info size={13} />
					</button>
				</li>
			{:else}
				<li class="px-3 py-10 text-center text-sm text-base-content/45">
					{topicSearch.trim()
						? `No topics match “${topicSearch.trim()}”`
						: 'No topics were found in this source.'}
				</li>
			{/each}
		</ul>

		<QuestionStudioContextMeter
			pageStats={sourcePreview?.pageCharacterCounts}
			selectedPageNumbers={contextPageNumbers}
			loading={sourceLoading}
			error={sourcePreviewError}
			compact
		/>
		<div class="flex shrink-0 items-center gap-2 border-t border-base-300 px-4 py-3">
			<p class="text-xs text-base-content/50">
				{selectedTopics.length} of {topics.length} selected
			</p>
			<button
				class="btn btn-primary btn-sm ml-auto rounded-full"
				onclick={() => (topicsOpen = false)}
			>
				Done
			</button>
		</div>
	</div>
	<button
		type="button"
		class="modal-backdrop bg-black/40"
		aria-label="Close"
		onclick={() => (topicsOpen = false)}
	></button>
</dialog>

<dialog class="modal" class:modal-open={mixOpen}>
	<div class="modal-box w-full max-w-lg overflow-hidden rounded-2xl p-0">
		<div class="flex shrink-0 items-center gap-2 border-b border-base-300 px-4 py-3">
			<span
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
			>
				<ListChecks size={15} />
			</span>
			<div class="min-w-0 flex-1">
				<h3 class="text-sm font-semibold leading-tight">Question mix</h3>
				<p class="text-xs text-base-content/50">
					How the {totalRequested} question{totalRequested === 1 ? '' : 's'} are split.
				</p>
			</div>
			<button
				type="button"
				class="btn btn-ghost btn-sm btn-circle"
				aria-label="Close"
				onclick={() => (mixOpen = false)}
			>
				<X size={16} />
			</button>
		</div>

		<div class="max-h-[60vh] overflow-y-auto p-2">
			{#each questionTypes as type (type)}
				{@const definition = questionTypeDefinitions[type]}
				{@const supported =
					sourceMode === 'pages' ||
					topics.some(
						(topic) =>
							selectedTopicIds.has(topic.topicId) && (topic.suggestedTypes?.includes(type) ?? true)
					)}
				<div class="flex items-start gap-3 rounded-xl px-3 py-3">
					<div class="min-w-0 flex-1">
						<p class="text-sm font-medium {supported ? '' : 'text-base-content/50'}">
							{definition.label}
						</p>
						<p class="mt-0.5 text-xs leading-relaxed text-base-content/50">
							{definition.description}
						</p>
						{#if !supported}
							<p class="mt-1 text-xs text-warning">
								None of the selected topics carry evidence for this type.
							</p>
						{/if}
					</div>
					<div class="mt-0.5 shrink-0">
						<QuestionStudioCountStepper
							value={counts[type]}
							max={supported ? maxQuestions - (totalRequested - counts[type]) : counts[type]}
							ariaLabel={`${definition.label} questions`}
							disabled={isGenerating}
							onChange={(value) => onSetCount(type, value)}
						/>
					</div>
				</div>
			{/each}
		</div>

		<div class="flex shrink-0 items-center gap-2 border-t border-base-300 px-4 py-3">
			<p class="text-xs text-base-content/50">
				{totalRequested} question{totalRequested === 1 ? '' : 's'} total
			</p>
			<button class="btn btn-primary btn-sm ml-auto rounded-full" onclick={() => (mixOpen = false)}>
				Done
			</button>
		</div>
	</div>
	<button
		type="button"
		class="modal-backdrop bg-black/40"
		aria-label="Close"
		onclick={() => (mixOpen = false)}
	></button>
</dialog>
