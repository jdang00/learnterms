<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { docsNav } from './nav';

	const currentPath = $derived(page.url.pathname);

	function isActive(path: string) {
		return currentPath === path;
	}
</script>

<aside class="">
	<ul class="w-56 rounded-3xl bg-muted p-3">
		{#each docsNav as section (section.title)}
			<li class="px-2.5 pt-3 pb-1 text-xs font-semibold uppercase opacity-70">{section.title}</li>
			{#each section.items as item (item.path)}
				<li>
					<a
						href={resolve(item.path)}
						class="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm hover:bg-background"
						class:bg-background={isActive(item.path)}
						class:font-semibold={isActive(item.path)}>{item.title}</a
					>
				</li>
			{/each}
		{/each}
	</ul>
</aside>
