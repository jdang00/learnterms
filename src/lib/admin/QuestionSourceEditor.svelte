<script lang="ts">
	import { onDestroy } from 'svelte';
	import { FileText, Plus, X } from 'lucide-svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Doc, Id } from '../../convex/_generated/dataModel';
	import QuestionSources from '$lib/components/QuestionSources.svelte';
	import RagDocumentBrowser from './RagDocumentBrowser.svelte';
	import QuestionStudioPagePicker from './QuestionStudioPagePicker.svelte';
	import type { SourcePreviewBatch } from './sourceContext';
	import { createSourcePreviewCache } from './sourcePreviewCache';
	import { createSourcePdf, warmPdfRenderer, type SourcePdfResource } from './sourcePdf';

	type Source = NonNullable<Doc<'question'>['metadata']['source']>;
	let {
		moduleId,
		source = $bindable<Source | undefined>(),
		onChange,
		disabled = false
	}: {
		moduleId: Id<'module'>;
		source?: Source;
		onChange: () => void;
		disabled?: boolean;
	} = $props();
	const client = useConvexClient();
	const module = useQuery(api.module.getModuleById, () => ({ id: moduleId }));
	const documents = useQuery(api.contentLib.getR2DocumentsByCohort, () =>
		module.data?.cohortId ? { cohortId: module.data.cohortId } : 'skip'
	);
	const previews = createSourcePreviewCache((id) =>
		client.action(api.questionStudio.getSourcePages, { documentId: id as Id<'contentLib'> })
	);
	// Resources are bookkeeping, not render state; two PDFs are retained for quick document switching.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const pdfs = new Map<string, { revision: number; resource: SourcePdfResource }>();
	let pdfResource = $state.raw<SourcePdfResource>();

	function getPdf(id: Id<'contentLib'>, revision: number) {
		const cached = pdfs.get(id);
		if (cached?.revision === revision) return cached.resource;
		cached?.resource.destroy();
		const resource = createSourcePdf(() =>
			client.query(api.r2Documents.getDocumentUrl, { documentId: id })
		);
		pdfs.delete(id);
		pdfs.set(id, { revision, resource });
		while (pdfs.size > 2) {
			const oldest = [...pdfs.keys()].find((key) => key !== id && key !== documentId);
			if (!oldest) break;
			pdfs.get(oldest)?.resource.destroy();
			pdfs.delete(oldest);
		}
		void resource.promise.catch(() => {
			if (pdfs.get(id)?.resource === resource) pdfs.delete(id);
			resource.destroy();
		});
		return resource;
	}
	function warmDocument(doc: Doc<'contentLib'>) {
		const revision = doc.metadata?.indexedAt;
		if (revision !== undefined) void previews.get(doc._id, revision).catch(() => {});
	}

	let documentDialog = $state<HTMLDialogElement>();
	let documentId = $state<Id<'contentLib'> | null>(null);
	let documentTitle = $state('');
	let preview = $state<SourcePreviewBatch | null>(null);
	let pages = $state<number[]>([]);
	let pagesOpen = $state(false);
	let loading = $state(false);
	let error = $state('');
	let request = 0;
	onDestroy(() => {
		request++;
		previews.clear();
		for (const { resource } of pdfs.values()) resource.destroy();
		pdfs.clear();
	});

	async function chooseDocument(id: Id<'contentLib'>, title: string) {
		const version = ++request;
		loading = true;
		error = '';
		try {
			const revision = documents.data?.find((doc) => doc._id === id)?.metadata?.indexedAt;
			const resource = getPdf(id, revision ?? 0);
			const result =
				revision === undefined
					? await client.action(api.questionStudio.getSourcePages, { documentId: id })
					: await previews.get(id, revision);
			if (version !== request) return;
			documentId = id;
			pdfResource = resource;
			documentTitle = title;
			pages = source?.sourceDocumentId === id ? [...source.sourcePageNumbers] : [];
			preview = result;
			documentDialog?.close();
			pagesOpen = true;
		} catch (cause) {
			if (version === request)
				error = cause instanceof Error ? cause.message : 'Could not load source pages.';
		} finally {
			if (version === request) loading = false;
		}
	}
	function cancelDocument() {
		request++;
		loading = false;
		documentDialog?.close();
	}
	function applyPages() {
		if (!documentId) return;
		source = pages.length
			? { sourceDocumentId: documentId, sourceTitle: documentTitle, sourcePageNumbers: [...pages] }
			: undefined;
		onChange();
	}
