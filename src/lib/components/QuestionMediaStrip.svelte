<script lang="ts">
	import type { Id } from '../../convex/_generated/dataModel';
	import { useQuestionMedia } from '$lib/utils/useQuestionMedia.svelte';
	import ImageViewer from './ImageViewer.svelte';

	// Phones and tablets have no attachments sidebar, so images sit right under the stem.
	let {
		questionId,
		showSolution = false
	}: { questionId: Id<'question'> | undefined; showSolution?: boolean } = $props();

	const mediaQuery = useQuestionMedia(() => questionId);
	const media = $derived(
		(mediaQuery.data ?? []).filter((item) => showSolution || !item.showOnSolution)
	);
	let viewerOpen = $state(false);
	let viewerIndex = $state(0);
</script>

{#if media.length}
	<ul
		class="-mx-1 my-3 flex gap-2 overflow-x-auto px-3 pb-1 lg:hidden"
		aria-label="Question images"
	>
		{#each media as item, index (item._id)}
			<li class="shrink-0">
				<button
					type="button"
					class="relative block overflow-hidden rounded-xl border border-base-300 bg-base-200 transition-transform active:scale-[0.98]"
					aria-label="View image: {item.altText}"
					onclick={() => {
						viewerIndex = index;
						viewerOpen = true;
					}}
				>
					<img
						src={item.url}
						alt={item.altText}
						loading="lazy"
						class="w-auto max-w-[70vw] object-cover {media.length === 1 ? 'h-44' : 'h-28'}"
					/>
					{#if item.showOnSolution}
						<span class="badge badge-success badge-sm absolute left-2 top-2">Answer</span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
	<ImageViewer images={media} bind:open={viewerOpen} bind:index={viewerIndex} />
{/if}
