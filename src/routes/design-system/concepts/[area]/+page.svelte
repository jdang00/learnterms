<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { findConceptArea } from '../registry';

	let { data } = $props();

	const area = $derived(findConceptArea(data.area));
</script>

{#if area}
	<div class="space-y-8">
		<header class="max-w-3xl">
			<Badge tone="secondary" variant="soft">Concept drafts</Badge>
			<h1 class="mt-3 title-page">{area.title}</h1>
			<p class="mt-2 text-muted-foreground">{area.summary}</p>
		</header>
		<area.component />
	</div>
{/if}
