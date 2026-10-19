<script lang="ts">
	import * as Empty from '$lib/components/ui/empty';
	import DocumentPipelineProgress from './DocumentPipelineProgress.svelte';
	import { documentPipeline } from './documentPipeline';
	import Check from '@lucide/svelte/icons/check';
	import Library from '@lucide/svelte/icons/library';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import type { Doc } from '../../../convex/_generated/dataModel';
	import { docHue, fileKind, formatPages, relativeTime, type ViewMode } from './contentLibrary';
	import { formatBytes } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';

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
				<Skeleton class="h-52 w-full rounded-2xl" />
			{/each}
		</div>
	{:else}
		<div class="space-y-2">
			{#each Array.from({ length: 8 }, (_, index) => index) as index (index)}
				<Skeleton class="h-16 w-full rounded-xl" />
			{/each}
		</div>
	{/if}
{:else if docs.length === 0 && searchTerm}
	<Empty.Root class="surface-dashed py-20">
		<Empty.Header>
			<Empty.Media variant="icon" class="rounded-full"><Search /></Empty.Media>
			<Empty.Title class="text-sm">No matches for "{searchTerm}"</Empty.Title>
			<Empty.Description class="text-xs"
				>Try a different word or check the spelling.</Empty.Description
			>
		</Empty.Header>
	</Empty.Root>
{:else if docs.length === 0}
	<Empty.Root class="surface-dashed py-20">
		<Empty.Header>
			<Empty.Media variant="icon" class="size-16 bg-primary/10 text-primary-ink [&_svg]:size-7"
				><Library /></Empty.Media
			>
			<Empty.Title>Your library is empty</Empty.Title>
			<Empty.Description>Add your first PDF to make it searchable for your class.</Empty.Description
			>
		</Empty.Header>
		<Empty.Content>
			<Button size="sm" class="gap-2" onclick={onAdd}>
				<Plus size={15} />
				Add file
			</Button>
		</Empty.Content>
	</Empty.Root>
{:else if viewMode === 'grid'}
	<div
		class="grid grid-cols-2 gap-3 {isDrawerOpen
			? 'xl:grid-cols-2'
			: 'sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6'}"
	>
		{#each docs as doc (doc._id)}
			{@const kind = fileKind(doc)}
			{@const tone = docHue(doc)}
			{@const pages = formatPages(doc.metadata?.pageCount)}
			{@const pipeline = documentPipeline(doc.metadata)}
			{@const isReady = pipeline.complete}
			{@const isSelected = selectedDocumentId === doc._id && isDrawerOpen}
			<div class="group relative" style="--kind: {tone.hue}">
				<button
					class="doc-card flex h-52 w-full flex-col overflow-hidden rounded-2xl border bg-background text-left transition-all duration-200 hover:-translate-y-1 {isSelected
						? 'border-primary ring-1 ring-primary'
						: 'border-border hover:border-[color-mix(in_oklab,var(--kind)_45%,var(--line))]'}"
					onclick={() => onSelect(doc)}
				>
					<div class="doc-stage relative h-28 w-full shrink-0 overflow-hidden">
						<span
							class="absolute left-2.5 top-2.5 z-10 inline-flex items-center rounded-full bg-background/85 px-2 py-0.5 label-caps text-foreground/65 backdrop-blur"
						>
							{kind.label}
						</span>
						{#if isReady}
							<span
								class="absolute right-3 top-3 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-background/90 text-success-ink group-hover:opacity-0 group-focus-within:opacity-0"
								title="Ready"
							>
								<Check size={12} strokeWidth={2.5} aria-hidden="true" /><span class="sr-only"
									>Ready</span
								>
							</span>
						{/if}
						{#if pages && (!pipeline.visible || pipeline.complete)}
							<span
								class="absolute bottom-2 right-2.5 z-10 inline-flex items-center rounded-full bg-background/85 px-2 py-0.5 font-mono text-[10px] font-medium text-foreground/70 backdrop-blur"
							>
								{pages}
							</span>
						{/if}
						<div class="sheet sheet-back"></div>
						<div class="sheet sheet-mid"></div>
						<div class="sheet sheet-front {tone.accent}">
							<kind.icon size={24} strokeWidth={1.5} />
							<span class="sheet-lines"></span>
							<span class="sheet-fold"></span>
						</div>
						{#if pipeline.visible && !pipeline.complete}
							<div
								class="absolute inset-x-0 bottom-0 z-10 bg-background/95 px-3 py-1 backdrop-blur"
							>
								<DocumentPipelineProgress metadata={doc.metadata} />
							</div>
						{/if}
					</div>
					<div class="flex min-h-0 flex-1 flex-col gap-1 border-t border-border/60 p-3">
						<p
							class="line-clamp-2 h-10 shrink-0 break-words text-sm font-medium leading-snug"
							title={doc.title}
						>
							{doc.title}
						</p>
						<div
							class="mt-auto flex shrink-0 items-center gap-1.5 pt-1.5 text-[11px] text-foreground/50"
						>
							<span>{formatBytes(doc.metadata?.sizeBytes)}</span>
							<span class="text-foreground/30">·</span>
							<span class="truncate">{relativeTime(doc.updatedAt)}</span>
						</div>
					</div>
				</button>
				<Button
					variant="outline"
					tone="neutral"
					shape="circle"
					size="xs"
					class="absolute top-2 right-2 z-20 bg-background/90 opacity-0 shadow-sm backdrop-blur transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
					onclick={() => onRename(doc)}
					aria-label="Rename {doc.title}"
					title="Rename"
				>
					<Pencil size={12} />
				</Button>
			</div>
		{/each}
	</div>
{:else}
	<div class="overflow-hidden surface">
		<div
			class="hidden grid-cols-[1fr_4rem_5rem_7rem_2.25rem] items-center gap-3 border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/40 {isDrawerOpen
				? ''
				: 'sm:grid'}"
		>
			<span>Name</span>
			<span class="text-right">Pages</span>
			<span class="text-right">Size</span>
			<span class="text-right">Updated</span>
			<span></span>
		</div>
		<div class="divide-y divide-muted">
			{#each docs as doc (doc._id)}
				{@const kind = fileKind(doc)}
				{@const tone = docHue(doc)}
				{@const pages = formatPages(doc.metadata?.pageCount)}
				{@const isReady = documentPipeline(doc.metadata).complete}
				{@const isSelected = selectedDocumentId === doc._id && isDrawerOpen}
				<div class="group relative" style="--kind: {tone.hue}">
					<button
						class="grid w-full grid-cols-[1fr_2.25rem] items-center gap-3 px-4 py-2.5 text-left transition-colors {isDrawerOpen
							? ''
							: 'sm:grid-cols-[1fr_4rem_5rem_7rem_2.25rem]'} {isSelected
							? 'bg-primary/5'
							: 'hover:bg-muted/60'}"
						onclick={() => onSelect(doc)}
					>
						<div class="flex min-w-0 items-center gap-3">
							<div class="relative shrink-0">
								<div class="doc-mini {tone.tint} {tone.accent}"><kind.icon size={15} /></div>
								{#if isReady}
									<span
										class="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background text-success-ink"
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
								<p class="truncate text-xs text-foreground/50">
									{doc.metadata?.originalFileName ?? kind.label}{#if pages}<span
											class={isDrawerOpen ? '' : 'sm:hidden'}
										>
											· {pages}</span
										>{/if}
								</p>
							</div>
						</div>
						<span
							class="text-right text-xs tabular-nums text-foreground/60 {isDrawerOpen
								? 'hidden'
								: 'max-sm:hidden'}"
						>
							{doc.metadata?.pageCount ?? '—'}
						</span>
						<span
							class="text-right text-xs text-foreground/60 {isDrawerOpen
								? 'hidden'
								: 'max-sm:hidden'}"
						>
							{formatBytes(doc.metadata?.sizeBytes)}
						</span>
						<span
							class="text-right text-xs text-foreground/60 {isDrawerOpen
								? 'hidden'
								: 'max-sm:hidden'}"
						>
							{relativeTime(doc.updatedAt)}
						</span>
						<span></span>
					</button>
					<Button
						variant="outline"
						tone="neutral"
						shape="circle"
						size="xs"
						class="absolute top-1/2 right-3 z-10 -translate-y-1/2 bg-background/90 opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
						onclick={() => onRename(doc)}
						aria-label="Rename {doc.title}"
						title="Rename"
					>
						<Pencil size={12} />
					</Button>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	/* Kind-tinted backdrop with a graph-paper grid (same motif as the landing
	   page) fading out behind the paper stack. */
	.doc-stage {
		background-color: color-mix(in oklab, var(--kind) 6%, var(--muted));
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
		background: var(--background);
		border: 1px solid color-mix(in oklab, var(--kind) 25%, var(--muted-strong));
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
		box-shadow: 0 -1px 10px color-mix(in oklab, var(--kind) 10%, transparent);
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
		background: color-mix(in oklab, var(--kind) 18%, var(--muted));
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
		border: 1px solid color-mix(in oklab, var(--kind) 22%, var(--muted-strong));
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
		background: color-mix(in oklab, var(--kind) 22%, var(--muted));
	}
</style>