</script>

<div class="mt-3">
	<div class="flex flex-wrap items-center gap-2">
		<span class="text-xs font-medium text-base-content/60"
			>Source <span class="font-normal text-base-content/40">(optional)</span></span
		>
		<button
			type="button"
			class="btn btn-ghost btn-xs gap-1 rounded-full"
			disabled={disabled || !module.data?.cohortId || loading}
			onclick={() => {
				error = '';
				warmPdfRenderer();
				documentDialog?.showModal();
			}}
		>
			<Plus size={12} />{source ? 'Change document' : 'Add source'}
		</button>
		{#if source}
			<button
				type="button"
				class="btn btn-ghost btn-xs gap-1 rounded-full"
				disabled={disabled || loading}
				onclick={() => source && chooseDocument(source.sourceDocumentId, source.sourceTitle)}
				><FileText size={12} />Edit pages</button
			>
			<button
				type="button"
				class="btn btn-ghost btn-xs rounded-full"
				{disabled}
				onclick={() => {
					source = undefined;
					onChange();
				}}>Remove source</button
			>
		{/if}
	</div>
	{#if loading}<p class="mt-2 text-xs text-base-content/50" role="status">
			Loading source pages…
		</p>{/if}
	{#if error}<p class="mt-2 text-xs text-error" role="alert">{error}</p>{/if}
	<QuestionSources
		{source}
		onRemovePage={disabled
			? undefined
			: (page) => {
					if (!source) return;
					const remaining = source.sourcePageNumbers.filter((number) => number !== page);
					source = remaining.length ? { ...source, sourcePageNumbers: remaining } : undefined;
					onChange();
				}}
	/>
</div>

<dialog bind:this={documentDialog} class="modal" oncancel={cancelDocument}>
	<div
		class="modal-box flex h-[72vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-base-300 p-0"
	>
		<header class="flex items-center justify-between border-b border-base-300 px-4 py-3">
			<div>
				<h3 class="text-sm font-semibold">Choose a source document</h3>
				<p class="text-xs text-base-content/50">Find the pages that support your rationale.</p>
			</div>
			<button
				type="button"
				class="btn btn-ghost btn-circle btn-sm"
				aria-label="Close source documents"
				onclick={cancelDocument}><X size={16} /></button
			>
		</header>
		{#if error}<p class="px-4 py-2 text-xs text-error" role="alert">{error}</p>{/if}
		{#if loading}<p class="px-4 py-2 text-xs text-base-content/50" role="status">
				Loading source pages…
			</p>{/if}
		<div class="min-h-0 flex-1 overflow-hidden">
			{#if module.data?.cohortId}
				<RagDocumentBrowser
					cohortId={module.data.cohortId}
					selectedDocumentId={source?.sourceDocumentId}
					onSelect={(doc) => chooseDocument(doc._id, doc.title)}
					onIntent={warmDocument}
				/>
			{/if}
		</div>
	</div>
	<button
		type="button"
		class="modal-backdrop bg-black/40"
		aria-label="Close source documents"
		onclick={cancelDocument}
	></button>
</dialog>

{#if documentId && preview}
	{#key documentId}
		<QuestionStudioPagePicker
			{documentId}
			{pdfResource}
			initialSource={preview}
			onSourceReloaded={(result) => (preview = result)}
			bind:selectedPageNumbers={pages}
			bind:open={pagesOpen}
			purpose="citation"
			onDone={applyPages}
		/>
	{/key}
{/if}
