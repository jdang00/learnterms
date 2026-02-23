<script lang="ts">
	import { GripVertical, Trash2, ArrowRightLeft, X, CheckSquare, FileText, CheckCircle, Filter } from 'lucide-svelte';
	import type { StatusFilter } from '$lib/types';

	type SortMode = 'order' | 'created_desc';

	interface Props {
		searchInput: string;
		sortMode: SortMode;
		statusFilter: StatusFilter;
		defaultStatus: 'published' | 'draft';
		reorderMode: boolean;
		selectedCount: number;
		totalCount: number;
		canEdit: boolean;
		isAdmin: boolean;
		variant?: 'mobile' | 'desktop';
		onSearchChange: (value: string) => void;
		onSearchClear: () => void;
		onSortChange: (mode: SortMode) => void;
		onStatusFilterChange: (filter: StatusFilter) => void;
		onDefaultStatusChange: (status: 'published' | 'draft') => void;
		onReorderToggle: () => void;
		onSelectAll: () => void;
		onDeselectAll: () => void;
		onMoveSelected: () => void;
		onDeleteSelected: () => void;
	}

	let {
		searchInput,
		sortMode,
		statusFilter,
		defaultStatus,
		reorderMode,
		selectedCount,
		totalCount,
		canEdit,
		isAdmin,
		variant = 'desktop',
		onSearchChange,
		onSearchClear,
		onSortChange,
		onStatusFilterChange,
		onDefaultStatusChange,
		onReorderToggle,
		onSelectAll,
		onDeselectAll,
		onMoveSelected,
		onDeleteSelected
	}: Props = $props();

	const statusFilterLabel = $derived(
		statusFilter === 'all' ? 'All' :
		statusFilter === 'published' ? 'Published' :
		statusFilter === 'draft' ? 'Drafts' : 'Archived'
	);

	const isMobile = $derived(variant === 'mobile');
</script>

