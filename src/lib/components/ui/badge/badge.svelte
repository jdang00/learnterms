<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';
	import { toneVars } from '../tone.js';

	export const badgeVariants = tv({
		base: 'group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent font-semibold whitespace-nowrap tabular-nums transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 [&>svg]:pointer-events-none [&>svg]:shrink-0',
		variants: {
			variant: {
				solid: 'bg-(--tone) text-(--tone-fg)',
				soft: 'bg-(--tone)/14 text-(--tone-ink)',
				outline: 'border-(--tone-ink)/35 text-(--tone-ink)',
				dash: 'border-dashed border-(--tone-ink)/40 text-(--tone-ink)',
				ghost: 'text-(--tone-ink)'
			},
			tone: toneVars,
			size: {
				xs: 'h-4.5 px-1.5 text-[0.6875rem] [&>svg]:size-3',
				sm: 'h-5.5 px-2 text-xs [&>svg]:size-3',
				md: 'h-7 px-3 text-xs [&>svg]:size-3.5'
			}
		},
		compoundVariants: [
			{ tone: 'neutral', variant: 'soft', class: 'bg-muted-strong text-muted-foreground' },
			{ tone: 'neutral', variant: 'outline', class: 'border-border text-muted-foreground' }
		],
		defaultVariants: {
			variant: 'soft',
			tone: 'neutral',
			size: 'sm'
		}
	});

	export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
	export type BadgeTone = VariantProps<typeof badgeVariants>['tone'];
	export type BadgeSize = VariantProps<typeof badgeVariants>['size'];
</script>

<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		href,
		class: className,
		variant = 'soft',
		tone = 'neutral',
		size = 'sm',
		children,
		...restProps
	}: WithElementRef<HTMLAnchorAttributes> & {
		variant?: BadgeVariant;
		tone?: BadgeTone;
		size?: BadgeSize;
	} = $props();
</script>

<svelte:element
	this={href ? 'a' : 'span'}
	bind:this={ref}
	data-slot="badge"
	{href}
	class={cn(badgeVariants({ variant, tone, size }), className)}
	{...restProps}
>
	{@render children?.()}
</svelte:element>
