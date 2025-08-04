<script lang="ts">
	import { Eye } from 'lucide-svelte';
	let { qs = $bindable(), currentlySelected } = $props();

	function handleOptionChange(optionId: string) {
		qs.toggleOption(optionId);
	}

	function handleEliminateOption(optionId: string) {
		qs.toggleElimination(optionId);
	}
</script>

<div class="flex flex-col justify-start space-y-2 lg:space-y-4">
	{#each currentlySelected.options as option (option.id)}
		<label
			class="label cursor-pointer rounded-full flex items-center border-2 border-base-300 bg-base-200 transition-colors p-2
			{qs.showSolution ? (qs.isCorrect(option.id) ? 'border-success' : 'border-error') : ''}"
		>
			<input
				type="checkbox"
				class="checkbox checkbox-primary checkbox-sm ms-4"
				value={option.id}
				checked={qs.isOptionSelected(option.id)}
				onchange={() => {
					handleOptionChange(option.id);
				}}
				disabled={qs.isOptionEliminated(option.id) || qs.showSolution}
			/>
			<span
				class="flex-grow text-wrap break-words ml-4 my-3 text-base
				{qs.isOptionEliminated(option.id) ? 'line-through opacity-50' : ''}"
			>
				{option.text}
			</span>

			<div class="flex items-center justify-center w-16 mr-4">
				<button
					class="btn btn-ghost btn-circle btn-md"
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
