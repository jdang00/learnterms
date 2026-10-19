<script lang="ts">
	import { flip } from 'svelte/animate';
	import { scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import { TONE_BADGE } from '../dockStyles';
	import { MOTION } from './constants';
	import type { DockCustomizerState } from './dockCustomizer.svelte';

	let { customizer }: { customizer: DockCustomizerState } = $props();
	const phone = $derived(customizer.preview === 'mobile');
	const tileSize = $derived(phone ? 'h-14 w-[4.5rem]' : 'h-12 w-14');
</script>

<div
	bind:this={customizer.toolsZone}
	class="mx-auto w-full rounded-2xl border bg-background/95 p-2 shadow-lg backdrop-blur transition-all duration-200
		{phone ? 'max-w-[21rem] pt-1.5' : ''}
		{customizer.drag?.over?.zone === 'tools'
		? 'border-primary/60 ring-4 ring-primary/15'
		: 'border-border'}"
>
	{#if phone}
		<span class="mx-auto mb-1.5 block h-1 w-8 rounded-full bg-muted-strong"></span>
		<div class="mb-1.5 px-0.5 text-xs font-semibold">Tools</div>
	{:else}
		<div class="mb-1 flex items-center justify-between px-0.5 label-caps">
			Tools
			<SlidersHorizontal size={10} />
		</div>
	{/if}
	<div class="flex flex-wrap gap-1" role="list" aria-label="Tools bar preview">
		{#each customizer.toolsView as entry (entry.kind === 'chip' ? entry.value : 'placeholder')}
			<div
				class="flex"
				role="listitem"
				animate:flip={{ duration: 220 * MOTION, easing: cubicOut }}
				in:scale={{ start: 0.6, duration: 260 * MOTION, easing: backOut }}
			>
				{#if entry.kind === 'placeholder'}
					<span class="{tileSize} rounded-xl border-2 border-dashed border-primary/50 bg-primary/10"
					></span>
				{:else}
					{@const id = entry.value}
					{@const command = customizer.command(id)}
					{@const Icon = command?.icon}
					{@const isSelected =
						customizer.selected?.zone === 'tools' && customizer.selected.key === id}
					<button
						type="button"
						data-chip
						class="flex {tileSize} touch-none select-none cursor-grab flex-col items-center justify-center gap-0.5 rounded-xl text-[0.6rem] font-semibold shadow-xs ring-1 ring-inset ring-current/20 transition active:cursor-grabbing hover:ring-current/40 {command
							? TONE_BADGE[command.tone]
							: 'bg-background'}
						{isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}"
						aria-label={`${customizer.nameOf(id)}${isSelected ? ', selected' : ''}`}
						aria-pressed={isSelected}
						onpointerdown={(event) =>
							customizer.handlePointerDown(
								event,
								{ from: 'tools', id, index: entry.index, display: 'icon' },
								true
							)}
						onclick={() => customizer.toggleSelected('tools', id)}
						onkeydown={(event) => customizer.handleChipKeydown(event, 'tools', id)}
					>
						{#if Icon}<Icon size={16} />{/if}
						<span class="max-w-full truncate px-1">{command?.name ?? id}</span>
					</button>
				{/if}
			</div>
		{:else}
			<span
				class="flex min-h-12 w-full items-center justify-center rounded-xl border border-dashed border-border px-2 text-center text-[0.68rem] text-foreground/45"
			>
				Drop study tools here
			</span>
		{/each}
	</div>
</div>
