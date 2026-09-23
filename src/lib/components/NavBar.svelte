<script lang="ts">
	import { SignedIn, SignedOut, SignInButton, UserButton } from 'svelte-clerk';
	import { useClerkContext } from 'svelte-clerk/client';
	import ThemeToggle from './ThemeToggle.svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';
	import { Search } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import PowerBar from './power-bar/PowerBar.svelte';
	import type { CohortItem, QuickLinkItem } from './power-bar/types';

	const ctx = useClerkContext();
	const user = $derived(ctx.user);

	const client = useConvexClient();

	const userDataQuery = useQuery(api.users.getUserById, () => (user ? { id: user.id } : 'skip'));

	const subscriptionQuery = useQuery(api.polar.getCurrentUserWithSubscription, () =>
		user ? {} : 'skip'
	);

	const dev = $derived(userDataQuery.data?.role === 'dev');
	const isPro = $derived(
		subscriptionQuery.data?.isPro ||
			subscriptionQuery.data?.subscription?.status === 'active' ||
			subscriptionQuery.data?.subscription?.status === 'trialing'
	);

	const cohortsList = useQuery(api.cohort.listCohortsWithSchools, () => (dev ? {} : 'skip'));
	const quickLinksQuery = useQuery(api.cohort.getCurrentUserQuickLinks, () => (user ? {} : 'skip'));

	let selectedCohortId = $state('');
	let isPowerBarOpen = $state(false);
	let isSwitchingCohort = $state(false);

	const allCohorts = $derived((cohortsList?.data ?? []) as CohortItem[]);
	const activeCohortId = $derived.by(
		() => selectedCohortId || (userDataQuery.data?.cohortId as string | undefined) || ''
	);
	const quickLinks = $derived((quickLinksQuery.data ?? []) as QuickLinkItem[]);

	$effect(() => {
		if (userDataQuery && !userDataQuery.isLoading && userDataQuery.data) {
			const dbCohortId = userDataQuery.data.cohortId as string | undefined;
			selectedCohortId = dbCohortId || '';
		}
	});

	$effect(() => {
		if (!user) {
			selectedCohortId = '';
			isPowerBarOpen = false;
		}
	});

	async function handleCohortChange(cohortIdStr: string) {
		if (!user) return;
		if (!cohortIdStr || cohortIdStr === activeCohortId) {
			isPowerBarOpen = false;
			return;
		}
		selectedCohortId = cohortIdStr;
		isSwitchingCohort = true;
		try {
			await client.mutation(api.authQueries.switchCohort, {
				cohortId: cohortIdStr as Id<'cohort'>
			});
			isPowerBarOpen = false;
			setTimeout(() => location.reload(), 10);
		} finally {
			isSwitchingCohort = false;
		}
	}
</script>

<div class="navbar bg-base-100 h-16">
	<div class="navbar-start">
		<a class="btn btn-ghost rounded-full text-xl" href={resolve('/')}>LearnTerms</a>
	</div>

	{#if !user}
		<nav class="navbar-center hidden gap-1 md:flex" aria-label="Public site">
			<a class="btn btn-ghost btn-sm" href={resolve('/features')}>Features</a>
			<a class="btn btn-ghost btn-sm" href={resolve('/pricing')}>Pricing</a>
			<a class="btn btn-ghost btn-sm" href="https://docs.learnterms.com/docs">Documentation</a>
			<a class="btn btn-ghost btn-sm" href={resolve('/blog')}>Blog</a>
			<a class="btn btn-ghost btn-sm" href={resolve('/about-us')}>About</a>
		</nav>
	{/if}

	{#if user}
		<div class="navbar-center flex sm:hidden">
			<button
				type="button"
				class="btn btn-ghost btn-sm btn-circle"
				onclick={() => (isPowerBarOpen = true)}
				aria-label="Open search"
			>
				<Search size={16} />
			</button>
		</div>

		<div class="navbar-center hidden sm:flex">
			<button
				type="button"
				class="btn btn-outline btn-sm rounded-full border-base-300 hover:border-primary hover:bg-primary/5 px-3 max-w-[24rem]"
				onclick={() => (isPowerBarOpen = true)}
			>
				<Search size={12} class="shrink-0 opacity-50" />
				<span class="truncate text-xs">
					<span class="font-medium">Search</span>
				</span>
				<kbd class="kbd kbd-xs hidden lg:inline-flex opacity-40">⌘K</kbd>
			</button>
		</div>
	{/if}

	<div class="navbar-end">
		<div class="flex flex-row gap-4">
			<ThemeToggle variant="ghost" size="md" class="btn-circle m-1" />

			{#if isPro}
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
					<div class="btn btn-outline btn-primary rounded-full self-end">
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

{#if !user}
	<nav
		class="flex justify-center gap-1 overflow-x-auto border-b border-base-300 px-2 pb-2 md:hidden"
		aria-label="Public site"
	>
		<a class="btn btn-ghost btn-xs" href={resolve('/features')}>Features</a>
		<a class="btn btn-ghost btn-xs" href={resolve('/pricing')}>Pricing</a>
		<a class="btn btn-ghost btn-xs" href="https://docs.learnterms.com/docs">Documentation</a>
		<a class="btn btn-ghost btn-xs" href={resolve('/blog')}>Blog</a>
		<a class="btn btn-ghost btn-xs" href={resolve('/about-us')}>About</a>
	</nav>
{/if}

{#if user}
	<PowerBar
		bind:isOpen={isPowerBarOpen}
		canSwitchCohorts={dev}
		cohorts={allCohorts}
		{activeCohortId}
		{isSwitchingCohort}
		{quickLinks}
		onSwitchCohort={handleCohortChange}
	/>
{/if}
