<script lang="ts">
	let { questions, handleSelect, currentlySelected, qs } = $props();

	let reactiveInteractedQuestions = $derived(qs?.liveInteractedQuestions || []);
	let reactiveFlags = $derived(qs?.liveFlaggedQuestions || []);
</script>

<div
	class="flex flex-row w-full overflow-x-auto overflow-y-hidden whitespace-nowrap space-x-4 relative items-center border border-base-300 px-6 py-3 rounded-4xl h-20 min-h-20 max-h-20 flex-none"
>
	{#each questions.data as question, index (question._id)}
		<div class="indicator">
			{#if reactiveFlags.includes(question._id)}
				<span
					class="indicator-item indicator-start badge badge-warning badge-xs translate-x-[-1/4] translate-y-[-1/4] z-[1]"
				></span>
			{/if}
			<button
				bind:this={qs.questionButtons[index]}
				class="btn btn-circle btn-md btn-soft {currentlySelected._id === question._id
					? 'btn-primary'
					: 'btn-outline'} {reactiveInteractedQuestions.includes(question._id) ? 'btn-accent' : ''}"
				onclick={() => handleSelect(question)}>{index + 1}</button
			>
		</div>
	{/each}
</div>
