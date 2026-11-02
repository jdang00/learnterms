<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';
	import Minus from '@lucide/svelte/icons/minus';
	import X from '@lucide/svelte/icons/x';
	import { Tip } from '#lib/components/ui/tooltip/index.js';
	import type { MatchStatus } from '#lib/utils/matching.js';

	// A revealed answer chip, shaped like the picker it replaces so revealing barely reflows the
	// board. A miss shows the pick as its struck letter (full text on hover) and then the key, so the
	// chip holds one answer's text; without letters the pick's text is struck inline instead.
	// Without a status it shows the key alone (admin preview).
	let {
		chosen,
		correct,
		status,
		chosenLetter,
		correctLetter
	}: {
		chosen?: string;
		correct?: string;
		status?: MatchStatus;
		chosenLetter?: string;
		correctLetter?: string;
	} = $props();

	const tone = $derived<MatchStatus | undefined>(status ?? (correct ? 'correct' : undefined));
	const CHIP: Record<MatchStatus, string> = {
		correct: 'border-success bg-success/10',
		incorrect: 'border-error bg-error/10',
		unanswered: 'border-dashed border-warning bg-warning/10'
	};
	const MARK: Record<MatchStatus, string> = {
		correct: 'bg-success text-success-foreground',
		incorrect: 'bg-error text-error-foreground',
		unanswered: 'bg-warning text-warning-foreground'
	};
	const LETTER =
		'inline-grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1 text-[0.6875rem] font-semibold tabular-nums';
</script>

{#snippet letter(value: string | undefined, className: string)}
	{#if value}<span class="{LETTER} {className}" aria-hidden="true">{value}</span>{/if}
{/snippet}

<div
	class="flex min-h-12 items-start gap-2.5 rounded-3xl border-2 py-2.5 ps-4 pe-3 text-sm leading-snug {tone
		? CHIP[tone]
		: 'border-dashed border-border'}"
>
	{#if status === 'incorrect' && chosenLetter}
		<Tip label="Your answer: {chosen}">
			<span class="{LETTER} mt-px bg-error/15 text-error-ink">{chosenLetter}</span>
		</Tip>
	{:else if status === 'unanswered'}
		{@render letter('–', 'mt-px bg-warning/20 text-warning-ink')}
	{:else if status !== 'incorrect'}
		{@render letter(chosenLetter ?? correctLetter, 'mt-px bg-success/15 text-success-ink')}
	{/if}

	<p class="min-w-0 flex-1 self-center wrap-break-word">
		{#if !status}
			<span class={correct ? 'text-foreground' : 'text-muted-foreground italic'}>
				{correct ?? 'No match'}
			</span>
		{:else if status === 'correct'}
			<span class={chosen ? 'text-foreground' : 'text-success-ink italic'}>
				{chosen ?? 'No match'}
			</span>
		{:else}
			{#if status === 'incorrect' && chosenLetter}
				<span class="sr-only">Your answer: {chosen}.</span>
			{:else if status === 'incorrect'}
				<span class="text-error-ink line-through decoration-error/60"
					><span class="sr-only">Your answer: </span>{chosen}</span
				>
			{:else}
				<span class="sr-only">No answer.</span>
			{/if}
			<ArrowRight
				size={14}
				class="mx-1 inline-block align-[-2px] text-foreground/40"
				aria-hidden="true"
			/>{@render letter(correctLetter, 'me-1.5 align-[1px] bg-success/15 text-success-ink')}<span
				class="font-medium text-success-ink"
				><span class="sr-only">Correct answer: </span>{correct ?? 'No match'}</span
			>
		{/if}
	</p>

	{#if tone}
		<span
			class="mt-px grid size-5 shrink-0 place-items-center rounded-full {MARK[tone]}"
			aria-hidden="true"
		>
			{#if tone === 'incorrect'}
				<X size={12} strokeWidth={3} />
			{:else if tone === 'unanswered'}
				<Minus size={12} strokeWidth={3} />
			{:else}
				<Check size={12} strokeWidth={3} />
			{/if}
		</span>
	{/if}
</div>
