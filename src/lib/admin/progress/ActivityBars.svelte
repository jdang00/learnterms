<script lang="ts">
	type Day = { start: number; tries: number; students: number; isToday: boolean };

	// Students active per day; the readout above carries the exact numbers for the focused day.
	let { days, live = false }: { days: Day[]; live?: boolean } = $props();

	let hovered = $state<number | null>(null);
	const max = $derived(Math.max(1, ...days.map((day) => day.students)));
	const ticks = $derived([max, Math.round(max / 2), 0]);
	const focus = $derived(hovered ?? days.length - 1);

	function dayLabel(start: number, long = false) {
		return new Date(start).toLocaleDateString(undefined, {
			weekday: 'short',
			...(long ? { month: 'short', day: 'numeric' } : {})
		});
	}
</script>

<div>
	<p class="mb-3 min-h-5 text-sm text-muted-foreground" aria-live="polite">
		{#if days[focus]}
			<span class="font-semibold text-foreground tabular-nums">{days[focus].students}</span>
			{days[focus].students === 1 ? 'student' : 'students'} ·
			<span class="text-foreground tabular-nums">{days[focus].tries}</span>
			questions · {days[focus].isToday ? 'Today so far' : dayLabel(days[focus].start, true)}
		{/if}
	</p>
	<div class="flex gap-3">
		<div
			class="flex h-44 flex-col justify-between text-right text-[10px] text-muted-foreground tabular-nums"
			aria-hidden="true"
		>
			{#each ticks as tick, i (i)}<span class="-my-1.5">{tick}</span>{/each}
		</div>
		<div class="relative h-44 flex-1">
			<div
				class="pointer-events-none absolute inset-0 flex flex-col justify-between"
				aria-hidden="true"
			>
				{#each ticks.keys() as i (i)}<span
						class="border-t {i === ticks.length - 1
							? 'border-border'
							: 'border-dashed border-muted-strong'}"
					></span>{/each}
			</div>
			<div
				class="relative flex h-full items-end gap-1"
				role="img"
				aria-label="Students active per day: {days
					.map((day) => `${dayLabel(day.start, true)} ${day.students}`)
					.join(', ')}"
			>
				{#each days as day, i (day.start)}
					<button
						type="button"
						class="flex h-full min-w-0 flex-1 items-end rounded-sm"
						aria-label="{dayLabel(day.start, true)}: {day.students} students, {day.tries} questions"
						onmouseenter={() => (hovered = i)}
						onmouseleave={() => (hovered = null)}
						onfocus={() => (hovered = i)}
						onblur={() => (hovered = null)}
					>
						<span
							class="block w-full rounded-t-md transition-[height,background-color] duration-700 ease-out {day.isToday
								? live
									? 'bg-success'
									: 'bg-primary'
								: hovered === i
									? 'bg-primary'
									: 'bg-primary/45'}"
							style="height: {day.students ? Math.max(3, (day.students / max) * 100) : 0}%"
						></span>
					</button>
				{/each}
			</div>
		</div>
	</div>
	<div class="mt-2 flex gap-1 pl-8 text-[10px] text-muted-foreground" aria-hidden="true">
		{#each days as day, i (day.start)}
			<span
				class="min-w-0 flex-1 truncate text-center {day.isToday
					? 'font-semibold text-foreground'
					: ''}"
				>{day.isToday
					? 'Today'
					: i % 2 === days.length % 2
						? new Date(day.start).toLocaleDateString(undefined, {
								day: 'numeric',
								month: 'numeric'
							})
						: ''}</span
			>
		{/each}
	</div>
</div>
