<script lang="ts">
	import { CircleHelp, TriangleAlert } from 'lucide-svelte';
	import {
		selectedContextSize,
		SOURCE_CONTEXT_TARGET,
		type PageCharacterCount
	} from './sourceContext';

	// How much of the document the agent will read, in pages rather than tokens.
	let {
		pageStats,
		selectedPageNumbers,
		loading = false,
		error = '',
		compact = false,
		track = false
	}: {
		pageStats?: PageCharacterCount[];
		selectedPageNumbers: number[];
		loading?: boolean;
		error?: string;
		compact?: boolean;
		track?: boolean;
	} = $props();

	const size = $derived(selectedContextSize(pageStats ?? [], selectedPageNumbers));
	const known = $derived(Boolean(pageStats) && size.complete && !loading && !error);
	const tooBroad = $derived(known && size.estimatedTokens > SOURCE_CONTEXT_TARGET.max);
	const filled = $derived(
		Math.min(100, (size.estimatedTokens / SOURCE_CONTEXT_TARGET.broad) * 100)
	);
</script>

{#if !error}
	<section
		class="text-xs {compact ? 'border-t border-base-300 px-4 py-2.5' : 'mt-4'}"
		aria-label="Source the agent will read"
	>
		<p class="flex flex-wrap items-center gap-1.5 text-base-content/55" aria-live="polite">
			<span>
				{#if known}
					The agent will read {size.pageCount}
					page{size.pageCount === 1 ? '' : 's'} of this document.
				{:else if loading}
					Measuring how much of this document the agent will read…
				{:else}
					Nothing selected for the agent to read yet.
				{/if}
			</span>
			<a
				href="https://docs.learnterms.com/docs/admin/source-context"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1 text-base-content/45 underline-offset-2 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
			>
				<CircleHelp size={13} />
				How much should I give it?
			</a>
		</p>
		{#if track}
			<div
				class="context-track"
				role="meter"
				aria-label="How much of the document is selected"
				aria-valuemin="0"
				aria-valuemax={SOURCE_CONTEXT_TARGET.broad}
				aria-valuenow={known
					? Math.min(size.estimatedTokens, SOURCE_CONTEXT_TARGET.broad)
					: undefined}
				aria-valuetext={known
					? `${size.pageCount} pages selected. The shaded band is the size that tends to give the sharpest questions.`
					: 'Not measured yet'}
			>
				<div class="target-band"></div>
				<div
					class="context-fill"
					class:broad={tooBroad}
					style:width={`${known ? filled : 0}%`}
				></div>
			</div>
		{/if}

		{#if tooBroad}
			<p class="mt-1.5 flex items-start gap-2 leading-relaxed text-warning">
				<TriangleAlert size={13} class="mt-0.5 shrink-0" />
				<span
					>That's a lot at once, so questions may get shallow. Narrow it down for sharper ones.</span
				>
			</p>
		{/if}
	</section>
{/if}

<style>
	.context-track {
		position: relative;
		height: 7px;
		margin: 7px 0 2px;
		border-radius: 99px;
		overflow: hidden;
		background: var(--color-base-300);
	}
	.target-band {
		position: absolute;
		inset-block: 0;
		left: 15%;
		width: 35%;
		background: color-mix(in oklab, var(--color-primary) 15%, var(--color-base-200));
		border-inline: 1px solid color-mix(in oklab, var(--color-primary) 35%, transparent);
	}
	.context-fill {
		position: relative;
		height: 100%;
		border-radius: inherit;
		background: var(--color-primary);
		transition: width 160ms ease;
	}
	.context-fill.broad {
		background: var(--color-warning);
	}
	@media (prefers-reduced-motion: reduce) {
		.context-fill {
			transition: none;
		}
	}
</style>
