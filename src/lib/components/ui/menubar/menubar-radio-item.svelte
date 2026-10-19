<script lang="ts">
	import { Menubar as MenubarPrimitive } from 'bits-ui';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { cn, type WithoutChild } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		inset,
		children: childrenProp,
		closeOnSelect = false,
		...restProps
	}: WithoutChild<MenubarPrimitive.RadioItemProps> & {
		inset?: boolean;
	} = $props();
</script>

<MenubarPrimitive.RadioItem
	bind:ref
	{closeOnSelect}
	data-slot="menubar-radio-item"
	data-inset={inset}
	class={cn(
		"focus:bg-muted focus:text-foreground focus:**:text-foreground gap-2.5 rounded-2xl py-2 pr-3 pl-9.5 text-sm font-medium data-disabled:opacity-50 data-inset:pl-9.5 [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
		className
	)}
	{...restProps}
>
	{#snippet children({ checked })}
		<span
			class="left-3 size-4 [&_svg:not([class*='size-'])]:size-4 pointer-events-none absolute flex items-center justify-center"
		>
			{#if checked}
				<CheckIcon />
			{/if}
		</span>
		{@render childrenProp?.({ checked })}
	{/snippet}
</MenubarPrimitive.RadioItem>
