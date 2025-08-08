<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { ClerkProvider } from 'svelte-clerk';
	import { PUBLIC_CLERK_PUBLISHABLE_KEY, PUBLIC_CONVEX_URL } from '$env/static/public';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import NavBar from '$lib/components/NavBar.svelte';
	import { setupConvex } from 'convex-svelte';
	import { theme, clerkTheme } from '$lib/theme.svelte';
	import { onMount } from 'svelte';

	setupConvex(PUBLIC_CONVEX_URL);

	injectAnalytics();

	const { children }: { children: Snippet } = $props();

	onMount(() => {
		theme.init();
	});
	const year = new Date().getFullYear();
</script>

<svelte:head>
	<title>LearnTerms</title>
	<meta
		name="description"
		content="Smarter Studying, Simplified. Adaptive learning powered by AI."
	/>

	<meta property="og:url" content="https://learnterms.com" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="LearnTerms" />
	<meta property="og:description" content="Smarter Studying, Simplified." />
	<meta
		property="og:image"
		content="https://axcaluti7p.ufs.sh/f/DYlXFqnaImOr0iRZZjwE17POUXjVTyuaLZCAI0p9cgf4lt6w"
	/>

	<meta name="twitter:card" content="summary_large_image" />
	<meta property="twitter:domain" content="learnterms.com" />
	<meta property="twitter:url" content="https://learnterms.com" />
	<meta name="twitter:title" content="LearnTerms" />
	<meta name="twitter:description" content="Learn terms the fast and easy way. Free forever." />
	<meta
		name="twitter:image"
		content="https://axcaluti7p.ufs.sh/f/DYlXFqnaImOr0iRZZjwE17POUXjVTyuaLZCAI0p9cgf4lt6w"
	/>
</svelte:head>

<ClerkProvider
	publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}
	appearance={{ baseTheme: $clerkTheme }}
>
	<div class="flex min-h-screen flex-col">
		<NavBar />

		<main class="flex-1 w-full">
			{@render children?.()}
		</main>

		<footer class="bg-base-200 text-base-content border-t border-base-300 mt-auto">
			<div class="mx-auto w-full max-w-6xl px-4 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
				<div class="col-span-2 sm:col-span-1 pr-8">
					<a href="/" class="text-lg font-semibold">LearnTerms</a>
					<p class="mt-2 text-sm text-base-content/70">Study smarter today—build your board prep as you learn.</p>
				</div>

				<nav aria-label="Product" class="flex flex-col space-y-1">
					<h6 class="footer-title">Product</h6>
					<a class="link link-hover" href="/">Features</a>
					<a class="link link-hover" href="/pricing">Pricing</a>
					<a class="link link-hover" href="/changelog">Changelog</a>
				</nav>

				<nav aria-label="Resources" class="flex flex-col space-y-1">
					<h6 class="footer-title">Resources</h6>
					<a class="link link-hover" href="/docs">Docs</a>
					<a class="link link-hover" href="/blog">Blog</a>
					<a class="link link-hover" href="/status">Status</a>
				</nav>

				<nav aria-label="Development" class="flex flex-col space-y-1">
					<h6 class="footer-title">Development</h6>
					<a class="link link-hover" href="https://github.com/yourusername/learnterms" target="_blank" rel="noopener noreferrer">GitHub</a>
					<a class="link link-hover" href="/about">About</a>
					<a class="link link-hover" href="/contact">Contact</a>
				</nav>
			</div>
			<div class="border-t border-base-300">
				<p class="mx-auto max-w-6xl px-4 py-6 text-sm text-base-content/70 text-center">© {year} LearnTerms. All rights reserved.</p>
			</div>
		</footer>
	</div>
</ClerkProvider>
