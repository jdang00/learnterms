<script lang="ts">
	import DocumentPipelineProgress from './DocumentPipelineProgress.svelte';
	import { documentPipeline } from './documentPipeline';
	import { Check, Library, Pencil, Plus, Search } from 'lucide-svelte';
	import type { Doc } from '../../../convex/_generated/dataModel';
	import { fileKind, formatPages, relativeTime, type ViewMode } from './contentLibrary';
	import { formatBytes } from '$lib/utils/format';

	let {
		docs,
		isLoading,
		searchTerm,
		viewMode,
		isDrawerOpen,
		selectedDocumentId,
		onAdd,
		onSelect,
		onRename
	}: {
		docs: Doc<'contentLib'>[];
		isLoading: boolean;
		searchTerm: string;
		viewMode: ViewMode;
		isDrawerOpen: boolean;
		selectedDocumentId: string;
		onAdd: () => void;
		onSelect: (doc: Doc<'contentLib'>) => void;
		onRename: (doc: Doc<'contentLib'>) => void;
	} = $props();
</script>

{#if isLoading}
	{#if viewMode === 'grid'}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each Array.from({ length: 12 }, (_, index) => index) as index (index)}
				<div class="skeleton h-52 w-full rounded-2xl"></div>
			{/each}
		</div>
	{:else}
		<div class="space-y-2">
			{#each Array.from({ length: 8 }, (_, index) => index) as index (index)}
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
			{@const pages = formatPages(doc.metadata?.pageCount)}
			{@const pipeline = documentPipeline(doc.metadata)}
			{@const isReady = pipeline.complete}
			{@const isSelected = selectedDocumentId === doc._id && isDrawerOpen}
			<div class="group relative" style="--kind: {kind.hue}">
				<button
					class="doc-card flex h-52 w-full flex-col overflow-hidden rounded-2xl border bg-base-100 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg {isSelected
						? 'border-primary ring-1 ring-primary'
						: 'border-base-300 hover:border-base-content/20'}"
					onclick={() => onSelect(doc)}
				>
					<div class="doc-stage relative h-28 w-full shrink-0 overflow-hidden">
						<span
							class="absolute left-2.5 top-2.5 z-10 inline-flex items-center rounded-full bg-base-100/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur {kind.accent}"
						>
							{kind.label}
						</span>
						{#if isReady}
							<span
								class="absolute right-3 top-3 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-base-100/90 text-success group-hover:opacity-0 group-focus-within:opacity-0"
								title="Ready"
							>
								<Check size={12} strokeWidth={2.5} aria-hidden="true" /><span class="sr-only"
									>Ready</span
								>
							</span>
						{/if}
						{#if pages && (!pipeline.visible || pipeline.complete)}
							<span
								class="absolute bottom-2 right-2.5 z-10 inline-flex items-center rounded-full bg-base-100/85 px-2 py-0.5 text-[10px] font-semibold text-base-content/70 backdrop-blur"
							>
								{pages}
							</span>
						{/if}
						<div class="sheet sheet-back"></div>
						<div class="sheet sheet-mid"></div>
						<div class="sheet sheet-front {kind.accent}">
							<kind.icon size={24} strokeWidth={1.5} />
							<span class="sheet-lines"></span>
							<span class="sheet-fold"></span>
						</div>
						{#if pipeline.visible && !pipeline.complete}
							<div class="absolute inset-x-0 bottom-0 z-10 bg-base-100/95 px-3 py-1 backdrop-blur">
								<DocumentPipelineProgress metadata={doc.metadata} />
							</div>
						{/if}
					</div>
					<div class="flex min-h-0 flex-1 flex-col gap-1 border-t border-base-300/60 p-3">
						<p
							class="line-clamp-2 h-10 shrink-0 break-words text-sm font-medium leading-snug"
							title={doc.title}
						>
							{doc.title}
						</p>
						<div
							class="mt-auto flex shrink-0 items-center gap-1.5 pt-1.5 text-[11px] text-base-content/50"
						>
							<span>{formatBytes(doc.metadata?.sizeBytes)}</span>
							<span class="text-base-content/30">·</span>
							<span class="truncate">{relativeTime(doc.updatedAt)}</span>
						</div>
					</div>
				</button>
				<button
					class="btn btn-circle btn-xs absolute right-2 top-2 z-20 border-base-300 bg-base-100/90 opacity-0 shadow-sm backdrop-blur transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
					onclick={() => onRename(doc)}
					aria-label="Rename {doc.title}"
					title="Rename"
				>
					<Pencil size={12} />
				</button>
			</div>
		{/each}
	</div>
{:else}
	<div class="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
		<div
			class="hidden grid-cols-[1fr_4rem_5rem_7rem_2.25rem] items-center gap-3 border-b border-base-300 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-base-content/40 sm:grid"
		>
			<span>Name</span>
			<span class="text-right">Pages</span>
			<span class="text-right">Size</span>
			<span class="text-right">Updated</span>
			<span></span>
		</div>
		<div class="divide-y divide-base-200">
			{#each docs as doc (doc._id)}
				{@const kind = fileKind(doc)}
				{@const pages = formatPages(doc.metadata?.pageCount)}
				{@const isReady = documentPipeline(doc.metadata).complete}
				{@const isSelected = selectedDocumentId === doc._id && isDrawerOpen}
				<div class="group relative" style="--kind: {kind.hue}">
					<button
						class="grid w-full grid-cols-[1fr_2.25rem] items-center gap-3 px-4 py-2.5 text-left transition-colors sm:grid-cols-[1fr_4rem_5rem_7rem_2.25rem] {isSelected
							? 'bg-primary/5'
							: 'hover:bg-base-200/60'}"
						onclick={() => onSelect(doc)}
					>
						<div class="flex min-w-0 items-center gap-3">
							<div class="relative shrink-0">
								<div class="doc-mini {kind.tint} {kind.accent}"><kind.icon size={15} /></div>
								{#if isReady}
									<span
										class="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-base-100 text-success"
										title="Ready"
									>
										<Check size={11} strokeWidth={2.5} aria-hidden="true" /><span class="sr-only"
											>Ready</span
										>
									</span>
								{/if}
							</div>
							<div class="min-w-0">
								<p class="truncate text-sm font-medium">{doc.title}</p>
								<DocumentPipelineProgress metadata={doc.metadata} />
								<p class="truncate text-xs text-base-content/50">
									{doc.metadata?.originalFileName ?? kind.label}{#if pages}<span class="sm:hidden">
											· {pages}</span
										>{/if}
								</p>
							</div>
						</div>
						<span class="text-right text-xs tabular-nums text-base-content/60 max-sm:hidden">
							{doc.metadata?.pageCount ?? '—'}
						</span>
						<span class="text-right text-xs text-base-content/60 max-sm:hidden">
							{formatBytes(doc.metadata?.sizeBytes)}
						</span>
						<span class="text-right text-xs text-base-content/60 max-sm:hidden">
							{relativeTime(doc.updatedAt)}
						</span>
						<span></span>
					</button>
					<button
						class="btn btn-circle btn-xs absolute right-3 top-1/2 z-10 -translate-y-1/2 border-base-300 bg-base-100/90 opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
						onclick={() => onRename(doc)}
						aria-label="Rename {doc.title}"
						title="Rename"
					>
						<Pencil size={12} />
					</button>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	/* Kind-tinted backdrop with a graph-paper grid (same motif as the landing
	   page) fading out behind the paper stack. */
	.doc-stage {
		background-color: color-mix(in oklab, var(--kind) 6%, var(--color-base-200));
	}

	.doc-stage::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			linear-gradient(
					to right,
					color-mix(in oklab, var(--kind) 7%, transparent) 1px,
					transparent 1px
				)
				0 0 / 16px 16px,
			linear-gradient(
					to bottom,
					color-mix(in oklab, var(--kind) 7%, transparent) 1px,
					transparent 1px
				)
				0 0 / 16px 16px;
		mask-image: linear-gradient(to bottom, black 0%, transparent 85%);
		-webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 85%);
	}

	.sheet {
		position: absolute;
		bottom: -8px;
		left: 50%;
		width: 58%;
		height: 82%;
		border-radius: 9px 9px 0 0;
		background: var(--color-base-100);
		border: 1px solid color-mix(in oklab, var(--kind) 25%, var(--color-base-300));
		transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.sheet-back {
		transform: translateX(-50%) rotate(-6deg) translateY(7px);
		opacity: 0.55;
	}

	.sheet-mid {
		transform: translateX(-50%) rotate(5deg) translateY(5px);
		opacity: 0.75;
	}

	.sheet-front {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding-top: 11px;
		transform: translateX(-50%);
		box-shadow: 0 -1px 10px color-mix(in oklab, var(--kind) 12%, transparent);
		clip-path: polygon(0 0, calc(100% - 13px) 0, 100% 13px, 100% 100%, 0 100%);
	}

	/* Fan the stack out on hover so it reads as a pile of pages. */
	.group:hover .sheet-back {
		transform: translateX(-50%) rotate(-9deg) translateY(5px) translateX(-6px);
	}

	.group:hover .sheet-mid {
		transform: translateX(-50%) rotate(8deg) translateY(3px) translateX(6px);
	}

	.group:hover .sheet-front {
		transform: translateX(-50%) translateY(-3px);
	}

	.sheet-lines {
		width: 62%;
		flex: 1;
		opacity: 0.45;
		background-image: repeating-linear-gradient(
			to bottom,
			color-mix(in oklab, currentColor 30%, transparent) 0 2px,
			transparent 2px 8px
		);
	}

	.sheet-fold {
		position: absolute;
		top: 0;
		right: 0;
		width: 13px;
		height: 13px;
		border-bottom-left-radius: 7px;
		background: color-mix(in oklab, var(--kind) 18%, var(--color-base-200));
		box-shadow: -1px 1px 2px rgb(0 0 0 / 0.06);
	}

	/* Miniature sheet for list rows: same folded-corner motif at chip scale. */
	.doc-mini {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.1rem;
		height: 2.1rem;
		border: 1px solid color-mix(in oklab, var(--kind) 22%, var(--color-base-300));
		border-radius: 0.55rem;
		clip-path: polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 0 100%);
	}

	.doc-mini::after {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		width: 9px;
		height: 9px;
		border-bottom-left-radius: 5px;
		background: color-mix(in oklab, var(--kind) 22%, var(--color-base-200));
	}
</style>
