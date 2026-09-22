<script lang="ts">
	import { acceptanceLevels, type AcceptanceLevel } from '$lib/utils/freeResponse';

	let { level, class: className = '' }: { level: AcceptanceLevel; class?: string } = $props();

	const levels = Object.keys(acceptanceLevels) as AcceptanceLevel[];
	const barHeights = ['h-1.5', 'h-2.5', 'h-3.5'];
	const filled = $derived(levels.indexOf(level) + 1);
</script>

<span class="inline-flex h-3.5 items-end gap-0.5 {className}" aria-hidden="true">
	{#each levels as l, i (l)}
		<span
			class="w-1 rounded-full transition-colors {barHeights[i]} {i < filled
				? 'bg-current'
				: 'bg-base-content/15'}"
		></span>
	{/each}
</span>
