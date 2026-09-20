<script lang="ts">
	import { Clock3, LoaderCircle, TriangleAlert } from 'lucide-svelte';
	import type { Doc } from '../../convex/_generated/dataModel';
	import { documentPipeline } from './documentPipeline';

	let { metadata }: { metadata: Doc<'contentLib'>['metadata'] } = $props();
	const progress = $derived(documentPipeline(metadata));
</script>

{#if progress.visible && !progress.complete}
	<div
		role="status"
		aria-atomic="true"
		class="my-1 max-w-64 space-y-1.5 text-[11px] {progress.failed ? 'text-error' : 'text-info'}"
		title={progress.description}
	>
		<div class="flex items-start gap-1.5 leading-snug">
			{#if progress.failed}
				<TriangleAlert size={12} class="mt-px shrink-0" aria-hidden="true" />
			{:else if progress.active}
				<LoaderCircle
					size={12}
					class="mt-px shrink-0 motion-safe:animate-spin"
					aria-hidden="true"
				/>
			{:else}
				<Clock3 size={12} class="mt-px shrink-0" aria-hidden="true" />
			{/if}
			<span class="line-clamp-2 min-w-0 flex-1">{progress.label}</span>
			{#if !progress.complete && !progress.failed}
				<span
					class="shrink-0 tabular-nums text-base-content/50"
					aria-label="Stage {progress.current + 1} of 4"
				>
					{progress.current + 1}/4
				</span>
			{/if}
		</div>
		{#if !progress.complete}
			<div class="flex gap-1" aria-hidden="true">
				{#each progress.states as state, index (index)}
					<span
						class="h-1 flex-1 rounded-full {state === 'done'
							? 'bg-success'
							: state === 'active'
								? 'bg-info motion-safe:animate-pulse'
								: state === 'error'
									? 'bg-error'
									: 'bg-base-300'}"
					></span>
				{/each}
			</div>
		{/if}
	</div>
{/if}
