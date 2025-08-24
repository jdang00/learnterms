<script lang="ts">
	import { SignedIn, SignedOut, SignInButton, UserButton } from 'svelte-clerk';
	import { useClerkContext } from 'svelte-clerk/client';
	import ThemeToggle from './ThemeToggle.svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';

	const ctx = useClerkContext();
	const plan = $derived(ctx.user?.publicMetadata.plan === 'pro');
	const dev = $derived(ctx.user?.publicMetadata.view === 'developer');
	const user = $derived(ctx.user);

	const client = useConvexClient();

	let userDataQuery: any = undefined;
	let cohortsList: any = $state(undefined);
	let selectedCohortId = $state<string>('');

	$effect(() => {
		if (user) {
			userDataQuery = useQuery(api.users.getUserById, { id: user.id });
		} else {
			userDataQuery = undefined;
		}

		if (dev) {
			cohortsList = useQuery(api.cohort.listCohortsWithSchools, {});
		} else {
			cohortsList = undefined;
		}
	});

	$effect(() => {
		if (userDataQuery && !userDataQuery.isLoading && userDataQuery.data?.cohortId) {
			selectedCohortId = userDataQuery.data.cohortId as string;
		}
	});

	async function handleCohortChange(cohortIdStr: string) {
		if (!user) return;
		await client.mutation(api.cohort.joinCohort, {
			clerkUserId: user.id,
			cohortId: cohortIdStr as Id<'cohort'>
		});
		location.reload();
	}
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
		</div>
		<a class="btn btn-ghost text-xl" href="/"
			>LearnTerms <span class="text-xs font-mono text-base-content/70">v3beta</span>
		</a>
	</div>

	<div class="navbar-center hidden lg:flex">
		<ul class="menu menu-horizontal px-1"></ul>
	</div>

	{#if dev}
		<div class="navbar-center hidden lg:flex">
			<select class="select select-bordered select-sm" bind:value={selectedCohortId} onchange={(e) => handleCohortChange((e.target as HTMLSelectElement).value)}>
				<option disabled value="">Select cohort…</option>
				{#if cohortsList && !cohortsList.isLoading && cohortsList.data}
					{#each cohortsList.data as c}
						<option value={c._id}>{c.name} — {c.schoolName}</option>
					{/each}
				{/if}
			</select>
		</div>
	{/if}

	<div class="navbar-end">
		<div class="flex flex-row gap-4">
			<ThemeToggle variant="ghost" size="md" class="btn-circle m-1" />

			{#if plan}
				<div class="self-center">
					<div class="badge badge-primary badge-outline rounded-full hidden sm:block">PRO</div>
				</div>
			{/if}

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
