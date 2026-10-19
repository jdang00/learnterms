<script lang="ts">
	import { Menubar as MenubarPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils.js';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		inset,
		class: className,
		...restProps
	}: ComponentProps<typeof MenubarPrimitive.GroupHeading> & {
		inset?: boolean;
	} = $props();
</script>

<MenubarPrimitive.GroupHeading
	bind:ref
	data-slot="menubar-group-heading"
	data-inset={inset}
	class={cn('text-muted-foreground px-3.5 py-2.5 text-xs data-inset:pl-9.5', className)}
	{...restProps}
/>
