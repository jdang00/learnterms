<script lang="ts">
	import { CircleHelp } from 'lucide-svelte';
	import {
		selectedContextSize,
		SOURCE_CONTEXT_TARGET,
		type PageCharacterCount
	} from './sourceContext';
	let {
		pageStats,
		selectedPageNumbers,
		loading = false,
		error = '',
		compact = false
	}: {
		pageStats?: PageCharacterCount[];
		selectedPageNumbers: number[];
		loading?: boolean;
		error?: string;
		compact?: boolean;
	} = $props();
	const size = $derived(selectedContextSize(pageStats ?? [], selectedPageNumbers));
	const known = $derived(Boolean(pageStats) && size.complete && !loading && !error);
	const status = $derived(
		!selectedPageNumbers.length
			? 'No context selected'
			: size.estimatedTokens < SOURCE_CONTEXT_TARGET.min
				? 'Small selection'
				: size.estimatedTokens <= SOURCE_CONTEXT_TARGET.max
					? 'Focused selection'
					: size.estimatedTokens <= SOURCE_CONTEXT_TARGET.broad
						? 'Broad selection'
						: 'Consider splitting'
	);
	const filled = $derived(
		Math.min(100, (size.estimatedTokens / SOURCE_CONTEXT_TARGET.broad) * 100)
	);
	const amount = $derived(size.estimatedTokens.toLocaleString('en-US'));
</script>

<section class="context-meter" class:compact aria-label="Selected source context">
	<div class="flex items-center justify-between gap-3 text-xs">
		<div class="flex items-center gap-1.5 text-base-content/60">
			<span>Context</span>
			<a
				href="https://docs.learnterms.com/docs/admin/source-context"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="About source context"
				title="About source context"
				class="rounded-full p-1 text-base-content/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
				><CircleHelp size={13} /></a
			>
		</div>
		<span
			aria-live="polite"
			class="font-medium tabular-nums"
			title={error || 'Estimated source tokens'}
		>
			{#if known}~{amount} tokens{:else if loading}Measuring…{:else}Unavailable{/if}
		</span>
	</div>
	<div
		class="context-track"
		role="meter"
		aria-label="Selected source tokens; suggested range 3,000 to 10,000"
		aria-valuemin="0"
		aria-valuemax={SOURCE_CONTEXT_TARGET.broad}
		aria-valuenow={known ? Math.min(size.estimatedTokens, SOURCE_CONTEXT_TARGET.broad) : undefined}
		aria-valuetext={known
			? `Approximately ${amount} source tokens. ${status}. Suggested range 3,000 to 10,000; not a hard limit.`
			: 'Estimate unavailable'}
	>
		<div class="target-band"></div>
		<div
			class="context-fill"
			class:broad={size.estimatedTokens > SOURCE_CONTEXT_TARGET.max}
			style:width={`${known ? filled : 0}%`}
		></div>
	</div>
</section>

<style>
	.context-meter {
		flex-shrink: 0;
		margin-top: 16px;
		padding: 8px 12px;
		border: 1px solid var(--color-base-300);
		border-radius: 12px;
		background: color-mix(in oklab, var(--color-base-200) 35%, transparent);
	}
	.context-meter.compact {
		margin: 0;
		padding: 10px 20px;
		border: 0;
		border-radius: 0;
	}
	.context-track {
		position: relative;
		height: 7px;
		margin: 5px 0 2px;
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
