<script lang="ts">
	import { Check, ChevronLeft, ChevronRight, Pencil, Plus, TriangleAlert, X } from 'lucide-svelte';
	import QuestionStudioCandidateEditor from './QuestionStudioCandidateEditor.svelte';
	import QuestionStudioWhyThis from './QuestionStudioWhyThis.svelte';
	import { candidateConcern } from './questionStudioRun';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import type { CandidateQuestion } from './questionStudioTypes';
	import type { CandidateReview } from './questionStudioRun';

	interface Props {
		candidate: CandidateQuestion;
		index: number;
		total: number;
		isIncluded: boolean;
		isSaved?: boolean;
		review?: CandidateReview;
		objective?: string;
		variant?: 'desktop' | 'mobile';
		onToggleInclude: () => void;
		onPrev: () => void;
		onNext: () => void;
		onClose?: () => void;
		canEdit?: boolean;
		onEditingChange?: (editing: boolean) => void;
	}

	let {
		candidate,
		index,
		total,
		isIncluded,
		isSaved = false,
		review,
		objective = '',
		variant = 'desktop',
		onToggleInclude,
		onPrev,
		onNext,
		onClose = undefined,
		canEdit = false,
		onEditingChange
	}: Props = $props();

	const isMobile = $derived(variant === 'mobile');
	const concern = $derived(candidateConcern(candidate, review));
	let editing = $state(false);

	function setEditing(value: boolean) {
		editing = value;
		onEditingChange?.(value);
	}
</script>

<div class="flex h-full w-full flex-col overflow-hidden">
	<!-- Header -->
	<div class="flex shrink-0 items-center justify-between gap-2 border-b border-base-300 p-4">
		<span class="whitespace-nowrap text-sm font-medium">
			Question #{index + 1}
			<span class="ml-1.5 text-xs font-normal text-base-content/45">of {total}</span>
		</span>
		<div class="flex items-center gap-1">
			{#if editing}
				<span class="mr-1 text-xs font-medium text-primary">Editing draft</span>
			{:else if isSaved}
				<span
					class="mr-1 flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success"
				>
					<Check size={13} />
					Saved
				</span>
			{:else}
				<button
					class="btn btn-sm gap-1.5 rounded-full {isIncluded
						? 'btn-ghost border border-base-300'
						: 'btn-primary'}"
					onclick={onToggleInclude}
				>
					{#if isIncluded}
						<X size={14} />
						Deselect
					{:else}
						<Plus size={14} />
						Select
					{/if}
				</button>
			{/if}

			{#if canEdit && candidate.metadata.jobId && !editing}
				<button
					class="btn btn-ghost btn-sm btn-circle"
					aria-label="Edit this draft"
					title="Edit this draft"
					onclick={() => setEditing(true)}
				>
					<Pencil size={15} />
				</button>
			{/if}

			<span class="mx-1 h-5 w-px bg-base-300"></span>
			<button
				class="btn btn-ghost btn-sm btn-circle"
				aria-label="Previous question"
				disabled={editing || index <= 0}
				onclick={onPrev}
			>
				<ChevronLeft size={16} />
			</button>
			<button
				class="btn btn-ghost btn-sm btn-circle"
				aria-label="Next question"
				disabled={editing || index >= total - 1}
				onclick={onNext}
			>
				<ChevronRight size={16} />
			</button>
			{#if onClose}
				<span class="mx-1 h-5 w-px bg-base-300"></span>
				<button
					class="btn btn-ghost btn-sm btn-circle"
					aria-label="Close question"
					title="Close"
					disabled={editing}
					onclick={onClose}
				>
					<X size={16} />
				</button>
			{/if}
		</div>
	</div>

	{#if editing}
		<QuestionStudioCandidateEditor
			{candidate}
			{index}
			{isMobile}
			onDone={() => setEditing(false)}
		/>
	{:else}
		<!-- Content -->
		<div class="min-h-0 flex-1 overflow-y-auto {isMobile ? 'p-4' : 'p-6 pb-12'}">
			{#if candidate.metadata.curatorEditedAt}
				<p class="mb-6 rounded-2xl bg-base-200 px-4 py-3 text-sm text-base-content/70">
					You edited this draft. The notes below describe the original.
				</p>
			{/if}

			{#if concern && !isSaved}
				<p
					class="mb-6 flex items-start gap-2 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm leading-relaxed"
				>
					<TriangleAlert size={15} class="mt-0.5 shrink-0 text-warning" />
					<span>{concern}</span>
				</p>
			{/if}

			<!-- Question Stem -->
			<div class={isMobile ? 'mb-6' : 'mb-8'}>
				<div
					class="{isMobile
						? 'text-base'
						: 'text-lg'} font-medium leading-relaxed text-base-content tiptap-content"
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html sanitizeHtml(candidate.stem)}
				</div>
			</div>

			<!-- Options -->
			<div class={isMobile ? 'mb-4' : 'mb-6'}>
				<h3 class="text-sm font-semibold {isMobile ? 'mb-2' : 'mb-3'}">Options</h3>
				<div class={isMobile ? 'space-y-2' : 'space-y-3'}>
					{#each candidate.options as option, optIndex (optIndex)}
						{@const correct = candidate.correctAnswers.includes(option)}
						<div
							class="flex items-center rounded-full transition-colors {isMobile
								? 'border p-1.5'
								: 'border-2 p-2'} {correct
								? 'border-success bg-success/5'
								: 'border-base-300 bg-base-200'}"
						>
							<span
								class="flex shrink-0 items-center justify-center rounded-full border {isMobile
									? 'ms-2 h-4 w-4'
									: 'ms-3 h-5 w-5'} {correct
									? 'border-success bg-success text-success-content'
									: 'border-base-300'}"
							>
								{#if correct}<Check size={isMobile ? 10 : 12} />{/if}
							</span>
							<span
								class="my-2 grow text-wrap break-words {isMobile ? 'ml-2 text-xs' : 'ml-4 text-sm'}"
							>
								<span class="mr-2 select-none font-semibold">
									{String.fromCharCode(65 + optIndex)}.
								</span>
								<span class="tiptap-content">
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html sanitizeHtml(option)}
								</span>
							</span>
							{#if correct}
								<span
									class="shrink-0 text-xs font-medium text-success {isMobile ? 'mr-3' : 'mr-4'}"
								>
									{isMobile ? '✓' : '✓ Correct'}
								</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Rationale -->
			<div class={isMobile ? 'mb-4' : 'mb-6'}>
				<h3 class="text-sm font-semibold {isMobile ? 'mb-2' : 'mb-3'}">Rationale</h3>
				<div class="rounded-2xl border border-base-300 bg-base-200/30 {isMobile ? 'p-3' : 'p-4'}">
					<div
						class="prose prose-sm max-w-none tiptap-content text-sm leading-relaxed text-base-content/80"
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html sanitizeHtml(candidate.rationale)}
					</div>
				</div>
			</div>

			<QuestionStudioWhyThis {candidate} {index} {review} {objective} compact={isMobile} />
		</div>
	{/if}
</div>
