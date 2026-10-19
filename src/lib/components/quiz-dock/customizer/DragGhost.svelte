<script lang="ts">
	import { scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import SeparatorVertical from '@lucide/svelte/icons/separator-vertical';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { DIVIDER_ID } from '../layouts';
	import { MOTION } from './constants';
	import type { DockCustomizerState } from './dockCustomizer.svelte';

	let { customizer }: { customizer: DockCustomizerState } = $props();
</script>

{#if customizer.drag}
	{@const drag = customizer.drag}
	{@const command = customizer.command(drag.source.id)}
	{@const Icon = drag.source.id === DIVIDER_ID ? SeparatorVertical : command?.icon}
	{@const removing = customizer.removing}
	<div
		class="pointer-events-none fixed left-0 top-0 z-[100]"
		style="transform: translate3d({drag.x}px, {drag.y}px, 0);"
	>
		<div
			class="flex -translate-x-1/2 -translate-y-1/2 -rotate-3 items-center gap-2 whitespace-nowrap rounded-full border bg-background px-3.5 py-2 text-sm font-medium shadow-2xl transition-colors duration-150
				{removing
				? 'border-error/50 text-error-ink'
				: drag.over
					? 'border-primary/50 ring-4 ring-primary/15'
					: 'border-border'}"
			in:scale={{ start: 0.7, duration: 180 * MOTION, easing: backOut }}
			out:scale={customizer.ghostOut}
		>
			{#if removing}
				<Trash2 size={16} />
			{:else if Icon}
				<Icon size={16} />
			{/if}
			{customizer.nameOf(drag.source.id)}
			{#if removing}
				<span class="text-xs font-normal opacity-70">· release to remove</span>
			{/if}
		</div>
	</div>
{/if}
