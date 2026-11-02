<script lang="ts">
	import { Button, type ButtonProps } from '#lib/components/ui/button/index.js';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		variant = 'ghost',
		size = 'xs',
		tone = 'neutral',
		...restProps
	}: ButtonProps = $props();
</script>

<Button
	bind:ref
	data-slot="attachment-action"
	{variant}
	{size}
	{tone}
	shape="circle"
	class={cn(className)}
	{...restProps}
/>
