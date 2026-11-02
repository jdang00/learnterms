<script lang="ts">
	import type { Snippet } from 'svelte';
	import { categories, type CategoryId } from './categories';

	let { id, summary, children }: { id: CategoryId; summary: string; children: Snippet } = $props();

	const title = $derived(categories.find((category) => category.id === id)?.title ?? id);
</script>

<section {id} class="scroll-mt-24 space-y-6">
	<header class="max-w-2xl">
		<h2 class="text-3xl font-semibold">{title}</h2>
		<p class="mt-1 text-muted-foreground">{summary}</p>
	</header>
	<div class="grid grid-cols-1 items-start gap-5 *:min-w-0 lg:grid-cols-2">
		{@render children()}
	</div>
</section>
