<script lang="ts">
	import { Library, Plus, Search } from 'lucide-svelte';
	import type { Doc } from '../../convex/_generated/dataModel';
	import { fileKind, formatSize, relativeTime, type ViewMode } from './contentLibrary';

	let {
		docs,
		isLoading,
		searchTerm,
		viewMode,
		isDrawerOpen,
		selectedDocumentId,
		onAdd,
		onSelect
	}: {
		docs: Doc<'contentLib'>[];
		isLoading: boolean;
		searchTerm: string;
		viewMode: ViewMode;
		isDrawerOpen: boolean;
		selectedDocumentId: string;
		onAdd: () => void;
		onSelect: (doc: Doc<'contentLib'>) => void;
	} = $props();
</script>

{#if isLoading}
	{#if viewMode === 'grid'}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each Array.from({ length: 12 }) as _}
				<div class="skeleton h-44 w-full rounded-2xl"></div>
			{/each}
		</div>
	{:else}
		<div class="space-y-2">
			{#each Array.from({ length: 8 }) as _}
				<div class="skeleton h-16 w-full rounded-xl"></div>
			{/each}
		</div>
	{/if}
{:else if docs.length === 0 && searchTerm}
	<div
		class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-base-300 bg-base-100 py-20 text-center"
	>
		<div class="mb-3 rounded-full bg-base-200 p-4 text-base-content/40">
			<Search size={24} />
		</div>
		<p class="text-sm font-semibold">No matches for "{searchTerm}"</p>
		<p class="mt-1 text-xs text-base-content/50">Try a different word or check the spelling.</p>
	</div>
{:else if docs.length === 0}
	<div
		class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-base-300 bg-base-100 py-20 text-center"
	>
		<div class="mb-4 rounded-2xl bg-primary/10 p-5 text-primary">
			<Library size={30} />
		</div>
		<p class="text-base font-semibold">Your library is empty</p>
		<p class="mt-1 max-w-xs text-sm text-base-content/50">
			Add your first PDF to make it searchable for your class.
		</p>
		<button class="btn btn-primary btn-sm mt-5 gap-2 rounded-full" onclick={onAdd}>
			<Plus size={15} />
			Add file
		</button>
	</div>
{:else if viewMode === 'grid'}
	<div
		class="grid grid-cols-2 gap-3 {isDrawerOpen
			? 'xl:grid-cols-2'
			: 'sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6'}"
	>
		{#each docs as doc (doc._id)}
			{@const kind = fileKind(doc)}
			<button
				class="group relative flex flex-col overflow-hidden rounded-2xl border bg-base-100 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md {selectedDocumentId ===
					doc._id && isDrawerOpen
					? 'border-primary ring-1 ring-primary'
					: 'border-base-300 hover:border-base-content/20'}"
				onclick={() => onSelect(doc)}
			>
				<div class="relative flex h-24 items-center justify-center {kind.tint} {kind.accent}">
					<kind.icon size={34} strokeWidth={1.5} />
					<span
						class="absolute right-2.5 top-2.5 inline-flex items-center rounded-full bg-base-100/80 px-2 py-0.5 text-[10px] font-semibold text-base-content/70 backdrop-blur"
					>
						{kind.label}
					</span>
				</div>
				<div class="flex flex-1 flex-col gap-1 p-3">
					<p class="line-clamp-2 text-sm font-medium leading-snug" title={doc.title}>
						{doc.title}
					</p>
					<div class="mt-auto flex items-center gap-1.5 pt-1.5 text-[11px] text-base-content/50">
						<span>{formatSize(doc.metadata?.sizeBytes)}</span>
						<span class="text-base-content/30">.</span>
						<span class="truncate">{relativeTime(doc.updatedAt)}</span>
					</div>
				</div>
			</button>
		{/each}
	</div>
{:else}
	<div class="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
		<div
			class="hidden grid-cols-[1fr_auto_auto] gap-4 border-b border-base-300 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-base-content/40 sm:grid"
		>
			<span>Name</span>
			<span class="w-20 text-right">Size</span>
			<span class="w-28 text-right">Updated</span>
		</div>
		<div class="divide-y divide-base-200">
			{#each docs as doc (doc._id)}
				{@const kind = fileKind(doc)}
				<button
					class="grid w-full grid-cols-[1fr_auto] items-center gap-4 px-4 py-2.5 text-left transition-colors sm:grid-cols-[1fr_auto_auto] {selectedDocumentId ===
						doc._id && isDrawerOpen
						? 'bg-primary/5'
						: 'hover:bg-base-200/60'}"
					onclick={() => onSelect(doc)}
				>
					<div class="flex min-w-0 items-center gap-3">
						<div class="shrink-0 rounded-lg p-2 {kind.tint} {kind.accent}">
							<kind.icon size={16} />
						</div>
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">{doc.title}</p>
							<p class="truncate text-xs text-base-content/50">
								{doc.metadata?.originalFileName ?? kind.label}
							</p>
						</div>
					</div>
					<span class="w-20 text-right text-xs text-base-content/60 max-sm:hidden">
						{formatSize(doc.metadata?.sizeBytes)}
					</span>
					<span class="w-28 text-right text-xs text-base-content/60 max-sm:hidden">
						{relativeTime(doc.updatedAt)}
					</span>
				</button>
			{/each}
		</div>
	</div>
{/if}
