<script lang="ts">
	import { GripVertical, Trash2, ArrowRightLeft, X, CheckSquare, FileText, CheckCircle, Filter } from 'lucide-svelte';

	type SortMode = 'order' | 'created_desc';
	type StatusFilter = 'all' | 'published' | 'draft' | 'archived';

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
		<label class="input input-sm input-bordered flex items-center gap-2 w-full sm:w-64">
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
			<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-lg z-10 w-40 p-1 shadow-lg border border-base-300">
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
			<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-lg z-10 w-40 p-1 shadow-lg border border-base-300">
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
				<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-lg z-10 w-48 p-1 shadow-lg border border-base-300">
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
				class="btn btn-sm gap-1 {reorderMode ? 'btn-primary' : 'btn-ghost'}"
				onclick={onReorderToggle}
			>
				<GripVertical size={14} />
				<span>{reorderMode ? 'Done' : 'Reorder'}</span>
			</button>
		{/if}

		<div class="flex-1"></div>

		{#if canEdit && selectedCount > 0}
			<div class="badge badge-neutral badge-sm">{selectedCount} selected</div>
			<button class="btn btn-sm btn-ghost gap-1" onclick={onMoveSelected}>
				<ArrowRightLeft size={14} />
				<span class="hidden sm:inline">Move</span>
			</button>
			<button class="btn btn-sm btn-ghost text-error gap-1" onclick={onDeleteSelected}>
				<Trash2 size={14} />
				<span class="hidden sm:inline">Delete</span>
			</button>
			<button class="btn btn-sm btn-ghost" onclick={onDeselectAll}>Clear</button>
		{:else if canEdit && totalCount > 0}
			<button class="btn btn-sm btn-ghost" onclick={onSelectAll}>Select All</button>
		{/if}
	</div>
{:else}
	<!-- Desktop layout (sidebar header) -->
	<div class="space-y-3">
		<label class="input input-sm input-bordered flex items-center gap-2 w-full">
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
				class="grow text-sm"
				placeholder="Search..."
				value={searchInput}
				oninput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
			/>
			{#if searchInput}
				<button class="btn btn-ghost btn-xs" onclick={onSearchClear}>×</button>
			{/if}
		</label>

		<div class="flex items-center gap-2">
			<!-- View Controls -->
			<div class="join shadow-sm">
				<div class="dropdown join-item">
					<div tabindex="0" role="button" class="btn btn-sm btn-ghost join-item gap-1 px-2 border border-base-300">
						{sortMode === 'order' ? 'Order' : 'Recent'}
						<svg class="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
						</svg>
					</div>
					<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-lg z-10 w-40 p-1 shadow-lg border border-base-300">
						<li><button class="text-sm" class:active={sortMode === 'order'} onclick={() => onSortChange('order')}>By Order</button></li>
						<li><button class="text-sm" class:active={sortMode === 'created_desc'} onclick={() => onSortChange('created_desc')}>Recent First</button></li>
					</ul>
				</div>

				<div class="dropdown join-item">
					<div tabindex="0" role="button" class="btn btn-sm btn-ghost join-item gap-1 px-2 border border-base-300 border-l-0 {statusFilter !== 'all' ? 'text-primary' : ''}" title="Filter by status">
						<Filter size={14} />
						<span class="text-xs">{statusFilterLabel}</span>
					</div>
					<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-lg z-10 w-40 p-1 shadow-lg border border-base-300">
						<li><button class="text-sm" class:active={statusFilter === 'all'} onclick={() => onStatusFilterChange('all')}>All</button></li>
						<li><button class="text-sm" class:active={statusFilter === 'published'} onclick={() => onStatusFilterChange('published')}>Published</button></li>
						<li><button class="text-sm" class:active={statusFilter === 'draft'} onclick={() => onStatusFilterChange('draft')}>Drafts</button></li>
						<li><button class="text-sm" class:active={statusFilter === 'archived'} onclick={() => onStatusFilterChange('archived')}>Archived</button></li>
					</ul>
				</div>
			</div>

			<!-- Divider -->
			<div class="h-6 w-px bg-base-300 mx-1"></div>

			<!-- Editor Actions -->
			{#if canEdit}
				<div class="dropdown">
					<div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-2 border border-base-300" title="New Question Status: {defaultStatus}">
						<span class="text-xs font-medium opacity-60">Save as:</span>
						{#if defaultStatus === 'published'}
							<CheckCircle size={14} class="text-success" />
							<span class="text-xs hidden lg:inline">Published</span>
						{:else}
							<FileText size={14} class="text-info" />
							<span class="text-xs hidden lg:inline">Draft</span>
						{/if}
						<svg class="w-3 h-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
						</svg>
					</div>
					<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-lg z-10 w-48 p-1 shadow-lg border border-base-300">
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
					class="btn btn-sm gap-1 {reorderMode ? 'btn-primary' : 'btn-ghost'}"
					onclick={onReorderToggle}
				>
					<GripVertical size={14} />
					{reorderMode ? 'Done' : 'Reorder'}
				</button>
			{/if}

			<div class="flex-1"></div>

			{#if canEdit && selectedCount > 0}
				<div class="badge badge-neutral badge-sm">{selectedCount}</div>
				<div class="join shadow-sm">
					<button
						class="btn btn-sm btn-ghost join-item btn-square border border-base-300"
						onclick={onMoveSelected}
						title="Move selected"
					>
						<ArrowRightLeft size={16} />
					</button>
					<button
						class="btn btn-sm btn-ghost join-item btn-square text-error border border-base-300 border-l-0"
						onclick={onDeleteSelected}
						title="Delete selected"
					>
						<Trash2 size={16} />
					</button>
					<button
						class="btn btn-sm btn-ghost join-item border border-base-300 border-l-0 px-2"
						onclick={onDeselectAll}
						title="Clear selection"
					>
						<X size={16} />
					</button>
				</div>
			{:else if canEdit && totalCount > 0}
				<button
					class="btn btn-sm btn-ghost gap-1"
					onclick={onSelectAll}
					title="Select all questions"
				>
					<CheckSquare size={16} />
					<span class="text-xs">Select All</span>
				</button>
			{/if}
		</div>
	</div>
{/if}
