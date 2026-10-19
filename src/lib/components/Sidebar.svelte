<script lang="ts">
	import { useAuth, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import type { QuickLinkPath } from './power-bar/types';

	const convexAuth = useAuth();
	const quickLinksQuery = useQuery(api.cohort.getCurrentUserQuickLinks, () =>
		convexAuth.isAuthenticated ? {} : 'skip'
	);

	interface QuickAction {
		title: string;
		description?: string;
		icon: string;
		href?: QuickLinkPath;
		onClick?: () => void;
	}

	interface Props {
		title?: string;
		actions?: QuickAction[];
		// chips: one horizontal row for phones, where the sidebar column would land below everything.
		variant?: 'list' | 'chips';
	}

	let { title = 'Quick Links', actions = [], variant = 'list' }: Props = $props();

	let finalActions: QuickAction[] = $state([]);

	$effect(() => {
		if (actions.length > 0) {
			finalActions = actions;
			return;
		}
		finalActions = quickLinksQuery.data ?? [];
	});

	const currentPath = $derived($page.url.pathname);
	const isExternalLink = (href: QuickLinkPath) => href.startsWith('http');
	const resolveInternalHref = (href: string) => `${base}${href}`;
</script>

{#if variant === 'chips'}
	{#if finalActions.length > 0}
		<nav
			aria-label={title}
			class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
		>
			{#each finalActions as action (action.title)}
				{#if action.href && !isExternalLink(action.href)}
					<!-- eslint-disable svelte/no-navigation-without-resolve -- base-prefixed by resolveInternalHref -->
					<a
						href={resolveInternalHref(action.href)}
						class="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium active:bg-muted"
						onclick={action.onClick}
					>
						<span aria-hidden="true">{action.icon}</span>{action.title}
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{:else}
					<button
						type="button"
						class="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium active:bg-muted"
						onclick={() => {
							if (action.href) window.open(action.href, '_blank', 'noreferrer');
							action.onClick?.();
						}}
					>
						<span aria-hidden="true">{action.icon}</span>{action.title}
					</button>
				{/if}
			{/each}
		</nav>
	{/if}
{:else}
	<div class="lg:col-span-1">
		<h3 class="mb-4 label-caps">
			{title}
		</h3>

		{#if finalActions.length > 0}
			<nav class="sidebar-nav flex flex-col gap-1">
				{#each finalActions as action (action.title)}
					{@const isActive =
						action.href && !isExternalLink(action.href) && currentPath === action.href}
					{#if action.href}
						{#if isExternalLink(action.href)}
							<button
								type="button"
								class="sidebar-link group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200"
								onclick={() => {
									window.open(action.href, '_blank', 'noreferrer');
									action.onClick?.();
								}}
							>
								<span
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm transition-transform duration-200 group-hover:scale-110"
								>
									{action.icon}
								</span>
								<div class="min-w-0 flex-1">
									<span class="block text-sm font-medium">{action.title}</span>
									{#if action.description}
										<span class="block truncate text-xs text-foreground/50"
											>{action.description}</span
										>
									{/if}
								</div>
								<ChevronRight
									size={14}
									class="text-foreground/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground/60"
								/>
							</button>
						{:else}
							<!-- eslint-disable svelte/no-navigation-without-resolve -- base-prefixed by resolveInternalHref -->
							<a
								href={resolveInternalHref(action.href)}
								class="sidebar-link group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200"
								class:sidebar-link--active={isActive}
								onclick={action.onClick}
							>
								<span
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm transition-transform duration-200 group-hover:scale-110"
									class:sidebar-icon--active={isActive}
								>
									{action.icon}
								</span>
								<div class="min-w-0 flex-1">
									<span class="block text-sm font-medium">{action.title}</span>
									{#if action.description}
										<span class="block truncate text-xs text-foreground/50"
											>{action.description}</span
										>
									{/if}
								</div>
								<ChevronRight
									size={14}
									class="text-foreground/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground/60"
								/>
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{/if}
					{:else}
						<button
							type="button"
							class="sidebar-link group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200"
							onclick={action.onClick}
						>
							<span
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm transition-transform duration-200 group-hover:scale-110"
							>
								{action.icon}
							</span>
							<div class="min-w-0 flex-1">
								<span class="block text-sm font-medium">{action.title}</span>
								{#if action.description}
									<span class="block truncate text-xs text-foreground/50">{action.description}</span
									>
								{/if}
							</div>
							<ChevronRight
								size={14}
								class="text-foreground/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground/60"
							/>
						</button>
					{/if}
				{/each}
			</nav>
		{:else}
			<div class="text-sm text-foreground/50">No links for now</div>
		{/if}
	</div>
{/if}

<style>
	.sidebar-link {
		color: var(--foreground);
	}

	.sidebar-link:hover {
		background: color-mix(in oklab, var(--foreground) 5%, transparent);
	}

	.sidebar-link--active {
		background: color-mix(in oklab, var(--primary) 8%, transparent);
	}

	.sidebar-link--active:hover {
		background: color-mix(in oklab, var(--primary) 12%, transparent);
	}

	.sidebar-icon--active {
		background: color-mix(in oklab, var(--primary) 14%, transparent);
		border-radius: 0.5rem;
	}
</style>
