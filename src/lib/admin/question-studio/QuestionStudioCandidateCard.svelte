<script lang="ts">
	import { Check } from 'lucide-svelte';
	import { questionTypeLabel } from './questionStudioTypes';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import type { CandidateQuestion } from './questionStudioTypes';
	import { candidateConcern } from './questionStudioRun';
	import type { CandidateReview } from './questionStudioRun';

	interface Props {
		candidate: CandidateQuestion;
		isActive: boolean;
		isIncluded: boolean;
		isSaved?: boolean;
		review?: CandidateReview;
		onSelect: () => void;
		onToggleInclude: () => void;
	}

	let {
		candidate,
		isActive,
		isIncluded,
		isSaved = false,
		review,
		onSelect,
		onToggleInclude
	}: Props = $props();

	const concern = $derived(candidateConcern(candidate, review));
	const pages = $derived(candidate.sourceCitations?.map((citation) => citation.pageNumber) ?? []);
	const pageLabel = $derived(
		pages.length ? `p. ${[...new Set(pages)].slice(0, 2).join(', ')}` : ''
	);
	const verdictShort = $derived(
		review?.verdict === 'accept' ? 'kept' : review?.verdict === 'revise' ? 'revised' : 'cut'
	);
	const verdictTitle = $derived(
		candidate.metadata.reviewMode === 'local'
			? 'Local evidence and structure checks only; review correctness before publishing.'
			: review
				? `Source support: ${review.sourceSupport}, answer: ${review.answerQuality}`
				: ''
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
				title="Published to module"
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
			<div class="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-base-content/45">
				<span>{questionTypeLabel(candidate.questionType)}</span>
				{#if candidate.topicTitle}
					<span class="min-w-0 max-w-[12rem] truncate text-base-content/60">
						{candidate.topicTitle}
					</span>
				{/if}
				{#if pageLabel}
					<span class="tabular-nums text-base-content/35">{pageLabel}</span>
				{/if}
				{#if review}
					<span class="uppercase tracking-wide text-base-content/35" title={verdictTitle}>
						{verdictShort}
					</span>
				{/if}
				{#if concern && !isSaved}
					<span
						title={concern}
						class="rounded-full bg-warning px-2 py-px font-medium text-warning-content"
					>
						Check this
					</span>
				{/if}
			</div>
			<p class="line-clamp-2 text-sm leading-snug text-base-content tiptap-content-inline">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html sanitizeHtml(candidate.stem)}
			</p>
		</div>
	</div>
</div>
