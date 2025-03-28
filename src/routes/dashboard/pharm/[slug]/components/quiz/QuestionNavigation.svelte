<script>
	let { qm } = $props();
</script>

<!-- Question Selection Menu -->
<div class="flex flex-row w-full mb-4 overflow-x-auto lg:mb-0 lg:mt-6 space-x-2 relative">
	{#key qm.fm.flagCount}
		{#each qm.getCurrentQuestionIds() as id, index (id)}
			<div class="indicator">
				{#if qm.fm.flags.has(id)}
					<span
						class="indicator-item indicator-start badge badge-warning badge-xs !right-10 translate-x-1/4 translate-y-1/4"
					></span>
				{/if}
				<button
					class="btn btn-circle btn-soft mx-2 {qm.currentlySelectedId === id
						? 'btn-primary'
						: 'btn-outline'} {qm.selectedAnswers[id]?.selected?.size > 0 ? 'btn-accent' : ''}"
					aria-label="question {index + 1}"
					onclick={() => qm.changeSelected(id)}
					bind:this={qm.questionButtons[index]}
				>
					{index + 1}
				</button>
			</div>
		{/each}
	{/key}
</div>
