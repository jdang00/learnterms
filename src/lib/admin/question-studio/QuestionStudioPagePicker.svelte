<script lang="ts">
	import QuestionStudioPagePreview from './QuestionStudioPagePreview.svelte';
	import QuestionStudioPageThumbnails from './QuestionStudioPageThumbnails.svelte';
	import Check from '@lucide/svelte/icons/check';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import X from '@lucide/svelte/icons/x';
	import { useConvexClient } from 'convex-svelte';
	import { untrack } from 'svelte';
	import type { PDFDocumentProxy } from 'pdfjs-dist';
	import { createSourcePdf, type SourcePdfResource } from '../source/sourcePdf';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import QuestionStudioContextMeter from './QuestionStudioContextMeter.svelte';
	import type { SourcePreviewBatch } from '../source/sourceContext';
	import { formatPageSelection, parsePageSelection, sourcePageBatch } from './pagePickerSelection';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';

	let {
		documentId,
		purpose = 'context',
		pdfResource,
		onDone,
		onChangeDocument,
		initialSource,
		onSourceReloaded,
		selectedPageNumbers = $bindable<number[]>([]),
		sourceIndexedAt = $bindable<number | undefined>(),
		open = $bindable(false)
	}: {
		documentId: Id<'contentLib'>;
		purpose?: 'context' | 'citation';
		pdfResource?: SourcePdfResource;
		onDone?: () => void;
		onChangeDocument?: () => void;
		initialSource: SourcePreviewBatch;
		onSourceReloaded: (result: SourcePreviewBatch) => void;
		selectedPageNumbers?: number[];
		sourceIndexedAt?: number;
		open?: boolean;
	} = $props();
	const client = useConvexClient();
	let pageText = $state<Record<number, string>>({});
	let pageNumbers = $state<number[]>([]);
	let error = $state('');
	let requestVersion = 0;
	// Request bookkeeping does not drive rendering.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	let pending = new Map<number, Promise<void>>();
	let dialog = $state<HTMLDialogElement>();
	let loadPdf = $state(false);
	let pdf = $state.raw<PDFDocumentProxy | null>(null);
	let pdfError = $state('');
	let previewPage = $state<number | null>(null);
	let mobilePreview = $state(false);
	let selectedOnly = $state(false);
	let range = $state('');
	let rangeError = $state('');
	const selected = $derived(new Set(selectedPageNumbers));
	const selectionSummary = $derived(formatPageSelection(selectedPageNumbers));

	$effect(() => {
		void documentId;
		requestVersion++;
		pageText = {};
		pageNumbers = [];
		pending = new Map();
		previewPage = null;
		sourceIndexedAt = undefined;
		error = '';
		const initial = initialSource;
		pageText = Object.fromEntries(initial.pages.map((page) => [page.pageNumber, page.text]));
		pageNumbers = initial.pageNumbers;
		untrack(() => {
			selectedPageNumbers = selectedPageNumbers.filter((page) =>
				initial.pageNumbers.includes(page)
			);
		});
		previewPage = initial.pageNumbers[0] ?? null;
		sourceIndexedAt = initial.sourceIndexedAt;
		return () => {
			requestVersion++;
		};
	});
	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			loadPdf = true;
			mobilePreview = false;
			dialog.showModal();
		} else if (!open && dialog.open) dialog.close();
	});
	$effect(() => {
		const id = documentId;
		if (!loadPdf) return;
		let cancelled = false;
		const resource =
			pdfResource ??
			createSourcePdf(() => client.query(api.r2Documents.getDocumentUrl, { documentId: id }));
		const ownsResource = !pdfResource;
		pdf = null;
		pdfError = '';
		void resource.promise
			.then((loaded) => {
				if (!cancelled) pdf = loaded;
			})
			.catch(() => {
				if (!cancelled)
					pdfError =
						'Original previews are unavailable. You can still choose pages and read their extracted text.';
			});
		return () => {
			cancelled = true;
			if (ownsResource) resource.destroy();
		};
	});

	$effect(() => {
		const page = previewPage;
		if (
			open &&
			page !== null &&
			pageNumbers.includes(page) &&
			pageText[page] === undefined &&
			!error
		)
			void load(documentId, sourcePageBatch(page, pageNumbers), requestVersion);
	});

	function load(id: Id<'contentLib'>, offset: number, version: number): Promise<void> {
		const existing = pending.get(offset);
		if (existing) return existing;
		const request = (async () => {
			try {
				const result = await client.action(api.questionStudio.context.getSourcePages, {
					documentId: id,
					offset
				});
				if (version !== requestVersion) return;
				if (offset === 0) {
					error = '';
					onSourceReloaded(result);
				}
				if (offset > 0 && sourceIndexedAt !== result.sourceIndexedAt) {
					selectedPageNumbers = [];
					sourceIndexedAt = undefined;
					throw new Error('The source changed. Reload its pages before selecting context.');
				}
				pageText = {
					...pageText,
					...Object.fromEntries(result.pages.map((p) => [p.pageNumber, p.text]))
				};
				pageNumbers = result.pageNumbers;
				selectedPageNumbers = selectedPageNumbers.filter((page) =>
					result.pageNumbers.includes(page)
				);
				sourceIndexedAt = result.sourceIndexedAt;
				if (previewPage === null) previewPage = result.pageNumbers[0] ?? null;
			} catch (cause) {
				if (version === requestVersion)
					error = cause instanceof Error ? cause.message : 'Could not load pages.';
			} finally {
				if (version === requestVersion) pending.delete(offset);
			}
		})();
		pending.set(offset, request);
		return request;
	}
	function toggle(page: number) {
		selectedPageNumbers = selected.has(page)
			? selectedPageNumbers.filter((n) => n !== page)
			: [...selectedPageNumbers, page].sort((a, b) => a - b);
	}
	function preview(page: number) {
		previewPage = page;
		mobilePreview = true;
	}
	function addRange() {
		try {
			const additions = parsePageSelection(range, pageNumbers);
			selectedPageNumbers = [...new Set([...selectedPageNumbers, ...additions])].sort(
				(a, b) => a - b
			);
			rangeError = '';
			range = '';
		} catch (cause) {
			rangeError = (cause as Error).message;
		}
	}
