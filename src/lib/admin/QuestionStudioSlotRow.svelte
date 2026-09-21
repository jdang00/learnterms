<script lang="ts">
	import { questionTypeLabel } from './questionStudioTypes';
	import type { PlannedSlot } from './questionStudioRun';

	interface Props {
		slot: PlannedSlot;
		writing?: boolean;
	}

	let { slot, writing = false }: Props = $props();
</script>

<div class="rounded-2xl border border-dashed border-base-300 bg-base-100/60 px-3 py-2.5">
	<div class="flex items-start gap-3">
		<span class="mt-1 flex h-4 w-4 shrink-0 items-center justify-center">
			{#if writing}
				<span class="relative flex h-2 w-2">
					<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60"
					></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
				</span>
			{:else}
				<span class="h-1.5 w-1.5 rounded-full border border-base-content/25"></span>
			{/if}
		</span>
		<div class="min-w-0 flex-1">
			<p class="mb-1 text-xs {writing ? 'text-primary' : 'text-base-content/35'}">
				{writing ? 'Writing' : 'Queued'}{slot.questionType
					? `, ${questionTypeLabel(slot.questionType).toLowerCase()}`
					: ''}
			</p>
			{#if slot.topicTitle}
				<p class="truncate text-sm leading-snug text-base-content/35">{slot.topicTitle}</p>
			{:else}
				<div class="skeleton h-4 w-3/4 rounded-sm"></div>
			{/if}
		</div>
	</div>
</div>
