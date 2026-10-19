<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CloudOff from '@lucide/svelte/icons/cloud-off';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as ButtonGroup from '#lib/components/ui/button-group/index.js';
	import { isPassive } from '../dockStyles';
	import { DIVIDER_ID } from '../layouts';
	import { DISPLAY_OPTIONS, MOTION } from './constants';
	import { ZONE_NAMES, type DockCustomizerState } from './dockCustomizer.svelte';

	let { customizer, syncError }: { customizer: DockCustomizerState; syncError: boolean } = $props();
</script>

<div class="flex min-h-9 items-center justify-center text-center">
	{#if customizer.selection}
		{@const selection = customizer.selection}
		{@const canOverflow = customizer.acceptsOverflow(selection.id)}
		{@const isReadout = isPassive(customizer.command(selection.id))}
		<div
			class="flex flex-wrap items-center justify-center gap-2 rounded-full border border-border bg-background px-2 py-1 shadow-sm"
			in:fly={{ y: 6, duration: 200 * MOTION, easing: cubicOut }}
		>
			<span class="px-2 text-sm font-medium">{customizer.nameOf(selection.id)}</span>
			{#if selection.zone === 'items' && selection.id !== DIVIDER_ID && !isReadout}
				{#if customizer.preview === 'mobile' && selection.id !== 'check'}
					<span class="text-xs text-foreground/50">Icon only on phones</span>
				{:else}
					<ButtonGroup.Root role="group" aria-label="Button style">
						{#each DISPLAY_OPTIONS as [value, text] (value)}
							<Button
								size="xs"
								variant={selection.display === value ? 'solid' : 'ghost'}
								tone={selection.display === value ? 'primary' : 'neutral'}
								aria-pressed={selection.display === value}
								onclick={() => customizer.setDisplay(value)}>{text}</Button
							>
						{/each}
					</ButtonGroup.Root>
				{/if}
			{/if}
			<div class="flex items-center">
				<Button
					variant="ghost"
					tone="neutral"
					size="xs"
					shape="circle"
					aria-label="Move earlier"
					tooltip="Move earlier (←)"
					disabled={selection.index === 0}
					onclick={() => customizer.moveSelected(-1)}><ChevronLeft size={14} /></Button
				>
				<Button
					variant="ghost"
					tone="neutral"
					size="xs"
					shape="circle"
					aria-label="Move later"
					tooltip="Move later (→)"
					disabled={selection.index ===
						(selection.zone === 'items'
							? customizer.config.items.length
							: customizer.config[selection.zone].length) -
							1}
					onclick={() => customizer.moveSelected(1)}><ChevronRight size={14} /></Button
				>
			</div>
			{#if selection.id !== DIVIDER_ID}
				{#each ['tools', 'items', 'overflow'] as const as zone (zone)}
					{#if zone !== selection.zone && (zone !== 'overflow' || canOverflow)}
						<Button
							variant="ghost"
							tone="neutral"
							size="xs"
							onclick={() => customizer.moveToZone(zone)}
						>
							Move to {ZONE_NAMES[zone]}
						</Button>
					{/if}
				{/each}
			{/if}
			<Button
				variant="ghost"
				tone="error"
				size="xs"
				shape="circle"
				aria-label="Remove"
				tooltip="Remove (Delete)"
				onclick={() => customizer.removeSelected()}><Trash2 size={14} /></Button
			>
		</div>
	{:else if customizer.foldedNames.length}
		<p
			class="rounded-full bg-warning/15 px-3 py-1 text-xs text-foreground/80"
			in:fade={{ duration: 150 * MOTION }}
		>
			Phones keep one row, so {new Intl.ListFormat('en', { type: 'conjunction' }).format(
				customizer.foldedNames
			)}
			{customizer.foldedNames.length === 1 ? 'moves' : 'move'} into More there.
		</p>
	{:else if syncError}
		<p
			class="flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs text-foreground/80"
		>
			<CloudOff size={13} class="text-warning" /> Saved on this device. It will sync once you're back
			online.
		</p>
	{:else}
		<p class="text-xs text-foreground/45">
			{customizer.preview === 'mobile'
				? 'Phones show one row of icons: Check stretches, and previous and next sit together on the right.'
				: 'Drag to reorder. Tap a tool to fine-tune it.'}
		</p>
	{/if}
</div>
