<script lang="ts">
	// Daily or hourly bars in a small space. The last bar is "now": solid, and live when asked.
	let {
		values,
		live = false,
		label,
		class: className = 'h-7 w-24'
	}: { values: number[]; live?: boolean; label: string; class?: string } = $props();
	const max = $derived(Math.max(1, ...values));
</script>

<span class="flex items-end gap-px {className}" role="img" aria-label={label}>
	{#each values as value, i (i)}
		{@const last = i === values.length - 1}
		<span
			class="min-w-0 flex-1 rounded-[2px] transition-[height] duration-700 ease-out {value
				? last
					? live
						? 'bg-success'
						: 'bg-primary'
					: 'bg-primary/40'
				: 'bg-muted-strong'}"
			style="height: {value ? Math.max(12, (value / max) * 100) : 8}%"
		></span>
	{/each}
</span>
