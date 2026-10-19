<script lang="ts" module>
	import type { LucideIcon } from '@lucide/svelte';
	import type { Tone } from '../tone.js';

	export type SegmentedOption = {
		value: string;
		label: string;
		icon?: LucideIcon;
		/** Overrides the control's tone for this option when it is selected. */
		tone?: Tone;
		disabled?: boolean;
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { RadioGroup } from 'bits-ui';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import { cn } from '#lib/utils.js';

	let {
		value = $bindable(''),
		options,
		onValueChange,
		size = 'sm',
		tone = 'primary',
		activeVariant = 'solid',
		track = 'surface',
		disabled = false,
		class: className,
		itemClass,
		labelClass,
		item,
		'aria-label': ariaLabel,
		'aria-labelledby': ariaLabelledby
	}: {
		value?: string;
		options: readonly SegmentedOption[];
		onValueChange?: (value: string) => void;
		size?: 'xs' | 'sm' | 'md';
		tone?: Tone;
		/** raised = a white pill on the track (iOS-style), for neutral view switches. */
		activeVariant?: 'solid' | 'soft' | 'raised';
		/** surface = bordered pill, muted = filled pill track, none = loose chips. */
		track?: 'surface' | 'muted' | 'none';
		disabled?: boolean;
		class?: string;
		itemClass?: string;
		/** Classes for each option's text, e.g. to hide labels on narrow containers. */
		labelClass?: string;
		/** Custom option content; replaces the icon and label. */
		item?: Snippet<[SegmentedOption, boolean]>;
		'aria-label'?: string;
		'aria-labelledby'?: string;
	} = $props();
</script>

<!-- One choice from a few: a radio group, so arrow keys move between options. -->
<RadioGroup.Root
	bind:value
	{onValueChange}
	{disabled}
	orientation="horizontal"
	aria-label={ariaLabel}
	aria-labelledby={ariaLabelledby}
	data-slot="segmented-control"
	class={cn(
		'flex w-fit flex-wrap items-center gap-1',
		track === 'surface' && 'rounded-full border border-border bg-background p-1 shadow-xs',
		track === 'muted' && 'gap-0.5 rounded-full bg-muted p-1',
		className
	)}
>
	{#each options as option (option.value)}
		{@const active = value === option.value}
		<RadioGroup.Item
			value={option.value}
			disabled={option.disabled}
			class={cn(
				activeVariant === 'raised'
					? [
							buttonVariants({ variant: 'ghost', tone: 'neutral', size }),
							'font-medium',
							active && 'bg-background text-foreground shadow-sm hover:bg-background'
						]
					: [
							buttonVariants({
								variant: active ? activeVariant : 'ghost',
								tone: active ? (option.tone ?? tone) : 'neutral',
								size
							}),
							'font-semibold'
						],
				size === 'sm' && 'px-3',
				itemClass
			)}
		>
			{#if item}
				{@render item(option, active)}
			{:else}
				{#if option.icon}<option.icon />{/if}
				<span class={labelClass}>{option.label}</span>
			{/if}
		</RadioGroup.Item>
	{/each}
</RadioGroup.Root>
