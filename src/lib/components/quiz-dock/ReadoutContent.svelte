<script lang="ts">
	import { Progress } from '#lib/components/ui/progress/index.js';
	import { scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import type { QuizCommand } from './types';
	import { TONE_TEXT } from './dockStyles';

	let { command }: { command: QuizCommand } = $props();

	const Icon = $derived(command.icon);
	const label = $derived(command.label());
	const caption = $derived(command.caption?.());
	// Readouts without an active state always wear their hue; others light up only when "hot".
	const lit = $derived(command.active ? command.active() : true);
</script>

<Icon
	size={14}
	class="shrink-0 transition-colors {lit ? TONE_TEXT[command.tone] : 'text-foreground/40'}"
	fill={command.active && lit ? 'currentColor' : 'none'}
/>
{#if command.kind === 'meter'}
	<Progress value={command.value?.() ?? 0} tone="success" class="h-1.5 w-12" />
{/if}
{#key label}
	<span
		class="font-semibold text-foreground"
		in:scale={{ start: 0.6, duration: 240, easing: backOut }}>{label}</span
	>
{/key}
{#if caption}
	<span class="text-xs font-normal text-foreground/55">{caption}</span>
{/if}
