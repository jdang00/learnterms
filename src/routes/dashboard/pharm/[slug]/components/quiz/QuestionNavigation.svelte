<script>
	let { qm = $bindable() } = $props();
</script>

<div
	class="
    flex flex-row w-full overflow-x-auto
    space-x-4
    relative
    items-center
    bg-transparent mt-2 mb-6 lg:my-0
  "
>
	{#key qm.fm.flagCount}
		{#each qm.getCurrentQuestionIds() as id, index (id)}
			<div class="indicator">
				{#if qm.fm.flags.has(id)}
					<span
						class="indicator-item indicator-start badge badge-warning badge-xs !right-10 translate-x-1/4 translate-y-1/4 z-[1]"
					></span>
				{/if}
				<button
					class="
            btn btn-circle btn-soft
            {qm.currentlySelectedId === id ? 'btn-primary' : 'btn-outline'}
            {qm.selectedAnswers[id]?.selected?.size > 0 ? 'btn-accent' : ''}
          "
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
