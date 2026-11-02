<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, note, children }: { title: string; note?: string; children: Snippet } = $props();
</script>

<section class="space-y-4">
	<div>
		<h2 class="text-xl font-semibold">{title}</h2>
		{#if note}<p class="mt-1 max-w-2xl text-sm text-muted-foreground">{note}</p>{/if}
	</div>
	<div class="surface p-4 sm:p-6">{@render children()}</div>
</section>
