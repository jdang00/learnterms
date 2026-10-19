<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Info from '@lucide/svelte/icons/info';
	import X from '@lucide/svelte/icons/x';
	import QuestionStudioContextMeter from './QuestionStudioContextMeter.svelte';
	import QuestionStudioCountStepper from './QuestionStudioCountStepper.svelte';
	import type { SourcePreviewBatch } from '../source/sourceContext';
	import type { SourceMode } from '../../../convex/questionStudio/pageSelection';
	import type { QuestionType, TopicMapItem } from './questionStudioTypes';
	import { questionTypes, questionTypeDefinitions } from './questionStudioTypes';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	interface Props {
		topicsOpen?: boolean;
		mixOpen?: boolean;
		topicSearch?: string;
		detailTopic?: TopicMapItem | null;
		topics: TopicMapItem[];
		selectedTopicIds: Set<string>;
		sourcePreview: SourcePreviewBatch | null;
		contextPageNumbers: number[];
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

<Dialog.Root bind:open={topicsOpen}>
	<Dialog.Content
		class="flex h-[75vh] w-full flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl"
		showCloseButton={false}
	>
		<div class="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
			<div class="min-w-0 flex-1">
				<h3 class="text-sm font-semibold leading-tight">Topics</h3>
				<p class="text-xs text-foreground/50">The agent writes only from the topics you keep.</p>
			</div>
			<Button
				variant="ghost"
				tone="neutral"
				shape="circle"
				size="sm"
				aria-label="Close"
				onclick={() => (topicsOpen = false)}
			>
				<X size={16} />
			</Button>
		</div>

		<div class="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
			<Input
				type="text"
				placeholder="Search topics..."
				class="h-8 min-w-0 flex-1 px-3 text-sm"
				bind:value={topicSearch}
			/>
			<Button variant="ghost" tone="neutral" size="sm" onclick={() => onSetAllTopics(true)}>
				All
			</Button>
			<Button variant="ghost" tone="neutral" size="sm" onclick={() => onSetAllTopics(false)}>
				None
			</Button>
		</div>

		<ul class="min-h-0 flex-1 overflow-y-auto p-2">
			{#each searchedTopics as topic (topic.topicId)}
				{@const selected = selectedTopicIds.has(topic.topicId)}
				<li class="flex items-start gap-1">
					<button
						type="button"
						class="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-muted/60"
						onclick={() => onToggleTopic(topic.topicId)}
					>
						<span
							class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border {selected
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border'}"
						>
							{#if selected}<Check size={10} />{/if}
						</span>
						<span class="min-w-0 flex-1">
							<span class="flex flex-wrap items-baseline gap-x-2">
								<span class="text-sm font-medium {selected ? '' : 'text-foreground/60'}">
									{topic.title}
								</span>
								{#if topic.pageNumbers.length}
									<span class="font-mono text-[11px] text-foreground/35">
										pp. {topic.pageNumbers.slice(0, 4).join(', ')}{topic.pageNumbers.length > 4
											? '…'
											: ''}
									</span>
								{/if}
							</span>
							{#if topic.summary}
								<span class="mt-0.5 block text-xs leading-relaxed text-foreground/45">
									{topic.summary}
								</span>
							{/if}
						</span>
					</button>
					<Button
						variant="ghost"
						tone="neutral"
						shape="circle"
						size="xs"
						class="mt-2 shrink-0 text-foreground/35 hover:text-foreground/70"
						tooltip="Topic details"
						aria-label="Topic details"
						onclick={() => (detailTopic = topic)}
					>
						<Info size={13} />
					</Button>
				</li>
			{:else}
				<li class="px-3 py-10 text-center text-sm text-foreground/45">
					{topicSearch.trim()
						? `No topics match “${topicSearch.trim()}”`
						: 'No topics were found in this source.'}
				</li>
			{/each}
		</ul>

		<QuestionStudioContextMeter
			pageStats={sourcePreview?.pageCharacterCounts}
			selectedPageNumbers={contextPageNumbers}
			loading={!sourcePreview}
			compact
		/>
		<div class="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3">
			<p class="text-xs text-foreground/50">
				{selectedTopics.length} of {topics.length} selected
			</p>
			<Button size="sm" class="ml-auto" onclick={() => (topicsOpen = false)}>Done</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={mixOpen}>
	<Dialog.Content
		class="w-full gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg"
		showCloseButton={false}
	>
		<div class="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
			<div class="min-w-0 flex-1">
				<h3 class="text-sm font-semibold leading-tight">Question mix</h3>
				<p class="text-xs text-foreground/50">
					How the {totalRequested} question{totalRequested === 1 ? '' : 's'} are split.
				</p>
			</div>
			<Button
				variant="ghost"
				tone="neutral"
				shape="circle"
				size="sm"
				aria-label="Close"
				onclick={() => (mixOpen = false)}
			>
				<X size={16} />
			</Button>
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
						<p class="text-sm font-medium {supported ? '' : 'text-foreground/50'}">
							{definition.label}
						</p>
						<p class="mt-0.5 text-xs leading-relaxed text-foreground/50">
							{definition.description}
						</p>
						{#if !supported}
							<p class="mt-1 text-xs text-warning-ink">
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

		<div class="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3">
			<p class="text-xs text-foreground/50">
				{totalRequested} question{totalRequested === 1 ? '' : 's'} total
			</p>
			<Button size="sm" class="ml-auto" onclick={() => (mixOpen = false)}>Done</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
