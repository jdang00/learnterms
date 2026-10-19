<script lang="ts">
	import { DOCK_ISLAND_CLASS, dockGlass } from '#lib/components/quiz-dock/dockStyles.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import type { ReviewState } from './review.svelte';

	let { review }: { review: ReviewState } = $props();
	const atStart = $derived(review.selectedIndex === 0);
	const atEnd = $derived(review.selectedIndex === (review.filteredReviewEntries.length || 1) - 1);
</script>

<!-- Fixed bottom nav bar for review -->
<div class={DOCK_ISLAND_CLASS}>
	<Button
		class={dockGlass('soft')}
		size="sm"
		variant="soft"
		tone="neutral"
		onclick={() => review.showSummary()}
	>
		<BarChart3 size={16} />
		Summary
	</Button>

	<span
		class="mx-1 h-7 w-px shrink-0 bg-linear-to-b from-transparent via-foreground/18 to-transparent"
		aria-hidden="true"
	></span>

	<Button
		class={dockGlass('outline')}
		variant="outline"
		tone="neutral"
		shape="segment-start"
		onclick={() => review.goToAdjacentReviewQuestion(-1)}
		disabled={atStart}
	>
		<ArrowLeft size={18} />
	</Button>
	<Button
		class={dockGlass('outline')}
		variant="outline"
		tone="neutral"
		shape="segment-end"
		onclick={() => review.goToAdjacentReviewQuestion(1)}
		disabled={atEnd}
	>
		<ArrowRight size={18} />
	</Button>
</div>

<!-- Mobile bottom nav for review -->
<div
	class="md:hidden bottom-dock fixed inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-3 pt-2 flex items-center justify-between gap-2"
>
	<Button
		variant="outline"
		tone="neutral"
		class="min-h-11"
		onclick={() => review.goToAdjacentReviewQuestion(-1)}
		disabled={atStart}
	>
		<ArrowLeft size={16} /> Prev
	</Button>
	<Button variant="soft" tone="neutral" class="min-h-11" onclick={() => review.showSummary()}>
		Summary
	</Button>
	<Button
		variant="outline"
		tone="neutral"
		class="min-h-11"
		onclick={() => review.goToAdjacentReviewQuestion(1)}
		disabled={atEnd}
	>
		Next <ArrowRight size={16} />
	</Button>
</div>
