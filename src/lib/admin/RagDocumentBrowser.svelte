<script lang="ts">
	import { CheckCircle2, FileText, Layers, Search, TriangleAlert } from 'lucide-svelte';
	import { onDestroy } from 'svelte';
	import { useQuery } from 'convex-svelte';
	import type { Doc, Id } from '../../convex/_generated/dataModel';
	import { api } from '../../convex/_generated/api';

	export interface Props {
		cohortId: Id<'cohort'>;
		selectedDocumentId?: Id<'contentLib'> | null;
		selectedSourceSummary?: string;
		onSelect?: (document: Doc<'contentLib'>) => void;
		onIntent?: (document: Doc<'contentLib'>) => void;
	}

	let {
		cohortId,
		selectedDocumentId = $bindable<Id<'contentLib'> | null>(null),
		selectedSourceSummary = $bindable(''),
		onSelect,
		onIntent
	}: Props = $props();

	const docs = useQuery(api.contentLib.getR2DocumentsByCohort, () => ({ cohortId }));

	let searchQuery = $state('');
	let intentTimer: ReturnType<typeof setTimeout> | undefined;
	function cancelIntent() {
		clearTimeout(intentTimer);
	}
	function scheduleIntent(doc: Doc<'contentLib'>) {
		cancelIntent();
		if (onIntent) intentTimer = setTimeout(() => onIntent?.(doc), 150);
	}
	onDestroy(cancelIntent);

	function formatSize(bytes?: number) {
		if (!bytes) return 'Unknown size';
		if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}

	function selectDocument(doc: Doc<'contentLib'>) {
		selectedDocumentId = doc._id;
		selectedSourceSummary = [
			`Document: ${doc.title}`,
			`File: ${doc.metadata?.originalFileName ?? doc.title}`,
			`Pages: ${doc.metadata?.pageCount ?? 'unknown'}`,
			`RAG namespace: ${doc.metadata?.ragNamespace ?? `document:${doc._id}`}`,
			`RAG entry: ${doc.metadata?.ragEntryId ?? 'not available'}`
		].join('\n');
		onSelect?.(doc);
	}

	const indexedDocs = $derived.by<Doc<'contentLib'>[]>(() =>
		((docs.data ?? []) as Doc<'contentLib'>[]).filter(
			(doc) =>
				doc.metadata?.storageProvider === 'r2' &&
				(doc.metadata?.ingestionStatus === 'indexed' ||
					doc.metadata?.ingestionStatus === 'mapped') &&
				Boolean(doc.metadata?.ragEntryId)
		)
	);

	const filteredDocs = $derived.by<Doc<'contentLib'>[]>(() =>
		!searchQuery.trim()
			? indexedDocs
			: indexedDocs.filter((doc: Doc<'contentLib'>) => {
					const search = searchQuery.toLowerCase();
					return (
						doc.title.toLowerCase().includes(search) ||
						(doc.metadata?.originalFileName ?? '').toLowerCase().includes(search)
					);
				})
	);
</script>

<div class="flex h-full flex-col">
	<div class="shrink-0 border-b border-base-300 p-4">
		<div class="mb-3">
			<h2 class="text-sm font-semibold">Sources</h2>
			<p class="mt-0.5 text-xs text-base-content/50">
				Choose an indexed or mapped document to use as your source.
			</p>
		</div>

		<label class="input input-sm input-bordered flex w-full items-center gap-2 rounded-full">
			<Search size={14} class="text-base-content/40" />
			<input class="grow" placeholder="Search sources..." bind:value={searchQuery} />
		</label>
	</div>

	<div class="flex-1 overflow-y-auto p-3">
		{#if docs.isLoading}
			<div class="space-y-2">
				{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
					<div class="skeleton h-16 w-full rounded-2xl"></div>
				{/each}
			</div>
		{:else if docs.error}
			<div class="py-8 text-center">
				<TriangleAlert size={32} class="mx-auto mb-2 text-error/60" />
				<p class="text-sm text-error">Failed to load sources</p>
			</div>
		{:else if filteredDocs.length === 0}
			<div class="py-8 text-center">
				<Layers size={32} class="mx-auto mb-2 text-base-content/20" />
				<p class="text-sm font-medium">
					{searchQuery ? 'No matching sources' : 'No sources yet'}
				</p>
				<p class="mx-auto mt-1 max-w-xs text-xs text-base-content/50">
					Upload and index a PDF in Content Library to select its pages.
				</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each filteredDocs as doc (doc._id)}
					{@const selected = selectedDocumentId === doc._id}
					<button
						type="button"
						onclick={() => {
							cancelIntent();
							selectDocument(doc);
						}}
						onpointerenter={() => scheduleIntent(doc)}
						onpointerleave={cancelIntent}
						onfocus={() => scheduleIntent(doc)}
						onblur={cancelIntent}
						class="rounded-2xl border transition-colors {selected
							? 'border-primary bg-primary/5'
							: 'border-base-300 hover:border-base-content/20 hover:bg-base-200/60'} w-full p-3 text-left"
					>
						<div class="flex items-start gap-3">
							<div class="rounded-xl bg-primary/10 p-2 text-primary">
								<FileText size={16} />
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<p class="truncate text-sm font-medium">{doc.title}</p>
									{#if selected}
										<CheckCircle2 size={14} class="shrink-0 text-success" />
									{/if}
								</div>
								<p class="mt-0.5 truncate text-xs text-base-content/50">
									{doc.metadata?.originalFileName ?? 'Uploaded document'} · {doc.metadata
										?.pageCount ?? '?'} pages · {formatSize(doc.metadata?.sizeBytes)}
								</p>
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
