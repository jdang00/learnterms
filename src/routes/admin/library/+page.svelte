<script lang="ts">
	import { ExternalLink, Maximize2, Minimize2, Presentation, Trash2, X } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import AddDocumentModal from '../../../lib/admin/AddDocumentModal.svelte';
	import ContentLibraryExplorer from '../../../lib/admin/ContentLibraryExplorer.svelte';
	import ContentLibraryHeader from '../../../lib/admin/ContentLibraryHeader.svelte';
	import ContentLibraryPreviewUnavailable from '../../../lib/admin/ContentLibraryPreviewUnavailable.svelte';
	import ContentLibraryPropertiesPanel from '../../../lib/admin/ContentLibraryPropertiesPanel.svelte';
	import ContentLibrarySourcePanel from '../../../lib/admin/ContentLibrarySourcePanel.svelte';
	import ContentLibraryToolbar from '../../../lib/admin/ContentLibraryToolbar.svelte';
	import DeleteConfirmationModal from '../../../lib/admin/DeleteConfirmationModal.svelte';
	import FullscreenTableDialog from '../../../lib/admin/FullscreenTableDialog.svelte';
	import {
		fileKind,
		formatSize,
		type DrawerTab,
		type SortKey,
		type ViewMode
	} from '../../../lib/admin/contentLibrary';
	import {
		buildMarpDeckMarkdown,
		extractTableLabels,
		isLocalArtifactLink,
		renderLatex,
		resolveTableLabels,
		stripPreviewArtifactReferences,
		stripStandaloneTableHeadings,
		styleTag
	} from '../../../lib/admin/contentLibraryPreview';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { Doc, Id } from '../../../convex/_generated/dataModel';
	import { useClerkContext } from 'svelte-clerk';
	import { browser } from '$app/environment';
	import { tick } from 'svelte';
	import { Marked, Renderer } from 'marked';
	import { Marp } from '@marp-team/marp-core';
	import 'katex/dist/katex.min.css';
	import { sanitizeHtml, sanitizeDeckHtml } from '$lib/utils/sanitizeHtml';

	const client = useConvexClient();
	const clerk = useClerkContext();
	const clerkUser = $derived(clerk.user);

	const userDataQuery = useQuery(api.users.getUserById, () =>
		browser && clerkUser ? { id: clerkUser.id } : 'skip'
	);

	const documents = useQuery(api.contentLib.getR2DocumentsByCohort, () =>
		browser && userDataQuery.data?.cohortId
			? { cohortId: userDataQuery.data.cohortId as Id<'cohort'> }
			: 'skip'
	);

	let isAddModalOpen = $state(false);
	let isDeleteModalOpen = $state(false);
	let deletingDocument: Doc<'contentLib'> | null = $state(null);
	let isDeleting = $state(false);
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
	let deckPreviewMarkdown = $state('');
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
	const marp = new Marp({
		html: false,
		math: 'katex',
		inlineSVG: true
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

	function openAddModal() {
		isAddModalOpen = true;
	}

	function closeAddModal() {
		isAddModalOpen = false;
	}

	function openDeleteModal(document: Doc<'contentLib'>) {
		deletingDocument = document;
		isDeleteModalOpen = true;
	}

	function closeDeleteModal() {
		isDeleteModalOpen = false;
		deletingDocument = null;
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
			const preview = await client.action(api.ragKnowledge.getR2DocumentMarkdownPreview, {
				documentId: document._id
			});
			const cleanedPreview = stripPreviewArtifactReferences(preview.text);
			pendingTableLabels = resolveTableLabels(extractTableLabels(cleanedPreview));
			const displayPreview = stripStandaloneTableHeadings(cleanedPreview);
			markdownPreviewHtml = sanitizeHtml(String(markdownParser.parse(renderLatex(displayPreview))));
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
		deckPreviewMarkdown = '';
		deckPreviewError = '';
		deckPreviewDocumentId = document._id;

		try {
			const preview = await client.action(api.ragKnowledge.getR2DocumentDeckPreview, {
				documentId: document._id
			});
			deckPreviewMarkdown = buildMarpDeckMarkdown({
				title: document.title,
				markdown: preview.text,
				pages: preview.pages ?? []
			});
			const rendered = marp.render(deckPreviewMarkdown);
			deckPreviewHtml = sanitizeDeckHtml(rendered.html);
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
			await client.action(api.ragKnowledge.deleteR2DocumentCompletely, {
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

<div class="min-h-screen bg-base-200/30">
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
			<div class="alert alert-error mb-4 rounded-2xl text-sm">
				<span>{error}</span>
			</div>
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
		/>
	</div>
</div>

{#if isDrawerOpen && selectedDocument}
	{@const kind = fileKind(selectedDocument)}
	<aside
		class="fixed inset-y-0 right-0 z-50 flex flex-col border-l border-base-300 bg-base-100 {isPanelFullscreen
			? 'w-full'
			: 'w-full lg:w-[62vw] xl:w-[68vw]'}"
		transition:fade={{ duration: 120 }}
	>
		<!-- Detail header -->
		<div class="flex items-start gap-3 border-b border-base-300 p-4">
			<div class="rounded-xl p-3 {kind.tint} {kind.accent}">
				<kind.icon size={22} strokeWidth={1.5} />
			</div>
			<div class="min-w-0 flex-1">
				<h2 class="truncate text-base font-semibold leading-tight">{selectedDocument.title}</h2>
				<div class="mt-1.5 flex items-center gap-1.5 text-xs text-base-content/60">
					<span class="font-medium">{kind.label}</span>
					<span class="text-base-content/30">·</span>
					<span>{formatSize(selectedDocument.metadata?.sizeBytes)}</span>
				</div>
			</div>
			<div class="flex shrink-0 items-center gap-1">
				<button
					class="btn btn-ghost btn-sm btn-circle"
					onclick={() => (isPanelFullscreen = !isPanelFullscreen)}
					aria-label={isPanelFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
					title={isPanelFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
				>
					{#if isPanelFullscreen}
						<Minimize2 size={16} />
					{:else}
						<Maximize2 size={16} />
					{/if}
				</button>
				<button class="btn btn-ghost btn-sm btn-circle" onclick={closeDrawer} aria-label="Close">
					<X size={16} />
				</button>
			</div>
		</div>

		<!-- Tabs + actions (one line) -->
		<div class="flex items-center gap-2 border-b border-base-300 px-4 py-2.5">
			<div class="inline-flex rounded-full bg-base-200 p-1">
				<button
					class="rounded-full px-4 py-1.5 text-xs font-medium transition-colors {drawerTab ===
					'preview'
						? 'bg-base-100 text-base-content shadow-sm'
						: 'text-base-content/60 hover:text-base-content'}"
					onclick={() => (drawerTab = 'preview')}
				>
					Preview
				</button>
				<button
					class="rounded-full px-4 py-1.5 text-xs font-medium transition-colors {drawerTab ===
					'source'
						? 'bg-base-100 text-base-content shadow-sm'
						: 'text-base-content/60 hover:text-base-content'}"
					onclick={() => (drawerTab = 'source')}
				>
					Source
				</button>
				<button
					class="rounded-full px-4 py-1.5 text-xs font-medium transition-colors {drawerTab ===
					'properties'
						? 'bg-base-100 text-base-content shadow-sm'
						: 'text-base-content/60 hover:text-base-content'}"
					onclick={() => (drawerTab = 'properties')}
				>
					Properties
				</button>
			</div>
			<div class="flex-1"></div>
			{#if viewUrl}
				<button
					type="button"
					class="btn btn-primary btn-sm gap-2 rounded-full"
					onclick={() => window.open(viewUrl, '_blank', 'noreferrer')}
				>
					<ExternalLink size={14} />
					<span class="hidden sm:inline">Open</span>
				</button>
			{/if}
			<button
				class="btn btn-ghost btn-sm gap-2 rounded-full text-error hover:bg-error/10"
				onclick={() => openDeleteModal(selectedDocument!)}
				disabled={isDeleting}
			>
				<Trash2 size={14} />
				<span class="hidden sm:inline">Remove</span>
			</button>
		</div>

		<!-- Tab body -->
		<div class="flex-1 overflow-y-auto p-4">
			{#if error}
				<div class="alert alert-error mb-3 rounded-xl text-sm">
					<span>{error}</span>
				</div>
			{/if}

			{#if drawerTab === 'preview'}
				<div class="h-full overflow-hidden rounded-2xl border border-base-300 bg-base-200/40">
					<div class="flex items-center gap-2 border-b border-base-300 bg-base-100 px-4 py-2">
						<span class="text-xs font-medium text-base-content/60">
							{isDeckMode ? 'Slide deck preview' : 'Markdown preview'}
						</span>
						<div class="flex-1"></div>
						<button
							class="btn btn-ghost btn-xs gap-1.5 rounded-full"
							onclick={toggleDeckMode}
							disabled={isMarkdownLoading || isDeckLoading}
						>
							<Presentation size={13} />
							{isDeckMode ? 'View as notes' : 'View as slide deck'}
						</button>
					</div>
					{#if isDeckMode}
						{#if isDeckLoading}
							<div class="flex h-full min-h-72 flex-col items-center justify-center gap-3">
								<span class="loading loading-spinner loading-lg text-primary"></span>
								<p class="text-sm text-base-content/60">Building slide deck preview...</p>
							</div>
						{:else if deckPreviewError}
							<ContentLibraryPreviewUnavailable
								title="Slide deck preview unavailable"
								description="We couldn't build a slide deck from this document. Retry, or open the log for details."
								errorText={deckPreviewError}
								onRetry={() => selectedDocument && loadDeckPreview(selectedDocument)}
							/>
						{:else if deckPreviewHtml}
							<div class="deck-preview h-full min-h-[60vh] overflow-y-auto p-8 pb-24">
								{@html styleTag(deckPreviewCss)}
								<div
									bind:this={deckPreviewInner}
									class="deck-preview-inner mx-auto flex max-w-[1100px] flex-col items-center gap-6"
								>
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
						<div class="flex h-full min-h-72 flex-col items-center justify-center gap-3">
							<span class="loading loading-spinner loading-lg text-primary"></span>
							<p class="text-sm text-base-content/60">Generating markdown preview...</p>
						</div>
					{:else if markdownPreviewError}
						<ContentLibraryPreviewUnavailable
							title="Markdown preview unavailable"
							description="We couldn't render this document's extracted markdown. Retry, or open the log for details."
							errorText={markdownPreviewError}
							onRetry={() => selectedDocument && loadMarkdownPreview(selectedDocument)}
						/>
					{:else if markdownPreviewHtml}
						<div class="preview-scroll h-full min-h-[60vh] overflow-y-auto bg-base-100">
							{#if markdownPreviewTruncated}
								<div
									class="border-b border-base-300 bg-warning/10 px-5 py-2 text-xs text-warning-content"
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

<AddDocumentModal
	{isAddModalOpen}
	{closeAddModal}
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

<style>
	/* Deeper canvas behind the slides so they read as cards without a shadow. */
	.deck-preview {
		scroll-padding-bottom: 6rem;
		background:
			radial-gradient(
				120% 80% at 50% 0%,
				color-mix(in oklab, var(--color-base-300) 55%, transparent),
				transparent 70%
			),
			color-mix(in oklab, var(--color-base-300) 80%, var(--color-base-200));
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

	.markdown-preview {
		--maximize-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 3H5a2 2 0 0 0-2 2v3'/%3E%3Cpath d='M21 8V5a2 2 0 0 0-2-2h-3'/%3E%3Cpath d='M3 16v3a2 2 0 0 0 2 2h3'/%3E%3Cpath d='M16 21h3a2 2 0 0 0 2-2v-3'/%3E%3C/svg%3E");
		--copy-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='14' height='14' x='8' y='8' rx='2' ry='2'/%3E%3Cpath d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'/%3E%3C/svg%3E");
		--check-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E");
		color: color-mix(in oklab, currentColor 92%, transparent);
		font-family: Georgia, 'Times New Roman', Times, serif;
		overflow-wrap: break-word;
	}

	.preview-scroll,
	.fullscreen-table {
		scroll-padding-bottom: 6rem;
	}

	.markdown-preview :global(h1),
	.markdown-preview :global(h2),
	.markdown-preview :global(h3) {
		margin: 1.5rem 0 1rem;
		font-family: Georgia, 'Times New Roman', Times, serif;
		font-weight: 700;
		line-height: 1.25;
	}

	.markdown-preview :global(h1) {
		border-bottom: 1px solid color-mix(in oklab, currentColor 16%, transparent);
		padding-bottom: 0.3rem;
		font-size: 2rem;
	}

	.markdown-preview :global(h2) {
		border-bottom: 1px solid color-mix(in oklab, currentColor 16%, transparent);
		padding-bottom: 0.3rem;
		font-size: 1.5rem;
	}

	.markdown-preview :global(h3) {
		font-size: 1.25rem;
	}

	.markdown-preview :global(h4),
	.markdown-preview :global(h5),
	.markdown-preview :global(h6) {
		margin: 1.25rem 0 1rem;
		font-family: Georgia, 'Times New Roman', Times, serif;
		font-weight: 700;
		line-height: 1.25;
	}

	.markdown-preview :global(p),
	.markdown-preview :global(ul),
	.markdown-preview :global(ol),
	.markdown-preview :global(blockquote),
	.markdown-preview :global(pre),
	.markdown-preview :global(.table-frame) {
		margin: 0.75rem 0;
	}

	.markdown-preview :global(ul),
	.markdown-preview :global(ol) {
		padding-left: 2rem;
	}

	.markdown-preview :global(ul) {
		list-style: disc;
	}

	.markdown-preview :global(ol) {
		list-style: decimal;
	}

	.markdown-preview :global(code) {
		border-radius: 0.375rem;
		background: color-mix(in oklab, currentColor 9%, transparent);
		padding: 0.2em 0.4em;
		font-family:
			ui-monospace, SFMono-Regular, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
		font-size: 0.85em;
	}

	.markdown-preview :global(pre) {
		overflow-x: auto;
		border-radius: 0.375rem;
		background: color-mix(in oklab, currentColor 5.5%, transparent);
		padding: 1rem;
	}

	.markdown-preview :global(pre code) {
		background: transparent;
		padding: 0;
	}

	.markdown-preview :global(blockquote) {
		border-left: 0.25rem solid color-mix(in oklab, currentColor 24%, transparent);
		padding: 0 1rem;
		color: color-mix(in oklab, currentColor 68%, transparent);
	}

	.markdown-preview :global(.table-frame) {
		overflow: hidden;
		border: 1px solid color-mix(in oklab, currentColor 14%, transparent);
		border-radius: 0.6rem;
		background: color-mix(in oklab, currentColor 2%, transparent);
	}

	.markdown-preview :global(.table-toolbar) {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		border-bottom: 1px solid color-mix(in oklab, currentColor 12%, transparent);
		padding: 0.4rem 0.55rem;
		font-family:
			ui-sans-serif,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		font-size: 0.72rem;
		font-weight: 600;
		color: color-mix(in oklab, currentColor 58%, transparent);
	}

	.markdown-preview :global(.table-toolbar span) {
		flex: 1;
	}

	.markdown-preview :global(.table-fullscreen) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.7rem;
		height: 1.7rem;
		border: 1px solid color-mix(in oklab, var(--color-primary) 22%, transparent);
		border-radius: 0.5rem;
		background: color-mix(in oklab, var(--color-primary) 7%, Canvas);
		color: color-mix(in oklab, var(--color-primary) 80%, currentColor);
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.markdown-preview :global(.table-fullscreen:hover) {
		background: color-mix(in oklab, var(--color-primary) 14%, Canvas);
		color: var(--color-primary);
		border-color: color-mix(in oklab, var(--color-primary) 40%, transparent);
	}

	.markdown-preview :global(.table-fullscreen-icon) {
		width: 0.95rem;
		height: 0.95rem;
		background-color: currentColor;
		-webkit-mask: var(--maximize-icon) center / contain no-repeat;
		mask: var(--maximize-icon) center / contain no-repeat;
	}

	.markdown-preview :global(.table-scroll) {
		max-width: 100%;
		overflow-x: auto;
	}

	.markdown-preview :global(table) {
		width: 100%;
		table-layout: auto;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	.markdown-preview :global(th),
	.markdown-preview :global(td) {
		border: 1px solid color-mix(in oklab, currentColor 16%, transparent);
		padding: 0.45rem 0.65rem;
		text-align: left;
		vertical-align: top;
		white-space: normal;
		overflow-wrap: break-word;
		word-break: break-word;
	}

	/* Inline preview keeps wide tables on one line with horizontal scroll;
	   only the fullscreen view wraps. */
	.markdown-preview :global(.table-scroll table) {
		width: max-content;
		min-width: 100%;
	}

	.markdown-preview :global(.table-scroll th),
	.markdown-preview :global(.table-scroll td) {
		white-space: pre-wrap;
		overflow-wrap: normal;
		word-break: normal;
	}

	.markdown-preview :global(th) {
		font-weight: 700;
	}

	.markdown-preview :global(tr:nth-child(2n)) {
		background: color-mix(in oklab, currentColor 3.5%, transparent);
	}

	.fullscreen-table :global(table) {
		width: 100%;
		table-layout: auto;
		border-collapse: collapse;
		font-size: 0.95rem;
	}

	.markdown-preview :global(hr) {
		height: 0.25rem;
		margin: 1.5rem 0;
		border: 0;
		background: color-mix(in oklab, currentColor 12%, transparent);
	}

	.markdown-preview :global(.katex-display) {
		display: block;
		max-width: 100%;
		overflow-x: auto;
		overflow-y: visible;
		padding: 0.35rem 0 0.55rem;
		text-align: center;
	}

	.markdown-preview :global(.katex) {
		font-size: 1.03em;
		white-space: nowrap;
	}

	.markdown-preview :global(.katex-display > .katex) {
		display: inline-block;
		max-width: 100%;
		white-space: nowrap;
	}

	.markdown-preview :global(td .katex-display),
	.markdown-preview :global(th .katex-display) {
		margin: 0.25rem 0;
		text-align: left;
	}

	.markdown-preview :global(.math-block) {
		position: relative;
		display: block;
		margin: 1rem 0;
		border-radius: 0.5rem;
		background: color-mix(in oklab, currentColor 3.5%, transparent);
		padding: 0.75rem 2.75rem 0.75rem 1rem;
	}

	.markdown-preview :global(.math-block .katex-display) {
		margin: 0;
	}

	.markdown-preview :global(.math-copy) {
		position: absolute;
		right: 0.5rem;
		top: 0.5rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.7rem;
		height: 1.7rem;
		border: 1px solid color-mix(in oklab, var(--color-primary) 22%, transparent);
		border-radius: 0.5rem;
		background: color-mix(in oklab, var(--color-primary) 7%, Canvas);
		color: color-mix(in oklab, var(--color-primary) 80%, currentColor);
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.markdown-preview :global(.math-copy:hover) {
		background: color-mix(in oklab, var(--color-primary) 14%, Canvas);
		color: var(--color-primary);
		border-color: color-mix(in oklab, var(--color-primary) 40%, transparent);
	}

	.markdown-preview :global(.math-copy-icon) {
		width: 0.9rem;
		height: 0.9rem;
		background-color: currentColor;
		-webkit-mask: var(--copy-icon) center / contain no-repeat;
		mask: var(--copy-icon) center / contain no-repeat;
	}

	.markdown-preview :global(.math-copy.is-copied) {
		color: var(--color-success, #16a34a);
		border-color: color-mix(in oklab, var(--color-success, #16a34a) 40%, transparent);
	}

	.markdown-preview :global(.math-copy.is-copied .math-copy-icon) {
		-webkit-mask: var(--check-icon) center / contain no-repeat;
		mask: var(--check-icon) center / contain no-repeat;
	}
</style>
