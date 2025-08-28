<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';

	export interface Props {
		documentId: Id<'contentLib'>;
		selectedText?: string;
	}

	let { documentId, selectedText = $bindable('') }: Props = $props();

	const chunks = useQuery(api.chunkContent.getChunkByDocumentId, () => ({ documentId }));

	let selectedChunkIds = $state(new Set<Id<'chunkContent'>>());

	function toggleSelect(id: Id<'chunkContent'>) {
		const next = new Set(selectedChunkIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selectedChunkIds = next;
	}

	function clearSelection() {
		selectedChunkIds = new Set();
		selectedText = '';
	}

	function isSelected(id: Id<'chunkContent'>): boolean {
		return selectedChunkIds.has(id);
	}

	function handleCardClick(event: MouseEvent, id: Id<'chunkContent'>) {
		const target = event.target as HTMLElement;
		if (
			target.closest('summary') ||
			target.closest('input') ||
			target.closest('button') ||
			target.closest('a')
		) {
			return;
		}
		toggleSelect(id);
	}

	$effect(() => {
		if (!chunks.data) return;
		const parts: string[] = [];
		for (const ch of chunks.data) {
			if (selectedChunkIds.has(ch._id)) parts.push(ch.content);
		}
		selectedText = parts.join('\n\n');
	});
</script>

{#if chunks.isLoading}
	<div class="space-y-3">
		{#each Array(4) as _}
			<div class="skeleton h-24 w-full"></div>
		{/each}
	</div>
{:else if chunks.error}
	<div class="alert alert-error"><span>Error loading chunks</span></div>
{:else if chunks.data.length === 0}
	<div class="text-base-content/70">No chunks yet</div>
{:else}
	<div class="flex items-center justify-end mb-2">
		<button class="btn btn-ghost btn-xs" onclick={clearSelection}>Clear selection</button>
	</div>
	<div class="grid gap-2 max-h-full overflow-y-auto overflow-x-hidden pr-1">
		{#each chunks.data as chunk (chunk._id)}
			<div
				class="card bg-base-100 border {isSelected(chunk._id)
					? 'border-primary bg-primary/5'
					: 'border-base-300'} cursor-pointer transition-colors"
				role="button"
				tabindex="0"
				onclick={(e) => handleCardClick(e, chunk._id)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						handleCardClick(e as unknown as MouseEvent, chunk._id);
					}
				}}
				aria-pressed={isSelected(chunk._id)}
			>
				<div class="card-body p-3 gap-2">
					<div class="grid grid-cols-[1fr_auto] items-start gap-2 w-full">
						<div class="min-w-0">
							<div class="flex items-center gap-2">
								<div class="font-semibold truncate text-sm">{chunk.title}</div>
								<span class="badge badge-soft badge-primary badge-xs capitalize"
									>{chunk.chunk_type}</span
								>
							</div>
							<div class="mt-1">
								<div class="tooltip tooltip-right" data-tip={chunk.summary}>
									<span class="badge badge-ghost badge-xs">Summary</span>
								</div>
							</div>
						</div>
						<label class="label cursor-pointer gap-2 justify-end">
							<span class="text-xs">Select</span>
							<input
								type="checkbox"
								class="checkbox checkbox-primary checkbox-sm"
								checked={selectedChunkIds.has(chunk._id)}
								onchange={() => toggleSelect(chunk._id)}
							/>
						</label>
					</div>
					<details class="collapse collapse-arrow bg-base-200">
						<summary class="collapse-title text-xs font-medium">View full content</summary>
						<div class="collapse-content">
							<pre
								class="whitespace-pre-wrap break-words text-xs leading-relaxed w-full max-w-full">{chunk.content}</pre>
						</div>
					</details>
				</div>
			</div>
		{/each}
	</div>
{/if}
