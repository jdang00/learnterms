<script lang="ts">
	import 'tailwindcss/tailwind.css';
	import { Sun, Moon } from 'lucide-svelte';

	let theme: string = 'light';
	import SignInButton from 'clerk-sveltekit/client/SignInButton.svelte';

	import UserButton from 'clerk-sveltekit/client/UserButton.svelte';
	import SignedIn from 'clerk-sveltekit/client/SignedIn.svelte';
	import SignedOut from 'clerk-sveltekit/client/SignedOut.svelte';
</script>

<html data-theme={theme} lang="en" class="min-h-screen">
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
				{#if theme === 'dark'}
					<button class="btn" on:click={() => (theme = 'light')}><Sun /></button>
				{:else}
					<button class="btn" on:click={() => (theme = 'dark')}><Moon /></button>
				{/if}
			</footer>
		</div>
	</div>
</html>
