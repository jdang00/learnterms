<script lang="ts">
	import SignInButton from 'clerk-sveltekit/client/SignInButton.svelte';

	import UserButton from 'clerk-sveltekit/client/UserButton.svelte';
	import SignedIn from 'clerk-sveltekit/client/SignedIn.svelte';
	import SignedOut from 'clerk-sveltekit/client/SignedOut.svelte';
	import { TestTube } from 'lucide-svelte';
</script>

<div class="flex items-center justify-between w-full flex-col p-8 min-h-96">
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

		<div class="max-w-3xl">
			<h1 class="text-3xl mt-5 font-semibold text-gray-700">About</h1>
			<p class="text-gray-500 mt-3">
				Learn Terms is a custom study solution built by and for the Northeastern State University
				Oklahoma College of Optometry Class of 2028. It is meant to compliment exisiting study tools
				like Quizlet and Anki by implementing features that don't exist or need to be paid for on
				other platforms. This site will remain truly free and open source. Forever. Period. To see
				the source code of the site, visit the <a
					class="link link-secondary"
					href="https://github.com/jdang00/learnterms"
					target="_blank">GitHub</a
				>
				.
			</p>

			<h1 class="text-3xl mt-5 font-semibold text-gray-700">Changelog</h1>

			<h3 class="text-xl mt-3 font-medium text-gray-600 px-3">September 8, 2024</h3>
			<ul class="mt-5 m-8">
				<li>Added tab to reveal word</li>
				<li>Added toggle switch for list and grid view for cards</li>
				<li>Cursor focus implementation</li>
				<li>Made this page</li>
				<li>Migrated card architecture to backend database (PostgreSQL)</li>
				<li>Login implementation</li>
			</ul>
		</div>
	</div>
</div>

<style>
	ul {
		list-style-type: '✨';
	}
</style>
