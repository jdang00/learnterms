<script lang="ts">
    import { Eye } from 'lucide-svelte';
    let { qs = $bindable(), currentlySelected, compact = false } = $props();

    function handleOptionChange(optionId: string) {
        qs.toggleOption(optionId);
        qs.scheduleSave?.();
    }

    function handleEliminateOption(optionId: string) {
        qs.toggleElimination(optionId);
        qs.scheduleSave?.();
    }

</script>

<div class="flex flex-col justify-start {compact ? 'space-y-3' : 'space-y-2 md:space-y-3 lg:space-y-4'}">
	{#each currentlySelected.options as option (option.id)}
        <label
            class="label cursor-pointer rounded-full flex items-center border-base-300 bg-base-200 transition-colors
            {compact ? 'border p-1.5 md:p-2' : 'border-2 p-2 md:p-3'}
            {qs.showSolution ? (qs.isCorrect(option.id) ? 'border-success' : 'border-error') : ''}"
        >
			<input
				type="checkbox"
                class="checkbox checkbox-primary {compact ? 'checkbox-xs' : 'checkbox-sm'} {compact ? 'ms-2 md:ms-3' : 'ms-4'}"
				value={option.id}
				checked={qs.isOptionSelected(option.id)}
				onchange={() => {
					handleOptionChange(option.id);
				}}
				disabled={qs.isOptionEliminated(option.id) || qs.showSolution}
			/>
            <span
                class="flex-grow text-wrap break-words {compact ? 'ml-2 md:ml-3 my-2 md:my-3 text-xs md:text-sm' : 'ml-3 md:ml-4 my-3 text-sm md:text-base'}
                {qs.isOptionEliminated(option.id) ? 'line-through opacity-50' : ''}"
            >
				{option.text}
			</span>

            <div class="flex items-center justify-center {compact ? 'w-10 md:w-12 mr-1 md:mr-2' : 'w-12 md:w-16 mr-2 md:mr-4'}">
				<button
                    class="btn btn-ghost btn-circle {compact ? 'btn-sm' : 'btn-md'}"
					onclick={() => handleEliminateOption(option.id)}
					disabled={qs.showSolution}
					aria-label="eliminate option {option.id}"
				>
					<Eye />
				</button>
			</div>
		</label>
	{/each}
</div>
