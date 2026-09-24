<script lang="ts">
	import '../app.css';
	import '@fontsource/space-grotesk/latin-600.css';
	import '@fontsource/space-grotesk/latin-700.css';
	import '@fontsource-variable/geist-mono';
	import { getRouteSeo, SITE_ORIGIN } from '$lib/seo';
	import { ClerkProvider } from 'svelte-clerk';
	import { PUBLIC_CLERK_PUBLISHABLE_KEY, PUBLIC_CONVEX_URL } from '$env/static/public';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import NavBar from '$lib/components/NavBar.svelte';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import BadgeAwardModal from '$lib/components/BadgeAwardModal.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import PostHogIdentify from '$lib/components/PostHogIdentify.svelte';
	import { setupConvex } from 'convex-svelte';
	import ConvexClerkBridge from '$lib/components/ConvexClerkBridge.svelte';
	import { theme, clerkTheme } from '$lib/theme.svelte';
	import { getPostHog } from '$lib/analytics/posthogClient';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { browser, dev } from '$app/environment';
	import { trackKeyboardInset } from '$lib/utils/keyboardInset';
	import { trackPreviousPath } from '$lib/utils/backNavigation';

	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	if (!dev) {
		injectSpeedInsights();
		injectAnalytics();
	}

	setupConvex(PUBLIC_CONVEX_URL);

	const { data, children } = $props();

	trackPreviousPath();

	onMount(() => {
		theme.init();
		void getPostHog();
		return trackKeyboardInset();
	});

	// Track page views on route changes
	$effect(() => {
		if (browser && page.url) {
			void getPostHog().then((posthog) => {
				if (!posthog) return;
				posthog.capture('$pageview', {
					$current_url: page.url.href
				});
			});
		}
	});

	const year = new Date().getFullYear();

	const defaultSeo = {
		image: `${SITE_ORIGIN}/og.png`,
		siteName: 'LearnTerms'
	};

	const routeSeo = $derived(getRouteSeo(page.route.id, page.url.pathname, page.status));
	const seo = $derived({
		...routeSeo,
		title: page.status >= 400 ? routeSeo.title : (page.data?.seo?.title ?? routeSeo.title),
		description:
			page.status >= 400
				? routeSeo.description
				: (page.data?.seo?.description ?? routeSeo.description),
		image: page.data?.seo?.image ?? defaultSeo.image,
		indexable: routeSeo.indexable && page.url.origin === SITE_ORIGIN
	});

	// Study and test screens bring their own top bar on phones, so the site nav steps aside below lg.
	const immersive = $derived(
		/^\/classes\/[^/]+\/(modules\/[^/]+|tests\/(?!new\/?$)[^/]+)\/?$/.test(page.url.pathname)
	);

	const hideFooter = $derived.by(() => {
		const path = page.url.pathname;
		const inClassStudyOrTest =
			path.startsWith('/classes') && (path.includes('/modules/') || path.includes('/tests/'));
		const inGradeCalculator = path.startsWith('/tools/grade-calculator');
		const inAdminModule = path.startsWith('/admin/') && path.includes('/module/');
		const inAdminLibrary = path.startsWith('/admin/library');
		const inAdminProgress = path === '/admin/progress' || path === '/admin/progress/';
		const inQuestionStudio = path.startsWith('/admin/question-studio');
		const inStudySpace = path.startsWith('/study-space');
		return (
			inClassStudyOrTest ||
			inGradeCalculator ||
			inAdminModule ||
			inAdminLibrary ||
			inAdminProgress ||
			inQuestionStudio ||
			inStudySpace
		);
	});
</script>

<svelte:head>
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	{#if seo.indexable}<link rel="canonical" href={seo.canonical} />{/if}
	<meta name="robots" content={seo.indexable ? 'index,follow' : 'noindex,follow'} />

	<meta property="og:url" content={seo.canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={defaultSeo.siteName} />
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:image" content={seo.image} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta property="twitter:domain" content="learnterms.com" />
	<meta property="twitter:url" content={seo.canonical} />
	<meta name="twitter:title" content={seo.title} />
	<meta name="twitter:description" content={seo.description} />
	<meta name="twitter:image" content={seo.image} />
</svelte:head>

<ClerkProvider
	publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}
	appearance={{ baseTheme: $clerkTheme }}
>
	<ConvexClerkBridge initialToken={data?.token ?? null} />
	<PostHogIdentify />
	<div class="flex min-h-screen flex-col">
		<div class={immersive ? 'hidden lg:block' : ''}>
			<NavBar />
		</div>

		<main class="flex-1 w-full">
			{@render children?.()}
		</main>

		{#if !hideFooter}
			<footer class="mt-auto border-t border-base-300 bg-base-200 text-base-content">
				<div
					class="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-5 py-12 sm:grid-cols-4 sm:px-8 lg:px-12"
				>
					<div class="col-span-2 pr-8 sm:col-span-1">
						<BrandLogo class="text-lg" />
						<p class="mt-2 text-sm leading-relaxed text-base-content/70">
							Class-aligned question banks and practice tests for health-professions cohorts.
						</p>
					</div>

					<nav aria-label="Product" class="flex flex-col space-y-1.5 text-sm">
						<h2 class="footer-title">Product</h2>
						<a class="link link-hover" href={resolve('/features')}>Features</a>
						<a class="link link-hover" href={resolve('/pricing')}>Pricing</a>
						<a class="link link-hover" href={resolve('/changelog')}>Changelog</a>
						<a class="link link-hover" href={resolve('/tools/grade-calculator')}>Grade calculator</a
						>
						<a class="link link-hover" href={resolve('/tools/calculator')}>Scientific calculator</a>
					</nav>

					<nav aria-label="Resources" class="flex flex-col space-y-1.5 text-sm">
						<h2 class="footer-title">Resources</h2>
						<a class="link link-hover" href="https://docs.learnterms.com/docs">Documentation</a>
						<a class="link link-hover" href={resolve('/blog')}>Blog</a>
						<a class="link link-hover" href={resolve('/status')}>Status</a>
					</nav>

					<nav aria-label="Project" class="flex flex-col space-y-1.5 text-sm">
						<h2 class="footer-title">Project</h2>
						<a class="link link-hover" href={resolve('/about-us')}>About</a>
						<a class="link link-hover" href={resolve('/contact')}>Contact</a>
						<a
							class="link link-hover"
							href="https://github.com/jdang00/learnterms"
							target="_blank"
							rel="noopener noreferrer">GitHub</a
						>
					</nav>
				</div>
				<div class="border-t border-base-300">
					<div
						class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-base-content/65 sm:flex-row sm:px-8 lg:px-12"
					>
						<p>© {year} LearnTerms. All rights reserved.</p>
						<div class="flex gap-5">
							<a class="link link-hover" href={resolve('/privacy')}>Privacy Policy</a>
							<a class="link link-hover" href={resolve('/terms')}>Terms and Conditions</a>
						</div>
					</div>
				</div>
			</footer>
		{/if}
	</div>
	<Toast />
	<BadgeAwardModal />
</ClerkProvider>
