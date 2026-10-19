<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import {
		buttonVariants,
		type ButtonTone,
		type ButtonVariant,
		type ButtonSize
	} from '#lib/components/ui/button/index.js';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		variant = 'outline',
		tone = 'neutral',
		size = 'md',
		...restProps
	}: AlertDialogPrimitive.CancelProps & {
		variant?: ButtonVariant;
		tone?: ButtonTone;
		size?: ButtonSize;
	} = $props();
</script>

<AlertDialogPrimitive.Cancel
	bind:ref
	data-slot="alert-dialog-cancel"
	class={cn(buttonVariants({ variant, tone, size }), '', className)}
	{...restProps}
/>
