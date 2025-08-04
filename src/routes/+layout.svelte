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
	<div class="flex flex-col h-screen">
		<NavBar />

		<div class="flex flex-1 flex-col overflow-hidden">
			<div class="flex-1 w-full overflow-y-auto">
				{@render children?.()}
			</div>

			<footer class="footer footer-center text-base-content p-4">
				<aside class="flex flex-col flex-wrap justify-center lg:flex-row">
					<p>
						Copyright © {new Date().getFullYear()} - LearnTerms. All rights reserved.
					</p>
				</aside>
			</footer>
		</div>
	</div>
</ClerkProvider>
