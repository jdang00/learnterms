<script lang="ts">
	import { flip } from 'svelte/animate';
	import { scale, slide } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import ArrowUpWideNarrow from '@lucide/svelte/icons/arrow-up-wide-narrow';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { MOTION } from './constants';
	import type { DockCustomizerState } from './dockCustomizer.svelte';

	let { customizer }: { customizer: DockCustomizerState } = $props();
	const moreOpen = $derived(customizer.moreOpen);
</script>

<div
	bind:this={customizer.overflowZone}
	class="transition-all duration-200
		{moreOpen ? 'w-full max-w-md surface p-2.5' : 'self-center rounded-full border'}
		{customizer.drag?.over?.zone === 'overflow'
		? 'scale-[1.02] border-primary/60 ring-4 ring-primary/15'
		: moreOpen
			? 'border-border'
			: 'border-transparent'}"
>
	<button
		type="button"
		class="flex items-center gap-1.5 rounded-full text-xs font-medium text-foreground/55 transition-colors hover:text-foreground
			{moreOpen ? 'mb-2 px-1' : 'px-3 py-1.5 hover:bg-foreground/5'}"
		aria-expanded={moreOpen}
		aria-controls="dock-more-menu"
		onclick={() => customizer.toggleMore()}
	>
		<ArrowUpWideNarrow size={13} />
		More menu
		{#if customizer.config.overflow.length}
			<Badge size="xs">{customizer.config.overflow.length}</Badge>
		{/if}
		{#if moreOpen}
			<span class="font-normal text-foreground/40">· tucked behind one button</span>
		{/if}
		<ChevronDown
			size={13}
			class="transition-transform duration-200 {moreOpen ? 'rotate-180' : ''}"
		/>
	</button>
	{#if moreOpen}
		<div
			id="dock-more-menu"
			class="flex min-h-8 flex-wrap gap-1.5"
			role="list"
			aria-label="More menu preview"
			transition:slide={{ duration: 180 * MOTION, easing: cubicOut }}
		>
			{#each customizer.overflowView as entry (entry.kind === 'chip' ? entry.value : 'placeholder')}
				<div
					class="flex"
					role="listitem"
					animate:flip={{ duration: 220 * MOTION, easing: cubicOut }}
					in:scale={{ start: 0.6, duration: 260 * MOTION, easing: backOut }}
				>
					{#if entry.kind === 'placeholder'}
						<span class="h-8 w-20 rounded-lg border-2 border-dashed border-primary/50 bg-primary/10"
						></span>
					{:else}
						{@const id = entry.value}
						{@const command = customizer.command(id)}
						{@const Icon = command?.icon}
						{@const isSelected =
							customizer.selected?.zone === 'overflow' && customizer.selected.key === id}
						<button
							type="button"
							data-chip
							class="inline-flex h-8 touch-none select-none cursor-grab items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium shadow-xs transition active:cursor-grabbing hover:border-foreground/25
								{command?.tone === 'error' ? 'text-error-ink' : ''}
								{isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}"
							aria-label={`${customizer.nameOf(id)}${isSelected ? ', selected' : ''}`}
							aria-pressed={isSelected}
							onpointerdown={(event) =>
								customizer.handlePointerDown(
									event,
									{ from: 'overflow', id, index: entry.index, display: 'icon' },
									true
								)}
							onclick={() => customizer.toggleSelected('overflow', id)}
							onkeydown={(event) => customizer.handleChipKeydown(event, 'overflow', id)}
						>
							{#if Icon}<Icon size={14} />{/if}
							{customizer.nameOf(id)}
						</button>
					{/if}
				</div>
			{:else}
				<span
					class="flex h-8 w-full items-center justify-center rounded-lg border border-dashed border-border text-xs text-foreground/45"
				>
					Drop tools here to tuck them away
				</span>
			{/each}
		</div>
	{/if}
</div>
