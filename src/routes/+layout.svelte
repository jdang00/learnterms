<script lang="ts">
	import 'tailwindcss/tailwind.css';
	import { Palette } from 'lucide-svelte';
	import SignInButton from 'clerk-sveltekit/client/SignInButton.svelte';
	import UserButton from 'clerk-sveltekit/client/UserButton.svelte';
	import SignedIn from 'clerk-sveltekit/client/SignedIn.svelte';
	import SignedOut from 'clerk-sveltekit/client/SignedOut.svelte';
	import { onMount } from 'svelte';

	const themes = ['light', 'dark', 'dracula', 'valentine', 'retro', 'bumblebee', 'nord'];

	onMount(() => {
		const themeChange = window.themeChange;
		if (typeof themeChange !== 'undefined') {
			themeChange(false);
		}
	});
</script>

<svelte:head>
	<title>LearnTerms</title>
	<meta charset="utf-8" />
	<meta name="description" content="Learn terms the fast and easy way. Free forever." />

	<script src="https://cdn.jsdelivr.net/npm/theme-change@2.0.2/index.js"></script>
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
					<li><a href="/about">About</a></li>
					<li><a href="/blog">Blog</a></li>
				</ul>
			</div>
			<a class="btn btn-ghost text-xl" href="/">LearnTerms </a>
		</div>
		<div class="navbar-center hidden lg:flex">
			<ul class="menu menu-horizontal px-1">
				<li><a href="/about">About</a></li>
				<li><a href="/blog">Blog</a></li>
			</ul>
		</div>
		<div class="navbar-end">
			<div class="flex flex-row gap-4">
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
			<slot />
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
