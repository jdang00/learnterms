<script lang="ts">
	import { cn } from '#lib/utils.js';
	import Spinner from './spinner.svelte';

	let {
		label,
		inline = false,
		class: className
	}: {
		label?: string;
		/** A single row for fields and lists; the default centers a larger spinner in its area. */
		inline?: boolean;
		class?: string;
	} = $props();
</script>

<div
	role="status"
	aria-live="polite"
	class={cn(
		inline
			? 'flex items-center gap-2.5 text-sm text-foreground/60'
			: 'flex flex-col items-center justify-center gap-3 py-8 text-center text-sm text-foreground/60',
		className
	)}
>
	<Spinner
		role="presentation"
		aria-hidden="true"
		class={inline ? 'size-4' : 'size-6 text-primary'}
	/>
	{#if label}<span>{label}</span>{:else}<span class="sr-only">Loading</span>{/if}
</div>
