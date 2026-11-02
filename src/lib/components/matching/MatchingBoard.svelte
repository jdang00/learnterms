<script lang="ts" module>
	export type BoardRow = { id: string; prompt: string };
</script>

<script lang="ts" generics="Row extends BoardRow">
	import type { Snippet } from 'svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import CornerDownRight from '@lucide/svelte/icons/corner-down-right';
	import { cn } from '#lib/utils.js';

	// Prompt chips on the left, answer slots on the right. One grid for every row, so the chips
	// share a width however long the answers get. Below `sm` each answer drops under its prompt.
	let {
		rows,
		answer,
		label = 'Matching pairs',
		class: className
	}: {
		rows: Row[];
		answer: Snippet<[Row, number]>;
		label?: string;
		class?: string;
	} = $props();
</script>

<ol
	aria-label={label}
	class={cn(
		'grid w-full gap-x-3 gap-y-4 sm:grid-cols-[fit-content(42%)_auto_minmax(0,1fr)] sm:gap-y-3',
		className
	)}
>
	{#each rows as row, i (row.id)}
		<li class="grid gap-1.5 sm:col-span-3 sm:grid-cols-subgrid sm:items-center">
			<div
				class="flex min-h-12 items-center rounded-3xl border-2 border-border bg-muted px-4 py-2.5 sm:min-w-40"
			>
				<span
					class="min-w-0 text-sm font-semibold leading-snug wrap-break-word text-foreground/70 md:text-base"
					>{row.prompt}</span
				>
			</div>
			<ArrowRight size={16} class="hidden text-foreground/40 sm:block" aria-hidden="true" />
			<div class="flex min-w-0 items-start gap-1.5">
				<CornerDownRight
					size={16}
					class="mt-4 ms-3 shrink-0 text-foreground/30 sm:hidden"
					aria-hidden="true"
				/>
				<div class="min-w-0 flex-1">{@render answer(row, i)}</div>
			</div>
		</li>
	{/each}
</ol>
