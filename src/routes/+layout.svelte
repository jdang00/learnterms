<script lang="ts">
	import '../app.css';
	import { ClerkProvider } from 'svelte-clerk';
	import { PUBLIC_CLERK_PUBLISHABLE_KEY, PUBLIC_CONVEX_URL } from '$env/static/public';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import NavBar from '$lib/components/NavBar.svelte';
	import BadgeAwardModal from '$lib/components/BadgeAwardModal.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import PostHogIdentify from '$lib/components/PostHogIdentify.svelte';
	import { setupConvex, useConvexClient } from 'convex-svelte';
	import { theme, clerkTheme } from '$lib/theme.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import posthog from 'posthog-js';
	import { browser } from '$app/environment';

	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	injectSpeedInsights();

	setupConvex(PUBLIC_CONVEX_URL);

	injectAnalytics();

	const { data, children } = $props();

	const convexClient = useConvexClient();

	// Keep both a mutable token for first use and a backup for fallback
	let initialToken: string | null = data?.token ?? null;
	const ssrTokenBackup: string | null = data?.token ?? null;

	// Helper to wait for Clerk session with timeout
	async function waitForClerkSession(timeoutMs: number = 5000): Promise<boolean> {
		if (window.Clerk?.session) return true;

		const startTime = Date.now();
		while (Date.now() - startTime < timeoutMs) {
			await new Promise((resolve) => setTimeout(resolve, 100));
			if (window.Clerk?.session) return true;
		}
		return false;
	}

	$effect(() => {
		convexClient.setAuth(async (args) => {
			const forceRefreshToken = args?.forceRefreshToken ?? false;

			// Use initial SSR token on first call (non-forced)
			if (!forceRefreshToken && initialToken) {
				const token = initialToken;
				initialToken = null;
				return token;
			}

			// Wait for Clerk to be ready (with timeout)
			const clerkReady = await waitForClerkSession(3000);

			if (!clerkReady || !window.Clerk?.session) {
				console.warn('[Convex Auth] Clerk session not available, using SSR token fallback');
				// Use the backup SSR token if Clerk isn't ready
				// This keeps the session alive while Clerk initializes
				return ssrTokenBackup ?? undefined;
			}

			try {
				const token = await window.Clerk.session.getToken({
					template: 'convex',
					skipCache: forceRefreshToken
				});

				if (!token) {
					console.warn('[Convex Auth] Clerk returned null token, user may be signed out');
				}

				return token ?? undefined;
			} catch (error) {
				console.error('[Convex Auth] Error fetching token from Clerk:', error);
				// On error, try the backup token as last resort
				return ssrTokenBackup ?? undefined;
			}
		});
	});

	onMount(() => {
		theme.init();
	});

	// Track page views on route changes
	$effect(() => {
		if (browser && page.url) {
			posthog.capture('$pageview', {
				$current_url: page.url.href
			});
		}
	});

	const year = new Date().getFullYear();

	const defaultSeo = {
		title: 'LearnTerms',
		description: 'Smarter Studying, Simplified. Adaptive learning powered by AI.',
		image: 'https://axcaluti7p.ufs.sh/f/DYlXFqnaImOr0iRZZjwE17POUXjVTyuaLZCAI0p9cgf4lt6w',
		siteName: 'LearnTerms'
	};

	type Seo = {
		title: string;
		description: string;
		image: string;
		canonical: string;
		fullUrl: string;
	};
	let seo: Seo = $derived({
		title: page.data?.seo?.title ?? defaultSeo.title,
		description: page.data?.seo?.description ?? defaultSeo.description,
		image: page.data?.seo?.image ?? defaultSeo.image,
		fullUrl:
			(page.url?.origin || 'https://learnterms.com') +
			(page.url?.pathname || '/') +
			(page.url?.search || ''),
		canonical: (page.url?.origin || 'https://learnterms.com') + (page.url?.pathname || '/')
	} as Seo);
</script>

<svelte:head>
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	<link rel="canonical" href={seo.canonical} />
	<meta name="robots" content="index,follow" />

	<meta property="og:url" content={seo.fullUrl} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={defaultSeo.siteName} />
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:image" content={seo.image} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta property="twitter:domain" content="learnterms.com" />
	<meta property="twitter:url" content={seo.fullUrl} />
	<meta name="twitter:title" content={seo.title} />
	<meta name="twitter:description" content={seo.description} />
	<meta name="twitter:image" content={seo.image} />
</svelte:head>

<ClerkProvider
	publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}
	appearance={{ baseTheme: $clerkTheme }}
>
	<PostHogIdentify />
	<div class="flex min-h-screen flex-col">
		<NavBar />

		<main class="flex-1 w-full">
			{@render children?.()}
		</main>

		{#if !(page.url.pathname.startsWith('/classes') && page.url.pathname.includes('/modules/')) && !page.url.pathname.startsWith('/tools/grade-calculator') && !(page.url.pathname.startsWith('/admin/') && page.url.pathname.includes('/module/'))}
			<footer class="bg-base-200 text-base-content border-t border-base-300 mt-auto">
				<div class="mx-auto w-full max-w-6xl px-4 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
					<div class="col-span-2 sm:col-span-1 pr-8">
						<a href="/" class="text-lg font-semibold">LearnTerms</a>
						<p class="mt-2 text-sm text-base-content/70">
							Study smarter today—build your board prep as you learn.
						</p>
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
						<a
							class="link link-hover"
							href="https://github.com/jdang00/learnterms"
							target="_blank"
							rel="noopener noreferrer">GitHub</a
						>
						<a class="link link-hover" href="/about-us">About Us</a>
						<a class="link link-hover" href="/contact">Contact</a>
					</nav>
				</div>
				<div class="border-t border-base-300">
					<p class="mx-auto max-w-6xl px-4 py-6 text-sm text-base-content/70 text-center">
						© {year} LearnTerms. All rights reserved.
					</p>
				</div>
			</footer>
		{/if}
	</div>
	<Toast />
	<BadgeAwardModal />
</ClerkProvider>
