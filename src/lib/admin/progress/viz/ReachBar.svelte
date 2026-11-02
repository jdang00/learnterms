<script lang="ts">
	// How much of the cohort a module has reached: ever (light) and in the chosen window (solid).
	let {
		reach,
		inWindow,
		total,
		live = false
	}: { reach: number; inWindow: number; total: number; live?: boolean } = $props();
	const width = (count: number) => (total > 0 ? Math.min(100, (count / total) * 100) : 0);
</script>

<span class="relative block h-1.5 w-full overflow-hidden rounded-full bg-muted-strong">
	<span
		class="absolute inset-y-0 left-0 rounded-full bg-primary/25 transition-[width] duration-700"
		style="width: {width(reach)}%"
	></span>
	<span
		class="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 {live
			? 'bg-success'
			: 'bg-primary'}"
		style="width: {width(inWindow)}%"
	></span>
</span>
