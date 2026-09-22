<script lang="ts">
	import { Check, ChevronRight, FileText } from 'lucide-svelte';
	import { tick } from 'svelte';
	import type { PDFDocumentProxy } from 'pdfjs-dist';
	import SourcePdfPage from './SourcePdfPage.svelte';
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
	<span class="text-[11px] font-semibold tracking-wider text-base-content/45 uppercase"
		>{selectedOnly ? 'Selected pages' : 'All pages'}</span
	>
	<form
		class="flex items-center gap-1"
		onsubmit={(event) => {
			event.preventDefault();
			void jumpToPage();
		}}
	>
		<input
			class="input input-xs w-24 rounded-md"
			type="number"
			min="1"
			aria-label="Go to page"
			placeholder="Go to page"
			bind:value={jump}
		/><button class="btn btn-ghost btn-xs" aria-label="Jump to page"
			><ChevronRight size={15} /></button
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
							>{#if !pdfError}<span class="loading loading-spinner loading-xs mt-2 opacity-30"
								></span>{/if}
						</div>{/if}
				</button>
				<div class="flex items-center justify-between px-1 pt-2">
					<span class="text-xs font-medium tabular-nums text-base-content/55">{page}</span><button
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
	{#if !visiblePages.length}<p class="p-10 text-center text-sm text-base-content/50">
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
		background: color-mix(in oklab, var(--color-base-200) 60%, transparent);
		cursor: pointer;
		transition:
			border-color 120ms,
			background 120ms;
		overflow: hidden;
	}
	.thumbnail-button:hover,
	.active .thumbnail-button {
		background: var(--color-base-200);
		border-color: var(--color-base-300);
	}
	.chosen .thumbnail-button {
		border-color: var(--color-primary);
		background: color-mix(in oklab, var(--color-primary) 5%, var(--color-base-100));
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
		border: 1.5px solid color-mix(in oklab, var(--color-base-content) 25%, transparent);
		border-radius: 50%;
	}
	.chosen .selection-circle {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-primary-content);
	}
	.text-thumbnail {
		overflow: hidden;
		height: 100%;
		padding: 5px;
		text-align: left;
		font-size: 7px;
		line-height: 1.5;
		color: var(--color-base-content);
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
