<script lang="ts">
	let {
		questions,
		handleSelect,
		currentlySelected,
		interactedQuestions = [],
		flags = [],
		qs
	} = $props();
</script>

<div
	class="flex flex-row w-full overflow-x-auto space-x-4 relative mt-6 lg:mt-0 items-center mb-6 lg:my-0 border border-base-300 !p-6 rounded-xl"
>
	{#each questions.data as question, index (question._id)}
		<div class="indicator">
			{#if flags.includes(question._id)}
				<span
					class="indicator-item indicator-start badge badge-warning badge-xs translate-x-[-1/4] translate-y-[-1/4] z-[1]"
				></span>
			{/if}
			<button
				bind:this={qs.questionButtons[index]}
				class="btn btn-circle btn-soft {currentlySelected._id === question._id
					? 'btn-primary'
					: 'btn-outline'} {interactedQuestions.includes(question._id)
					? 'btn-accent'
					: ''}"
				onclick={() => handleSelect(question)}>{index + 1}</button
			>
		</div>
	{/each}
</div>