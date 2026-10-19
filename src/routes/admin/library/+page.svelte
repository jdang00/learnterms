<script lang="ts">
	import { SegmentedControl } from '#lib/components/ui/segmented-control/index.js';
	import '#lib/admin/content-library/markdown-preview.css';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { LoadingState } from '#lib/components/ui/spinner/index.js';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import FileUp from '@lucide/svelte/icons/file-up';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import Minimize2 from '@lucide/svelte/icons/minimize-2';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Presentation from '@lucide/svelte/icons/presentation';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	import { fade } from 'svelte/transition';
	import * as FileDropZone from '#lib/components/ui/file-drop-zone/index.js';
	import { toastStore } from '#lib/stores/toast.svelte.js';
	import AddDocumentModal from '../../../lib/admin/content-library/AddDocumentModal.svelte';
	import ContentLibraryExplorer from '../../../lib/admin/content-library/ContentLibraryExplorer.svelte';
	import ContentLibraryHeader from '../../../lib/admin/content-library/ContentLibraryHeader.svelte';
	import ContentLibraryPreviewUnavailable from '../../../lib/admin/content-library/ContentLibraryPreviewUnavailable.svelte';
	import ContentLibraryPropertiesPanel from '../../../lib/admin/content-library/ContentLibraryPropertiesPanel.svelte';
	import ContentLibrarySourcePanel from '../../../lib/admin/content-library/ContentLibrarySourcePanel.svelte';
	import ContentLibraryToolbar from '../../../lib/admin/content-library/ContentLibraryToolbar.svelte';
	import DeleteConfirmationModal from '../../../lib/admin/DeleteConfirmationModal.svelte';
	import FullscreenTableDialog from '../../../lib/admin/content-library/FullscreenTableDialog.svelte';
	import RenameDocumentModal from '../../../lib/admin/content-library/RenameDocumentModal.svelte';
	import {
		fileKind,
		formatPages,
		type DrawerTab,
		type SortKey,
		type ViewMode
	} from '../../../lib/admin/content-library/contentLibrary';
	import { formatBytes } from '#lib/utils/format.js';
	import {
		extractTableLabels,
		isLocalArtifactLink,
		loadKatex,
		renderLatex,
		resolveTableLabels,
		stripPreviewArtifactReferences,
		stripStandaloneTableHeadings,
		styleTag
	} from '../../../lib/admin/content-library/contentLibraryPreview';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { Doc } from '../../../convex/_generated/dataModel';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import { Marked, Renderer } from 'marked';
	import 'katex/dist/katex.min.css';
	import { sanitizeHtml } from '#lib/utils/sanitizeHtml.js';

	let { data } = $props();

	const client = useConvexClient();
	const userDataQuery = $derived(data.userData);
	const documents = $derived(data.documents);

	let isAddModalOpen = $state(false);
	let isDeleteModalOpen = $state(false);
	let deletingDocument: Doc<'contentLib'> | null = $state(null);
	let isDeleting = $state(false);
	let isRenameModalOpen = $state(false);
	let renamingDocument: Doc<'contentLib'> | null = $state(null);
	let renameTitle = $state('');
	let isRenaming = $state(false);
	let renameError = $state('');
	let error = $state('');
	let searchTerm = $state('');
	let selectedDocumentId = $state('');
	let viewUrl = $state('');
	let markdownPreviewHtml = $state('');
	let markdownPreviewError = $state('');
	let isMarkdownLoading = $state(false);
	let markdownPreviewDocumentId = $state('');
	let markdownPreviewTruncated = $state(false);
	let isDeckMode = $state(false);
	let deckPreviewHtml = $state('');
	let deckPreviewCss = $state('');
	let deckPreviewError = $state('');
	let isDeckLoading = $state(false);
	let deckPreviewDocumentId = $state('');
	let deckPreviewInner = $state<HTMLDivElement | null>(null);
	let isOpening = $state(false);
	let isDrawerOpen = $state(false);
	let isPanelFullscreen = $state(false);
	let drawerTab = $state<DrawerTab>('preview');
	let viewMode = $state<ViewMode>('grid');
	let sortKey = $state<SortKey>('recent');
	let copiedKey = $state<string | null>(null);
	let renderedTableHtmls = $state<string[]>([]);
	let renderedTableLabels = $state<string[]>([]);
	let pendingTableLabels: string[] = [];
	let fullscreenTableHtml = $state('');
	let fullscreenTableLabel = $state('');

	const markdownRenderer = new Renderer();
	markdownRenderer.image = ({ text }) => (text ? `<p><em>${text}</em></p>` : '');
	markdownRenderer.link = ({ href, text }) => {
		if (isLocalArtifactLink(href)) return '';
		return `<a href="${href}">${text}</a>`;
	};
	markdownRenderer.table = function (token) {
		const tableHtml = Renderer.prototype.table.call(this, token);
		const tableIndex = renderedTableHtmls.length;
		const label = pendingTableLabels.shift() ?? `Table ${tableIndex + 1}`;
		renderedTableHtmls = [...renderedTableHtmls, tableHtml];
		renderedTableLabels = [...renderedTableLabels, label];
		return `<div class="table-frame"><div class="table-toolbar"><span>${label}</span><button type="button" class="table-fullscreen" data-table-index="${tableIndex}" aria-label="Open table fullscreen" title="Open table fullscreen"><span class="table-fullscreen-icon" aria-hidden="true"></span></button></div><div class="table-scroll">${tableHtml}</div></div>`;
	};
	const markdownParser = new Marked({
		gfm: true,
		breaks: false,
		renderer: markdownRenderer
	});
	const filteredDocs = $derived.by<Doc<'contentLib'>[]>(() => {
		const search = searchTerm.trim().toLowerCase();
		const docs = [...(documents.data ?? [])];
		const matched = docs.filter((doc) => {
			if (!search) return true;
			return (
				doc.title.toLowerCase().includes(search) ||
				(doc.description ?? '').toLowerCase().includes(search) ||
				(doc.metadata?.originalFileName ?? '').toLowerCase().includes(search)
			);
		});

		switch (sortKey) {
			case 'name':
				return matched.sort((a, b) => a.title.localeCompare(b.title));
			case 'oldest':
				return matched.sort((a, b) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0));
			case 'size':
				return matched.sort((a, b) => (b.metadata?.sizeBytes ?? 0) - (a.metadata?.sizeBytes ?? 0));
			case 'type':
				return matched.sort((a, b) => fileKind(a).label.localeCompare(fileKind(b).label));
			default:
				return matched.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
		}
	});

	const totalDocs = $derived(documents.data?.length ?? 0);
	const selectedDocument = $derived(
		selectedDocumentId
			? ((documents.data ?? []).find((doc) => doc._id === selectedDocumentId) ?? null)
			: null
	);

	const rawMetadata = $derived.by(() => {
		if (!selectedDocument) return '';
		return JSON.stringify(
			{
				_id: selectedDocument._id,
				title: selectedDocument.title,
				description: selectedDocument.description ?? null,
				cohortId: selectedDocument.cohortId,
				updatedAt: selectedDocument.updatedAt,
				_creationTime: selectedDocument._creationTime,
				metadata: selectedDocument.metadata ?? {}
			},
			null,
			2
		);
	});

	async function copyValue(key: string, value: string) {
		try {
			await navigator.clipboard.writeText(value);
			copiedKey = key;
			setTimeout(() => {
				if (copiedKey === key) copiedKey = null;
			}, 1400);
		} catch {
			/* clipboard unavailable */
		}
	}

	let droppedFiles = $state<File[]>([]);

	function openAddModal() {
		isAddModalOpen = true;
	}

	function closeAddModal() {
		isAddModalOpen = false;
		droppedFiles = [];
	}

	// Files dropped anywhere on the library open the upload panel with them already queued.
	async function handlePageDrop(files: File[]) {
		droppedFiles = files;
		isAddModalOpen = true;
	}

	function openDeleteModal(document: Doc<'contentLib'>) {
		deletingDocument = document;
		isDeleteModalOpen = true;
	}

	function closeDeleteModal() {
		isDeleteModalOpen = false;
		deletingDocument = null;
	}

	function openRenameModal(document: Doc<'contentLib'>) {
		renamingDocument = document;
		renameTitle = document.title;
		renameError = '';
		isRenameModalOpen = true;
	}

	function closeRenameModal() {
		if (isRenaming) return;
		isRenameModalOpen = false;
		renamingDocument = null;
		renameTitle = '';
		renameError = '';
	}

	function closeDrawer() {
		isDrawerOpen = false;
		isPanelFullscreen = false;
	}

	async function loadMarkdownPreview(document: Doc<'contentLib'>) {
		if (
			markdownPreviewDocumentId === document._id &&
			(markdownPreviewHtml || markdownPreviewError)
		) {
			return;
		}

		isMarkdownLoading = true;
		markdownPreviewHtml = '';
		markdownPreviewError = '';
		markdownPreviewDocumentId = document._id;
		markdownPreviewTruncated = false;
		renderedTableHtmls = [];
		renderedTableLabels = [];
		pendingTableLabels = [];
		fullscreenTableHtml = '';
		fullscreenTableLabel = '';

		try {
			const [preview, katex] = await Promise.all([
				client.action(api.ragKnowledge.previews.getR2DocumentMarkdownPreview, {
					documentId: document._id
				}),
				loadKatex()
			]);
			const cleanedPreview = stripPreviewArtifactReferences(preview.text);
			pendingTableLabels = resolveTableLabels(extractTableLabels(cleanedPreview));
			const displayPreview = stripStandaloneTableHeadings(cleanedPreview);
			markdownPreviewHtml = sanitizeHtml(
				String(markdownParser.parse(renderLatex(displayPreview, katex)))
			);
			markdownPreviewTruncated = preview.truncated;
		} catch (e) {
			markdownPreviewError =
				e instanceof Error ? e.message : 'Unable to load extracted markdown preview';
		} finally {
			isMarkdownLoading = false;
		}
	}

	async function loadDeckPreview(document: Doc<'contentLib'>) {
		if (deckPreviewDocumentId === document._id && (deckPreviewHtml || deckPreviewError)) return;

		isDeckLoading = true;
		deckPreviewHtml = '';
		deckPreviewCss = '';
		deckPreviewError = '';
		deckPreviewDocumentId = document._id;

		try {
			const preview = await client.action(api.ragKnowledge.previews.getR2DocumentDeckPreview, {
				documentId: document._id
			});
			const response = await fetch(resolve('/admin/library/deck-preview'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: document.title,
					markdown: preview.text,
					pages: preview.pages ?? []
				})
			});
			if (!response.ok) throw new Error(`Slide deck rendering failed (${response.status})`);
			const rendered: { html: string; css: string } = await response.json();
			deckPreviewHtml = rendered.html;
			deckPreviewCss = rendered.css;
			await tick();
			fitDeckSlides();
		} catch (e) {
			deckPreviewError = e instanceof Error ? e.message : 'Unable to build slide deck preview';
		} finally {
			isDeckLoading = false;
		}
	}

	// Shrink slide content uniformly so overflowing text stays within the
	// fixed 1280x720 SVG canvas instead of being clipped off the slide.
	function fitDeckSlides() {
		const sections = deckPreviewInner?.querySelectorAll<HTMLElement>('section');
		if (!sections) return;
		for (const section of sections) {
			section.style.transform = '';
			section.style.transformOrigin = '';
			const overflowY = section.scrollHeight / section.clientHeight;
			const overflowX = section.scrollWidth / section.clientWidth;
			const overflow = Math.max(overflowY, overflowX);
			if (overflow > 1.001) {
				section.style.transformOrigin = 'top left';
				section.style.transform = `scale(${(1 / overflow).toFixed(4)})`;
			}
		}
	}

	async function toggleDeckMode() {
		isDeckMode = !isDeckMode;
		if (isDeckMode && selectedDocument) {
			await loadDeckPreview(selectedDocument);
		}
	}

	async function handleMarkdownPreviewClick(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;

		const tableButton = target.closest<HTMLButtonElement>('button[data-table-index]');
		if (tableButton?.dataset.tableIndex) {
			const tableIndex = Number(tableButton.dataset.tableIndex);
			fullscreenTableHtml = renderedTableHtmls[tableIndex] ?? '';
			fullscreenTableLabel = renderedTableLabels[tableIndex] ?? 'Table preview';
			return;
		}

		const button = target.closest<HTMLButtonElement>('button[data-latex]');
		if (!button?.dataset.latex) return;

		await copyValue(`latex-${button.dataset.latex.slice(0, 24)}`, button.dataset.latex);
		button.classList.add('is-copied');
		setTimeout(() => {
			button.classList.remove('is-copied');
		}, 1200);
	}

	function handleMarkdownPreviewKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		const target = event.target;
		if (!(target instanceof HTMLButtonElement) || !target.dataset.latex) return;
		event.preventDefault();
		target.click();
	}

	async function handleDelete() {
		if (!deletingDocument) return;
		isDeleting = true;
		error = '';

		try {
			await client.action(api.ragKnowledge.management.deleteR2DocumentCompletely, {
				documentId: deletingDocument._id
			});
			if (selectedDocumentId === deletingDocument._id) {
				selectedDocumentId = '';
				viewUrl = '';
				isDrawerOpen = false;
			}
			closeDeleteModal();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete document';
		} finally {
			isDeleting = false;
		}
	}

	async function handleRename() {
		if (!renamingDocument) return;
		const title = renameTitle.trim();
		if (title.length < 2) {
			renameError = 'File name must be at least 2 characters.';
			return;
		}
		if (title.length > 100) {
			renameError = 'File name cannot exceed 100 characters.';
			return;
		}
		if (title === renamingDocument.title) {
			closeRenameModal();
			return;
		}

		isRenaming = true;
		renameError = '';
		try {
			await client.mutation(api.contentLib.renameDocument, {
				documentId: renamingDocument._id,
				title
			});
			isRenameModalOpen = false;
			renamingDocument = null;
			renameTitle = '';
		} catch (e) {
			renameError = e instanceof Error ? e.message : 'Failed to rename file';
		} finally {
			isRenaming = false;
		}
	}

	async function selectDocument(document: Doc<'contentLib'>, tab: DrawerTab = 'preview') {
		selectedDocumentId = document._id;
		drawerTab = tab;
		isDeckMode = false;
		isDrawerOpen = true;
		error = '';

		const key = document.metadata?.r2Key;
		if (!key) {
			viewUrl = '';
			return;
		}

		isOpening = true;
		viewUrl = '';
		try {
			viewUrl = await client.query(api.r2Documents.getUrl, { key });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unable to open document';
		} finally {
			isOpening = false;
		}

		if (tab === 'preview') {
			await loadMarkdownPreview(document);
		}
	}

	$effect(() => {
		if (drawerTab !== 'preview' || !selectedDocument) return;
		void loadMarkdownPreview(selectedDocument);
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key !== 'Escape') return;
		if (isRenameModalOpen) {
			closeRenameModal();
			return;
		}
		if (fullscreenTableHtml) {
			fullscreenTableHtml = '';
			fullscreenTableLabel = '';
			return;
		}
		if (!isDrawerOpen) return;
		if (isPanelFullscreen) isPanelFullscreen = false;
		else closeDrawer();
	}}
