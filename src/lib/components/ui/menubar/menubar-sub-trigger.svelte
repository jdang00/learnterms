<script lang="ts">
	import { Menubar as MenubarPrimitive } from 'bits-ui';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { cn, type WithoutChild } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		inset = undefined,
		children,
		...restProps
	}: WithoutChild<MenubarPrimitive.SubTriggerProps> & {
		inset?: boolean;
	} = $props();
</script>

<MenubarPrimitive.SubTrigger
	bind:ref
	data-slot="menubar-sub-trigger"
	data-inset={inset}
	class={cn(
		"focus:bg-muted focus:text-foreground data-open:bg-muted data-open:text-foreground gap-2 rounded-2xl px-3 py-2 text-sm font-medium data-inset:pl-9.5 [&_svg:not([class*='size-'])]:size-4 flex cursor-default items-center outline-none select-none",
		className
	)}
	{...restProps}
>
	{@render children?.()}
	<ChevronRightIcon class="cn-rtl-flip ml-auto size-4" />
</MenubarPrimitive.SubTrigger>
