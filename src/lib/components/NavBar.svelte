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

	// Initialize selectedCohortId from localStorage
	let selectedCohortId = $state('');

	// Load from localStorage after component mount
	$effect(() => {
		selectedCohortId = typeof window !== 'undefined' ? localStorage.getItem('selectedCohortId') || '' : '';
	});

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

	// Sync with database only if user data exists and differs
	$effect(() => {
		if (userDataQuery && !userDataQuery.isLoading && userDataQuery.data?.cohortId && selectedCohortId) {
			const dbCohortId = userDataQuery.data.cohortId as string;
			// Only update if database has a different value AND we already have a selection
			if (dbCohortId !== selectedCohortId) {
				selectedCohortId = dbCohortId;
				localStorage.setItem('selectedCohortId', dbCohortId);
			}
		}
	});

	// Clear localStorage when user logs out
	$effect(() => {
		if (!user) {
			localStorage.removeItem('selectedCohortId');
			selectedCohortId = '';
		}
	});

	async function handleCohortChange(cohortIdStr: string) {
		if (!user) return;

		localStorage.setItem('selectedCohortId', cohortIdStr);
		selectedCohortId = cohortIdStr;

		localStorage.getItem('selectedCohortId'); 

		await client.mutation(api.cohort.joinCohort, {
			clerkUserId: user.id,
			cohortId: cohortIdStr as Id<'cohort'>
		});

		setTimeout(() => location.reload(), 10);
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
			<div class="dropdown">
				<div tabindex="0" role="button" class="btn btn-ghost btn-sm px-56">
					{#if selectedCohortId && cohortsList && !cohortsList.isLoading && cohortsList.data}
						{@const selectedCohort = cohortsList.data.find((c: any) => c._id === selectedCohortId)}
						{#if selectedCohort}
							{selectedCohort.name} — {selectedCohort.schoolName}
						{:else}
							Select cohort…
						{/if}
					{:else}
						Select cohort…
					{/if}
				</div>
				<ul tabindex="-1" class="dropdown-content menu bg-base-100 rounded-box z-[1]  p-2 shadow">
					{#if cohortsList && !cohortsList.isLoading && cohortsList.data}
						{#each cohortsList.data as c}
							<li>
								<button
									class="cursor-pointer {selectedCohortId === c._id ? 'bg-primary text-primary-content' : ''}"
									onclick={() => handleCohortChange(c._id)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											handleCohortChange(c._id);
										}
									}}
									type="button"
								>
									{c.name} — {c.schoolName}
								</button>
							</li>
						{/each}
					{/if}
				</ul>
			</div>
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
