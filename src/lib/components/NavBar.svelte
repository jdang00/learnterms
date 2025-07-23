<script lang="ts">
	import { Palette } from 'lucide-svelte';
	import { themeChange } from 'theme-change';
	import { SignedIn, SignedOut, SignInButton, UserButton } from 'svelte-clerk';

	const themes = ['light', 'dark', 'dracula', 'nord'];

	$effect(() => {
		themeChange(false);
	});
</script>

<div class="navbar bg-base-100 h-16">
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
			></ul>
		</div>
		<a class="btn btn-ghost text-xl" href="/">LearnTerms</a>
	</div>

	<div class="navbar-center hidden lg:flex">
		<ul class="menu menu-horizontal px-1"></ul>
	</div>

	<div class="navbar-end">
		<div class="flex flex-row">
			<div class="dropdown dropdown-end">
				<div tabindex="-1" class="btn btn-ghost m-1">
					<Palette size="22" />
				</div>

				<ul
					tabindex="-1"
					class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow"
				>
					{#each themes as themeOption (themeOption)}
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
					<div class="mt-1">
						<UserButton afterSignOutUrl="/" />
					</div>
				</SignedIn>
				<SignedOut>
					<div class="btn btn-outline btn-primary self-end">
						<SignInButton
							forceRedirectUrl="/sign-in"
							fallbackRedirectUrl="/sign-in"
							signUpForceRedirectUrl="/sign-up"
							signUpFallbackRedirectUrl="/sign-up"
						/>
					</div>
				</SignedOut>
			</div>
		</div>
	</div>
</div>
