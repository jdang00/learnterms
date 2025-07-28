<script lang="ts">
	import { PanelRight, Eye } from 'lucide-svelte';

	let { qs = $bindable(), module, currentlySelected } = $props();
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
		{hideSidebar ? 'w-1/20' : 'w-1/4'}
	"
>
	<button class="btn btn-ghost btn-sm" onclick={() => (hideSidebar = !hideSidebar)}>
		<PanelRight
			size={18}
			class="transition-transform duration-300 {hideSidebar ? 'rotate-180' : ''}"
		/>
	</button>

	{#if !hideSidebar}
		<div class="p-6">
			<h4 class="font-bold text-sm tracking-wide text-secondary mb-2">
				CHAPTER {module.data.order}
			</h4>
			<h2 class="font-semibold text-3xl mt-4">{module.data.title}</h2>
			<p class="text-base-content/70 mt-2">{module.data.description}</p>
		</div>

		<div class="flex flex-col justify-center m-4">
			<div class="card bg-base-100 shadow-xl mt-12">
				<div class="card-body">
					<div class="flex flex-row flex-wrap justify-between border-b pb-2">
						<h2 class="card-title">Solution</h2>
						<div class="flex flex-row">
							<kbd class="kbd kbd-sm hidden xl:block self-center me-1">tab</kbd>
							<button class="btn btn-ghost btn-circle" onclick={() => qs.handleSolution()}>
								<Eye />
							</button>
						</div>
					</div>
					<p
						class={`mt-2 transition-all duration-300 ${qs.showSolution ? 'blur-none' : 'blur-sm'}`}
					>
						{currentlySelected.explanation}
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>
