<script lang="ts">
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
	import X from '@lucide/svelte/icons/x';
	import FileText from '@lucide/svelte/icons/file-text';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import Filter from '@lucide/svelte/icons/filter';
	import Send from '@lucide/svelte/icons/send';
	import Archive from '@lucide/svelte/icons/archive';
	import type { StatusFilter } from '#lib/types.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';

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
		onPublishSelected: () => void;
		onDraftSelected: () => void;
		onArchiveSelected: () => void;
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
		onPublishSelected,
		onDraftSelected,
		onArchiveSelected,
		onMoveSelected,
		onDeleteSelected
	}: Props = $props();

	const statusFilterLabels: Record<StatusFilter, string> = {
		all: 'All',
		published: 'Published',
		draft: 'Drafts',
		archived: 'Archived'
	};

	const statusFilterLabel = $derived(statusFilterLabels[statusFilter] ?? statusFilterLabels.all);

	const isMobile = $derived(variant === 'mobile');
</script>

{#if isMobile}
	<!-- Mobile/tablet layout (horizontal bar) -->
	<div class="space-y-3">
		<InputGroup.Root class="h-8 w-full sm:w-64">
			<InputGroup.Addon>
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
			</InputGroup.Addon>
			<InputGroup.Input
				type="text"
				class="text-sm"
				placeholder="Search..."
				value={searchInput}
				oninput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
			/>
			{#if searchInput}
				<InputGroup.Addon align="inline-end">
					<InputGroup.Button onclick={onSearchClear}>×</InputGroup.Button>
				</InputGroup.Addon>
			{/if}
		</InputGroup.Root>

		<div class="flex flex-wrap items-center gap-2">
			{#if canEdit && totalCount > 0}
				<Button
					variant="ghost"
					tone="neutral"
					size="sm"
					class="px-2"
					onclick={() => (selectedCount === totalCount ? onDeselectAll() : onSelectAll())}
				>
					{selectedCount === totalCount ? 'Deselect all' : 'Select all'}
				</Button>
			{/if}

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" tone="neutral" size="sm" class="gap-1">
							{sortMode === 'order' ? 'Order' : 'Recent'}
							<svg class="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								></path>
							</svg>
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="w-40">
					<DropdownMenu.Item
						class={sortMode === 'order' ? 'bg-muted font-semibold' : undefined}
						onSelect={() => onSortChange('order')}>By Order</DropdownMenu.Item
					>
					<DropdownMenu.Item
						class={sortMode === 'created_desc' ? 'bg-muted font-semibold' : undefined}
						onSelect={() => onSortChange('created_desc')}>Recent First</DropdownMenu.Item
					>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="ghost"
							tone="neutral"
							size="sm"
							class="gap-1 {statusFilter !== 'all' ? 'text-primary-ink' : ''}"
						>
							<Filter size={14} />
							<span class="text-xs">{statusFilterLabel}</span>
							<svg class="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								></path>
							</svg>
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="w-40">
					<DropdownMenu.Item
						class={statusFilter === 'all' ? 'bg-muted font-semibold' : undefined}
						onSelect={() => onStatusFilterChange('all')}>All</DropdownMenu.Item
					>
					<DropdownMenu.Item
						class={statusFilter === 'published' ? 'bg-muted font-semibold' : undefined}
						onSelect={() => onStatusFilterChange('published')}>Published</DropdownMenu.Item
					>
					<DropdownMenu.Item
						class={statusFilter === 'draft' ? 'bg-muted font-semibold' : undefined}
						onSelect={() => onStatusFilterChange('draft')}>Drafts</DropdownMenu.Item
					>
					<DropdownMenu.Item
						class={statusFilter === 'archived' ? 'bg-muted font-semibold' : undefined}
						onSelect={() => onStatusFilterChange('archived')}>Archived</DropdownMenu.Item
					>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			{#if canEdit}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								tone="neutral"
								size="sm"
								class="gap-1"
								tooltip="New Question Status"
								aria-label="New question status: {defaultStatus}"
							>
								{#if defaultStatus === 'published'}
									<CheckCircle size={14} class="text-success" />
								{:else}
									<FileText size={14} class="text-info" />
								{/if}
								<span class="hidden sm:inline text-xs"
									>{defaultStatus === 'published' ? 'Auto-publish' : 'Save as draft'}</span
								>
								<svg class="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									></path>
								</svg>
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="start" class="w-48">
						<DropdownMenu.Label class="text-xs">New questions are saved as:</DropdownMenu.Label>
						<DropdownMenu.Item
							class={defaultStatus === 'published' ? 'bg-muted font-semibold' : undefined}
							onSelect={() => onDefaultStatusChange('published')}
						>
							<CheckCircle size={14} class="text-success" /> Published
						</DropdownMenu.Item>
						<DropdownMenu.Item
							class={defaultStatus === 'draft' ? 'bg-muted font-semibold' : undefined}
							onSelect={() => onDefaultStatusChange('draft')}
						>
							<FileText size={14} class="text-info" /> Draft
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}

			<div class="flex-1"></div>

			{#if isAdmin}
				<Button
					size="sm"
					variant={reorderMode ? 'solid' : 'ghost'}
					tone={reorderMode ? 'primary' : 'neutral'}
					class="gap-1"
					onclick={onReorderToggle}
					aria-label={reorderMode ? 'Finish reordering' : 'Reorder questions'}
					tooltip={reorderMode ? 'Finish reordering' : 'Reorder questions'}
				>
					<GripVertical size={14} />
					<span class="hidden sm:inline">{reorderMode ? 'Done' : 'Reorder'}</span>
				</Button>
			{/if}
		</div>

		{#if canEdit && selectedCount > 0}
			<div class="flex flex-wrap items-center justify-start gap-1 border-t border-border pt-2">
				<Badge variant="solid" tone="neutral" size="sm" class="mr-1">{selectedCount} selected</Badge
				>
				<Button size="xs" variant="ghost" tone="neutral" class="gap-1" onclick={onPublishSelected}>
					<Send size={14} />
					<span>Publish</span>
				</Button>
				<Button size="xs" variant="ghost" tone="neutral" class="gap-1" onclick={onDraftSelected}>
					<FileText size={14} />
					<span>Draft</span>
				</Button>
				<Button size="xs" variant="ghost" tone="neutral" class="gap-1" onclick={onArchiveSelected}>
					<Archive size={14} />
					<span>Archive</span>
				</Button>
				<Button size="xs" variant="ghost" tone="neutral" class="gap-1" onclick={onMoveSelected}>
					<ArrowRightLeft size={14} />
					<span>Move</span>
				</Button>
				<Button size="xs" variant="ghost" tone="error" class="gap-1" onclick={onDeleteSelected}>
					<Trash2 size={14} />
					<span>Delete</span>
				</Button>
				<Button size="xs" variant="ghost" tone="neutral" onclick={onDeselectAll}>Clear</Button>
			</div>
		{/if}
	</div>
{:else}
	<!-- Desktop layout (sidebar header) -->
	<div class="space-y-3">
		<InputGroup.Root class="h-8 w-full">
			<InputGroup.Addon>
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
			</InputGroup.Addon>
			<InputGroup.Input
				type="text"
				class="text-sm"
				placeholder="Search..."
				value={searchInput}
				oninput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
			/>
			{#if searchInput}
				<InputGroup.Addon align="inline-end">
					<InputGroup.Button size="icon-xs" onclick={onSearchClear}>×</InputGroup.Button>
				</InputGroup.Addon>
			{/if}
		</InputGroup.Root>

		<div class="flex flex-wrap items-center gap-2">
			{#if canEdit && totalCount > 0}
				<Button
					variant="ghost"
					tone="neutral"
					size="sm"
					class="px-2"
					onclick={() => (selectedCount === totalCount ? onDeselectAll() : onSelectAll())}
				>
					{selectedCount === totalCount ? 'Deselect all' : 'Select all'}
				</Button>
			{/if}

			<div class="flex items-center rounded-full border border-border p-0.5 gap-0.5">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" tone="neutral" size="sm" class="gap-1 px-3">
								{sortMode === 'order' ? 'Order' : 'Recent'}
								<svg
									class="size-3 opacity-50"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									></path>
								</svg>
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="start" class="w-40">
						<DropdownMenu.Item
							class={sortMode === 'order' ? 'bg-muted font-semibold' : undefined}
							onSelect={() => onSortChange('order')}>By Order</DropdownMenu.Item
						>
						<DropdownMenu.Item
							class={sortMode === 'created_desc' ? 'bg-muted font-semibold' : undefined}
							onSelect={() => onSortChange('created_desc')}>Recent First</DropdownMenu.Item
						>
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<div class="w-px h-4 bg-muted-strong"></div>

				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								tone="neutral"
								size="sm"
								class="gap-1 px-3 {statusFilter !== 'all' ? 'text-primary-ink' : ''}"
							>
								<Filter size={14} />
								{statusFilterLabel}
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="start" class="w-40">
						<DropdownMenu.Item
							class={statusFilter === 'all' ? 'bg-muted font-semibold' : undefined}
							onSelect={() => onStatusFilterChange('all')}>All</DropdownMenu.Item
						>
						<DropdownMenu.Item
							class={statusFilter === 'published' ? 'bg-muted font-semibold' : undefined}
							onSelect={() => onStatusFilterChange('published')}>Published</DropdownMenu.Item
						>
						<DropdownMenu.Item
							class={statusFilter === 'draft' ? 'bg-muted font-semibold' : undefined}
							onSelect={() => onStatusFilterChange('draft')}>Drafts</DropdownMenu.Item
						>
						<DropdownMenu.Item
							class={statusFilter === 'archived' ? 'bg-muted font-semibold' : undefined}
							onSelect={() => onStatusFilterChange('archived')}>Archived</DropdownMenu.Item
						>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>

			{#if canEdit}
				<div class="w-px h-5 bg-muted-strong"></div>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								tone="neutral"
								size="sm"
								class="gap-1 px-3"
								tooltip="New questions save as: {defaultStatus}"
								aria-label="New questions save as: {defaultStatus}"
							>
								{#if defaultStatus === 'published'}
									<CheckCircle size={14} class="text-success" />
								{:else}
									<FileText size={14} class="text-info" />
								{/if}
								{defaultStatus === 'published' ? 'Published' : 'Draft'}
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="start" class="w-48">
						<DropdownMenu.Label class="label-caps opacity-50">
							New questions save as
						</DropdownMenu.Label>
						<DropdownMenu.Item
							class={defaultStatus === 'published' ? 'bg-muted font-semibold' : undefined}
							onSelect={() => onDefaultStatusChange('published')}
						>
							<CheckCircle size={14} class="text-success" /> Published
						</DropdownMenu.Item>
						<DropdownMenu.Item
							class={defaultStatus === 'draft' ? 'bg-muted font-semibold' : undefined}
							onSelect={() => onDefaultStatusChange('draft')}
						>
							<FileText size={14} class="text-info" /> Draft
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}

			<div class="flex-1"></div>

			{#if isAdmin}
				<Button
					size="sm"
					variant={reorderMode ? 'solid' : 'ghost'}
					tone={reorderMode ? 'primary' : 'neutral'}
					class="gap-1"
					onclick={onReorderToggle}
				>
					<GripVertical size={14} />
					{reorderMode ? 'Done' : 'Reorder'}
				</Button>
			{/if}
		</div>

		{#if canEdit && selectedCount > 0}
			<div class="flex flex-wrap items-center justify-start gap-1 border-t border-border pt-2">
				<Badge variant="solid" tone="neutral" size="sm" class="mr-1">{selectedCount} selected</Badge
				>
				<Button
					size="xs"
					variant="ghost"
					tone="neutral"
					class="gap-1"
					onclick={onPublishSelected}
					tooltip="Publish selected"
				>
					<Send size={14} />
					Publish
				</Button>
				<Button
					size="xs"
					variant="ghost"
					tone="neutral"
					class="gap-1"
					onclick={onDraftSelected}
					tooltip="Save selected as drafts"
				>
					<FileText size={14} />
					Draft
				</Button>
				<Button
					size="xs"
					variant="ghost"
					tone="neutral"
					class="gap-1"
					onclick={onArchiveSelected}
					tooltip="Archive selected"
				>
					<Archive size={14} />
					Archive
				</Button>
				<Button
					size="xs"
					variant="ghost"
					tone="neutral"
					class="gap-1"
					onclick={onMoveSelected}
					tooltip="Move selected"
				>
					<ArrowRightLeft size={14} />
					Move
				</Button>
				<Button
					size="xs"
					variant="ghost"
					tone="error"
					class="gap-1"
					onclick={onDeleteSelected}
					tooltip="Delete selected"
				>
					<Trash2 size={14} />
					Delete
				</Button>
				<Button
					size="xs"
					variant="ghost"
					tone="neutral"
					class="gap-1"
					onclick={onDeselectAll}
					tooltip="Clear selection"
				>
					<X size={14} />
					Clear
				</Button>
			</div>
		{/if}
	</div>
{/if}
