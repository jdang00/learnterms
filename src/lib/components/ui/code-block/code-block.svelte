<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const codeBlockVariants = tv({
		base: 'rounded-2xl text-sm data-[size=sm]:text-xs has-[>[data-slot=code-block-content]:focus-visible]:ring-3 has-[>[data-slot=code-block-content]:focus-visible]:ring-ring/30 data-[size=sm]:rounded-xl group/code-block relative flex w-full min-w-0 flex-col overflow-hidden',
		variants: {
			variant: {
				default: 'bg-muted text-foreground ring-1 ring-foreground/5 dark:ring-foreground/10',
				destructive:
					'bg-destructive/5 text-destructive ring-1 ring-destructive/15 dark:bg-destructive/10 dark:ring-destructive/20'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	});

	export type CodeBlockVariant = VariantProps<typeof codeBlockVariants>['variant'];
	export type CodeBlockSize = 'default' | 'sm';
</script>

<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		variant = 'default',
		size = 'default',
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: CodeBlockVariant;
		size?: CodeBlockSize;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="code-block"
	data-variant={variant}
	data-size={size}
	class={cn(codeBlockVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
