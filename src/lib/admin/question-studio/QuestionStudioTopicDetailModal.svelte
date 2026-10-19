<script lang="ts">
	import { questionTypeLabel } from './questionStudioTypes';
	import type { TopicMapItem } from './questionStudioTypes';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';

	interface Props {
		detailTopic?: TopicMapItem | null;
	}

	let { detailTopic = $bindable<TopicMapItem | null>(null) }: Props = $props();
</script>

{#if detailTopic}
	{@const topic = detailTopic}
	<Dialog.Root
		open
		onOpenChange={(open) => {
			if (!open) detailTopic = null;
		}}
	>
		<Dialog.Content showCloseButton={false} class="gap-0 rounded-2xl sm:max-w-lg">
			<div class="mb-4 flex items-start justify-between gap-3">
				<Dialog.Title class="text-base leading-normal font-semibold">{topic.title}</Dialog.Title>
				<div class="flex shrink-0 gap-1.5">
					<Badge>Pages {topic.pageNumbers.join(', ')}</Badge>
					<Badge variant="outline">
						up to {topic.estimatedQuestionCapacity}
					</Badge>
				</div>
			</div>
			<p class="text-sm leading-relaxed text-foreground/70">{topic.summary}</p>
			<p class="mt-3 text-xs text-foreground/60">
				{topic.suggestedTypes
					? `Suggested types: ${topic.suggestedTypes.map(questionTypeLabel).join(', ')}`
					: 'Question type suitability is checked during drafting and review.'}
			</p>
			{#if topic.keyTerms.length > 0}
				<div class="mt-4">
					<p class="mb-1.5 text-xs font-medium text-foreground/50">Key terms</p>
					<div class="flex flex-wrap gap-1.5">
						{#each topic.keyTerms as term (term)}
							<Badge>{term}</Badge>
						{/each}
					</div>
				</div>
			{/if}
			<Dialog.Footer class="mt-6">
				<Button size="sm" variant="soft" tone="neutral" onclick={() => (detailTopic = null)}
					>Close</Button
				>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
