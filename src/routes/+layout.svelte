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
	<div class="flex items-center justify-between w-full flex-col p-8 min-h-96">
		<div class="w-full">
			<div class="flex justify-between items-end">
				<div class="flex flex-wrap items-end space-x-3">
					<a class="font-medium mt-3 text-3xl" href="/">Introduction to Optometry Terms</a>
					<p class="font-bold text-gray-400">BETA</p>
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
			<slot />
			<footer class="footer footer-center text-base-content p-4 mt-24">
				<aside class="flex flex-row">
					<p>
						Copyright © {new Date().getFullYear()} - Oklahoma College of Optometry Class of 2028 |
					</p>
					<a class="link" href="/about">About / Changelog</a>
				</aside>
				<button class="btn" on:click={handleThemeToggle}>
					{#if $theme === 'dark'}
						<Sun />
					{:else}
						<Moon />
					{/if}
				</button>
			</footer>
		</div>
	</div>
</html>
