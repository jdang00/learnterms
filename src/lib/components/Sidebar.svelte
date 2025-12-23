<script lang="ts">
	import { useClerkContext } from 'svelte-clerk/client';

	const ctx = useClerkContext();

	const admin = $derived(ctx.user?.publicMetadata.role === 'admin');
	const contributor = $derived(ctx.user?.publicMetadata.create === 'contributor');
	const userRole = $derived(
		ctx.user?.publicMetadata.role === 'student' || ctx.user?.publicMetadata.role === 'user'
	);

	interface QuickAction {
		title: string;
		icon: string;
		href?: string;
		onClick?: () => void;
	}

	interface Props {
		title?: string;
		actions?: QuickAction[];
	}

	let { title = 'Quick Actions', actions = [] }: Props = $props();

	let finalActions: QuickAction[] = $state([]);

	$effect(() => {
		if (actions.length > 0) {
			finalActions = actions;
			return;
		}
		const computed: QuickAction[] = [];
		if (admin || contributor) {
			computed.push({ title: 'Admin Dashboard', icon: '✏️', href: '/admin' });
			computed.push({ title: 'Content Library', icon: '📚', href: '/admin/library' });
			computed.push({ title: 'Question Studio', icon: '✨', href: '/admin/question-studio' });
			computed.push({ title: 'Class Progress', icon: '📊', href: '/admin/progress' });
		}
		if (userRole) {
			computed.push({ title: 'My Dashboard', icon: '🏠', href: '/classes' });
		}
		finalActions = computed;
	});
</script>

<div class="lg:col-span-1">
	<h3 class="text-lg font-semibold mb-6">{title}</h3>

	{#if finalActions.length > 0}
		<div class="space-y-3">
			{#each finalActions as action (action.title)}
				<button
					type="button"
					class="card bg-base-100 border border-base-300 hover:border-primary shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all duration-300 cursor-pointer w-full text-left"
					onclick={action.onClick}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							action.onClick?.();
						}
					}}
				>
					<a href={action.href} class="card-body p-4">
						<div class="flex justify-between">
							<div class="flex space-x-3">
								<span>{action.icon}</span>
								<span class="font-medium">{action.title}</span>
							</div>
						</div>
					</a>
				</button>
			{/each}
		</div>
	{:else}
		<div class="text-base-content/70">No links for now</div>
	{/if}
</div>
