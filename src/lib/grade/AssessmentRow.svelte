<script lang="ts">
	import type { Assessment } from '$lib/models';
	import { Trash2 } from 'lucide-svelte';

	export let assessment: Assessment;
	export let onRemove: () => void;
</script>

<div class="flex items-center gap-2">
	<input
		type="number"
		placeholder="Score"
		class="input input-sm input-bordered w-full"
		bind:value={assessment.score}
		min="0"
		max={assessment.total ?? undefined}
		aria-label="Assessment score"
	/>
	<span class="font-bold">/</span>
	<input
		type="number"
		placeholder="Total"
		class="input input-sm input-bordered w-full"
		bind:value={assessment.total}
		min="1"
		aria-label="Assessment total"
	/>
	<button
		class="btn btn-xs btn-ghost text-error hover:bg-error/10"
		on:click={onRemove}
		aria-label="Remove assessment"
	>
		<Trash2 size={14} />
	</button>
</div>
