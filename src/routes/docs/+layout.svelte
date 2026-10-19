<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import DocsMenu from '$lib/docs/DocsMenu.svelte';
	import DocsBreadcrumbs from '$lib/docs/DocsBreadcrumbs.svelte';
	import { docsNav } from '$lib/docs/nav';
	import type { DocsNavItem } from '$lib/docs/nav';

	const { children }: { children: Snippet } = $props();

	const currentPath = $derived(page.url.pathname.replace(/\/+$/, ''));
	const flatItems: DocsNavItem[] = $derived(docsNav.flatMap((s) => s.items));
	const currentIndex = $derived(flatItems.findIndex((i) => i.path === currentPath));
	const prevItem: DocsNavItem | null = $derived(
		currentIndex > 0 ? flatItems[currentIndex - 1] : null
	);
	const nextItem: DocsNavItem | null = $derived(
		currentIndex >= 0 && currentIndex < flatItems.length - 1 ? flatItems[currentIndex + 1] : null
	);
</script>

<section class="mx-auto max-w-6xl px-4 py-10 mb-56">
	<DocsBreadcrumbs />
	<div class="mt-6 grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6 items-start">
		<DocsMenu />
		<div>
			<article class="prose max-w-none prose-h1:font-display">
				{@render children?.()}
			</article>

			<Separator class="my-10" />

			<nav class="mt-10 flex items-center justify-between">
				{#if prevItem}
					<Button
						rel="prev"
						href={resolve(prevItem.path)}
						variant="outline"
						tone="neutral"
						shape="rect"
						class="h-auto py-8"
					>
						<div class="flex flex-col gap-1">
							<p class="text-xs text-foreground/70 self-start">Previous</p>
							<p class="text-foreground/90">← {prevItem.title}</p>
						</div>
					</Button>
				{:else}
					<span></span>
				{/if}
				{#if nextItem}
					<Button
						rel="next"
						href={resolve(nextItem.path)}
						variant="outline"
						tone="neutral"
						shape="rect"
						class="h-auto py-8"
					>
						<div class="flex flex-col gap-1">
							<p class="text-xs text-foreground/70 self-start">Next</p>
							<p class="text-foreground/90">{nextItem.title} →</p>
						</div>
					</Button>
				{/if}
			</nav>
		</div>
	</div>
</section>
