<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Check from '@lucide/svelte/icons/check';
	import Minus from '@lucide/svelte/icons/minus';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Kbd } from '#lib/components/ui/kbd/index.js';
	import { DIVIDER_ID, dockHas } from '../layouts';
	import { MOTION } from './constants';
	import type { DockCustomizerState } from './dockCustomizer.svelte';

	let { customizer, onBack }: { customizer: DockCustomizerState; onBack: () => void } = $props();
</script>

<div in:fade={{ duration: 180 * MOTION }}>
	<Button
		variant="ghost"
		tone="neutral"
		size="xs"
		class="-ml-2 mb-3 text-foreground/60"
		onclick={onBack}
	>
		<ArrowLeft size={13} /> Presets and quick tools
	</Button>
	{#each customizer.palette as section (section.title)}
		<h3 class="mb-2 mt-4 label-caps">
			{section.title}
		</h3>
		<div class="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3">
			{#each section.entries as entry, i (entry.id)}
				{@const added = entry.id !== DIVIDER_ID && dockHas(customizer.config, entry.id)}
				{@const lifted =
					customizer.drag?.source.from === 'palette' && customizer.drag.source.id === entry.id}
				{@const Icon = entry.icon}
				<button
					type="button"
					class="group relative flex select-none [-webkit-touch-callout:none] items-center gap-3 rounded-2xl border p-2.5 text-left transition-all duration-200 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md
						{added
						? 'border-primary/30 bg-primary/[0.04]'
						: 'border-border bg-background hover:border-foreground/20'}
						{lifted ? 'scale-95 opacity-40' : ''}"
					aria-pressed={added}
					aria-label={`${entry.name}: ${entry.description}. ${added ? 'Added, activate to remove' : 'Activate to add'}`}
					onpointerdown={(event) =>
						customizer.handlePointerDown(event, { from: 'palette', id: entry.id }, false)}
					onclick={() => customizer.togglePaletteEntry(entry.id)}
					in:fly|global={{
						y: 10,
						duration: 280 * MOTION,
						delay: (40 + (section.offset + i) * 14) * MOTION,
						easing: cubicOut
					}}
				>
					<span
						class="grid size-9 shrink-0 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-110 {entry.badge}"
					>
						<Icon size={18} />
					</span>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-1.5 text-sm font-medium">
							<span class="truncate">{entry.name}</span>
							{#if entry.shortcut}
								<Kbd class="shrink-0 opacity-70">{entry.shortcut}</Kbd>
							{/if}
						</span>
						<span class="block truncate text-xs text-foreground/55">{entry.description}</span>
					</span>
					{#if added}
						<span
							class="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm ring-2 ring-background"
							in:scale={{ start: 0.3, duration: 260 * MOTION, easing: backOut }}
						>
							<Check size={11} strokeWidth={3} class="group-hover:hidden" />
							<Minus size={11} strokeWidth={3} class="hidden group-hover:block" />
						</span>
					{/if}
				</button>
			{/each}
		</div>
	{/each}
</div>