</script>

{#if error && !open}
	<p class="mt-3 text-xs text-error-ink" role="alert">
		{error}
		<button class="underline" onclick={() => load(documentId, 0, requestVersion)}>
			Reload pages
		</button>
	</p>
{/if}

<dialog
	bind:this={dialog}
	class="page-dialog bg-background text-foreground"
	aria-labelledby="page-picker-title"
	onclose={() => (open = false)}
>
	{#if open}
		<div class="picker-shell">
			<header class="flex items-center gap-3 border-b border-border px-5 py-4">
				<div class="min-w-0 flex-1">
					<h2 id="page-picker-title" class="text-lg font-semibold tracking-tight">
						{purpose === 'citation' ? 'Choose pages to cite' : 'Choose your pages'}
					</h2>
					<p class="mt-0.5 text-xs text-foreground/55">
						Tap a thumbnail to preview it, or its circle to select it.
					</p>
				</div>
				{#if onChangeDocument}
					<Button
						variant="ghost"
						tone="neutral"
						size="sm"
						onclick={() => {
							open = false;
							onChangeDocument();
						}}>Change document</Button
					>
				{/if}
				<Button
					variant="ghost"
					tone="neutral"
					shape="circle"
					size="sm"
					aria-label="Close page picker"
					onclick={() => (open = false)}><X size={18} /></Button
				>
			</header>
			<div class="picker-toolbar border-b border-border px-5 py-3">
				<div class="flex flex-wrap items-center gap-2">
					<Button
						variant="outline"
						tone="neutral"
						size="xs"
						disabled={sourceIndexedAt === undefined}
						onclick={() => (selectedPageNumbers = [...pageNumbers])}>Select all</Button
					>
					<Button
						variant="ghost"
						tone="neutral"
						size="xs"
						disabled={!selectedPageNumbers.length}
						onclick={() => (selectedPageNumbers = [])}>Clear</Button
					>
					<Button
						variant={selectedOnly ? 'solid' : 'ghost'}
						tone={selectedOnly ? 'primary' : 'neutral'}
						size="xs"
						aria-pressed={selectedOnly}
						onclick={() => (selectedOnly = !selectedOnly)}
						>Selected only{selectedPageNumbers.length
							? ` (${selectedPageNumbers.length})`
							: ''}</Button
					>
				</div>
				<form
					class="flex min-w-0 items-center gap-2"
					onsubmit={(event) => {
						event.preventDefault();
						addRange();
					}}
				>
					<Input
						class="h-8 min-w-0 flex-1 px-3 text-sm"
						aria-label="Page numbers or ranges"
						placeholder="Pages: 1–12, 24, 38–45"
						bind:value={range}
					/>
					<Button
						type="submit"
						variant="soft"
						tone="neutral"
						size="sm"
						disabled={sourceIndexedAt === undefined}>Add pages</Button
					>
				</form>
			</div>
			{#if rangeError}<p class="px-5 py-2 text-xs text-error-ink" role="alert">{rangeError}</p>{/if}
			{#if error}<p class="px-5 py-2 text-xs text-error-ink" role="alert">
					{error}
					<button class="underline" onclick={() => load(documentId, 0, requestVersion)}
						><RotateCcw size={12} class="inline" /> Reload pages</button
					>
				</p>{/if}
			{#if pdfError}<p
					class="border-b border-border px-5 py-2 text-xs text-foreground/60"
					role="status"
				>
					{pdfError}
				</p>{/if}
			<div class="picker-body" class:mobile-preview={mobilePreview}>
				<div class="thumbnail-pane">
					<QuestionStudioPageThumbnails
						{purpose}
						{pageNumbers}
						{selected}
						{pdf}
						{pdfError}
						{pageText}
						{sourceIndexedAt}
						bind:previewPage
						bind:selectedOnly
						bind:rangeError
						onPreview={preview}
						onToggle={toggle}
					/>
				</div>
				<QuestionStudioPagePreview
					{purpose}
					{pdf}
					{pageNumbers}
					{selected}
					{pageText}
					{sourceIndexedAt}
					{error}
					bind:previewPage
					bind:mobilePreview
					onToggle={toggle}
				/>
			</div>
			{#if purpose === 'context'}
				<QuestionStudioContextMeter
					pageStats={initialSource.pageCharacterCounts}
					{selectedPageNumbers}
					compact
					track
				/>
			{/if}
			<footer class="flex items-center gap-3 border-t border-border px-5 py-4">
				<div class="min-w-0 flex-1" aria-live="polite">
					<p class="text-sm font-semibold">
						{selectedPageNumbers.length}
						{selectedPageNumbers.length === 1 ? 'page' : 'pages'}
						{purpose === 'citation' ? 'to cite' : 'in context'}
					</p>
					<p class="truncate text-xs text-foreground/50" title={selectionSummary}>
						{selectionSummary ||
							(purpose === 'citation'
								? 'Select pages that support your rationale.'
								: 'Select the pages you want questions from.')}
					</p>
				</div>
				<Button
					class="px-7"
					onclick={() => {
						onDone?.();
						open = false;
					}}>{purpose === 'citation' ? 'Use pages' : 'Done'}<Check size={16} /></Button
				>
			</footer>
		</div>
	{/if}
</dialog>

<style>
	.page-dialog {
		width: min(1440px, 94vw);
		max-width: none;
		height: min(900px, 90dvh);
		max-height: none;
		padding: 0;
		margin: auto;
		border: 1px solid var(--muted-strong);
		border-radius: 20px;
		box-shadow: 0 24px 100px #0004;
		overflow: hidden;
	}
	.page-dialog::backdrop {
		background: #11182780;
		backdrop-filter: blur(4px);
	}
	.picker-shell {
		height: 100%;
		display: flex;
		flex-direction: column;
	}
	.picker-toolbar {
		display: grid;
		grid-template-columns: 1fr minmax(260px, 420px);
		align-items: center;
		gap: 12px;
	}
	.picker-body {
		display: grid;
		grid-template-columns: 1fr 1fr;
		flex: 1;
		min-height: 0;
	}
	.thumbnail-pane {
		min-width: 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	@media (max-width: 767px) {
		.page-dialog {
			width: 100vw;
			height: 100dvh;
			border-radius: 0;
			border: 0;
		}
		.picker-toolbar {
			grid-template-columns: 1fr;
			gap: 10px;
		}
		.picker-body {
			display: flex;
		}
		.thumbnail-pane {
			width: 100%;
		}

		.mobile-preview .thumbnail-pane {
			display: none;
		}
	}
</style>
