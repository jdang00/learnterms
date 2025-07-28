<script>
	let { questions, handleSelect, currentlySelected } = $props();
</script>

<div
	class="flex flex-row w-full overflow-x-auto space-x-4 relative mt-6 items-center mb-6 lg:my-0 border border-base-300 p-6 rounded-xl
"
>
	{#each questions.data as question, index (question._id)}
		<button
			class="btn btn-circle btn-soft {currentlySelected._id === question._id
				? 'btn-primary'
				: 'btn-outline'}"
			onclick={() => handleSelect(question)}>{index + 1}</button
		>
	{/each}
</div>
