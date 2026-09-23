<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft } from 'lucide-svelte';
	import ReleaseOne from '$lib/components/blog/ReleaseOne.svelte';
	import Lens from '$lib/components/blog/Lens.svelte';
	import VersionTwoBeta from '$lib/components/blog/VersionTwoBeta.svelte';
	import VersionTwo from '$lib/components/blog/VersionTwo.svelte';
	import VersionThree from '$lib/components/blog/VersionThree.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const articles = {
		'learnterms-1-0': ReleaseOne,
		lens: Lens,
		'learnterms-v2-beta': VersionTwoBeta,
		'learnterms-v2': VersionTwo,
		'learnterms-v3': VersionThree
	};
	const Article = $derived(articles[data.post.slug]);
	const breadcrumbs = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Home',
					item: 'https://learnterms.com/'
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: 'Blog',
					item: 'https://learnterms.com/blog'
				},
				{
					'@type': 'ListItem',
					position: 3,
					name: data.post.title,
					item: `https://learnterms.com/blog/${data.post.slug}`
				}
			]
		})
	);
	const breadcrumbsMarkup = $derived(
		'<scr' +
			'ipt type="application/ld+json">' +
			breadcrumbs.replace(/</g, '\\u003c') +
			'</scr' +
			'ipt>'
	);
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted JSON from static blog metadata -->
	{@html breadcrumbsMarkup}
</svelte:head>

<article id="main-content" class="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
	<nav aria-label="Breadcrumb" class="flex items-center gap-2 text-sm text-base-content/65">
		<a href={resolve('/')} class="hover:text-primary">Home</a>
		<span aria-hidden="true">/</span>
		<a href={resolve('/blog')} class="inline-flex items-center gap-1 hover:text-primary"
			><ArrowLeft size={14} /> Blog</a
		>
		<span aria-hidden="true">/</span>
		<span aria-current="page" class="truncate">{data.post.title}</span>
	</nav>
	<header class="mt-7">
		<h1 class="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
			{data.post.title}
		</h1>
		<p class="mt-4 text-sm text-base-content/60">
			Justin Dang · <time datetime={data.post.date}>{data.post.displayDate}</time>
		</p>
	</header>
	{#if data.post.archived}<p
			class="my-7 border-l-2 border-base-300 pl-4 text-sm leading-relaxed text-base-content/60"
		>
			Archived post. Features, plans, and performance claims describe the original release.
		</p>{/if}
	<div
		class="prose mt-8 max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-2xl prose-h3:text-xl prose-a:underline-offset-4 prose-img:rounded-xl prose-pre:whitespace-pre-wrap prose-pre:break-words"
	>
		<Article />
	</div>
	{#if data.post.archiveNote}<p
			class="mt-10 border-t border-base-300 pt-5 text-xs leading-relaxed text-base-content/55"
		>
			Archive note: {data.post.archiveNote}
		</p>{/if}
</article>

<style>
	.prose :global(table) {
		display: block;
		max-width: 100%;
		overflow-x: auto;
	}
</style>
