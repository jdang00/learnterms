<script lang="ts">
	import { ChevronRight, Trophy, RotateCcw } from 'lucide-svelte';
	import { scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import type { ModuleSummary } from '$lib/utils/moduleCompletion';

	let {
		summary,
		onclick,
		onreset,
		currentId,
		compact = false
	}: {
		summary: ModuleSummary;
		onclick: () => void;
		onreset: () => void;
		currentId?: string;
		compact?: boolean;
	} = $props();

	const pct = (n: number) => (summary.total ? (n / summary.total) * 100 : 0);
	const motion = { duration: () => (prefersReducedMotion.current ? 0 : 600), easing: cubicOut };
	const correctWidth = Tween.of(() => pct(summary.correct), motion);
	const reviewWidth = Tween.of(() => pct(summary.incorrect), motion);
	const cellClass = {
		mastered: 'bg-emerald-800',
		correct: 'bg-success/60',
		incorrect: 'bg-warning/70',
		unanswered: 'bg-base-content/10'
	} as const;
	const pop = { duration: 260, start: 0.4, easing: backOut };
</script>

<button
	type="button"
	class="group block w-full rounded-2xl border border-base-300 text-left text-sm shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-base-200/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0 {compact
		? 'px-3 py-2.5'
		: 'p-4'}"
	{onclick}
	aria-label={`Module progress: ${summary.answered} of ${summary.total} answered, ${summary.correct} correct, ${summary.incorrect} need review. Open progress overview`}
>
	<span class="mb-2 flex items-center justify-between gap-2">
		<span class="tabular-nums">
			<span class="font-semibold text-base-content">{summary.answered}</span>
			<span class="text-base-content/60">of {summary.total} answered</span>
		</span>
		<span class="inline-flex items-center gap-1 text-xs text-base-content/60">
			{#if summary.isMastered}
				<span class="inline-flex items-center gap-1 font-semibold text-success"
					><Trophy size={12} /> Mastered</span
				>
			{:else if compact && summary.incorrect}
				<span class="tabular-nums">{summary.incorrect} to review</span>
			{/if}
			<ChevronRight
				size={14}
				class="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
			/>
		</span>
	</span>

	<span
		class="flex h-1.5 w-full overflow-hidden rounded-full bg-base-content/10"
		aria-hidden="true"
	>
		<span class="h-full bg-success" style:width="{correctWidth.current}%"></span>
		<span class="h-full bg-warning" style:width="{reviewWidth.current}%"></span>
	</span>

	{#if !compact && summary.total}
		<span
			class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(10px,1fr))] gap-[3px]"
			aria-hidden="true"
		>
			{#each summary.results as result (result.questionId)}
				<span
					class="relative aspect-square rounded-[3px] {result.questionId === currentId
						? 'ring-2 ring-base-content/70 ring-offset-1 ring-offset-base-100'
						: ''}"
				>
					{#key result.status}
						<span
							class="absolute inset-0 rounded-[inherit] {cellClass[result.status]}"
							in:scale={prefersReducedMotion.current ? { duration: 0 } : pop}
						></span>
					{/key}
					{#if result.flagged}<span
							class="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-primary ring-1 ring-base-100"
						></span>{/if}
				</span>
			{/each}
		</span>

		<span
			class="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-base-content/60 tabular-nums"
			aria-hidden="true"
		>
			<span class="inline-flex items-center gap-1.5"
				><span class="size-2 rounded-full bg-success"></span>{summary.correct} correct</span
			>
			<span class="inline-flex items-center gap-1.5"
				><span class="size-2 rounded-sm bg-emerald-800"></span>{summary.mastered} mastered</span
			>
			{#if summary.incorrect}
				<span class="inline-flex items-center gap-1.5"
					><span class="size-2 rounded-full bg-warning"></span>{summary.incorrect} needs review</span
				>
			{/if}
		</span>
	{/if}
</button>

{#if summary.isComplete}
	<button
		type="button"
		class="btn btn-ghost btn-xs mt-2 w-full rounded-full text-base-content/65"
		onclick={onreset}><RotateCcw size={12} /> Reset module</button
	>
{/if}
