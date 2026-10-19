<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { TONE_BADGE } from '../dockStyles';
	import {
		DIVIDER_ID,
		DOCK_PRESETS,
		dockHas,
		homeZoneFor,
		zoneOf,
		type DockConfig
	} from '../layouts';
	import { MINI_DOCK_LIMIT, MOTION } from './constants';
	import { ZONE_NAMES, type DockCustomizerState } from './dockCustomizer.svelte';

	let { customizer, onAdvanced }: { customizer: DockCustomizerState; onAdvanced: () => void } =
		$props();
</script>

{#snippet miniDock(preset: DockConfig)}
	{@const shown = preset.items.slice(0, MINI_DOCK_LIMIT)}
	{@const extra = preset.items.length - shown.length + preset.overflow.length}
	<span class="flex min-w-0 max-w-full items-center gap-1 overflow-hidden">
		{#each shown as item (item.key)}
			{@const command = customizer.command(item.id)}
			{#if item.id === DIVIDER_ID}
				<span class="mx-0.5 h-3.5 w-px shrink-0 bg-foreground/20"></span>
			{:else if command}
				{@const Icon = command.icon}
				<span
					class="grid size-5 shrink-0 place-items-center rounded-full {TONE_BADGE[command.tone]}"
				>
					<Icon size={11} />
				</span>
			{/if}
		{/each}
		{#if extra > 0}
			<span class="ml-0.5 shrink-0 text-[0.65rem] font-medium text-foreground/45">+{extra}</span>
		{/if}
	</span>
{/snippet}

<div in:fade={{ duration: 180 * MOTION }}>
	<div class="mb-2 flex items-baseline justify-between">
		<h3 class="label-caps">Start from</h3>
		{#if !customizer.activePreset}
			<span in:scale={{ duration: 180 * MOTION }}><Badge>Custom layout</Badge></span>
		{/if}
	</div>
	<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
		{#each DOCK_PRESETS as preset, i (preset.id)}
			{@const current = customizer.activePreset === preset.id}
			<button
				type="button"
				class="group relative flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
					{current
					? 'border-primary bg-primary/[0.05] ring-1 ring-primary/30'
					: 'border-border bg-background hover:border-foreground/20'}"
				aria-pressed={current}
				onclick={() => customizer.applyPreset(preset.config)}
				in:fly|global={{
					y: 10,
					duration: 280 * MOTION,
					delay: (60 + i * 40) * MOTION,
					easing: cubicOut
				}}
			>
				<span class="flex w-full items-center justify-between">
					<span class="text-sm font-semibold">{preset.name}</span>
					{#if current}
						<span
							class="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"
							in:scale={{ start: 0.3, duration: 240 * MOTION, easing: backOut }}
						>
							<Check size={11} strokeWidth={3} />
						</span>
					{/if}
				</span>
				{@render miniDock(preset.config)}
				<span class="text-xs text-foreground/55">{preset.description}</span>
			</button>
		{/each}
	</div>

	<h3 class="mb-2 mt-6 label-caps">Quick tools</h3>
	<ul class="divide-y divide-border/70 rounded-2xl border border-border">
		{#each customizer.quickTools as command, i (command.id)}
			{@const on = dockHas(customizer.config, command.id)}
			{@const zone = zoneOf(customizer.config, command.id)}
			{@const Icon = command.icon}
			<li
				in:fly|global={{
					y: 8,
					duration: 260 * MOTION,
					delay: (160 + i * 22) * MOTION,
					easing: cubicOut
				}}
			>
				<label
					class="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
				>
					<span
						class="grid size-8 shrink-0 place-items-center rounded-lg {TONE_BADGE[command.tone]}"
					>
						<Icon size={16} />
					</span>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-1.5 text-sm font-medium">
							{command.name}
							{#if zone === 'overflow' || zone === 'tools'}
								<Badge size="xs">in {ZONE_NAMES[zone]}</Badge>
							{/if}
						</span>
						<span class="block truncate text-xs text-foreground/55">{command.description}</span>
					</span>
					<Switch
						size="sm"
						checked={on}
						onCheckedChange={() => customizer.toggleQuickTool(command.id)}
						aria-label={`Show ${command.name} in ${ZONE_NAMES[zone ?? homeZoneFor(command.id)]}`}
					/>
				</label>
			</li>
		{/each}
	</ul>

	<button
		type="button"
		class="group mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
		onclick={onAdvanced}
	>
		<span class="grid size-8 place-items-center rounded-lg bg-foreground/5 text-foreground/70">
			<SlidersHorizontal size={16} />
		</span>
		<span class="flex-1">
			<span class="block text-sm font-medium">Fine-tune every button</span>
			<span class="block text-xs text-foreground/55"
				>All {customizer.available.length} tools, drag and drop, labels, and dividers</span
			>
		</span>
		<ChevronRight
			size={16}
			class="text-foreground/40 transition-transform group-hover:translate-x-0.5"
		/>
	</button>
</div>
