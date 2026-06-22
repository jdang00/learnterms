<script lang="ts">
	import {
		ArrowDownUp,
		Check,
		ChevronDown,
		LayoutGrid,
		List,
		Plus,
		Search,
		X
	} from 'lucide-svelte';
	import { sortOptions, type SortKey, type ViewMode } from './contentLibrary';

	let {
		searchTerm = $bindable(''),
		filteredCount,
		totalDocs,
		sortKey = $bindable<SortKey>('recent'),
		viewMode = $bindable<ViewMode>('grid'),
		onAdd
	}: {
		searchTerm: string;
		filteredCount: number;
		totalDocs: number;
		sortKey: SortKey;
		viewMode: ViewMode;
		onAdd: () => void;
	} = $props();

	const sortLabel = $derived(sortOptions.find((option) => option.key === sortKey)?.label ?? 'Sort');
</script>

<div
	class="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-base-300 bg-base-100 p-2.5"
>
	<label class="input input-sm input-bordered flex w-full items-center gap-2 rounded-full sm:w-72">
		<Search size={14} class="text-base-content/50" />
		<input class="grow" placeholder="Search files..." bind:value={searchTerm} />
		{#if searchTerm}
			<button
				class="text-base-content/40 hover:text-base-content"
				onclick={() => (searchTerm = '')}
				aria-label="Clear search"
			>
				<X size={14} />
			</button>
		{/if}
	</label>

	{#if searchTerm && filteredCount !== totalDocs}
		<span class="badge badge-ghost badge-sm gap-1.5">
			{filteredCount} of {totalDocs}
		</span>
	{/if}

	<div class="flex-1"></div>

	<div class="dropdown dropdown-end">
		<div tabindex="0" role="button" class="btn btn-ghost btn-sm gap-1.5 rounded-full font-normal">
			<ArrowDownUp size={14} class="text-base-content/60" />
			<span class="hidden text-xs sm:inline">{sortLabel}</span>
			<ChevronDown size={13} class="text-base-content/50" />
		</div>
		<ul
			class="dropdown-content menu z-30 mt-2 w-52 rounded-xl border border-base-300 bg-base-100 p-1.5 shadow-lg"
		>
			{#each sortOptions as option}
				<li>
					<button
						class="flex items-center justify-between rounded-lg text-sm {sortKey === option.key
							? 'bg-primary/10 text-primary'
							: ''}"
						onclick={() => {
							sortKey = option.key;
							if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
						}}
					>
						{option.label}
						{#if sortKey === option.key}<Check size={14} />{/if}
					</button>
				</li>
			{/each}
		</ul>
	</div>

	<div class="inline-flex items-center rounded-full bg-base-200 p-1">
		<button
			class="rounded-full p-1.5 transition-colors {viewMode === 'grid'
				? 'bg-base-100 text-base-content shadow-sm'
				: 'text-base-content/50 hover:text-base-content'}"
			onclick={() => (viewMode = 'grid')}
			aria-label="Grid view"
			title="Grid view"
		>
			<LayoutGrid size={15} />
		</button>
		<button
			class="rounded-full p-1.5 transition-colors {viewMode === 'list'
				? 'bg-base-100 text-base-content shadow-sm'
				: 'text-base-content/50 hover:text-base-content'}"
			onclick={() => (viewMode = 'list')}
			aria-label="List view"
			title="List view"
		>
			<List size={15} />
		</button>
	</div>

	<button class="btn btn-primary btn-sm gap-2 rounded-full" onclick={onAdd}>
		<Plus size={15} />
		<span class="hidden sm:inline">Add file</span>
	</button>
</div>
