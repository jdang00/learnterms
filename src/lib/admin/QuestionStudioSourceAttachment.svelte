<script lang="ts">
	import { FileText, Paperclip, X, Replace } from 'lucide-svelte';
	import RagDocumentBrowser from './RagDocumentBrowser.svelte';
	import type { Id } from '../../convex/_generated/dataModel';

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

	const summaryLines = $derived(selectedSourceSummary.split('\n'));
	const attachedTitle = $derived(
		summaryLines.find((line) => line.startsWith('Document: '))?.slice('Document: '.length) ??
			'Source'
	);
	const attachedPages = $derived(
		summaryLines.find((line) => line.startsWith('Pages: '))?.slice('Pages: '.length) ?? ''
	);

	function detach() {
		selectedDocumentId = null;
		selectedSourceSummary = '';
	}

	$effect(() => {
		if (selectedDocumentId) open = false;
	});
</script>

{#if selectedDocumentId}
	<div
		class="group flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 py-1 pl-1.5 pr-1"
	>
		<span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
			<FileText size={14} />
		</span>
		<div class="flex min-w-0 flex-col leading-tight">
			<span class="max-w-[180px] truncate text-xs font-medium">{attachedTitle}</span>
			{#if attachedPages}
				<span class="text-[10px] text-base-content/50">{attachedPages} pages attached</span>
			{/if}
		</div>
		<button
			type="button"
			class="btn btn-ghost btn-xs btn-circle"
			title="Change source"
			aria-label="Change source"
			onclick={() => (open = true)}
		>
			<Replace size={13} />
		</button>
		<button
			type="button"
			class="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-error"
			title="Detach source"
			aria-label="Detach source"
			onclick={detach}
		>
			<X size={13} />
		</button>
	</div>
{:else}
	<button
		type="button"
		class="btn btn-sm gap-2 rounded-full border-dashed border-base-300 bg-base-100 font-medium text-base-content/70 hover:border-primary/50 hover:text-primary"
		disabled={!cohortId || cohortLoading}
		onclick={() => (open = true)}
	>
		<Paperclip size={14} />
		Attach source
	</button>
{/if}

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
					<h3 class="text-sm font-semibold">Attach a source</h3>
					<p class="text-xs text-base-content/50">
						Pick an indexed or mapped document for the agent to read
					</p>
				</div>
			</div>
			<button
				type="button"
				class="btn btn-ghost btn-sm btn-circle"
				aria-label="Close"
				onclick={() => (open = false)}
			>
				<X size={16} />
			</button>
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
