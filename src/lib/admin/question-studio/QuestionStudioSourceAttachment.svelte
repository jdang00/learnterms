<script lang="ts">
	import { ChevronDown, FileText, Paperclip, X } from 'lucide-svelte';
	import { tokenClass } from './questionStudioToken';
	import RagDocumentBrowser from '../source/RagDocumentBrowser.svelte';
	import type { Id } from '../../../convex/_generated/dataModel';

	interface Props {
		cohortId?: Id<'cohort'> | null;
		cohortLoading?: boolean;
		selectedDocumentId?: Id<'contentLib'> | null;
		selectedSourceSummary?: string;
	}

	let {
		cohortId = null,
		cohortLoading = false,
		selectedDocumentId = $bindable<Id<'contentLib'> | null>(null),
		selectedSourceSummary = $bindable('')
	}: Props = $props();

	let open = $state(false);

	function detach() {
		selectedDocumentId = null;
		selectedSourceSummary = '';
		open = false;
	}

	const summaryLines = $derived(selectedSourceSummary.split('\n'));
	const attachedTitle = $derived(
		summaryLines.find((line) => line.startsWith('Document: '))?.slice('Document: '.length) ??
			'selected document'
	);

	$effect(() => {
		if (selectedDocumentId) open = false;
	});
</script>

<button
	type="button"
	class={tokenClass(Boolean(selectedDocumentId))}
	disabled={!cohortId || cohortLoading}
	title={selectedDocumentId ? 'Change document' : undefined}
	onclick={() => (open = true)}
>
	{#if selectedDocumentId}
		<FileText size={16} class="shrink-0 text-base-content/60" />
	{:else}
		<Paperclip size={16} class="shrink-0" />
	{/if}
	<span class="truncate">{selectedDocumentId ? attachedTitle : 'a document'}</span>
	<ChevronDown size={15} class="shrink-0 opacity-60" />
</button>

<dialog class="modal" class:modal-open={open}>
	<div class="modal-box flex h-[72vh] max-w-2xl flex-col overflow-hidden rounded-2xl p-0">
		<div class="flex shrink-0 items-center justify-between border-b border-base-300 px-4 py-3">
			<div class="flex items-center gap-2">
				<span
					class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"
				>
					<Paperclip size={16} />
				</span>
				<div>
					<h3 class="text-sm font-semibold">
						{selectedDocumentId ? 'Change document' : 'Choose a document'}
					</h3>
					<p class="text-xs text-base-content/50">
						The agent writes only from what's in this document.
					</p>
				</div>
			</div>
			<div class="flex items-center gap-1">
				{#if selectedDocumentId}
					<button type="button" class="btn btn-ghost btn-sm rounded-full" onclick={detach}>
						Remove document
					</button>
				{/if}
				<button
					type="button"
					class="btn btn-ghost btn-sm btn-circle"
					aria-label="Close"
					onclick={() => (open = false)}
				>
					<X size={16} />
				</button>
			</div>
		</div>
		<div class="min-h-0 flex-1 overflow-hidden">
			{#if cohortLoading}
				<div class="space-y-2 p-4">
					{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
						<div class="skeleton h-16 w-full rounded-2xl"></div>
					{/each}
				</div>
			{:else if !cohortId}
				<div class="p-4">
					<div class="alert alert-warning rounded-2xl text-sm">No cohort assigned</div>
				</div>
			{:else}
				<RagDocumentBrowser {cohortId} bind:selectedDocumentId bind:selectedSourceSummary />
			{/if}
		</div>
	</div>
	<button
		type="button"
		class="modal-backdrop bg-black/40"
		aria-label="Close"
		onclick={() => (open = false)}
	></button>
</dialog>
