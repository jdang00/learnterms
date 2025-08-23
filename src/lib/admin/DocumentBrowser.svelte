<script lang="ts">
	import { FileText, ArrowLeft } from 'lucide-svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id, Doc } from '../../convex/_generated/dataModel';
	import ChunkList from './ChunkList.svelte';

	export interface Props {
		cohortId: Id<'cohort'>;
		initialLib?: Doc<'contentLib'>[];
		selectedText?: string;
	}

	let { cohortId, initialLib, selectedText = $bindable('') }: Props = $props();

	const docs = useQuery(
		api.contentLib.getContentLibByCohort,
		{ cohortId },
		{ initialData: initialLib }
	);

	let selectedDocId: Id<'contentLib'> | null = $state(null);
	let selectedDocument: Doc<'contentLib'> | null = $state(null);

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
			if (match) {
				selectedDocument = match as Doc<'contentLib'>;
			}
		}
	});

	// Removed debug $inspect/console statements
</script>

<div class="h-full grid grid-rows-[auto_1fr]">
	<div class="p-6 border-b border-base-300">
		{#if selectedDocument}
			<div class="flex items-center gap-3">
				<button
					class="btn btn-ghost btn-sm"
					onclick={backToDocuments}
					aria-label="Back to documents"
				>
					<ArrowLeft size={16} /> Back
				</button>
				<div class="flex-1 min-w-0">
					<h2 class="text-lg font-semibold">Document Chunks</h2>
					<p class="text-sm text-base-content/70 break-words">Showing chunks for: {selectedDocument.title}</p>
				</div>
			</div>
		{:else}
			<div>
				<h2 class="text-lg font-semibold">Documents</h2>
				<p class="text-sm text-base-content/70">Select a document to view its chunks</p>
			</div>
		{/if}
	</div>

	<div class="min-h-0 h-full overflow-y-auto overflow-x-hidden p-6">
		{#if !selectedDocument}
			{#if docs.isLoading}
				<div class="space-y-2">
					{#each Array(6) as _}
						<div class="skeleton h-10 w-full"></div>
					{/each}
				</div>
			{:else if docs.error}
				<div class="alert alert-error"><span>Error loading documents</span></div>
			{:else if !docs.data || docs.data.length === 0}
				<div class="p-2 text-base-content/70">No documents yet</div>
			{:else}
				<div class="space-y-2">
					{#each docs.data as doc (doc._id)}
						<button
							class="w-full text-left p-3 rounded-lg border border-base-300 bg-base-100 hover:bg-base-200 hover:border-base-400 transition-all duration-200 group"
							onclick={() => selectDoc(doc)}
							aria-label={`Open ${doc.title}`}
						>
							<div class="flex items-start gap-3">
								<FileText size={18} class="text-primary mt-0.5 flex-shrink-0" />
								<div class="flex-1 min-w-0">
									<div class="font-medium text-base-content group-hover:text-primary transition-colors">
										{doc.title}
									</div>
									<div class="text-xs text-base-content/60 mt-1">
										Click to view chunks and select content
									</div>
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		{:else if selectedDocId}
			<div class="mb-3">
				<h3 class="text-base font-semibold mb-1">Document</h3>
				<p class="text-sm text-base-content/70 break-words font-medium">{selectedDocument.title}</p>
			</div>
			{#key selectedDocId}
				<div class="h-[80vh] sm:h-[85vh] lg:h-[90vh] 2xl:h-[95vh] overflow-y-auto overflow-x-hidden pr-1">
					<ChunkList documentId={selectedDocId as Id<'contentLib'>} bind:selectedText />
				</div>
			{/key}
		{/if}
	</div>
</div>
