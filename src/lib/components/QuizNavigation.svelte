<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	let { questions, handleSelect, currentlySelected, qs } = $props();

	let reactiveInteractedQuestions = $derived(qs?.liveInteractedQuestions || []);
	let reactiveFlags = $derived(qs?.liveFlaggedQuestions || []);
</script>

<div
	class="flex flex-row w-full overflow-x-auto overflow-y-hidden whitespace-nowrap space-x-4 relative items-center border border-border px-6 py-3 rounded-4xl h-20 min-h-20 max-h-20 flex-none"
>
	{#each questions.data as question, index (question._id)}
		<div class="relative inline-flex">
			{#if reactiveFlags.includes(question._id)}
				<Badge
					variant="solid"
					tone="warning"
					size="xs"
					class="absolute top-0 left-0 z-[1] -translate-x-1/2 -translate-y-1/2"
				></Badge>
			{/if}
			<Button
				bind:ref={qs.questionButtons[index]}
				variant="soft"
				shape="circle"
				tone={reactiveInteractedQuestions.includes(question._id)
					? 'accent'
					: currentlySelected._id === question._id
						? 'primary'
						: 'neutral'}
				onclick={() => handleSelect(question)}>{index + 1}</Button
			>
		</div>
	{/each}
</div>
