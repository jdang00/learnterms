<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';
	import { Check, ChevronDown, Layers } from 'lucide-svelte';

	export interface Props {
		documentId: Id<'contentLib'>;
		selectedText?: string;
	}

	let { documentId, selectedText = $bindable('') }: Props = $props();

	const chunks = useQuery(api.chunkContent.getChunkByDocumentId, () => ({ documentId }));

	let selectedChunkIds = $state(new Set<Id<'chunkContent'>>());

	function toggleSelect(id: Id<'chunkContent'>) {
		const next = new Set(selectedChunkIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedChunkIds = next;
	}

	function selectAll() {
		if (!chunks.data) return;
		selectedChunkIds = new Set(chunks.data.map((c) => c._id));
	}

	function clearSelection() {
		selectedChunkIds = new Set();
		selectedText = '';
	}

	$effect(() => {
		if (!chunks.data) return;
		const parts: string[] = [];
		for (const ch of chunks.data) {
			if (selectedChunkIds.has(ch._id)) parts.push(ch.content);
		}
		selectedText = parts.join('\n\n');
	});

	const selectedCount = $derived(selectedChunkIds.size);
	const totalCount = $derived(chunks.data?.length || 0);
</script>

{#if chunks.isLoading}
	<div class="space-y-2">
		{#each Array(4) as _}
			<div class="skeleton h-16 w-full rounded-2xl"></div>
		{/each}
	</div>
{:else if chunks.error}
	<div class="text-center py-8">
		<p class="text-sm text-error">Failed to load chunks</p>
	</div>
{:else if chunks.data.length === 0}
	<div class="text-center py-8">
		<Layers size={32} class="mx-auto text-base-content/20 mb-2" />
		<p class="text-sm text-base-content/50">No chunks in this document</p>
	</div>
{:else}
	<div class="mb-3 flex items-center justify-between">
		<span class="text-xs text-base-content/60">
			{#if selectedCount > 0}
				<span class="text-primary font-medium">{selectedCount}</span> of {totalCount} selected
			{:else}
				{totalCount} chunks
			{/if}
		</span>
		<div class="flex gap-1">
			<button class="btn btn-ghost btn-xs" onclick={selectAll}>All</button>
			<button class="btn btn-ghost btn-xs" onclick={clearSelection} disabled={selectedCount === 0}>Clear</button>
		</div>
	</div>

	<div class="space-y-2">
		{#each chunks.data as chunk (chunk._id)}
			{@const isSelected = selectedChunkIds.has(chunk._id)}
			<div
				class="rounded-2xl border transition-all cursor-pointer {isSelected
					? 'border-primary bg-primary/5'
					: 'border-base-300 hover:border-base-content/20'}"
				role="button"
				tabindex="0"
				onclick={() => toggleSelect(chunk._id)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						toggleSelect(chunk._id);
					}
				}}
			>
				<div class="p-3">
					<div class="flex items-start gap-3">
						<div class="pt-0.5">
							<div
								class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors {isSelected
									? 'bg-primary border-primary'
									: 'border-base-300'}"
							>
								{#if isSelected}
									<Check size={12} class="text-primary-content" />
								{/if}
							</div>
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<span class="text-sm font-medium truncate">{chunk.title}</span>
								<span class="badge badge-ghost badge-xs capitalize flex-shrink-0">{chunk.chunk_type}</span>
							</div>
							<p class="text-xs text-base-content/60 line-clamp-2">{chunk.summary}</p>
						</div>
					</div>

					<details class="mt-2" onclick={(e) => e.stopPropagation()}>
						<summary class="text-xs text-base-content/50 cursor-pointer hover:text-base-content/70 flex items-center gap-1">
							<ChevronDown size={12} />
							Preview content
						</summary>
						<div class="mt-2 p-2 bg-base-200 rounded-xl text-xs max-h-32 overflow-auto">
							<pre class="whitespace-pre-wrap break-words">{chunk.content}</pre>
						</div>
					</details>
				</div>
			</div>
		{/each}
	</div>
{/if}
