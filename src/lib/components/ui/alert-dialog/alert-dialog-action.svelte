<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import {
		buttonVariants,
		type ButtonTone,
		type ButtonVariant,
		type ButtonSize
	} from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		variant = 'solid',
		tone = 'primary',
		size = 'md',
		...restProps
	}: AlertDialogPrimitive.ActionProps & {
		variant?: ButtonVariant;
		tone?: ButtonTone;
		size?: ButtonSize;
	} = $props();
</script>

<AlertDialogPrimitive.Action
	bind:ref
	data-slot="alert-dialog-action"
	class={cn(buttonVariants({ variant, tone, size }), '', className)}
	{...restProps}
/>
