<script lang="ts">
	import 'tailwindcss/tailwind.css';
	import { Sun, Moon } from 'lucide-svelte';
	import SignInButton from 'clerk-sveltekit/client/SignInButton.svelte';
	import UserButton from 'clerk-sveltekit/client/UserButton.svelte';
	import SignedIn from 'clerk-sveltekit/client/SignedIn.svelte';
	import SignedOut from 'clerk-sveltekit/client/SignedOut.svelte';
	import { theme, manuallySet, toggleTheme } from '$lib/themeStore';
	import { onMount } from 'svelte';

	let currentTheme: string;
	let isManuallySet: boolean;

	theme.subscribe((value) => {
		currentTheme = value;
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', value);
		}
	});

	manuallySet.subscribe((value) => {
		isManuallySet = value;
	});

	onMount(() => {
		// Check system preference on mount only if theme hasn't been manually set
		if (!isManuallySet) {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			if (prefersDark && currentTheme === 'light') {
				theme.set('dark');
			} else if (!prefersDark && currentTheme === 'dark') {
				theme.set('light');
			}
		}
	});

	function handleThemeToggle() {
		toggleTheme();
	}
</script>

<html lang="en" class="min-h-screen">
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
			</div>
			<a class="btn btn-ghost text-xl" href="/"
				>LearnTerms
				<p class="font-bold text-sm text-gray-400 mt-1">BETA</p>
			</a>
		</div>
		<div class="navbar-center hidden lg:flex"></div>
		<div class="navbar-end">
			<div class="flex flex-row gap-3">
				<button class="btn btn-sm" on:click={handleThemeToggle}>
					{#if $theme === 'dark'}
						<Sun />
					{:else}
						<Moon />
					{/if}
				</button>
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
	<div class="flex items-center justify-between w-full flex-col p-8 min-h-96">
		<div class="w-full">
			<slot />
			<footer class="footer footer-center text-base-content p-4 mt-24">
				<aside class="flex flex-row">
					<p>
						Copyright © {new Date().getFullYear()} - Oklahoma College of Optometry Class of 2028 |
					</p>
					<a class="link" href="/about">About / Changelog</a>
				</aside>
			</footer>
		</div>
	</div>
</html>