{#if isMobile}
	<!-- Mobile/tablet layout (horizontal bar) -->
	<div class="flex flex-wrap items-center gap-2">
		<label class="input input-sm input-bordered rounded-full flex items-center gap-2 w-full sm:w-64">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 16 16"
				fill="currentColor"
				class="w-4 h-4 opacity-70"
			>
				<path
					fill-rule="evenodd"
					d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
					clip-rule="evenodd"
				/>
			</svg>
			<input
				type="text"
				class="grow"
				placeholder="Search..."
				value={searchInput}
				oninput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
			/>
			{#if searchInput}
				<button class="btn btn-ghost btn-xs" onclick={onSearchClear}>×</button>
			{/if}
		</label>

		<div class="dropdown">
			<div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-1">
				{sortMode === 'order' ? 'Order' : 'Recent'}
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
				</svg>
			</div>
			<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-2xl z-10 w-40 p-1 shadow-lg border border-base-300">
				<li><button class="text-sm" class:active={sortMode === 'order'} onclick={() => onSortChange('order')}>By Order</button></li>
				<li><button class="text-sm" class:active={sortMode === 'created_desc'} onclick={() => onSortChange('created_desc')}>Recent First</button></li>
			</ul>
		</div>

		<div class="dropdown">
			<div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-1 {statusFilter !== 'all' ? 'text-primary' : ''}">
				<Filter size={14} />
				<span class="text-xs">{statusFilterLabel}</span>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
				</svg>
			</div>
			<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-2xl z-10 w-40 p-1 shadow-lg border border-base-300">
				<li><button class="text-sm" class:active={statusFilter === 'all'} onclick={() => onStatusFilterChange('all')}>All</button></li>
				<li><button class="text-sm" class:active={statusFilter === 'published'} onclick={() => onStatusFilterChange('published')}>Published</button></li>
				<li><button class="text-sm" class:active={statusFilter === 'draft'} onclick={() => onStatusFilterChange('draft')}>Drafts</button></li>
				<li><button class="text-sm" class:active={statusFilter === 'archived'} onclick={() => onStatusFilterChange('archived')}>Archived</button></li>
			</ul>
		</div>

		{#if canEdit}
			<div class="dropdown">
				<div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-1" title="New Question Status">
					{#if defaultStatus === 'published'}
						<CheckCircle size={14} class="text-success" />
					{:else}
						<FileText size={14} class="text-info" />
					{/if}
					<span class="hidden sm:inline text-xs">{defaultStatus === 'published' ? 'Auto-publish' : 'Save as draft'}</span>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
					</svg>
				</div>
				<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-2xl z-10 w-48 p-1 shadow-lg border border-base-300">
					<li class="menu-title text-xs px-2 pt-1 pb-1">New questions are saved as:</li>
					<li>
						<button class="text-sm" class:active={defaultStatus === 'published'} onclick={() => onDefaultStatusChange('published')}>
							<CheckCircle size={14} class="text-success" /> Published
						</button>
					</li>
					<li>
						<button class="text-sm" class:active={defaultStatus === 'draft'} onclick={() => onDefaultStatusChange('draft')}>
							<FileText size={14} class="text-info" /> Draft
						</button>
					</li>
				</ul>
			</div>
		{/if}

		{#if isAdmin}
			<button
				class="btn btn-sm rounded-full gap-1 {reorderMode ? 'btn-primary' : 'btn-ghost'}"
				onclick={onReorderToggle}
			>
				<GripVertical size={14} />
				<span>{reorderMode ? 'Done' : 'Reorder'}</span>
			</button>
		{/if}

		<div class="flex-1"></div>

		{#if canEdit && selectedCount > 0}
			<div class="badge badge-neutral badge-sm rounded-full">{selectedCount} selected</div>
			<button class="btn btn-sm btn-ghost rounded-full gap-1" onclick={onMoveSelected}>
				<ArrowRightLeft size={14} />
				<span class="hidden sm:inline">Move</span>
			</button>
			<button class="btn btn-sm btn-ghost rounded-full text-error gap-1" onclick={onDeleteSelected}>
				<Trash2 size={14} />
				<span class="hidden sm:inline">Delete</span>
			</button>
			<button class="btn btn-sm btn-ghost rounded-full" onclick={onDeselectAll}>Clear</button>
		{:else if canEdit && totalCount > 0}
			<button class="btn btn-sm btn-ghost rounded-full" onclick={onSelectAll}>Select All</button>
		{/if}
	</div>
{:else}
	<!-- Desktop layout (sidebar header) -->
	<div class="space-y-3">
		<label class="input input-sm input-bordered rounded-full flex items-center gap-2 w-full">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 opacity-70">
				<path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" />
			</svg>
			<input
				type="text"
				class="grow text-sm"
				placeholder="Search..."
				value={searchInput}
				oninput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
			/>
			{#if searchInput}
				<button class="btn btn-ghost btn-xs btn-circle" onclick={onSearchClear}>×</button>
			{/if}
		</label>

		<div class="flex items-center gap-2">
			<div class="flex items-center rounded-full border border-base-300 p-0.5 gap-0.5">
				<div class="dropdown">
					<div tabindex="0" role="button" class="btn btn-sm btn-ghost rounded-full gap-1 px-3 border-0">
						{sortMode === 'order' ? 'Order' : 'Recent'}
						<svg class="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
						</svg>
					</div>
					<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-2xl z-10 w-40 p-1 shadow-lg border border-base-300">
						<li><button class="text-sm rounded-xl" class:active={sortMode === 'order'} onclick={() => onSortChange('order')}>By Order</button></li>
						<li><button class="text-sm rounded-xl" class:active={sortMode === 'created_desc'} onclick={() => onSortChange('created_desc')}>Recent First</button></li>
					</ul>
				</div>

				<div class="w-px h-4 bg-base-300"></div>

				<div class="dropdown">
					<div tabindex="0" role="button" class="btn btn-sm btn-ghost rounded-full gap-1 px-3 border-0 {statusFilter !== 'all' ? 'text-primary' : ''}">
						<Filter size={14} />
						{statusFilterLabel}
					</div>
					<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-2xl z-10 w-40 p-1 shadow-lg border border-base-300">
						<li><button class="text-sm rounded-xl" class:active={statusFilter === 'all'} onclick={() => onStatusFilterChange('all')}>All</button></li>
						<li><button class="text-sm rounded-xl" class:active={statusFilter === 'published'} onclick={() => onStatusFilterChange('published')}>Published</button></li>
						<li><button class="text-sm rounded-xl" class:active={statusFilter === 'draft'} onclick={() => onStatusFilterChange('draft')}>Drafts</button></li>
						<li><button class="text-sm rounded-xl" class:active={statusFilter === 'archived'} onclick={() => onStatusFilterChange('archived')}>Archived</button></li>
					</ul>
				</div>
			</div>

			{#if canEdit && selectedCount > 0}
				<div class="w-px h-5 bg-base-300"></div>
				<div class="flex-1"></div>
				<div class="badge badge-neutral badge-sm rounded-full">{selectedCount} selected</div>
				<div class="w-px h-5 bg-base-300"></div>
				<button class="btn btn-sm btn-ghost rounded-full gap-1" onclick={onMoveSelected} title="Move selected">
					<ArrowRightLeft size={14} />
					Move
				</button>
				<button class="btn btn-sm btn-ghost rounded-full text-error gap-1" onclick={onDeleteSelected} title="Delete selected">
					<Trash2 size={14} />
					Delete
				</button>
				<div class="w-px h-5 bg-base-300"></div>
				<button class="btn btn-sm btn-ghost rounded-full gap-1" onclick={onDeselectAll} title="Clear selection">
					<X size={14} />
					Clear
				</button>
			{:else}
				{#if canEdit}
					<div class="w-px h-5 bg-base-300"></div>
					<div class="dropdown">
						<div tabindex="0" role="button" class="btn btn-sm btn-ghost rounded-full gap-1 px-3" title="New questions save as: {defaultStatus}">
							{#if defaultStatus === 'published'}
								<CheckCircle size={14} class="text-success" />
							{:else}
								<FileText size={14} class="text-info" />
							{/if}
							{defaultStatus === 'published' ? 'Published' : 'Draft'}
						</div>
						<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-2xl z-10 w-48 p-1 shadow-lg border border-base-300">
							<li class="menu-title text-[10px] px-3 pt-1.5 pb-1 uppercase tracking-wider opacity-50">New questions save as</li>
							<li>
								<button class="text-sm rounded-xl" class:active={defaultStatus === 'published'} onclick={() => onDefaultStatusChange('published')}>
									<CheckCircle size={14} class="text-success" /> Published
								</button>
							</li>
							<li>
								<button class="text-sm rounded-xl" class:active={defaultStatus === 'draft'} onclick={() => onDefaultStatusChange('draft')}>
									<FileText size={14} class="text-info" /> Draft
								</button>
							</li>
						</ul>
					</div>
				{/if}

				<div class="flex-1"></div>

				{#if isAdmin}
					<button
						class="btn btn-sm rounded-full gap-1 {reorderMode ? 'btn-primary' : 'btn-ghost'}"
						onclick={onReorderToggle}
					>
						<GripVertical size={14} />
						{reorderMode ? 'Done' : 'Reorder'}
					</button>
				{/if}

				{#if canEdit && totalCount > 0}
					<div class="w-px h-5 bg-base-300"></div>
					<button class="btn btn-sm btn-ghost rounded-full gap-1" onclick={onSelectAll} title="Select all questions">
						<CheckSquare size={14} />
						Select All
					</button>
				{/if}
			{/if}
		</div>
	</div>
{/if}
