<script lang="ts">
	import { useClerkContext } from 'svelte-clerk/client';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import { ChevronRight } from 'lucide-svelte';
	import { page } from '$app/stores';

	const ctx = useClerkContext();
	const clerkUser = $derived(ctx.user);
	const userDataQuery = useQuery(api.users.getUserById, () =>
		clerkUser ? { id: clerkUser.id } : 'skip'
	);

	const dev = $derived(userDataQuery.data?.role === 'dev');
	const admin = $derived(userDataQuery.data?.role === 'admin');
	const curator = $derived(userDataQuery.data?.role === 'curator');
	const userRole = $derived(!userDataQuery.data?.role);

	interface QuickAction {
		title: string;
		description?: string;
		icon: string;
		href?: string;
		onClick?: () => void;
	}

	interface Props {
		title?: string;
		actions?: QuickAction[];
	}

	let { title = 'Quick Links', actions = [] }: Props = $props();

	let finalActions: QuickAction[] = $state([]);

	$effect(() => {
		if (actions.length > 0) {
			finalActions = actions;
			return;
		}
		const computed: QuickAction[] = [];
		if (dev || admin || curator) {
			computed.push({ title: 'Admin Dashboard', description: 'Manage classes and settings', icon: '✏️', href: '/admin' });
			computed.push({ title: 'Content Library', description: 'Organize notes, docs, and lectures', icon: '📚', href: '/admin/library' });
			computed.push({ title: 'Question Studio', description: 'AI-powered question generation', icon: '✨', href: '/admin/question-studio' });
			computed.push({ title: 'Class Progress', description: 'Track student performance', icon: '📊', href: '/admin/progress' });
		}
		if (userRole) {
			computed.push({ title: 'My Dashboard', description: 'Your classes and modules', icon: '🏠', href: '/classes' });
		}
		if (userDataQuery.data?.cohortId) {
			computed.push({ title: 'Class Activity', description: 'See classmate badges and stats', icon: '🏅', href: '/cohort' });
		}
		finalActions = computed;
	});

	const currentPath = $derived($page.url.pathname);
</script>

<div class="lg:col-span-1">
	<h3 class="mb-4 text-xs font-semibold uppercase tracking-wider text-base-content/50">
		{title}
	</h3>

	{#if finalActions.length > 0}
		<nav class="sidebar-nav flex flex-col gap-1">
			{#each finalActions as action (action.title)}
				{@const isActive = action.href && currentPath === action.href}
				<a
					href={action.href}
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
							<span class="block truncate text-xs text-base-content/50">{action.description}</span>
						{/if}
					</div>
					<ChevronRight
						size={14}
						class="text-base-content/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-base-content/60"
					/>
				</a>
			{/each}
		</nav>
	{:else}
		<div class="text-sm text-base-content/50">No links for now</div>
	{/if}
</div>

<style>
	.sidebar-link {
		color: var(--color-base-content);
	}

	.sidebar-link:hover {
		background: color-mix(in oklab, var(--color-base-content) 5%, transparent);
	}

	.sidebar-link--active {
		background: color-mix(in oklab, var(--color-primary) 8%, transparent);
	}

	.sidebar-link--active:hover {
		background: color-mix(in oklab, var(--color-primary) 12%, transparent);
	}

	.sidebar-icon--active {
		background: color-mix(in oklab, var(--color-primary) 14%, transparent);
		border-radius: 0.5rem;
	}
</style>
