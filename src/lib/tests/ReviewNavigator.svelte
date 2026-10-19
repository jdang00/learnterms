<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { isUnansweredItem } from './results';
	import type { ReviewState } from './review.svelte';

	let { review }: { review: ReviewState } = $props();
	let questionButtons = $state<HTMLElement[]>([]);

	$effect(() => {
		if (!review.scrollRequest) return;
		const index = review.selectedIndex;
		requestAnimationFrame(() => {
			questionButtons[index]?.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
				inline: 'center'
			});
		});
	});
</script>

<div class="flex flex-wrap gap-2 mb-3">
	<Button
		size="sm"
		variant={review.reviewFilter === 'all' ? 'soft' : 'ghost'}
		tone={review.reviewFilter === 'all' ? 'primary' : 'neutral'}
		class={review.reviewFilter === 'all' ? '' : 'border border-border'}
		onclick={() => review.setReviewFilter('all')}
	>
		All ({review.reviewFilterCounts.all})
	</Button>
	<Button
		size="sm"
		variant={review.reviewFilter === 'flagged' ? 'solid' : 'ghost'}
		tone={review.reviewFilter === 'flagged' ? 'warning' : 'neutral'}
		class={review.reviewFilter === 'flagged' ? '' : 'border border-border'}
		onclick={() => review.setReviewFilter('flagged')}
	>
		Flagged ({review.reviewFilterCounts.flagged})
	</Button>
	<Button
		size="sm"
		variant={review.reviewFilter === 'unanswered' ? 'soft' : 'ghost'}
		tone={review.reviewFilter === 'unanswered' ? 'info' : 'neutral'}
		class={review.reviewFilter === 'unanswered' ? '' : 'border border-border'}
		onclick={() => review.setReviewFilter('unanswered')}
	>
		Unanswered ({review.reviewFilterCounts.unanswered})
	</Button>
	<Button
		size="sm"
		variant={review.reviewFilter === 'incorrect' ? 'soft' : 'ghost'}
		tone={review.reviewFilter === 'incorrect' ? 'error' : 'neutral'}
		class={review.reviewFilter === 'incorrect' ? '' : 'border border-border'}
		onclick={() => review.setReviewFilter('incorrect')}
	>
		Incorrect only ({review.reviewFilterCounts.incorrect})
	</Button>
</div>

{#if review.filteredReviewEntries.length === 0}
	<div class="surface p-5 text-sm text-foreground/60">
		No questions match this filter.
		<Button
			variant="ghost"
			tone="neutral"
			size="xs"
			class="ml-2"
			onclick={() => review.setReviewFilter('all')}
		>
			Show all
		</Button>
	</div>
{:else}
	<!-- Horizontal question navigator -->
	<div
		class="flex flex-row w-full overflow-x-auto overflow-y-hidden whitespace-nowrap space-x-4 relative items-center border border-border px-6 py-3 rounded-4xl h-20 min-h-20 max-h-20 flex-none"
	>
		{#each review.filteredReviewEntries as entry, idx (entry.item._id)}
			{@const item = entry.item}
			{@const isCorrect = item.score?.isCorrect === true}
			{@const unanswered = isUnansweredItem(item)}
			{@const navSelected = idx === review.selectedIndex}
			<div class="relative inline-flex">
				{#if item.response?.isFlagged}
					<span
						class="absolute start-0 top-0 z-[1] inline-block size-2.5 rounded-full bg-warning -translate-x-1/4 -translate-y-1/4"
					></span>
				{/if}
				<Button
					bind:ref={questionButtons[idx]}
					variant={unanswered && !navSelected ? 'outline' : 'soft'}
					tone={navSelected ? 'primary' : unanswered ? 'neutral' : isCorrect ? 'success' : 'error'}
					shape="circle"
					size="md"
					onclick={() => review.goToReviewQuestion(idx)}
					title={`Question ${entry.originalIndex + 1} - ${isCorrect ? 'Correct' : unanswered ? 'Skipped' : 'Incorrect'}`}
				>
					{entry.originalIndex + 1}
				</Button>
			</div>
		{/each}
	</div>
{/if}
