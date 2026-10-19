<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.js';
	import { toneVars, type Tone } from '../tone.js';

	// A ring that fills clockwise in the tone, with its label in the middle. Size with `size-*`.
	let {
		value,
		max = 100,
		thickness = 4,
		tone = 'primary',
		label = 'Progress',
		class: className,
		children
	}: {
		value: number;
		max?: number;
		thickness?: number;
		tone?: Tone;
		label?: string;
		class?: string;
		children?: Snippet;
	} = $props();

	const percent = $derived(Math.max(0, Math.min(100, (value / (max || 1)) * 100)));
</script>

<span
	data-slot="radial-progress"
	class={cn(
		'relative grid size-12 shrink-0 place-items-center rounded-full font-semibold tabular-nums text-(--tone-ink)',
		toneVars[tone],
		className
	)}
	style:background="conic-gradient(var(--tone) {percent}%, color-mix(in oklab, var(--foreground)
	10%, transparent) 0)"
	role="progressbar"
	aria-label={label}
	aria-valuemin={0}
	aria-valuemax={max}
	aria-valuenow={value}
>
	<span class="absolute rounded-full bg-background" style:inset="{thickness}px"></span>
	<span class="relative">{@render children?.()}</span>
</span>
