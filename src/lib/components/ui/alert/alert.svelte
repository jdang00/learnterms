<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';
	import { toneVars } from '../tone.js';

	// Soft by default: a wash of the tone with ink-colored icon and title, body text stays readable.
	export const alertVariants = tv({
		base: "group/alert relative grid w-full gap-0.5 rounded-2xl border px-4 py-3 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-(--tone-ink) *:[svg:not([class*='size-'])]:size-4 *:data-[slot=alert-title]:text-(--tone-ink)",
		variants: {
			variant: {
				soft: 'border-(--tone)/25 bg-(--tone)/10 text-foreground',
				outline: 'border-(--tone-ink)/30 bg-background text-foreground',
				solid:
					'border-transparent bg-(--tone) text-(--tone-fg) *:[svg]:text-(--tone-fg) *:data-[slot=alert-title]:text-(--tone-fg)'
			},
			tone: toneVars
		},
		compoundVariants: [{ tone: 'neutral', variant: 'soft', class: 'border-border bg-muted' }],
		defaultVariants: {
			variant: 'soft',
			tone: 'neutral'
		}
	});

	export type AlertTone = VariantProps<typeof alertVariants>['tone'];
	export type AlertVariant = VariantProps<typeof alertVariants>['variant'];
</script>

<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		variant = 'soft',
		tone = 'neutral',
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: AlertVariant;
		tone?: AlertTone;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="alert"
	role="alert"
	class={cn(alertVariants({ variant, tone }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
