<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import type { AttemptRunnerState } from './attempt.svelte';

	let { runner }: { runner: AttemptRunnerState } = $props();
	let questionButtons = $state<HTMLElement[]>([]);

	$effect(() => {
		if (!runner.scrollRequest) return;
		const index = runner.currentIndex;
		requestAnimationFrame(() => {
			questionButtons[index]?.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
				inline: 'center'
			});
		});
	});
</script>

<!-- Horizontal question navigator (matches QuizNavigation style) -->
<div
	class="hidden lg:flex flex-row w-full overflow-x-auto overflow-y-hidden whitespace-nowrap space-x-4 relative items-center border border-border px-6 py-3 rounded-4xl h-20 min-h-20 max-h-20 flex-none"
>
	{#each runner.bundle?.items ?? [] as item, index (item._id)}
		{@const r = runner.responses[item._id]}
		{@const answered = runner.isAnswered(item)}
		{@const current = index === runner.currentIndex}
		<div class="relative inline-flex">
			{#if r?.isFlagged}
				<span
					class="absolute start-0 top-0 z-[1] inline-block size-2.5 rounded-full bg-warning -translate-x-1/4 -translate-y-1/4"
				></span>
			{/if}
			<Button
				bind:ref={questionButtons[index]}
				variant={current || answered ? 'soft' : 'outline'}
				tone={current ? 'primary' : answered ? 'accent' : 'neutral'}
				shape="circle"
				size="md"
				onclick={() => runner.jumpToQuestion(index)}
				title={`Question ${index + 1}`}
			>
				{index + 1}
			</Button>
		</div>
	{/each}
</div>
