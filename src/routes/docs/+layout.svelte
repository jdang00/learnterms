<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
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

	const sectionTitle = $derived('Docs');
	const pageTitle = $derived(
		(flatItems[currentIndex]?.title ? `${flatItems[currentIndex]?.title} – ` : '') +
			'LearnTerms Docs'
	);
	const description = $derived('Guides and documentation for LearnTerms.');
	const canonical = $derived(page.url.href);
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta name="robots" content="index,follow" />
</svelte:head>

<section class="mx-auto max-w-6xl px-4 py-10 mb-56">
	<DocsBreadcrumbs />
	<div class="mt-6 grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6 items-start">
		<DocsMenu />
		<div>
			<article class="prose max-w-none">
				{@render children?.()}
			</article>

			<div class="divider my-10"></div>

			<nav class="mt-10 flex items-center justify-between">
				{#if prevItem}
					<a rel="prev" href={prevItem.path} class="btn btn-outline py-8">
						<div class="flex flex-col gap-1">
							<p class="text-xs text-base-content/70 self-start">Previous</p>
							<p class="text-base-content/90">← {prevItem.title}</p>
						</div>
					</a>
				{:else}
					<span></span>
				{/if}
				{#if nextItem}
					<a rel="next" href={nextItem.path} class="btn btn-outline py-8">
						<div class="flex flex-col gap-1">
							<p class="text-xs text-base-content/70 self-start">Next</p>
							<p class="text-base-content/90">{nextItem.title} →</p>
						</div>
					</a>
				{/if}
			</nav>
		</div>
	</div>
</section>
