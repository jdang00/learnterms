<script lang="ts">
	import { TriangleAlert } from 'lucide-svelte';
	import type { StatItem } from './adminStatStrip';

	let {
		items = [],
		loading = false,
		ariaLabel = 'Summary'
	}: { items?: StatItem[]; loading?: boolean; ariaLabel?: string } = $props();

	const toneText: Record<string, string> = {
		warning: 'text-warning',
		error: 'text-error',
		success: 'text-success'
	};
	const toneFill: Record<string, string> = {
		warning: 'bg-warning',
		error: 'bg-error',
		success: 'bg-success'
	};
</script>

{#if loading}
	<div class="skeleton h-16 w-full rounded-2xl"></div>
{:else}
	<div
		class="flex items-stretch overflow-x-auto rounded-2xl border border-base-300 bg-base-100 px-1 shadow-xs"
		aria-label={ariaLabel}
	>
		{#each items as item (item.label)}
			<div
				class="flex min-w-0 shrink-0 flex-col justify-center border-r border-base-300 px-4 py-2.5 last:border-r-0"
			>
				<span class="flex items-center gap-1 text-[11px] leading-none text-base-content/50">
					{#if item.tone === 'error'}<TriangleAlert size={11} class="text-error" />{/if}
					{item.label}
				</span>
				<span
					class="mt-1.5 text-base font-semibold leading-none tabular-nums {item.tone
						? toneText[item.tone]
						: ''}"
				>
					{item.value}
				</span>
				{#if item.fill !== undefined}
					<span class="mt-1.5 flex h-1 w-full min-w-16 rounded-full bg-base-300" aria-hidden="true">
						<span
							class="h-full rounded-full {item.tone ? toneFill[item.tone] : 'bg-primary'}"
							style="width: {Math.round(Math.min(1, Math.max(0, item.fill)) * 100)}%"
						></span>
					</span>
				{/if}
				{#if item.note}
					<span class="mt-1.5 truncate text-[11px] leading-none text-base-content/40">
						{item.note}
					</span>
				{/if}
			</div>
		{/each}
	</div>
{/if}
