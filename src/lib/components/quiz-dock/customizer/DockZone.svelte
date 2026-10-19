<script lang="ts">
	import { flip } from 'svelte/animate';
	import { scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import { buttonVariants } from '$lib/components/ui/button';
	import ReadoutContent from '../ReadoutContent.svelte';
	import { dockButtonClass, READOUT_CLASS, segmentShape, isPassive } from '../dockStyles';
	import { DIVIDER_ID, displayFor } from '../layouts';
	import { MOTION } from './constants';
	import type { DockCustomizerState } from './dockCustomizer.svelte';

	let { customizer }: { customizer: DockCustomizerState } = $props();
	const preview = $derived(customizer.preview);
</script>

<div
	bind:this={customizer.itemsZone}
	style="--segment-gap: {preview === 'desktop' ? '0.5rem' : '0.25rem'}"
	class="flex min-h-14 flex-wrap items-center justify-center border bg-background/95 py-3 backdrop-blur transition-all duration-300
		{preview === 'desktop'
		? 'min-w-[14rem] max-w-full gap-2 rounded-full px-4 shadow-lg'
		: 'w-full max-w-[21rem] gap-1 rounded-2xl px-2 shadow-lg'}
		{customizer.drag?.over?.zone === 'items'
		? 'border-primary/60 ring-4 ring-primary/15'
		: 'border-border'}"
	role="list"
	aria-label="Dock preview"
>
	{#each customizer.itemsView as entry (entry.kind === 'chip' ? entry.value.key : 'placeholder')}
		<div
			class="flex"
			role="listitem"
			animate:flip={{ duration: 220 * MOTION, easing: cubicOut }}
			in:scale={{ start: 0.5, duration: 280 * MOTION, easing: backOut }}
		>
			{#if entry.kind === 'placeholder'}
				<span class="h-8 w-10 rounded-full border-2 border-dashed border-primary/50 bg-primary/10"
				></span>
			{:else}
				{@const item = entry.value}
				{@const command = customizer.command(item.id)}
				{@const display = displayFor(item.id, item.display, preview)}
				{@const isSelected =
					customizer.selected?.zone === 'items' && customizer.selected.key === item.key}
				{@const ring = isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
				{@const contextual = command?.visible?.() === false}
				{@const hiddenOnPhone = item.id === DIVIDER_ID && preview === 'mobile'}
				{@const inMoreOnPhone = customizer.foldedOnPhone.includes(item.key)}
				<button
					type="button"
					data-chip
					class="touch-none select-none cursor-grab active:cursor-grabbing {item.id === DIVIDER_ID
						? `flex h-8 w-4 items-center justify-center rounded-full ${ring} ${hiddenOnPhone ? 'opacity-30' : ''}`
						: isPassive(command)
							? `${READOUT_CLASS} ${ring}`
							: command
								? `${dockButtonClass(command, {
										display,
										shape: segmentShape(customizer.itemIds, entry.index),
										active: command.active?.() ?? false
									})} ${ring}`
								: `${buttonVariants({ variant: 'dash', tone: 'neutral', size: 'sm' })} ${ring}`}
						{contextual || inMoreOnPhone
						? 'outline-1 outline-dashed outline-offset-2 outline-foreground/30'
						: ''}
						{inMoreOnPhone ? 'opacity-45' : ''}"
					title={hiddenOnPhone
						? 'Divider · hidden on phones'
						: inMoreOnPhone
							? `${customizer.nameOf(item.id)} · in More on phones`
							: contextual
								? `${customizer.nameOf(item.id)} · appears when available`
								: customizer.nameOf(item.id)}
					aria-label={`${customizer.nameOf(item.id)}${isSelected ? ', selected' : ''}`}
					aria-pressed={isSelected}
					onpointerdown={(event) =>
						customizer.handlePointerDown(
							event,
							{ from: 'items', id: item.id, index: entry.index, display: item.display },
							true
						)}
					onclick={() => customizer.toggleSelected('items', item.key)}
					onkeydown={(event) => customizer.handleChipKeydown(event, 'items', item.key)}
				>
					{#if item.id === DIVIDER_ID}
						<span class="h-6 w-px bg-foreground/25"></span>
					{:else if command && isPassive(command)}
						<ReadoutContent {command} />
					{:else if command}
						{@const Icon =
							command.active?.() && command.activeIcon ? command.activeIcon : command.icon}
						{#if display !== 'label'}<Icon size={18} />{/if}
						{#if display !== 'icon'}{command.label()}{/if}
					{:else}
						{customizer.nameOf(item.id)}
					{/if}
				</button>
			{/if}
		</div>
	{:else}
		<span class="px-2 text-sm text-foreground/50">Drop tools here</span>
	{/each}
</div>
