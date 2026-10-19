<script lang="ts">
	import { SignedIn, SignedOut, UserButton } from 'svelte-clerk';
	import { useClerkContext } from 'svelte-clerk/client';
	import ThemeToggle from './ThemeToggle.svelte';
	import BrandLogo from './BrandLogo.svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';
	import Search from '@lucide/svelte/icons/search';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { onMount } from 'svelte';
	import { modifierKeyLabel } from '$lib/utils/platform';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Kbd } from '$lib/components/ui/kbd';
	import PowerBar from './power-bar/PowerBar.svelte';
	import type { CohortItem, QuickLinkItem } from './power-bar/types';

	const publicLinks = [
		{ href: resolve('/features'), label: 'Features' },
		{ href: resolve('/pricing'), label: 'Pricing' },
		{ href: 'https://docs.learnterms.com/docs', label: 'Docs' },
		{ href: resolve('/blog'), label: 'Blog' },
		{ href: resolve('/about-us'), label: 'About' }
	];

	const isCurrent = (href: string) =>
		href.startsWith('/') &&
		(page.url.pathname === href || page.url.pathname.startsWith(`${href}/`));

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
	// Read after mount: the server can't know whether this is a Mac.
	let modifierKey = $state('');
	onMount(() => (modifierKey = modifierKeyLabel()));
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

<div class="flex h-16 w-full items-center bg-background p-2">
	<div class="inline-flex w-1/2 items-center justify-start">
		<BrandLogo class="ml-1 rounded-full px-2 py-1 text-xl sm:ml-2" />
	</div>

	{#if !user}
		<nav class="hidden shrink-0 items-center gap-1 md:flex" aria-label="Public site">
			{#each publicLinks as link (link.href)}
				<!-- eslint-disable svelte/no-navigation-without-resolve -- resolved in publicLinks; Docs is external -->
				<a
					class="nav-link"
					href={link.href}
					aria-current={isCurrent(link.href) ? 'page' : undefined}>{link.label}</a
				>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{/each}
		</nav>
	{/if}

	{#if user}
		<div class="flex shrink-0 items-center sm:hidden">
			<Button
				variant="ghost"
				tone="neutral"
				size="sm"
				shape="circle"
				onclick={() => (isPowerBarOpen = true)}
				aria-label="Open search"
			>
				<Search size={16} />
			</Button>
		</div>

		<div class="hidden shrink-0 items-center sm:flex">
			<Button
				variant="outline"
				tone="neutral"
				size="sm"
				class="max-w-[24rem] px-3 hover:border-primary hover:bg-primary/5"
				onclick={() => (isPowerBarOpen = true)}
			>
				<Search size={12} class="shrink-0 opacity-50" />
				<span class="truncate text-xs">
					<span class="font-medium">Search</span>
				</span>
				{#if modifierKey}
					<span class="hidden items-center gap-0.5 opacity-50 lg:inline-flex" aria-hidden="true">
						<Kbd>{modifierKey}</Kbd><Kbd>K</Kbd>
					</span>
				{/if}
			</Button>
		</div>
	{/if}

	<div class="inline-flex w-1/2 items-center justify-end">
		<div class="flex flex-row items-center gap-2 sm:gap-3">
			<ThemeToggle variant="ghost" size="md" class="m-1" />

			{#if isPro}
				<div class="self-center">
					<Badge
						tone="primary"
						size="md"
						class="hidden gap-1 px-2.5 font-bold tracking-wide shadow-[inset_0_1px_0_rgb(255_255_255/0.6),inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_22%,transparent)] sm:inline-flex"
					>
						<Sparkles />Pro
					</Badge>
				</div>
			{/if}

			<div class="self-center">
				<SignedIn>
					<div class="mt-1">
						<UserButton afterSignOutUrl="/" />
					</div>
				</SignedIn>
				<SignedOut>
					<div class="flex items-center gap-1">
						<Button variant="ghost" tone="neutral" size="sm" href={resolve('/sign-in')}
							>Sign in</Button
						>
						<Button size="sm" class="hidden px-4 sm:inline-flex" href={resolve('/sign-up')}
							>Get started</Button
						>
					</div>
				</SignedOut>
			</div>
		</div>
	</div>
</div>

{#if !user}
	<nav
		class="flex justify-center gap-1 overflow-x-auto border-b border-border px-2 pb-2 md:hidden"
		aria-label="Public site"
	>
		{#each publicLinks as link (link.href)}
			<!-- eslint-disable svelte/no-navigation-without-resolve -- resolved in publicLinks; Docs is external -->
			<a
				class="nav-link nav-link-sm"
				href={link.href}
				aria-current={isCurrent(link.href) ? 'page' : undefined}>{link.label}</a
			>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/each}
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

<style>
	.nav-link {
		position: relative;
		border-radius: 999px;
		padding: 0.35rem 0.8rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: color-mix(in oklab, var(--foreground) 70%, transparent);
		transition:
			color 0.15s ease,
			background-color 0.15s ease;
	}

	.nav-link:hover {
		color: var(--foreground);
		background: color-mix(in oklab, var(--foreground) 6%, transparent);
	}

	.nav-link[aria-current='page'] {
		color: var(--foreground);
	}

	.nav-link[aria-current='page']::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: -0.2rem;
		width: 0.3rem;
		height: 0.3rem;
		border-radius: 999px;
		background: var(--primary);
		transform: translateX(-50%);
	}

	.nav-link-sm {
		padding: 0.25rem 0.65rem;
		font-size: 0.8rem;
		white-space: nowrap;
	}
</style>
