<script lang="ts">
	import '../app.css';
	let { children } = $props();

	import { Palette } from 'lucide-svelte';
	import SignInButton from 'clerk-sveltekit/client/SignInButton.svelte';
	import UserButton from 'clerk-sveltekit/client/UserButton.svelte';
	import SignedIn from 'clerk-sveltekit/client/SignedIn.svelte';
	import SignedOut from 'clerk-sveltekit/client/SignedOut.svelte';
	import { themeChange } from 'theme-change';

	const themes = ['light', 'dark', 'dracula', 'retro', 'nord'];

	$effect(() => {
		themeChange(false);

		if (browser) {
			posthog.init('phc_3eXFYO1aHVEWM75fi3wXFE6OiJZiDNvI5pcl67S19fK', {
				api_host: 'https://us.i.posthog.com',
				capture_pageview: false,
				capture_pageleave: false
			});
		}
	});

	import { browser } from '$app/environment';
	import { beforeNavigate, afterNavigate } from '$app/navigation';
	import posthog from 'posthog-js';

	if (browser) {
		beforeNavigate(() => posthog.capture('$pageleave'));
		afterNavigate(() => posthog.capture('$pageview'));
	}
</script>

<svelte:head>
	<title>LearnTerms</title>
	<meta name="description" content="Learn terms the fast and easy way. Free forever." />

	<meta property="og:url" content="https://learnterms.com" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="LearnTerms" />
	<meta property="og:description" content="Smarter Studying, Simplified." />
	<meta
		property="og:image"
		content="https://utfs.io/f/DYlXFqnaImOr6b8ZTOYKMG3TeLB2CicaW8b1hoH7EIvUmVsj"
	/>

	<meta name="twitter:card" content="summary_large_image" />
	<meta property="twitter:domain" content="learnterms.com" />
	<meta property="twitter:url" content="https://learnterms.com" />
	<meta name="twitter:title" content="LearnTerms" />
	<meta name="twitter:description" content="Learn terms the fast and easy way. Free forever." />
	<meta
		name="twitter:image"
		content="https://utfs.io/f/DYlXFqnaImOrrhcGjisLdGjaF1OlZIY57ygCH9oDWsxAUveS"
	/>
</svelte:head>

<div class="min-h-screen">
	<div class="navbar bg-base-100 mt-2 px-4">
		<div class="navbar-start">
			<div class="dropdown">
				<div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h8m-8 6h16"
						/>
					</svg>
				</div>
				<ul
					tabindex="-1"
					class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
				>
					<li><a href="/blog">Blog</a></li>
				</ul>
			</div>
			<a class="btn btn-ghost text-xl" href="/">LearnTerms </a>
		</div>
		<div class="navbar-center hidden lg:flex">
			<ul class="menu menu-horizontal px-1">
				<li><a href="/blog">Blog</a></li>
			</ul>
		</div>
		<div class="navbar-end">
			<div class="flex flex-row">
				<div class="dropdown dropdown-end">
					<div tabindex="-1" class="btn btn-ghost m-1">
						<Palette />
					</div>

					<ul
						tabindex="-1"
						class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow"
					>
						{#each themes as themeOption}
							<li>
								<button data-set-theme={themeOption} data-act-class="active">
									{themeOption}
								</button>
							</li>
						{/each}
					</ul>
				</div>

				<a
					class="btn btn-ghost self-center me-4 hidden lg:flex"
					href="https://github.com/jdang00/learnterms"
					target="_blank"
					aria-label="GitHub"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-github"
						><path
							d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
						/><path d="M9 18c-4.51 2-5-2-7-2" /></svg
					>
				</a>
				<div class="self-center">
					<SignedIn>
						<UserButton afterSignOutUrl="/" />
					</SignedIn>
					<SignedOut>
						<SignInButton class="btn btn-link self-end">Login</SignInButton>
					</SignedOut>
				</div>
			</div>
		</div>
	</div>
	<div class="flex min-h-96 w-full flex-col items-center justify-between">
		<div class="w-full">
			{@render children?.()}
			<footer class="footer footer-center text-base-content mt-24 p-4">
				<aside class="flex flex-row flex-wrap justify-center">
					<p>
						Copyright © {new Date().getFullYear()} - Oklahoma College of Optometry Class of 2028 |
					</p>
					<a class="link" href="/changelog">Changelog</a>
				</aside>
			</footer>
		</div>
	</div>
</div>
