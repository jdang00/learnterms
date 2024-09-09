<script lang="ts">
	import 'tailwindcss/tailwind.css';
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
			<footer class="footer footer-center text-base-content p-4">
				<aside class="flex flex-row">
					<p>
						Copyright © {new Date().getFullYear()} - Oklahoma College of Optometry Class of 2028 |
					</p>
					<a class="link" href="/about">About / Changelog</a>
				</aside>
				<label class="flex cursor-pointer gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="5" />
						<path
							d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
						/>
					</svg>
					{#if theme === 'dark'}
						<input
							type="checkbox"
							on:click={() => (theme = 'light')}
							class="toggle theme-controller"
						/>
					{:else}
						<input
							type="checkbox"
							on:click={() => (theme = 'dark')}
							class="toggle theme-controller"
						/>
					{/if}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
					</svg>
				</label>
			</footer>
		</div>
	</div>
</html>
