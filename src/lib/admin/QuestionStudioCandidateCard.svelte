<script lang="ts">
	import { Check } from 'lucide-svelte';
	import { questionTypeLabel } from './questionStudioTypes';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import type { CandidateQuestion } from './questionStudioTypes';
	import type { CandidateReview } from './questionStudioRun';

	interface Props {
		candidate: CandidateQuestion;
		index: number;
		isActive: boolean;
		isIncluded: boolean;
		isSaved?: boolean;
		review?: CandidateReview;
		onSelect: () => void;
		onToggleInclude: () => void;
	}

	let {
		candidate,
		index,
		isActive,
		isIncluded,
		isSaved = false,
		review,
		onSelect,
		onToggleInclude
	}: Props = $props();

	// One dot for "should a human look harder at this one" — weak evidence and near-duplicates
	// both mean the same thing to a curator.
	const flagged = $derived(
		candidate.duplicateRisk !== 'low' ||
			review?.sourceSupport === 'weak' ||
			review?.answerQuality === 'ambiguous'
	);
	const dotTone = $derived(
		candidate.duplicateRisk === 'high' || review?.sourceSupport === 'weak'
			? 'bg-error'
			: flagged
				? 'bg-warning'
				: 'bg-success'
	);
	const dotTitle = $derived(
		flagged ? 'Needs a closer look before saving' : 'Passed the agent checks'
	);
</script>

<div
	role="button"
	tabindex="0"
	class="cursor-pointer rounded-2xl px-3 py-2.5 transition-all
		{isActive
		? 'border border-primary/30 bg-primary/8 hover:bg-primary/12'
		: 'border border-base-300/60 bg-base-100 hover:border-base-300 hover:bg-base-200/40'}
		{isSaved ? 'opacity-70' : ''}"
	onclick={onSelect}
	onkeydown={(e) => e.key === 'Enter' && onSelect()}
>
	<div class="flex items-start gap-3">
		{#if isSaved}
			<span
				class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
				title="Saved as a draft"
			>
				<Check size={12} />
			</span>
		{:else}
			<input
				type="checkbox"
				class="checkbox checkbox-sm checkbox-primary mt-0.5 shrink-0"
				aria-label="Select question to save"
				checked={isIncluded}
				onclick={(e) => {
					e.stopPropagation();
					onToggleInclude();
				}}
			/>
		{/if}
		<div class="min-w-0 flex-1">
			<div class="mb-1 flex flex-wrap items-center gap-2">
				<span class="text-xs font-medium text-base-content/50">#{index + 1}</span>
				<span
					class="rounded-sm bg-base-200 px-1.5 py-0.5 text-[10px] font-medium uppercase text-base-content/60"
				>
					MC
				</span>
				<span
					class="rounded-sm border border-base-300 px-1.5 py-0.5 text-[10px] font-medium capitalize text-base-content/55"
				>
					{questionTypeLabel(candidate.questionType)}
				</span>
				<span class="h-2 w-2 shrink-0 rounded-full {dotTone}" title={dotTitle}></span>
				{#if isSaved}
					<span class="text-[10px] font-semibold uppercase tracking-wide text-success">Saved</span>
				{/if}
			</div>
			<p class="line-clamp-2 text-sm leading-snug text-base-content tiptap-content-inline">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html sanitizeHtml(candidate.stem)}
			</p>
		</div>
	</div>
</div>
