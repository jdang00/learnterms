<script>
	import { Eye } from 'lucide-svelte';
	let { qm = $bindable(), option, index } = $props();
</script>

<label
	class="label cursor-pointer rounded-full flex items-center border-2 border-base-300 bg-base-200 transition-colors p-2
  {qm.showSolution ? (option.isCorrect ? 'border-success' : 'border-error') : ''}"
>
	<input
		type="checkbox"
		class="checkbox checkbox-primary checkbox-sm ms-4"
		checked={option.isSelected}
		onclick={() => qm.toggleOption(index)}
		disabled={option.isEliminated || qm.showSolution}
	/>
	<span
		class="flex-grow text-wrap break-words ml-4 my-3 text-base
    {option.isEliminated ? 'line-through opacity-50' : ''}"
	>
		{option.text}
	</span>
	<div class="flex items-center justify-center w-16 mr-4">
		<button
			class="btn btn-ghost btn-circle btn-md"
			onclick={() => qm.toggleElimination(index)}
			disabled={qm.showSolution}
			aria-label="eliminate option {option.letter}"
		>
			<Eye />
		</button>
	</div>
</label>
