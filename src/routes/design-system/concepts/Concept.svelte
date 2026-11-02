<script lang="ts">
	import type { Snippet } from 'svelte';
	import MapPin from '@lucide/svelte/icons/map-pin';

	// One concept draft: the idea, the shadcn parts it is built from, and where it would live.
	let {
		title,
		uses,
		where,
		wide = false,
		class: className = '',
		children
	}: {
		title: string;
		uses: string[];
		where: string;
		wide?: boolean;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<article class="flex min-w-0 flex-col surface {wide ? 'lg:col-span-2' : ''}">
	<header class="space-y-1.5 px-5 pt-4">
		<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
			<h3 class="text-base font-semibold">{title}</h3>
			<span class="flex flex-wrap gap-1.5">
				{#each uses as part (part)}
					<code class="rounded-md bg-primary/8 px-1.5 py-0.5 font-mono text-[11px] text-primary-ink"
						>{part}</code
					>
				{/each}
			</span>
		</div>
		<p class="flex items-start gap-1.5 text-sm text-muted-foreground">
			<MapPin size={14} class="mt-0.5 shrink-0" aria-hidden="true" />{where}
		</p>
	</header>
	<div class="min-w-0 flex-1 p-5 {className}">
		{@render children()}
	</div>
</article>
