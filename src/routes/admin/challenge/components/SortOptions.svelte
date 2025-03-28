<script lang="ts">
	import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-svelte';

	let { lm = $bindable() } = $props();
</script>

<!-- Quick stats about results -->
<div class="text-sm text-base-content/70 whitespace-nowrap">
	<span class="me-2">{lm.filteredQuestions.length} questions found</span>
	<!-- Sort Dropdown -->
	<div class="dropdown dropdown-end">
		<div tabindex="0" role="button" class="btn">
			{#if lm.sortField === 'created_at'}
				{#if lm.sortDirection === 'asc'}
					<ArrowUp size={16} />
				{:else}
					<ArrowDown size={16} />
				{/if}
				<span> {lm.sortDirection === 'asc' ? 'Oldest' : 'Newest'} First</span>
			{:else}
				<ArrowUpDown size={16} />
				<span>Sort</span>
			{/if}
		</div>
		<ul tabindex="-1" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
			<li>
				<button onclick={() => lm.toggleSort('created_at')}>
					<ArrowDown
						size={16}
						class={lm.sortField === 'created_at' && lm.sortDirection === 'desc' ? '' : 'opacity-30'}
					/>
					<span>Newest First</span>
				</button>
			</li>
			<li>
				<button
					onclick={() => {
						lm.toggleSort('created_at');
						if (lm.sortDirection === 'desc') lm.sortDirection = 'asc';
					}}
				>
					<ArrowUp
						size={16}
						class={lm.sortField === 'created_at' && lm.sortDirection === 'asc' ? '' : 'opacity-30'}
					/>
					<span>Oldest First</span>
				</button>
			</li>
			{#if lm.sortField}
				<li>
					<button onclick={() => lm.clearSort()}>Clear Sort</button>
				</li>
			{/if}
		</ul>
	</div>
</div>
