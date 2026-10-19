<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const emptyMediaVariants = tv({
		base: 'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
		variants: {
			variant: {
				default: 'bg-transparent',
				// LearnTerms: a soft tile; tint it with a tone class (bg-primary/10 text-primary-ink) when the
				// empty state invites an action.
				icon: "bg-muted text-foreground/45 flex size-14 shrink-0 items-center justify-center rounded-2xl [&_svg:not([class*='size-'])]:size-6",
				emoji: 'text-5xl leading-none'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	});

	export type EmptyMediaVariant = VariantProps<typeof emptyMediaVariants>['variant'];
</script>

<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		variant = 'default',
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { variant?: EmptyMediaVariant } = $props();
</script>

<div
	bind:this={ref}
	data-slot="empty-icon"
	data-variant={variant}
	class={cn(emptyMediaVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
