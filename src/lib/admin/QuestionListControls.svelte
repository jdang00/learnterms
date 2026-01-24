<script lang="ts">
	import { GripVertical, Trash2, ArrowRightLeft, X, CheckSquare, FileText, CheckCircle } from 'lucide-svelte';

	type SortMode = 'order' | 'created_desc';

	interface Props {
		searchInput: string;
		sortMode: SortMode;
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
		onDefaultStatusChange,
		onReorderToggle,
		onSelectAll,
		onDeselectAll,
		onMoveSelected,
		onDeleteSelected
	}: Props = $props();

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

		{#if canEdit}
			<div class="dropdown">
				<div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-1" title="New Question Status">
					{#if defaultStatus === 'published'}
						<CheckCircle size={14} class="text-success" />
					{:else}
						<FileText size={14} class="text-info" />
					{/if}
					<span class="hidden sm:inline text-xs">New: {defaultStatus}</span>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
					</svg>
				</div>
				<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-lg z-10 w-48 p-1 shadow-lg border border-base-300">
					<li class="menu-title text-xs px-2 pt-1 pb-1">New questions default to:</li>
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

			{#if canEdit}
				<div class="dropdown">
					<div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-1 btn-square" title="New Question Status: {defaultStatus}">
						{#if defaultStatus === 'published'}
							<CheckCircle size={16} class="text-success" />
						{:else}
							<FileText size={16} class="text-info" />
						{/if}
					</div>
					<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-lg z-10 w-48 p-1 shadow-lg border border-base-300">
						<li class="menu-title text-xs px-2 pt-1 pb-1">New questions default to:</li>
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
				<button
					class="btn btn-sm btn-ghost btn-square"
					onclick={onMoveSelected}
					title="Move selected"
				>
					<ArrowRightLeft size={16} />
				</button>
				<button
					class="btn btn-sm btn-ghost gap-1"
					onclick={onDeselectAll}
					title="Clear selection"
				>
					<X size={16} />
					<span class="text-xs">Clear</span>
				</button>
				<button
					class="btn btn-sm btn-ghost btn-square text-error"
					onclick={onDeleteSelected}
					title="Delete selected"
				>
					<Trash2 size={16} />
				</button>
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
