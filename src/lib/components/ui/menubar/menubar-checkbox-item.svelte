<script lang="ts">
	import { Menubar as MenubarPrimitive } from 'bits-ui';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		checked = $bindable(false),
		indeterminate = $bindable(false),
		inset,
		children: childrenProp,
		closeOnSelect = false,
		...restProps
	}: WithoutChildrenOrChild<MenubarPrimitive.CheckboxItemProps> & {
		inset?: boolean;
		children?: Snippet;
	} = $props();
</script>

<MenubarPrimitive.CheckboxItem
	bind:ref
	{closeOnSelect}
	bind:checked
	bind:indeterminate
	data-slot="menubar-checkbox-item"
	data-inset={inset}
	class={cn(
		'focus:bg-muted focus:text-foreground focus:**:text-foreground gap-2.5 rounded-2xl py-2 pr-3 pl-9.5 text-sm font-medium data-inset:pl-9.5 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
		className
	)}
	{...restProps}
>
	{#snippet children({ checked: checked, indeterminate: indeterminate })}
		<span
			class="left-3 size-4 [&_svg:not([class*='size-'])]:size-4 pointer-events-none absolute flex items-center justify-center"
		>
			{#if indeterminate}
				<MinusIcon />
			{:else if checked}
				<CheckIcon />
			{/if}
		</span>
		{@render childrenProp?.()}
	{/snippet}
</MenubarPrimitive.CheckboxItem>
