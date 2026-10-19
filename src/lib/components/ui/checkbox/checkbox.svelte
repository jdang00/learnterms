<script lang="ts">
	import { Checkbox as CheckboxPrimitive } from 'bits-ui';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> = $props();
</script>

<CheckboxPrimitive.Root
	bind:ref
	data-slot="checkbox"
	class={cn(
		'border-foreground/30 dark:bg-muted data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary data-checked:border-primary aria-invalid:aria-checked:border-primary aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 flex size-[1.125rem] items-center justify-center rounded-md border shadow-none transition-[background-color,border-color,box-shadow,scale] duration-150 active:scale-90 data-checked:animate-checkbox-pop motion-reduce:animate-none group-has-disabled/field:opacity-50 focus-visible:ring-3 aria-invalid:ring-3 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-foreground/30 group-has-[:focus-visible]/field-label:data-checked:border-primary peer relative shrink-0 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	bind:checked
	bind:indeterminate
	{...restProps}
>
	{#snippet children({ checked, indeterminate })}
		<div
			data-slot="checkbox-indicator"
			class="[&>svg]:size-3.5 grid place-content-center text-current transition-none"
		>
			{#if checked}
				<!-- Drawn in, like a pen stroke, each time the box is checked. -->
				<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path
						d="M5 12.5l4.5 4.5L19 7.5"
						pathLength="1"
						stroke="currentColor"
						stroke-width="3.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="animate-checkbox-draw [stroke-dasharray:1] motion-reduce:animate-none"
					/>
				</svg>
			{:else if indeterminate}
				<MinusIcon />
			{/if}
		</div>
	{/snippet}
</CheckboxPrimitive.Root>
