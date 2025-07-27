<script lang="ts">
	import { PanelRight } from 'lucide-svelte';

	let { module } = $props();
	let hideSidebar = $state(false);
</script>

<div
	class="
		hidden lg:block
		overflow-y-auto
		h-screen
		border border-base-300
		rounded-xl
		p-3
		mx-4
		transition-all duration-200 ease-out
		{hideSidebar ? 'w-1/16' : 'w-1/4'}
	"
>
	<button class="btn btn-ghost" onclick={() => (hideSidebar = !hideSidebar)}>
		<PanelRight class="transition-transform duration-300 {hideSidebar ? 'rotate-180' : ''}" />
	</button>

	{#if !hideSidebar}
		<div class="p-6">
			<h4 class="font-bold text-sm tracking-wide text-secondary mb-2">
				CHAPTER {module.data.order}
			</h4>
			<h2 class="font-semibold text-3xl mt-4">{module.data.title}</h2>
			<p class="text-base-content/70 mt-2">{module.data.description}</p>
		</div>
	{/if}
</div>
