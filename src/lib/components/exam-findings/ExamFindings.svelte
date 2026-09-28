<script lang="ts">
	import type { ExamFinding, ExamFindingSize } from '$lib/examFindings/findings';
	import { buildExamFindingView, laneSpan, packLanes } from '$lib/examFindings/view';
	import ExamFindingCard from './ExamFindingCard.svelte';

	let {
		findings,
		compact = false,
		class: className = '',
		reveal = true,
		onOpen
	}: {
		findings?: ExamFinding[];
		compact?: boolean;
		class?: string;
		// Pass false while the question is unanswered so pattern quizzes don't give the answer away.
		reveal?: boolean;
		// Makes each box a button (the curator preview opens it in the editor).
		onOpen?: (index: number) => void;
	} = $props();

	// Before the container is measured (server render), boxes wrap in rows.
	const BASIS: Record<ExamFindingSize, string> = {
		small: 'grow-0 self-start basis-full @xs:basis-[calc((100%-var(--gap))/2)] @xl:basis-48',
		half: 'grow basis-full @2xl:basis-[calc((100%-var(--gap))/2)]',
		full: 'grow basis-full'
	};

	const views = $derived(
		(findings ?? []).flatMap((finding, index) => {
			const view = buildExamFindingView(finding);
			return view ? [{ view, index }] : [];
		})
	);

	const gap = $derived(compact ? 8 : 12);
	let width = $state(0);
	let heights = $state<number[]>([]);
	// Lanes are at least 10rem (9rem compact) wide, so small boxes pair up even on phones.
	const lanes = $derived(
		width
			? Math.max(
					1,
					Math.min(compact ? 6 : 4, Math.floor((width + gap) / ((compact ? 144 : 160) + gap)))
				)
			: 0
	);
	const spans = $derived(views.map(({ view }) => laneSpan(view.size, lanes)));
	// Boxes are placed once every height is known; until then they flow as a plain grid.
	const places = $derived(
		lanes && views.every((_, i) => heights[i] > 0)
			? packLanes(
					spans.map((span, i) => ({ span, height: Math.ceil(heights[i]) + gap })),
					lanes
				)
			: null
	);

	function boxStyle(i: number) {
		if (!lanes) return undefined;
		const place = places?.[i];
		return place
			? `grid-column: ${place.lane + 1} / span ${spans[i]}; grid-row: ${place.top + 1} / span ${Math.ceil(heights[i]) + gap};`
			: `grid-column: span ${spans[i]};`;
	}
</script>

{#if views.length}
	<div class="@container my-4 {className}">
		<section
			aria-label="Exam findings"
			bind:clientWidth={width}
			class="text-sm {compact ? '[--gap:0.5rem]' : '[--gap:0.75rem]'} {lanes
				? 'grid items-start gap-x-(--gap)'
				: 'flex flex-wrap gap-(--gap)'}"
			style={lanes
				? `grid-template-columns: repeat(${lanes}, minmax(0, 1fr)); ${places ? 'grid-auto-rows: 1px; margin-bottom: calc(-1 * var(--gap));' : 'row-gap: var(--gap);'}`
				: undefined}
		>
			{#each views as { view, index }, i (index)}
				<div class="min-w-0 {lanes ? '' : BASIS[view.size]}" style={boxStyle(i)}>
					<div
						bind:clientHeight={heights[i]}
						class="relative {lanes ? '' : 'h-full'} {onOpen
							? 'rounded-2xl transition-shadow hover:ring-2 hover:ring-primary/25'
							: ''}"
					>
						<ExamFindingCard
							{view}
							{compact}
							{reveal}
							class="{lanes ? '' : 'h-full'} {onOpen ? 'pointer-events-none' : ''}"
						/>
						{#if onOpen}
							<button
								type="button"
								class="absolute inset-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
								aria-label="Edit {view.title}"
								title="Edit {view.title}"
								onclick={() => onOpen(index)}
							></button>
						{/if}
					</div>
				</div>
			{/each}
		</section>
	</div>
{/if}
