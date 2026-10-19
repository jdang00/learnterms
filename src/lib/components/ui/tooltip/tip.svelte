<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Tooltip as TooltipPrimitive } from 'bits-ui';
	import { Kbd } from '../kbd/index.js';
	import Content from './tooltip-content.svelte';

	// The LearnTerms tooltip: an ink pill with an optional shortcut. Pass `child` to put the
	// trigger props on your own element (a Button), or plain children to wrap them in a span.
	let {
		label,
		kbd,
		side = 'top',
		align = 'center',
		delay,
		disabled = false,
		open = $bindable(false),
		class: className,
		child: triggerChild,
		children
	}: {
		label: string | Snippet;
		kbd?: string | string[];
		side?: 'top' | 'right' | 'bottom' | 'left';
		align?: 'start' | 'center' | 'end';
		delay?: number;
		disabled?: boolean;
		open?: boolean;
		class?: string;
		child?: Snippet<[{ props: Record<string, unknown> }]>;
		children?: Snippet;
	} = $props();

	const keys = $derived(kbd === undefined ? [] : Array.isArray(kbd) ? kbd : [kbd]);
</script>

<TooltipPrimitive.Root bind:open delayDuration={delay} {disabled}>
	<TooltipPrimitive.Trigger>
		{#snippet child({ props })}
			{#if triggerChild}
				{@render triggerChild({ props })}
			{:else}
				<span {...props} class="inline-flex">{@render children?.()}</span>
			{/if}
		{/snippet}
	</TooltipPrimitive.Trigger>
	<Content {side} {align} class={className}>
		{#if typeof label === 'string'}{label}{:else}{@render label()}{/if}
		{#if keys.length}
			<span class="flex items-center gap-0.5">
				{#each keys as key (key)}<Kbd>{key}</Kbd>{/each}
			</span>
		{/if}
	</Content>
</TooltipPrimitive.Root>
