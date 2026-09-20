<script lang="ts">
	import { Check, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import type { PDFDocumentProxy } from 'pdfjs-dist';
	import SourcePagePreview from './SourcePagePreview.svelte';
	import SourcePdfPage from './SourcePdfPage.svelte';
	let {
		pdf,
		pageNumbers,
		selected,
		pageText,
		sourceIndexedAt,
		error,
		previewPage = $bindable<number | null>(null),
		mobilePreview = $bindable(false),
		onToggle
	}: {
		pdf: PDFDocumentProxy | null;
		pageNumbers: number[];
		selected: Set<number>;
		pageText: Record<number, string>;
		sourceIndexedAt?: number;
		error: string;
		previewPage?: number | null;
		mobilePreview?: boolean;
		onToggle: (page: number) => void;
	} = $props();
	let textPreview = $state(false);
	const previewIndex = $derived(previewPage === null ? -1 : pageNumbers.indexOf(previewPage));
</script>

<aside class="preview-pane" class:mobile-preview={mobilePreview} aria-label="Page preview">
	{#if previewPage !== null}
		<div class="flex flex-wrap items-center gap-2 border-b border-base-300 px-4 py-3">
			<button
				type="button"
				class="back-to-grid btn btn-ghost btn-xs"
				onclick={() => (mobilePreview = false)}><ChevronLeft size={14} />Pages</button
			>
			<span class="flex-1 text-sm font-semibold">Page {previewPage}</span>
			<button
				type="button"
				class="btn btn-ghost btn-circle btn-xs"
				aria-label="Previous preview page"
				disabled={previewIndex <= 0}
				onclick={() => (previewPage = pageNumbers[previewIndex - 1])}
				><ChevronLeft size={16} /></button
			>
			<button
				type="button"
				class="btn btn-ghost btn-circle btn-xs"
				aria-label="Next preview page"
				disabled={previewIndex >= pageNumbers.length - 1}
				onclick={() => (previewPage = pageNumbers[previewIndex + 1])}
				><ChevronRight size={16} /></button
			>
			<button
				type="button"
				class="btn btn-sm rounded-full {selected.has(previewPage) ? 'btn-primary' : 'btn-outline'}"
				disabled={sourceIndexedAt === undefined}
				aria-pressed={selected.has(previewPage)}
				onclick={() => previewPage !== null && onToggle(previewPage)}
				>{#if selected.has(previewPage)}<Check size={14} />In context{:else}Add to context{/if}</button
			>
		</div>
		{#if pdf}<div class="flex gap-1 px-4 py-2">
				<button
					type="button"
					class="btn btn-xs rounded-full {textPreview ? 'btn-ghost' : 'btn-active'}"
					aria-pressed={!textPreview}
					onclick={() => (textPreview = false)}>Original</button
				><button
					type="button"
					class="btn btn-xs rounded-full {textPreview ? 'btn-active' : 'btn-ghost'}"
					aria-pressed={textPreview}
					onclick={() => (textPreview = true)}>Text used for questions</button
				>
			</div>{/if}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable preview needs keyboard access.) -->
		<div
			class="preview-scroll"
			tabindex="0"
			role="region"
			aria-label={`Page ${previewPage} content`}
		>
			{#key previewPage}
				{#if pdf && !textPreview}<SourcePdfPage
						document={pdf}
						pageNumber={previewPage}
					/>{:else if pageText[previewPage] !== undefined}<SourcePagePreview
						text={pageText[previewPage]}
					/>{:else}<div class="grid h-40 place-items-center text-xs text-base-content/50">
						{error ? 'Could not load page text.' : 'Loading page…'}
					</div>{/if}
			{/key}
		</div>
		<p class="px-4 py-2 text-[11px] text-base-content/45">
			Questions use the extracted text from your selected pages.
		</p>
	{/if}
</aside>

<style>
	.preview-pane {
		min-width: 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
		border-left: 1px solid var(--color-base-300);
		background: color-mix(in oklab, var(--color-base-200) 65%, var(--color-base-100));
	}
	.preview-pane > p {
		flex: 0 0 auto;
	}
	.preview-scroll {
		flex: 1;
		min-height: 0;
		overflow: auto;
		overscroll-behavior: contain;
		padding: 18px;
	}
	.back-to-grid {
		display: none;
	}

	@media (max-width: 767px) {
		.preview-pane {
			display: none;
			width: 100%;
			border-left: 0;
		}
		.preview-pane.mobile-preview {
			display: flex;
		}
		.back-to-grid {
			display: inline-flex;
		}
	}
</style>
