<script lang="ts">
	import type { Snippet } from 'svelte';

	// One component on the overview: what it is, where it lives, and the real thing in its states.
	let {
		title,
		src,
		note,
		wide = false,
		class: className = '',
		children
	}: {
		title: string;
		src: string | string[];
		note?: string;
		wide?: boolean;
		class?: string;
		children: Snippet;
	} = $props();

	const paths = $derived(Array.isArray(src) ? src : [src]);
</script>

<article class="flex flex-col surface {wide ? 'lg:col-span-2' : ''}">
	<header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 px-5 pt-4">
		<h3 class="text-base font-semibold">{title}</h3>
		<span class="flex flex-wrap gap-1.5">
			{#each paths as path (path)}
				<code class="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
					>{path}</code
				>
			{/each}
		</span>
		{#if note}<p class="w-full text-sm text-muted-foreground">{note}</p>{/if}
	</header>
	<div class="flex-1 p-5 {className}">
		{@render children()}
	</div>
</article>
