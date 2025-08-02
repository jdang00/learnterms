<script lang="ts">
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

	const defaultActions: QuickAction[] = [
		{
			title: 'Admin Dashboard',
			icon: '✏️',
			href: '/admin'
		}
	];

	const finalActions = actions.length > 0 ? actions : defaultActions;
</script>

<div class="lg:col-span-1">
	<h3 class="text-lg font-semibold mb-6">{title}</h3>

	<div class="space-y-3">
		{#each finalActions as action (action.title)}
			<button
				type="button"
				class="card bg-base-100 shadow-md hover:shadow-lg hover:translate-y-[-2px] transition-all duration-300 cursor-pointer w-full text-left"
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
</div>
