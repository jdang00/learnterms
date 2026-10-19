<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import FileText from '@lucide/svelte/icons/file-text';
	import { tick } from 'svelte';
	import type { PDFDocumentProxy } from 'pdfjs-dist';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Spinner } from '$lib/components/ui/spinner';
	import SourcePdfPage from '../source/SourcePdfPage.svelte';
	let {
		purpose = 'context',
		pageNumbers,
		selected,
		pdf,
		pdfError,
		pageText,
		sourceIndexedAt,
		previewPage = $bindable<number | null>(null),
		selectedOnly = $bindable(false),
		rangeError = $bindable(''),
		onPreview,
		onToggle
	}: {
		purpose?: 'context' | 'citation';
		pageNumbers: number[];
		selected: Set<number>;
		pdf: PDFDocumentProxy | null;
		pdfError: string;
		pageText: Record<number, string>;
		sourceIndexedAt?: number;
		previewPage?: number | null;
		selectedOnly?: boolean;
		rangeError?: string;
		onPreview: (page: number) => void;
		onToggle: (page: number) => void;
	} = $props();
	let jump = $state('');
	let grid = $state<HTMLDivElement>();
	const visiblePages = $derived(
		selectedOnly ? pageNumbers.filter((p) => selected.has(p)) : pageNumbers
	);
	async function jumpToPage() {
		const page = Number(jump);
		if (!pageNumbers.includes(page)) {
			rangeError = 'Enter a page number available in this document.';
			return;
		}
		rangeError = '';
		selectedOnly = false;
		previewPage = page;
		await tick();
		const button = grid?.querySelector<HTMLButtonElement>(`[data-page="${page}"]`);
		button?.scrollIntoView({ block: 'center', behavior: 'smooth' });
		button?.focus({ preventScroll: true });
	}
</script>

<div class="flex items-center justify-between gap-2 px-5 py-3">
	<span class="label-caps">{selectedOnly ? 'Selected pages' : 'All pages'}</span>
	<form
		class="flex items-center gap-1"
		onsubmit={(event) => {
			event.preventDefault();
			void jumpToPage();
		}}
	>
		<Input
			class="h-7 w-24 px-2.5 text-xs"
			type="number"
			min="1"
			aria-label="Go to page"
			placeholder="Go to page"
			bind:value={jump}
		/><Button variant="ghost" tone="neutral" size="xs" aria-label="Jump to page"
			><ChevronRight size={15} /></Button
		>
	</form>
</div>
<div bind:this={grid} class="thumbnail-scroll" aria-label="Page thumbnails">
	<div class="thumbnail-grid">
		{#each visiblePages as page (page)}
			<div class="page-tile" class:chosen={selected.has(page)} class:active={previewPage === page}>
				<button
					type="button"
					class="thumbnail-button"
					data-page={page}
					aria-label={`Preview page ${page}`}
					aria-pressed={previewPage === page}
					onclick={() => onPreview(page)}
				>
					{#if pdf}<SourcePdfPage document={pdf} pageNumber={page} thumbnail />{:else}<div
							class="text-thumbnail"
						>
							<FileText size={20} class="mb-2 opacity-30" /><span
								>{pageText[page]?.replace(/^#+\s*/gm, '').slice(0, 160) || `Page ${page}`}</span
							>{#if !pdfError}<Spinner class="mt-2 size-3 opacity-30" />{/if}
						</div>{/if}
				</button>
				<div class="flex items-center justify-between px-1 pt-2">
					<span class="font-mono text-xs font-medium text-foreground/55">{page}</span><button
						type="button"
						class="selection-target"
						aria-label={`${selected.has(page) ? 'Remove' : 'Add'} page ${page} ${selected.has(page) ? 'from' : 'to'} ${purpose === 'citation' ? 'citations' : 'context'}`}
						aria-pressed={selected.has(page)}
						disabled={sourceIndexedAt === undefined}
						onclick={() => onToggle(page)}
						><span class="selection-circle"
							>{#if selected.has(page)}<Check size={14} strokeWidth={3} />{/if}</span
						></button
					>
				</div>
			</div>
		{/each}
	</div>
	{#if !visiblePages.length}<p class="p-10 text-center text-sm text-foreground/50">
			No pages selected yet.<br /><button
				type="button"
				class="mt-3 underline"
				onclick={() => (selectedOnly = false)}>Browse all pages</button
			>
		</p>{/if}
</div>

<style>
	.thumbnail-scroll {
		flex: 1;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 4px 20px 24px;
	}
	.thumbnail-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 18px 16px;
	}
	.thumbnail-button {
		width: 100%;
		height: 106px;
		padding: 7px;
		border: 2px solid transparent;
		border-radius: 7px;
		background: color-mix(in oklab, var(--muted) 60%, transparent);
		cursor: pointer;
		transition:
			border-color 120ms,
			background 120ms;
		overflow: hidden;
	}
	.thumbnail-button:hover,
	.active .thumbnail-button {
		background: var(--muted);
		border-color: var(--muted-strong);
	}
	.chosen .thumbnail-button {
		border-color: var(--primary);
		background: color-mix(in oklab, var(--primary) 5%, var(--background));
	}
	.selection-target {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		cursor: pointer;
		border-radius: 50%;
	}
	.selection-circle {
		display: grid;
		place-items: center;
		width: 23px;
		height: 23px;
		border: 1.5px solid color-mix(in oklab, var(--foreground) 25%, transparent);
		border-radius: 50%;
	}
	.chosen .selection-circle {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}
	.text-thumbnail {
		overflow: hidden;
		height: 100%;
		padding: 5px;
		text-align: left;
		font-size: 7px;
		line-height: 1.5;
		color: var(--foreground);
	}

	@media (max-width: 767px) {
		.thumbnail-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 16px 10px;
		}
		.thumbnail-button {
			height: 86px;
			padding: 4px;
		}
		.thumbnail-scroll {
			padding-inline: 16px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.thumbnail-button {
			transition: none;
		}
	}
</style>
