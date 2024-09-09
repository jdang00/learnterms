<script lang="ts">
	import Quiz from './quiz/quiz.svelte';
	import SignInButton from 'clerk-sveltekit/client/SignInButton.svelte';

	import UserButton from 'clerk-sveltekit/client/UserButton.svelte';
	import SignedIn from 'clerk-sveltekit/client/SignedIn.svelte';
	import SignedOut from 'clerk-sveltekit/client/SignedOut.svelte';
</script>

<div class="flex items-center justify-between w-full flex-col p-8 min-h-screen">
	<div class="w-full">
		<div class="flex justify-between items-end">
			<div class="flex flex-wrap items-end space-x-3">
				<a class="font-medium mt-3 text-3xl" href="/">Introduction to Optometry Terms</a>
				<p class="font-bold text-gray-400">BETA</p>
			</div>

			<div class="self-center">
				<SignedIn>
					<UserButton class="item-end" afterSignOutUrl="/" />
				</SignedIn>
				<SignedOut>
					<SignInButton class="btn btn-link self-end">Login</SignInButton>
				</SignedOut>
			</div>
		</div>
		<div class="flex flex-col space-y-2 items-center">
			<Quiz />
			<a class="btn btn-active btn-secondary max-w-lg" href="/terms">View all cards</a>
		</div>
	</div>
</div>

<footer class="footer footer-center text-base-content p-4">
	<aside>
		<p>Copyright © {new Date().getFullYear()} - Justin A. Dang</p>
	</aside>
</footer>
