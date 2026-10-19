<script lang="ts">
	import { Progress as ProgressPrimitive } from 'bits-ui';
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
	import { toneVars, type Tone } from '../tone.js';

	let {
		ref = $bindable(null),
		class: className,
		max = 100,
		value,
		tone = 'primary',
		...restProps
	}: WithoutChildrenOrChild<ProgressPrimitive.RootProps> & { tone?: Tone } = $props();
</script>

<ProgressPrimitive.Root
	bind:ref
	data-slot="progress"
	class={cn(
		'relative flex h-2 w-full items-center overflow-x-hidden rounded-full bg-muted-strong',
		toneVars[tone],
		className
	)}
	{value}
	{max}
	{...restProps}
>
	<div
		data-slot="progress-indicator"
		class="size-full flex-1 rounded-full bg-(--tone) transition-transform duration-300 ease-out"
		style="transform: translateX(-{100 - (100 * (value ?? 0)) / (max ?? 1)}%)"
	></div>
</ProgressPrimitive.Root>
