<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import FileText from '@lucide/svelte/icons/file-text';
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import X from '@lucide/svelte/icons/x';
	import RagDocumentBrowser from '../source/RagDocumentBrowser.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Alert } from '$lib/components/ui/alert';
	import { Skeleton } from '$lib/components/ui/skeleton';
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

<Button
	variant={selectedDocumentId ? 'soft' : 'dash'}
	tone="neutral"
	size="lg"
	class="mx-1.5 max-w-full gap-2 px-5 align-middle font-medium"
	disabled={!cohortId || cohortLoading}
	title={selectedDocumentId ? 'Change document' : undefined}
	onclick={() => (open = true)}
>
	{#if selectedDocumentId}
		<FileText size={16} class="shrink-0 text-foreground/60" />
	{:else}
		<Paperclip size={16} class="shrink-0" />
	{/if}
	<span class="truncate">{selectedDocumentId ? attachedTitle : 'a document'}</span>
	<ChevronDown size={15} class="shrink-0 opacity-60" />
</Button>

<Dialog.Root bind:open>
	<Dialog.Content
		showCloseButton={false}
		class="flex h-[72vh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl"
	>
		<div class="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
			<div class="flex items-center gap-2">
				<span
					class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary-ink"
				>
					<Paperclip size={16} />
				</span>
				<div>
					<Dialog.Title class="text-sm font-semibold">
						{selectedDocumentId ? 'Change document' : 'Choose a document'}
					</Dialog.Title>
					<Dialog.Description class="text-xs text-foreground/50">
						The agent writes only from what's in this document.
					</Dialog.Description>
				</div>
			</div>
			<div class="flex items-center gap-1">
				{#if selectedDocumentId}
					<Button variant="ghost" tone="neutral" size="sm" onclick={detach}>Remove document</Button>
				{/if}
				<Button
					variant="ghost"
					tone="neutral"
					size="sm"
					shape="circle"
					aria-label="Close"
					onclick={() => (open = false)}
				>
					<X size={16} />
				</Button>
			</div>
		</div>
		<div class="min-h-0 flex-1 overflow-hidden">
			{#if cohortLoading}
				<div class="space-y-2 p-4">
					{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
						<Skeleton class="h-16 w-full rounded-2xl" />
					{/each}
				</div>
			{:else if !cohortId}
				<div class="p-4">
					<Alert tone="warning" class="rounded-2xl text-sm">No cohort assigned</Alert>
				</div>
			{:else}
				<RagDocumentBrowser {cohortId} bind:selectedDocumentId bind:selectedSourceSummary />
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
