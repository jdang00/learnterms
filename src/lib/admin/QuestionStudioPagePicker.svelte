<script lang="ts">
	import QuestionStudioPagePreview from './QuestionStudioPagePreview.svelte';
	import QuestionStudioPageThumbnails from './QuestionStudioPageThumbnails.svelte';
	import { Check, Grid2X2, RotateCcw, X } from 'lucide-svelte';
	import { useConvexClient } from 'convex-svelte';
	import { base } from '$app/paths';
	import { untrack } from 'svelte';
	import type { PDFDocumentProxy, PDFDocumentLoadingTask } from 'pdfjs-dist';
	import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';
	import QuestionStudioContextMeter from './QuestionStudioContextMeter.svelte';
	import type { SourcePreviewBatch } from './sourceContext';
	import { formatPageSelection, parsePageSelection, sourcePageBatch } from './pagePickerSelection';

	let {
		documentId,
		initialSource,
		onSourceReloaded,
		selectedPageNumbers = $bindable<number[]>([]),
		sourceIndexedAt = $bindable<number | undefined>()
	}: {
		documentId: Id<'contentLib'>;
		initialSource: SourcePreviewBatch;
		onSourceReloaded: (result: SourcePreviewBatch) => void;
		selectedPageNumbers?: number[];
		sourceIndexedAt?: number;
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
	let open = $state(false);
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
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});
	$effect(() => {
		const id = documentId;
		if (!loadPdf) return;
		let cancelled = false;
		let task: PDFDocumentLoadingTask | undefined;
		pdf = null;
		pdfError = '';
		void (async () => {
			try {
				const [url, pdfjs] = await Promise.all([
					client.query(api.r2Documents.getDocumentUrl, { documentId: id }),
					import('pdfjs-dist')
				]);
				if (cancelled) return;
				pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
				const assetBase = `${base}/pdfjs/${pdfjs.version}`;
				task = pdfjs.getDocument({
					url,
					cMapUrl: `${assetBase}/cmaps/`,
					standardFontDataUrl: `${assetBase}/standard_fonts/`,
					wasmUrl: `${assetBase}/wasm/`,
					iccUrl: `${assetBase}/iccs/`
				});
				const loaded = await task.promise;
				if (!cancelled) pdf = loaded;
			} catch {
				if (!cancelled)
					pdfError =
						'Original previews are unavailable. You can still choose pages and read their extracted text.';
			}
		})();
		return () => {
			cancelled = true;
			void task?.destroy();
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
				const result = await client.action(api.questionStudio.getSourcePages, {
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

<section
	class="mt-5 rounded-2xl border border-base-300 bg-base-200/40 p-4"
	aria-label="Select source pages"
>
	<div class="flex items-center gap-3">
		<div class="rounded-xl bg-base-100 p-3 text-primary"><Grid2X2 size={21} /></div>
		<div class="min-w-0 flex-1">
			<h2 class="text-sm font-semibold">Choose your pages</h2>
			<p class="mt-0.5 text-xs text-base-content/55">
				Browse thumbnails, preview a page, and add it to context.
			</p>
		</div>
		<button
			type="button"
			class="btn btn-primary btn-sm rounded-full"
			disabled={!pageNumbers.length}
			onclick={() => {
				open = true;
				loadPdf = true;
				mobilePreview = false;
			}}>{selectedPageNumbers.length ? 'Edit selection' : 'Choose pages'}</button
		>
	</div>
	<div class="mt-3 flex gap-2 border-t border-base-300 pt-3 text-xs" aria-live="polite">
		<span class="shrink-0 font-semibold"
			>{selectedPageNumbers.length} of {pageNumbers.length || '…'} pages selected</span
		>
		<span class="truncate text-base-content/55" title={selectionSummary}
			>{selectionSummary ||
				(pageNumbers.length ? 'No pages in context yet' : 'Loading pages…')}</span
		>
	</div>
	{#if error && !open}<p class="mt-2 text-xs text-error" role="alert">
			{error}
			<button class="underline" onclick={() => load(documentId, 0, requestVersion)}
				>Reload pages</button
			>
		</p>{/if}
</section>

<dialog
	bind:this={dialog}
	class="page-dialog bg-base-100 text-base-content"
	aria-labelledby="page-picker-title"
	onclose={() => (open = false)}
>
	{#if open}
		<div class="picker-shell">
			<header class="flex items-center gap-3 border-b border-base-300 px-5 py-4">
				<div class="min-w-0 flex-1">
					<h2 id="page-picker-title" class="text-lg font-semibold tracking-tight">
						Choose your pages
					</h2>
					<p class="mt-0.5 text-xs text-base-content/55">
						{pageNumbers.length} pages · Tap a thumbnail to preview, a circle to select.
					</p>
				</div>
				<button
					type="button"
					class="btn btn-ghost btn-circle btn-sm"
					aria-label="Close page picker"
					onclick={() => (open = false)}><X size={18} /></button
				>
			</header>
			<div class="picker-toolbar border-b border-base-300 px-5 py-3">
				<div class="flex flex-wrap items-center gap-2">
					<button
						type="button"
						class="btn btn-outline btn-xs rounded-full"
						disabled={sourceIndexedAt === undefined}
						onclick={() => (selectedPageNumbers = [...pageNumbers])}>Select all</button
					>
					<button
						type="button"
						class="btn btn-ghost btn-xs rounded-full"
						disabled={!selectedPageNumbers.length}
						onclick={() => (selectedPageNumbers = [])}>Clear</button
					>
					<button
						type="button"
						class="btn btn-xs rounded-full {selectedOnly ? 'btn-primary' : 'btn-ghost'}"
						aria-pressed={selectedOnly}
						onclick={() => (selectedOnly = !selectedOnly)}
						>Selected only{selectedPageNumbers.length
							? ` (${selectedPageNumbers.length})`
							: ''}</button
					>
				</div>
				<form
					class="flex min-w-0 items-center gap-2"
					onsubmit={(event) => {
						event.preventDefault();
						addRange();
					}}
				>
					<input
						class="input input-sm min-w-0 flex-1 rounded-lg"
						aria-label="Page numbers or ranges"
						placeholder="Pages: 1–12, 24, 38–45"
						bind:value={range}
					/>
					<button class="btn btn-sm rounded-lg" disabled={sourceIndexedAt === undefined}
						>Add pages</button
					>
				</form>
			</div>
			{#if rangeError}<p class="px-5 py-2 text-xs text-error" role="alert">{rangeError}</p>{/if}
			{#if error}<p class="px-5 py-2 text-xs text-error" role="alert">
					{error}
					<button class="underline" onclick={() => load(documentId, 0, requestVersion)}
						><RotateCcw size={12} class="inline" /> Reload pages</button
					>
				</p>{/if}
			{#if pdfError}<p
					class="border-b border-base-300 px-5 py-2 text-xs text-base-content/60"
					role="status"
				>
					{pdfError}
				</p>{/if}
			<div class="picker-body" class:mobile-preview={mobilePreview}>
				<div class="thumbnail-pane">
					<QuestionStudioPageThumbnails
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
			<QuestionStudioContextMeter
				pageStats={initialSource.pageCharacterCounts}
				{selectedPageNumbers}
				{error}
				compact
			/>
			<footer class="flex items-center gap-3 border-t border-base-300 px-5 py-4">
				<div class="min-w-0 flex-1" aria-live="polite">
					<p class="text-sm font-semibold">{selectedPageNumbers.length} pages in context</p>
					<p class="truncate text-xs text-base-content/50" title={selectionSummary}>
						{selectionSummary || 'Select the pages you want questions from.'}
					</p>
				</div>
				<button
					type="button"
					class="btn btn-primary rounded-full px-7"
					onclick={() => (open = false)}>Done<Check size={16} /></button
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
		border: 1px solid var(--color-base-300);
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
