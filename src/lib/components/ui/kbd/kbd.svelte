<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<kbd
	bind:this={ref}
	data-slot="kbd"
	class={cn(
		"pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-md border border-border bg-muted px-1.5 font-mono text-[0.6875rem] font-medium text-muted-foreground shadow-[inset_0_-1px_0_var(--line)] select-none [&_svg:not([class*='size-'])]:size-3",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</kbd>
