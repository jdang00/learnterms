<script lang="ts">
	import { findShowcase } from '../showcases';

	let { data } = $props();
	const showcase = $derived(findShowcase(data.slug)!);
</script>

<div class="space-y-12">
	<header class="space-y-3">
		<p class="label-caps">Showcase · updated {showcase.updated}</p>
		<h1 class="title-page">{showcase.title}</h1>
		<p class="max-w-2xl text-muted-foreground">{showcase.summary}</p>
		{#if showcase.sources?.length}
			<ul class="flex flex-wrap gap-1.5">
				{#each showcase.sources as source (source)}
					<li
						class="rounded-md bg-muted px-2 py-0.5 font-mono text-xs break-all text-muted-foreground"
					>
						{source}
					</li>
				{/each}
			</ul>
		{/if}
	</header>
	{#key showcase.slug}<showcase.component />{/key}
</div>
