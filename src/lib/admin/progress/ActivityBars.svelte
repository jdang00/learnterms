<script lang="ts">
	type Day = { start: number; tries: number; students: number; isToday: boolean };

	let { days, metric }: { days: Day[]; metric: 'tries' | 'students' } = $props();

	let hovered = $state<number | null>(null);
	const values = $derived(days.map((day) => (metric === 'tries' ? day.tries : day.students)));
	const max = $derived(Math.max(1, ...values));
	const ticks = $derived([max, Math.round(max / 2), 0]);
	const focus = $derived(hovered ?? days.length - 1);
	const unit = $derived(metric === 'tries' ? 'questions tried' : 'active students');

	function dayLabel(start: number, long = false) {
		return new Date(start).toLocaleDateString(undefined, {
			weekday: 'short',
			...(long ? { month: 'short', day: 'numeric' } : {})
		});
	}
</script>

<div>
	<p class="mb-3 h-5 text-sm text-base-content/60" aria-live="polite">
		{#if days[focus]}
			<span class="font-semibold text-base-content tabular-nums">{values[focus]}</span>
			{unit} · {days[focus].isToday ? 'Today so far' : dayLabel(days[focus].start, true)}
		{/if}
	</p>
	<div class="flex gap-3">
		<div
			class="flex h-44 flex-col justify-between text-right text-[10px] tabular-nums text-base-content/40"
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
							? 'border-base-300'
							: 'border-dashed border-base-200'}"
					></span>{/each}
			</div>
			<div
				class="relative flex h-full items-end gap-0.5"
				role="img"
				aria-label="Daily {unit}: {days
					.map((day, i) => `${dayLabel(day.start, true)} ${values[i]}`)
					.join(', ')}"
			>
				{#each days as day, i (day.start)}
					<button
						type="button"
						class="group flex h-full min-w-0 flex-1 items-end rounded-sm"
						aria-label="{dayLabel(day.start, true)}: {values[i]} {unit}"
						onmouseenter={() => (hovered = i)}
						onmouseleave={() => (hovered = null)}
						onfocus={() => (hovered = i)}
						onblur={() => (hovered = null)}
					>
						<span
							class="block w-full rounded-t transition-all duration-500 {day.isToday
								? 'bg-primary'
								: 'bg-primary/55'} {hovered === i ? 'bg-primary! ' : ''}"
							style="height: {values[i] ? Math.max(3, (values[i] / max) * 100) : 0}%"
						></span>
					</button>
				{/each}
			</div>
		</div>
	</div>
	<div class="mt-2 flex gap-0.5 pl-8 text-[10px] text-base-content/45" aria-hidden="true">
		{#each days as day, i (day.start)}
			<span
				class="min-w-0 flex-1 truncate text-center {day.isToday
					? 'font-semibold text-primary'
					: ''}"
				>{i % 2 === days.length % 2 || day.isToday
					? day.isToday
						? 'Today'
						: new Date(day.start).toLocaleDateString(undefined, {
								day: 'numeric',
								month: 'numeric'
							})
					: ''}</span
			>
		{/each}
	</div>
</div>
