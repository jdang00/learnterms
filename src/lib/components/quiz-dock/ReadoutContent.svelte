<script lang="ts">
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
	class="shrink-0 transition-colors {lit ? TONE_TEXT[command.tone] : 'text-base-content/40'}"
	fill={command.active && lit ? 'currentColor' : 'none'}
/>
{#if command.kind === 'meter'}
	<progress
		class="progress progress-success h-1.5 w-12 bg-base-content/10"
		value={command.value?.() ?? 0}
		max="100"
	></progress>
{/if}
{#key label}
	<span
		class="font-semibold text-base-content"
		in:scale={{ start: 0.6, duration: 240, easing: backOut }}>{label}</span
	>
{/key}
{#if caption}
	<span class="text-xs font-normal text-base-content/55">{caption}</span>
{/if}
