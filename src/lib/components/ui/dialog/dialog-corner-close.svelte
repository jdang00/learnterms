<script lang="ts">
	import XIcon from '@lucide/svelte/icons/x';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils.js';

	// The one close button for dialogs: inset far enough to clear the 2rem corner radius.
	let {
		onclick,
		disabled = false,
		label = 'Close',
		class: className
	}: {
		onclick?: () => void;
		disabled?: boolean;
		label?: string;
		class?: string;
	} = $props();
</script>

<Button
	variant="ghost"
	tone="neutral"
	shape="circle"
	size="sm"
	class={cn(
		'absolute top-5 right-5 z-10 bg-muted text-muted-foreground hover:bg-muted-strong hover:text-foreground',
		className
	)}
	{onclick}
	{disabled}
	aria-label={label}
>
	<XIcon class="size-4" />
</Button>
