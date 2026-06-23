<script lang="ts">
	import type { TopicMapItem } from './questionStudioTypes';

	interface Props {
		detailTopic?: TopicMapItem | null;
	}

	let { detailTopic = $bindable<TopicMapItem | null>(null) }: Props = $props();
</script>

{#if detailTopic}
	<div class="modal modal-open">
		<div class="modal-box max-w-lg rounded-2xl">
			<div class="mb-4 flex items-start justify-between gap-3">
				<h3 class="text-base font-semibold">{detailTopic.title}</h3>
				<div class="flex shrink-0 gap-1.5">
					<span class="badge badge-ghost badge-sm">Pages {detailTopic.pageNumbers.join(', ')}</span>
					<span class="badge badge-outline badge-sm">
						up to {detailTopic.estimatedQuestionCapacity}
					</span>
				</div>
			</div>
			<p class="text-sm leading-relaxed text-base-content/70">{detailTopic.summary}</p>
			{#if detailTopic.keyTerms.length > 0}
				<div class="mt-4">
					<p class="mb-1.5 text-xs font-medium text-base-content/50">Key terms</p>
					<div class="flex flex-wrap gap-1.5">
						{#each detailTopic.keyTerms as term}
							<span class="badge badge-ghost badge-sm">{term}</span>
						{/each}
					</div>
				</div>
			{/if}
			<div class="modal-action">
				<button type="button" class="btn btn-sm" onclick={() => (detailTopic = null)}>Close</button>
			</div>
		</div>
		<button
			type="button"
			class="modal-backdrop bg-black/50"
			aria-label="Close topic details"
			onclick={() => (detailTopic = null)}
		></button>
	</div>
{/if}
