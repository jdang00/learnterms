<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import PublicPage from '$lib/components/landing/PublicPage.svelte';
	let { title, summary, children }: { title: string; summary: string; children: Snippet } =
		$props();
</script>

<PublicPage {title} lede={summary} width="narrow">
	{#snippet intro()}
		<p class="mt-4 text-sm text-base-content/60">
			Last updated <time datetime="2026-09-22">September 22, 2026</time>
		</p>
	{/snippet}

	<article
		class="prose max-w-none border-t border-base-content/10 pt-8 prose-headings:scroll-mt-8 prose-a:text-primary"
	>
		{@render children()}
	</article>
	<nav
		aria-label="Legal and support"
		class="mt-10 flex flex-wrap gap-5 border-t border-base-content/10 pt-6 text-sm"
	>
		<a class="link link-hover" href={resolve('/privacy')}>Privacy Policy</a>
		<a class="link link-hover" href={resolve('/terms')}>Terms and Conditions</a>
		<a class="link link-hover" href={resolve('/contact')}>Contact</a>
	</nav>
</PublicPage>
