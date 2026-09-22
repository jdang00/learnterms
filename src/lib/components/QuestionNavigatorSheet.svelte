<script lang="ts" module>
	export type NavigatorStatus = 'mastered' | 'correct' | 'incorrect' | 'answered' | 'unanswered';
	export type NavigatorItem = { id: string; status: NavigatorStatus; flagged: boolean };
</script>

<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import Sheet from './Sheet.svelte';

	let {
		open = $bindable(false),
		title = 'Questions',
		description,
		items,
		currentIndex,
		onselect,
		filters,
		footer
	}: {
		open?: boolean;
		title?: string;
		description?: string;
		items: NavigatorItem[];
		currentIndex: number;
		onselect: (index: number) => void;
		filters?: Snippet;
		footer?: Snippet;
	} = $props();

	let grid = $state<HTMLOListElement>();

	const CELL: Record<NavigatorStatus, string> = {
		mastered: 'bg-emerald-800 text-white',
		correct: 'bg-success/20 text-success',
		incorrect: 'bg-warning/25 text-base-content',
		answered: 'bg-accent/20 text-base-content',
		unanswered: 'bg-base-200 text-base-content/70'
	};
	const LEGEND: Record<NavigatorStatus, string> = {
		mastered: 'Mastered',
		correct: 'Correct',
		incorrect: 'Needs review',
		answered: 'Answered',
		unanswered: 'Not answered'
	};

	const present = $derived(
		(Object.keys(LEGEND) as NavigatorStatus[]).filter((status) =>
			items.some((item) => item.status === status)
		)
	);
	const anyFlagged = $derived(items.some((item) => item.flagged));

	$effect(() => {
		if (!open) return;
		void tick().then(() =>
			grid?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'center' })
		);
	});

	function choose(index: number) {
		open = false;
		onselect(index);
	}
</script>

<Sheet bind:open {title} {description} expandable {footer}>
	{#if filters}
		<div class="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1">
			{@render filters()}
		</div>
	{/if}

	{#if items.length}
		<ol
			bind:this={grid}
			class="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2 py-1"
			aria-label="{title}: tap one to open it"
		>
			{#each items as item, index (item.id)}
				<li>
					<button
						type="button"
						class="relative grid h-11 w-full place-items-center rounded-xl text-sm font-semibold tabular-nums transition-transform active:scale-95 {CELL[
							item.status
						]} {index === currentIndex
							? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100'
							: ''}"
						aria-current={index === currentIndex}
						aria-label="Question {index + 1}, {LEGEND[item.status].toLowerCase()}{item.flagged
							? ', flagged'
							: ''}"
						onclick={() => choose(index)}
					>
						{index + 1}
						{#if item.flagged}
							<span
								class="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-warning ring-2 ring-base-100"
								aria-hidden="true"
							></span>
						{/if}
					</button>
				</li>
			{/each}
		</ol>
	{:else}
		<p class="py-6 text-center text-sm text-base-content/60">No questions match this filter.</p>
	{/if}

	{#if present.length > 1 || anyFlagged}
		<ul
			class="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-base-content/60"
			aria-hidden="true"
		>
			{#each present as status (status)}
				<li class="flex items-center gap-1.5">
					<span class="size-3 rounded-[4px] {CELL[status]}"></span>{LEGEND[status]}
				</li>
			{/each}
			{#if anyFlagged}
				<li class="flex items-center gap-1.5">
					<span class="size-2.5 rounded-full bg-warning"></span>Flagged
				</li>
			{/if}
		</ul>
	{/if}
</Sheet>
