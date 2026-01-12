<script lang="ts">
	import { FileText, ArrowLeft, Search } from 'lucide-svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id, Doc } from '../../convex/_generated/dataModel';
	import ChunkList from './ChunkList.svelte';

	export interface Props {
		cohortId: Id<'cohort'>;
		selectedText?: string;
	}

	let { cohortId, selectedText = $bindable('') }: Props = $props();

	const docs = useQuery(api.contentLib.getContentLibByCohort, () => ({ cohortId }));

	let selectedDocId: Id<'contentLib'> | null = $state(null);
	let selectedDocument: Doc<'contentLib'> | null = $state(null);
	let searchQuery = $state('');

	function selectDoc(doc: Doc<'contentLib'>) {
		selectedDocId = doc._id as Id<'contentLib'>;
		selectedDocument = doc;
	}

	function backToDocuments() {
		selectedDocId = null;
		selectedDocument = null;
	}

	$effect(() => {
		if (selectedDocId && docs.data) {
			const match = docs.data.find((d) => d._id === selectedDocId);
			if (match) selectedDocument = match as Doc<'contentLib'>;
		}
	});

	const filteredDocs = $derived(
		!docs.data || !searchQuery.trim()
			? docs.data
			: docs.data.filter((d) =>
					d.title.toLowerCase().includes(searchQuery.toLowerCase())
				)
	);
</script>

<div class="h-full flex flex-col">
	<div class="p-4 border-b border-base-300 flex-shrink-0">
		{#if selectedDocument}
			<div class="flex items-center gap-2">
				<button class="btn btn-ghost btn-xs gap-1" onclick={backToDocuments}>
					<ArrowLeft size={14} />
					Back
				</button>
				<div class="h-4 w-px bg-base-300"></div>
				<span class="text-sm font-medium truncate">{selectedDocument.title}</span>
			</div>
		{:else}
			<div class="flex items-center justify-between gap-2 mb-3">
				<h2 class="text-sm font-semibold">Content Library</h2>
				<span class="text-xs text-base-content/50">{docs.data?.length || 0} docs</span>
			</div>
			<div class="relative">
				<Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
				<input
					type="text"
					placeholder="Search documents..."
					class="input input-sm input-bordered w-full pl-9"
					bind:value={searchQuery}
				/>
			</div>
		{/if}
	</div>

	<div class="flex-1 overflow-y-auto p-3">
		{#if !selectedDocument}
			{#if docs.isLoading}
				<div class="space-y-2">
					{#each Array(5) as _}
						<div class="skeleton h-14 w-full rounded-lg"></div>
					{/each}
				</div>
			{:else if docs.error}
				<div class="text-center py-8">
					<p class="text-sm text-error">Failed to load documents</p>
				</div>
			{:else if !filteredDocs || filteredDocs.length === 0}
				<div class="text-center py-8">
					<FileText size={32} class="mx-auto text-base-content/20 mb-2" />
					<p class="text-sm text-base-content/50">
						{searchQuery ? 'No matching documents' : 'No documents yet'}
					</p>
				</div>
			{:else}
				<div class="space-y-1">
					{#each filteredDocs as doc (doc._id)}
						<button
							class="w-full text-left p-3 rounded-lg hover:bg-base-200 transition-colors group"
							onclick={() => selectDoc(doc as Doc<'contentLib'>)}
						>
							<div class="flex items-center gap-3">
								<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
									<FileText size={16} class="text-primary" />
								</div>
								<div class="flex-1 min-w-0">
									<div class="text-sm font-medium truncate group-hover:text-primary transition-colors">
										{doc.title}
									</div>
									{#if doc.description}
										<div class="text-xs text-base-content/50 truncate">{doc.description}</div>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		{:else if selectedDocId}
			<ChunkList documentId={selectedDocId} bind:selectedText />
		{/if}
	</div>
</div>
