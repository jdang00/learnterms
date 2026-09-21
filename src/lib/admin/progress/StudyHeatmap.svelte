<script lang="ts">
	let { cells }: { cells: number[][] } = $props();

	const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const levels = ['bg-base-200', 'bg-primary/20', 'bg-primary/40', 'bg-primary/65', 'bg-primary'];
	let hovered = $state<{ day: number; hour: number } | null>(null);

	const max = $derived(Math.max(0, ...cells.flat()));
	const peak = $derived.by(() => {
		let best = { day: 0, hour: 0, value: 0 };
		cells.forEach((row, day) =>
			row.forEach((value, hour) => {
				if (value > best.value) best = { day, hour, value };
			})
		);
		return best;
	});

	function level(value: number) {
		if (!value || !max) return 0;
		return Math.min(4, Math.ceil((value / max) * 4));
	}
	function hourLabel(hour: number) {
		const suffix = hour < 12 ? 'am' : 'pm';
		return `${hour % 12 || 12}${suffix}`;
	}
</script>

<div>
	<p class="mb-3 h-5 text-sm text-base-content/60" aria-live="polite">
		{#if hovered}
			<span class="font-semibold text-base-content tabular-nums"
				>{cells[hovered.day][hovered.hour]}</span
			>
			questions · {weekdays[hovered.day]}s {hourLabel(hovered.hour)}–{hourLabel(
				(hovered.hour + 1) % 24
			)}
		{:else if peak.value}
			Busiest: <span class="font-semibold text-base-content"
				>{weekdays[peak.day]}s around {hourLabel(peak.hour)}</span
			>
		{:else}
			No study sessions recorded in this window.
		{/if}
	</p>
	<div class="overflow-x-auto">
		<div
			class="grid min-w-[520px] grid-cols-[2.25rem_repeat(24,minmax(0,1fr))] gap-[3px]"
			role="img"
			aria-label="Questions tried by weekday and hour of day"
		>
			{#each cells as row, day (day)}
				<span class="self-center text-[10px] text-base-content/50">{weekdays[day]}</span>
				{#each row as value, hour (hour)}
					<span
						class="aspect-square rounded-[3px] transition-colors {levels[
							level(value)
						]} {hovered?.day === day && hovered?.hour === hour
							? 'ring-2 ring-base-content/60'
							: ''}"
						onmouseenter={() => (hovered = { day, hour })}
						onmouseleave={() => (hovered = null)}
						role="presentation"
					></span>
				{/each}
			{/each}
			<span></span>
			{#each Array.from({ length: 24 }, (_, hour) => hour) as hour (hour)}
				<span class="text-center text-[9px] text-base-content/40"
					>{hour % 6 === 0 ? hourLabel(hour) : ''}</span
				>
			{/each}
		</div>
	</div>
	<div class="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-base-content/45">
		Less {#each levels as fill (fill)}<span class="h-2.5 w-2.5 rounded-[3px] {fill}"></span>{/each} More
	</div>
</div>
