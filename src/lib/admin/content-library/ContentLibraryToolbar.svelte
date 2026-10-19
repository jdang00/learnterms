<script lang="ts">
	import ArrowDownUp from '@lucide/svelte/icons/arrow-down-up';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import List from '@lucide/svelte/icons/list';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as InputGroup from '$lib/components/ui/input-group';
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

<div class="mb-5 flex flex-wrap items-center gap-2 surface p-2.5">
	<InputGroup.Root class="h-8 w-full sm:w-72">
		<InputGroup.Addon>
			<Search size={14} class="text-foreground/50" />
		</InputGroup.Addon>
		<InputGroup.Input
			class="h-8 px-3 text-sm"
			placeholder="Search files..."
			bind:value={searchTerm}
		/>
		{#if searchTerm}
			<button
				class="me-2 text-foreground/40 hover:text-foreground"
				onclick={() => (searchTerm = '')}
				aria-label="Clear search"
			>
				<X size={14} />
			</button>
		{/if}
	</InputGroup.Root>

	{#if searchTerm && filteredCount !== totalDocs}
		<Badge class="gap-1.5">
			{filteredCount} of {totalDocs}
		</Badge>
	{/if}

	<div class="flex-1"></div>

	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" tone="neutral" size="sm" class="gap-1.5 font-normal">
					<ArrowDownUp size={14} class="text-foreground/60" />
					<span class="hidden text-xs sm:inline">{sortLabel}</span>
					<ChevronDown size={13} class="text-foreground/50" />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="w-52">
			{#each sortOptions as option (option.key)}
				<DropdownMenu.Item
					class="justify-between {sortKey === option.key ? 'bg-primary/10 text-primary-ink' : ''}"
					onSelect={() => {
						sortKey = option.key;
						if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
					}}
				>
					{option.label}
					{#if sortKey === option.key}<Check size={14} />{/if}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>

	<div class="inline-flex items-center rounded-full bg-muted p-1">
		<button
			class="rounded-full p-1.5 transition-colors {viewMode === 'grid'
				? 'bg-background text-foreground shadow-sm'
				: 'text-foreground/50 hover:text-foreground'}"
			onclick={() => (viewMode = 'grid')}
			aria-label="Grid view"
			title="Grid view"
		>
			<LayoutGrid size={15} />
		</button>
		<button
			class="rounded-full p-1.5 transition-colors {viewMode === 'list'
				? 'bg-background text-foreground shadow-sm'
				: 'text-foreground/50 hover:text-foreground'}"
			onclick={() => (viewMode = 'list')}
			aria-label="List view"
			title="List view"
		>
			<List size={15} />
		</button>
	</div>

	<Button size="sm" class="gap-2" onclick={onAdd} aria-label="Upload PDFs">
		<Plus size={15} />
		<span class="hidden sm:inline">Upload PDFs</span>
	</Button>
</div>
