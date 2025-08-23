<script lang="ts">
	let {
		questions,
		handleSelect,
		currentlySelected,
		interactedQuestions = [],
		flags = [],
		qs
	} = $props();

	// Use client-side progress data from QuizState instead of server props
	let reactiveInteractedQuestions = $derived(qs?.liveInteractedQuestions || []);
	let reactiveFlags = $derived(qs?.liveFlaggedQuestions || []);
</script>

<div
	class="flex flex-row w-full overflow-x-auto space-x-4 relative lg:mt-0 items-center mb-6 lg:my-0 border border-base-300 !p-6 rounded-xl"
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
				class="btn btn-circle btn-soft {currentlySelected._id === question._id
					? 'btn-primary'
					: 'btn-outline'} {reactiveInteractedQuestions.includes(question._id) ? 'btn-accent' : ''}"
				onclick={() => handleSelect(question)}>{index + 1}</button
			>
		</div>
	{/each}
</div>
