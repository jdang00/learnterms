<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { buildBreadcrumbTrail } from './nav';
	const trail = $derived(buildBreadcrumbTrail(page.url.pathname));
</script>

<div class="text-sm">
	<ul class="flex flex-wrap items-center gap-2">
		{#each trail as crumb, i (crumb.path)}
			<li class="flex items-center gap-2">
				{#if i > 0}<ChevronRight size={14} class="shrink-0 text-muted-foreground" />{/if}
				{#if i < trail.length - 1}
					<a href={resolve(crumb.path)}>{crumb.title}</a>
				{:else}
					<span class="text-foreground/70">{crumb.title}</span>
				{/if}
			</li>
		{/each}
	</ul>
</div>
