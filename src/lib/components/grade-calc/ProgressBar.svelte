<script lang="ts">
	let { percentage = 0, color = 'info' }: { percentage?: number; color?: string } = $props();
</script>

<div class="w-full">
	<div class="flex justify-between mb-1">
		<span class="text-sm font-medium text-base-content">Progress</span>
		<span class="text-sm font-medium text-base-content">{(percentage ?? 0).toFixed(2)}%</span>
	</div>
	<progress
		class={"progress progress-" + color + " w-full h-4"}
		value={percentage ?? 0}
		max="100"
	/>
</div>


