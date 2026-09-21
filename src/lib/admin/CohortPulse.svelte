<script lang="ts">
	// Mastery is an ordinal status ladder, so it reuses the app's existing mastery colors
	// (warning / primary / success) rather than a new ramp. Every band is direct-labelled
	// below the ribbon, so the reading never depends on color alone.
	type Student = {
		_id: string;
		name: string;
		progress: number;
		questionsInteracted: number;
		lastActivityAt: number | null;
	};

	let {
		students = [],
		loading = false,
		onPickBand
	}: {
		students?: Student[];
		loading?: boolean;
		onPickBand?: (band: string | null) => void;
	} = $props();

	const bands = [
		{ id: 'strong', label: 'Strong', hint: '80% and up', fill: 'bg-success', min: 80, max: 101 },
		{ id: 'on-track', label: 'On track', hint: '50–79%', fill: 'bg-primary', min: 50, max: 80 },
		{ id: 'behind', label: 'Behind', hint: '1–49%', fill: 'bg-warning', min: 1, max: 50 },
		{ id: 'none', label: 'Not started', hint: 'No questions tried', fill: 'bg-base-300', min: 0, max: 1 }
	];

	const total = $derived(students.length);
	const segments = $derived(
		bands
			.map((band) => {
				const count = students.filter(
					(student) => student.progress >= band.min && student.progress < band.max
				).length;
				return { ...band, count, share: total ? count / total : 0 };
			})
			.filter((segment) => segment.count > 0)
	);

	const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
	const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
	const activeThisWeek = $derived(
		students.filter((student) => (student.lastActivityAt ?? 0) >= weekAgo).length
	);
	const dormant = $derived(
		students.filter(
			(student) => student.questionsInteracted > 0 && (student.lastActivityAt ?? 0) < monthAgo
		).length
	);
	const neverStarted = $derived(
		students.filter((student) => student.questionsInteracted === 0).length
	);

	let hovered = $state<string | null>(null);
</script>

<section class="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-xs sm:p-5">
	<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
		<h2 class="text-sm font-semibold">Where the cohort stands</h2>
		<p class="text-xs text-base-content/50">
			{total}
			{total === 1 ? 'student' : 'students'} by share of the question bank mastered
		</p>
		<p class="ml-auto text-xs text-base-content/50">
			<span class="font-medium text-base-content/80">{activeThisWeek}</span> active this week
			{#if dormant > 0}
				<span class="mx-1 text-base-content/25">·</span>
				<span class="text-warning">{dormant} gone quiet</span>
			{/if}
		</p>
	</div>

	{#if loading}
		<div class="skeleton mt-3 h-12 w-full rounded-xl"></div>
	{:else if total === 0}
		<p class="mt-4 text-sm text-base-content/50">No students in this cohort yet.</p>
	{:else}
		<div class="mt-3 flex h-12 w-full gap-0.5" role="img" aria-label={ribbonLabel(segments)}>
			{#each segments as segment (segment.id)}
				<button
					type="button"
					class="tooltip tooltip-bottom h-full min-w-1.5 overflow-hidden rounded-md transition {segment.fill} {hovered &&
					hovered !== segment.id
						? 'opacity-45'
						: ''}"
					style="flex: {segment.count} 1 0%"
					data-tip="{segment.label} · {segment.count} of {total} ({Math.round(
						segment.share * 100
					)}%)"
					aria-label="{segment.label}: {segment.count} students"
					onmouseenter={() => (hovered = segment.id)}
					onmouseleave={() => (hovered = null)}
					onfocus={() => (hovered = segment.id)}
					onblur={() => (hovered = null)}
					onclick={() => onPickBand?.(segment.id)}
				></button>
			{/each}
		</div>

		<ul class="mt-3 flex flex-wrap gap-x-5 gap-y-2">
			{#each bands as band (band.id)}
				{@const match = segments.find((segment) => segment.id === band.id)}
				<li class="flex items-baseline gap-2 text-xs">
					<span class="h-2.5 w-2.5 shrink-0 self-center rounded-sm {band.fill}"></span>
					<span class="font-medium">{band.label}</span>
					<span class="tabular-nums text-base-content/70">{match?.count ?? 0}</span>
					<span class="text-base-content/40">{band.hint}</span>
				</li>
			{/each}
			{#if neverStarted > 0}
				<li class="ml-auto text-xs text-base-content/45">
					{neverStarted} have never answered a question
				</li>
			{/if}
		</ul>
	{/if}
</section>

<script lang="ts" module>
	function ribbonLabel(segments: Array<{ label: string; count: number }>): string {
		if (segments.length === 0) return 'No student mastery data';
		return `Cohort mastery: ${segments.map((s) => `${s.label} ${s.count}`).join(', ')}`;
	}
</script>
