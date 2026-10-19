<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { toneVars } from '../tone.js';

	// Variants follow the quiz dock's rule of roles: solid = primary action, outline = state toggle,
	// dash = preference, ghost = quiet utility, soft = secondary action.
	export const buttonVariants = tv({
		base: 'group/button inline-flex shrink-0 cursor-pointer items-center justify-center font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,translate] duration-150 outline-none select-none border border-transparent bg-clip-padding focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0',
		variants: {
			variant: {
				solid:
					'bg-(--tone) text-(--tone-fg) hover:bg-[color-mix(in_oklab,var(--tone),var(--foreground)_10%)]',
				soft: 'bg-(--tone)/12 text-(--tone-ink) hover:bg-(--tone)/20 aria-pressed:bg-(--tone)/24 aria-expanded:bg-(--tone)/20',
				outline:
					'border-(--tone-ink)/35 text-(--tone-ink) hover:border-(--tone-ink)/60 hover:bg-(--tone)/8 aria-pressed:border-(--tone) aria-pressed:bg-(--tone) aria-pressed:text-(--tone-fg)',
				dash: 'border-dashed border-(--tone-ink)/40 text-(--tone-ink) hover:border-(--tone-ink)/70 hover:bg-(--tone)/8 aria-pressed:border-solid aria-pressed:bg-(--tone)/14',
				ghost:
					'text-(--tone-ink) hover:bg-(--tone)/10 aria-pressed:bg-(--tone)/14 aria-expanded:bg-(--tone)/10',
				link: 'h-auto! border-0 p-0! text-(--tone-ink) underline-offset-4 hover:underline'
			},
			tone: toneVars,
			size: {
				xs: "h-6 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
				sm: "h-8 gap-1.5 px-3.5 text-sm [&_svg:not([class*='size-'])]:size-4",
				md: "h-10 gap-2 px-5 text-sm [&_svg:not([class*='size-'])]:size-4",
				lg: "h-12 gap-2 px-7 text-base [&_svg:not([class*='size-'])]:size-5"
			},
			shape: {
				pill: 'rounded-full',
				rect: 'rounded-xl',
				circle: 'aspect-square rounded-full px-0',
				square: 'aspect-square rounded-xl px-0',
				// Previous/next as one split pill: rounded outside, nearly touching where they meet.
				// Containers that space them with a gap set --segment-gap so the end can cancel it.
				'segment-start': 'rounded-[9999px_0.3rem_0.3rem_9999px]',
				'segment-end': 'ms-[calc(2px-var(--segment-gap,0px))] rounded-[0.3rem_9999px_9999px_0.3rem]'
			}
		},
		compoundVariants: [
			// Neutral ghost and outline read quieter than the ink so icons don't shout.
			{
				tone: 'neutral',
				variant: ['ghost', 'outline', 'dash'],
				class: 'text-foreground/75 hover:text-foreground'
			},
			{
				tone: 'neutral',
				variant: ['soft'],
				class: 'bg-foreground/6 text-foreground hover:bg-foreground/10'
			},
			{ tone: 'neutral', variant: ['outline'], class: 'border-border hover:border-foreground/25' }
		],
		defaultVariants: {
			variant: 'solid',
			tone: 'primary',
			size: 'md',
			shape: 'pill'
		}
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonTone = VariantProps<typeof buttonVariants>['tone'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];
	export type ButtonShape = VariantProps<typeof buttonVariants>['shape'];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			tone?: ButtonTone;
			size?: ButtonSize;
			shape?: ButtonShape;
			/** Shows a spinner in place of the leading content and blocks clicks. */
			loading?: boolean;
			/** Wraps the button in the LearnTerms Tip. Use instead of `title` for hover hints. */
			tooltip?: string;
			tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
			/** Shortcut keys shown in the tooltip. */
			tooltipKbd?: string | string[];
		};
</script>

<script lang="ts">
	import { mergeProps } from 'bits-ui';
	import { Spinner } from '../spinner/index.js';
	import { Tip } from '../tooltip/index.js';

	let {
		class: className,
		variant = 'solid',
		tone = 'primary',
		size = 'md',
		shape = 'pill',
		loading = false,
		tooltip,
		tooltipSide,
		tooltipKbd,
		ref = $bindable(),
		href = undefined,
		type = 'button',
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();

	const classes = $derived(cn(buttonVariants({ variant, tone, size, shape }), className));
</script>

{#snippet element(extra: Record<string, unknown>)}
	{#if href}
		<!-- eslint-disable svelte/no-navigation-without-resolve -- callers pass a resolve()d or external href -->
		<a
			bind:this={ref}
			data-slot="button"
			class={classes}
			href={disabled ? undefined : href}
			aria-disabled={disabled || loading || undefined}
			aria-busy={loading || undefined}
			role={disabled ? 'link' : undefined}
			tabindex={disabled ? -1 : undefined}
			{...mergeProps(restProps, extra)}
		>
			{#if loading}<Spinner />{/if}
			{@render children?.()}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{:else}
		<button
			bind:this={ref}
			data-slot="button"
			class={classes}
			{type}
			disabled={disabled || loading}
			aria-busy={loading || undefined}
			{...mergeProps(restProps, extra)}
		>
			{#if loading}<Spinner />{/if}
			{@render children?.()}
		</button>
	{/if}
{/snippet}

{#if tooltip}
	<Tip label={tooltip} side={tooltipSide} kbd={tooltipKbd}>
		{#snippet child({ props })}{@render element(props)}{/snippet}
	</Tip>
{:else}
	{@render element({})}
{/if}
