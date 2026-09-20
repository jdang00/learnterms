<script lang="ts">
	import { questionTypeLabel } from './questionStudioTypes';
	import type { PlannedSlot } from './questionStudioRun';

	interface Props {
		slot: PlannedSlot;
		index: number;
		variant: 'pending' | 'cut';
		writing?: boolean;
		reason?: string;
	}

	let { slot, index, variant, writing = false, reason = '' }: Props = $props();
</script>

<div
	class="rounded-2xl border border-dashed px-3 py-2.5 {variant === 'cut'
		? 'border-base-300/70 bg-base-200/25'
		: 'border-base-300 bg-base-100/60'}"
>
	<div class="flex items-start gap-3">
		<span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
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
			<div class="mb-1 flex flex-wrap items-center gap-2">
				<span class="text-xs font-medium text-base-content/35">#{index + 1}</span>
				{#if slot.questionType}
					<span
						class="rounded-sm border border-base-300 px-1.5 py-0.5 text-[10px] font-medium capitalize text-base-content/40"
					>
						{questionTypeLabel(slot.questionType)}
					</span>
				{/if}
				<span
					class="text-[10px] font-semibold uppercase tracking-wide {variant === 'cut'
						? 'text-base-content/35'
						: writing
							? 'text-primary'
							: 'text-base-content/30'}"
				>
					{variant === 'cut' ? 'Not kept' : writing ? 'Writing' : 'Queued'}
				</span>
			</div>
			{#if variant === 'cut'}
				<p class="text-xs leading-snug text-base-content/45">{reason}</p>
			{:else if slot.topicTitle}
				<p class="truncate text-sm leading-snug text-base-content/35">{slot.topicTitle}</p>
			{:else}
				<div class="skeleton h-4 w-3/4 rounded-sm"></div>
			{/if}
		</div>
	</div>
</div>
