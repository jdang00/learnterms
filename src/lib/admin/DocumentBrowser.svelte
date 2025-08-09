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
  <div class="p-4 border-b border-base-300">
    {#if selectedDocument}
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-sm" onclick={backToDocuments} aria-label="Back to documents">
          <ArrowLeft size={16} /> Back
        </button>
        <div>
          <h2 class="text-lg font-semibold">Chunks</h2>
          <p class="text-sm text-base-content/70">Showing chunks for: {selectedDocument.title}</p>
        </div>
      </div>
    {:else}
      <div>
        <h2 class="text-lg font-semibold">Documents</h2>
        <p class="text-sm text-base-content/70">Select a document to view its chunks</p>
      </div>
    {/if}
  </div>

  <div class="min-h-0 h-full overflow-y-auto overflow-x-hidden p-4">
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
        <ul class="menu p-0 w-full">
          {#each docs.data as doc (doc._id)}
            <li>
              <button class="btn btn-ghost w-full justify-start gap-3" onclick={() => selectDoc(doc)} aria-label={`Open ${doc.title}`}>
                <FileText size={16} class="text-base-content/60" />
                <span class="truncate">{doc.title}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    {:else}
      {#if selectedDocId}
        <div class="mb-2">
          <h3 class="text-base font-semibold">Document</h3>
          <p class="text-sm text-base-content/70 truncate">{selectedDocument.title}</p>
        </div>
        {#key selectedDocId}
          <div class="h-[60vh] sm:h-[65vh] lg:h-[70vh] overflow-y-auto overflow-x-hidden pr-1">
            <ChunkList documentId={selectedDocId as Id<'contentLib'>} bind:selectedText />
          </div>
        {/key}
      {/if}
    {/if}
  </div>
</div>


