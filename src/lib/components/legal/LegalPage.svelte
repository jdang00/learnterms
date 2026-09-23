<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	let { title, summary, children }: { title: string; summary: string; children: Snippet } =
		$props();
</script>

<div class="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
	<header class="border-b border-base-300 pb-8">
		<p class="text-sm font-semibold text-primary">LearnTerms</p>
		<h1 class="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
		<p class="mt-5 text-lg text-base-content/75">{summary}</p>
		<p class="mt-4 text-sm text-base-content/60">
			Last updated <time datetime="2026-09-22">September 22, 2026</time>
		</p>
	</header>
	<article class="prose mt-8 max-w-none prose-headings:scroll-mt-8 prose-a:text-primary">
		{@render children()}
	</article>
	<nav
		aria-label="Legal and support"
		class="mt-10 flex flex-wrap gap-5 border-t border-base-300 pt-6 text-sm"
	>
		<a class="link link-hover" href={resolve('/privacy')}>Privacy Policy</a>
		<a class="link link-hover" href={resolve('/terms')}>Terms and Conditions</a>
		<a class="link link-hover" href={resolve('/contact')}>Contact</a>
	</nav>
</div>
