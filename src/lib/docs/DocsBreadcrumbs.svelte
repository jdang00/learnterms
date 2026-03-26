<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { buildBreadcrumbTrail } from './nav';
	const trail = $derived(buildBreadcrumbTrail(page.url.pathname));
</script>

<div class="breadcrumbs text-sm">
	<ul>
		{#each trail as crumb, i (crumb.path)}
			{#if i < trail.length - 1}
				<li><a href={resolve(crumb.path)}>{crumb.title}</a></li>
			{:else}
				<li class="text-base-content/70">{crumb.title}</li>
			{/if}
		{/each}
	</ul>
</div>
