<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { PDFDocumentProxy } from 'pdfjs-dist';
	import { Button } from '$lib/components/ui/button';
	import SourcePagePreview from '../source/SourcePagePreview.svelte';
	import SourcePdfPage from '../source/SourcePdfPage.svelte';
	let {
		purpose = 'context',
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
		purpose?: 'context' | 'citation';
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
		<div class="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
			<Button
				variant="ghost"
				tone="neutral"
				size="xs"
				class="md:hidden"
				onclick={() => (mobilePreview = false)}><ChevronLeft size={14} />Pages</Button
			>
			<span class="flex-1 text-sm font-semibold">Page {previewPage}</span>
			<Button
				variant="ghost"
				tone="neutral"
				shape="circle"
				size="xs"
				aria-label="Previous preview page"
				disabled={previewIndex <= 0}
				onclick={() => (previewPage = pageNumbers[previewIndex - 1])}
				><ChevronLeft size={16} /></Button
			>
			<Button
				variant="ghost"
				tone="neutral"
				shape="circle"
				size="xs"
				aria-label="Next preview page"
				disabled={previewIndex >= pageNumbers.length - 1}
				onclick={() => (previewPage = pageNumbers[previewIndex + 1])}
				><ChevronRight size={16} /></Button
			>
			<Button
				size="sm"
				variant={selected.has(previewPage) ? 'solid' : 'outline'}
				tone={selected.has(previewPage) ? 'primary' : 'neutral'}
				disabled={sourceIndexedAt === undefined}
				aria-pressed={selected.has(previewPage)}
				onclick={() => previewPage !== null && onToggle(previewPage)}
				>{#if selected.has(previewPage)}<Check size={14} />{purpose === 'citation'
						? 'Cited'
						: 'In context'}{:else}{purpose === 'citation'
						? 'Cite page'
						: 'Add to context'}{/if}</Button
			>
		</div>
		{#if pdf}<div class="flex gap-1 px-4 py-2">
				<Button
					size="xs"
					variant="ghost"
					tone="neutral"
					aria-pressed={!textPreview}
					onclick={() => (textPreview = false)}>Original</Button
				><Button
					size="xs"
					variant="ghost"
					tone="neutral"
					aria-pressed={textPreview}
					onclick={() => (textPreview = true)}
					>{purpose === 'citation' ? 'Extracted text' : 'Text used for questions'}</Button
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
					/>{:else}<div class="grid h-40 place-items-center text-xs text-foreground/50">
						{error ? 'Could not load page text.' : 'Loading page…'}
					</div>{/if}
			{/key}
		</div>
		<p class="px-4 py-2 text-[11px] text-foreground/45">
			{purpose === 'citation'
				? 'Selected pages appear as source chips below the rationale.'
				: 'Questions use the extracted text from your selected pages.'}
		</p>
	{/if}
</aside>

<style>
	.preview-pane {
		min-width: 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
		border-left: 1px solid var(--muted-strong);
		background: color-mix(in oklab, var(--muted) 65%, var(--background));
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
	@media (max-width: 767px) {
		.preview-pane {
			display: none;
			width: 100%;
			border-left: 0;
		}
		.preview-pane.mobile-preview {
			display: flex;
		}
	}
</style>