/>

<div class="min-h-screen bg-muted/30">
	<div
		class="mx-auto p-4 transition-all duration-200 sm:p-6 {isDrawerOpen
			? 'max-w-none lg:pr-[calc(62vw+2.5rem)] xl:pr-[calc(68vw+2.5rem)]'
			: 'max-w-[1600px]'}"
	>
		<ContentLibraryHeader {totalDocs} />

		<ContentLibraryToolbar
			bind:searchTerm
			filteredCount={filteredDocs.length}
			{totalDocs}
			bind:sortKey
			bind:viewMode
			onAdd={openAddModal}
		/>

		{#if error && !isDrawerOpen}
			<Alert.Root tone="error" class="mb-4 rounded-2xl"
				><Alert.Description>{error}</Alert.Description></Alert.Root
			>
		{/if}

		<ContentLibraryExplorer
			docs={filteredDocs}
			isLoading={documents.isLoading}
			{searchTerm}
			{viewMode}
			{isDrawerOpen}
			{selectedDocumentId}
			onAdd={openAddModal}
			onSelect={selectDocument}
			onRename={openRenameModal}
		/>
	</div>
</div>

{#if isDrawerOpen && selectedDocument}
	{@const kind = fileKind(selectedDocument)}
	{@const pages = formatPages(selectedDocument.metadata?.pageCount)}
	<aside
		class="fixed inset-y-0 right-0 z-50 flex flex-col border-l border-border bg-background {isPanelFullscreen
			? 'w-full'
			: 'w-full lg:w-[62vw] xl:w-[68vw]'}"
		transition:fade={{ duration: 120 }}
	>
		<!-- Detail header -->
		<div class="flex items-start gap-3 border-b border-border p-4">
			<div class="rounded-xl p-3 {kind.tint} {kind.accent}">
				<kind.icon size={22} strokeWidth={1.5} />
			</div>
			<div class="min-w-0 flex-1">
				<h2 class="truncate text-base font-semibold leading-tight">{selectedDocument.title}</h2>
				<div class="mt-1.5 flex items-center gap-1.5 text-xs text-foreground/60">
					<span class="font-medium">{kind.label}</span>
					<span class="text-foreground/30">·</span>
					<span>{formatBytes(selectedDocument.metadata?.sizeBytes)}</span>
					{#if pages}
						<span class="text-foreground/30">·</span>
						<span>{pages}</span>
					{/if}
				</div>
			</div>
			<div class="flex shrink-0 items-center gap-1">
				<Button
					variant="ghost"
					tone="neutral"
					size="sm"
					shape="circle"
					onclick={() => (isPanelFullscreen = !isPanelFullscreen)}
					aria-label={isPanelFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
					title={isPanelFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
				>
					{#if isPanelFullscreen}
						<Minimize2 size={16} />
					{:else}
						<Maximize2 size={16} />
					{/if}
				</Button>
				<Button
					variant="ghost"
					tone="neutral"
					size="sm"
					shape="circle"
					onclick={closeDrawer}
					aria-label="Close"
				>
					<X size={16} />
				</Button>
			</div>
		</div>

		<!-- Tabs + actions (one line) -->
		<div class="flex items-center gap-2 border-b border-border px-4 py-2.5">
			<SegmentedControl
				value={drawerTab}
				onValueChange={(value) => (drawerTab = value as DrawerTab)}
				options={[
					{ value: 'preview', label: 'Preview' },
					{ value: 'source', label: 'Source' },
					{ value: 'properties', label: 'Properties' }
				]}
				size="xs"
				track="muted"
				activeVariant="raised"
				itemClass="px-4"
				aria-label="Document panel"
			/>
			<div class="flex-1"></div>
			<Button
				variant="ghost"
				tone="neutral"
				size="sm"
				class="gap-2"
				onclick={() => openRenameModal(selectedDocument!)}
			>
				<Pencil size={14} />
				<span class="hidden sm:inline">Rename</span>
			</Button>
			{#if viewUrl}
				<Button
					type="button"
					size="sm"
					class="gap-2"
					onclick={() => window.open(viewUrl, '_blank', 'noreferrer')}
				>
					<ExternalLink size={14} />
					<span class="hidden sm:inline">Open</span>
				</Button>
			{/if}
			<Button
				variant="ghost"
				tone="error"
				size="sm"
				class="gap-2"
				onclick={() => openDeleteModal(selectedDocument!)}
				disabled={isDeleting}
			>
				<Trash2 size={14} />
				<span class="hidden sm:inline">Remove</span>
			</Button>
		</div>

		<!-- Tab body -->
		<div class="flex-1 overflow-y-auto p-4">
			{#if error}
				<Alert.Root tone="error" class="mb-3 rounded-xl"
					><Alert.Description>{error}</Alert.Description></Alert.Root
				>
			{/if}

			{#if drawerTab === 'preview'}
				<div class="h-full overflow-hidden surface-muted">
					<div class="flex items-center gap-2 border-b border-border bg-background px-4 py-2">
						<span class="text-xs font-medium text-foreground/60">
							{isDeckMode ? 'Slide deck preview' : 'Markdown preview'}
						</span>
						<div class="flex-1"></div>
						<Button
							variant="ghost"
							tone="neutral"
							size="xs"
							class="gap-1.5"
							onclick={toggleDeckMode}
							disabled={isMarkdownLoading || isDeckLoading}
						>
							<Presentation size={13} />
							{isDeckMode ? 'View as notes' : 'View as slide deck'}
						</Button>
					</div>
					{#if isDeckMode}
						{#if isDeckLoading}
							<LoadingState label="Building slide deck preview…" class="h-full min-h-72" />
						{:else if deckPreviewError}
							<ContentLibraryPreviewUnavailable
								title="Slide deck preview unavailable"
								description="We couldn't build a slide deck from this document. Retry, or open the log for details."
								errorText={deckPreviewError}
								onRetry={() => selectedDocument && loadDeckPreview(selectedDocument)}
							/>
						{:else if deckPreviewHtml}
							<div class="deck-preview h-full min-h-[60vh] overflow-y-auto p-8 pb-24">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html styleTag(deckPreviewCss)}
								<div
									bind:this={deckPreviewInner}
									class="deck-preview-inner mx-auto flex max-w-[1100px] flex-col items-center gap-6"
								>
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html deckPreviewHtml}
								</div>
							</div>
						{:else}
							<ContentLibraryPreviewUnavailable
								title="No deck preview available"
								description="This document doesn't have slide content to render yet."
							/>
						{/if}
					{:else if isMarkdownLoading}
						<LoadingState label="Generating markdown preview…" class="h-full min-h-72" />
					{:else if markdownPreviewError}
						<ContentLibraryPreviewUnavailable
							title="Markdown preview unavailable"
							description="We couldn't render this document's extracted markdown. Retry, or open the log for details."
							errorText={markdownPreviewError}
							onRetry={() => selectedDocument && loadMarkdownPreview(selectedDocument)}
						/>
					{:else if markdownPreviewHtml}
						<div class="preview-scroll h-full min-h-[60vh] overflow-y-auto bg-background">
							{#if markdownPreviewTruncated}
								<div
									class="border-b border-border bg-warning/10 px-5 py-2 text-xs text-warning-foreground"
								>
									Preview clipped for speed.
								</div>
							{/if}
							<div
								class="markdown-preview mx-auto max-w-[980px] px-8 pb-24 pt-6 text-base leading-7"
								role="presentation"
								onclick={handleMarkdownPreviewClick}
								onkeydown={handleMarkdownPreviewKeydown}
							>
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html markdownPreviewHtml}
							</div>
						</div>
					{:else}
						<ContentLibraryPreviewUnavailable
							title="No preview available"
							description="This file is missing its storage key. Try re-uploading it."
						/>
					{/if}
				</div>
			{:else if drawerTab === 'source'}
				<ContentLibrarySourcePanel document={selectedDocument} {viewUrl} {isOpening} />
			{:else}
				<ContentLibraryPropertiesPanel
					document={selectedDocument}
					{rawMetadata}
					{copiedKey}
					onCopy={copyValue}
				/>
			{/if}
		</div>
	</aside>
{/if}

<FullscreenTableDialog
	html={fullscreenTableHtml}
	label={fullscreenTableLabel}
	onClose={() => {
		fullscreenTableHtml = '';
		fullscreenTableLabel = '';
	}}
/>

<FileDropZone.Root
	accept=".pdf,application/pdf"
	disabled={isAddModalOpen || !userDataQuery.data?.cohortId}
	onUpload={handlePageDrop}
	onFileRejected={({ file }) => toastStore.error(`${file.name}: only PDF files are supported.`)}
>
	<FileDropZone.DragOverlay disabled={isAddModalOpen || !userDataQuery.data?.cohortId}>
		<div
			class="pointer-events-none absolute inset-4 rounded-[2rem] border-2 border-dashed border-primary/60"
		></div>
		<div class="flex flex-col items-center gap-4 text-center">
			<div
				class="flex size-16 animate-bounce items-center justify-center rounded-3xl bg-primary text-primary-foreground motion-reduce:animate-none"
			>
				<FileUp size={28} />
			</div>
			<div>
				<p class="text-xl font-semibold">Drop PDFs to add them to the library</p>
				<p class="mt-1 text-sm text-muted-foreground">Up to 150 pages and 30 MB each</p>
			</div>
		</div>
	</FileDropZone.DragOverlay>
</FileDropZone.Root>

<AddDocumentModal
	{isAddModalOpen}
	{closeAddModal}
	incomingFiles={droppedFiles}
	userData={userDataQuery.data}
	onUploaded={() => {
		selectedDocumentId = '';
		viewUrl = '';
		isDrawerOpen = false;
	}}
/>

<DeleteConfirmationModal
	{isDeleteModalOpen}
	onCancel={closeDeleteModal}
	onConfirm={handleDelete}
	itemName={deletingDocument?.title}
	itemType="document"
/>

<RenameDocumentModal
	isOpen={isRenameModalOpen}
	bind:title={renameTitle}
	isSaving={isRenaming}
	error={renameError}
	onCancel={closeRenameModal}
	onConfirm={handleRename}
/>

<style>
	/* Deeper canvas behind the slides so they read as cards without a shadow. */
	.deck-preview {
		scroll-padding-bottom: 6rem;
		background:
			radial-gradient(
				120% 80% at 50% 0%,
				color-mix(in oklab, var(--muted-strong) 55%, transparent),
				transparent 70%
			),
			color-mix(in oklab, var(--muted-strong) 80%, var(--muted));
	}

	.deck-preview-inner :global(.marpit) {
		display: contents;
	}

	/* Each Marp slide renders as a viewBox-scaled SVG; normalize it into a
	   responsive, softly rounded 16:9 frame. */
	.deck-preview-inner :global(svg[data-marpit-svg]) {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 1.75rem;
		overflow: hidden;
		background: #ffffff;
	}

	.deck-preview-inner :global(section) {
		background: #ffffff;
		color: #1f2937;
		margin: 0;
	}

	.deck-preview-inner :global(section h1),
	.deck-preview-inner :global(section h2),
	.deck-preview-inner :global(section h3),
	.deck-preview-inner :global(section h4),
	.deck-preview-inner :global(section h5),
	.deck-preview-inner :global(section h6),
	.deck-preview-inner :global(section p),
	.deck-preview-inner :global(section li) {
		color: inherit;
		font-family: Georgia, 'Times New Roman', Times, serif;
	}

	.deck-preview-inner :global(section h1),
	.deck-preview-inner :global(section h2),
	.deck-preview-inner :global(section h3),
	.deck-preview-inner :global(section h4),
	.deck-preview-inner :global(section h5),
	.deck-preview-inner :global(section h6) {
		font-weight: 700;
	}

	.deck-preview-inner :global(section ul),
	.deck-preview-inner :global(section ol) {
		padding-left: 1.5em;
	}

	.deck-preview-inner :global(section ul) {
		list-style: disc;
	}

	.deck-preview-inner :global(section ol) {
		list-style: decimal;
	}

	.preview-scroll {
		scroll-padding-bottom: 6rem;
	}
</style>
