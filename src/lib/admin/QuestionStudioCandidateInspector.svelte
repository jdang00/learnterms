<script lang="ts">
	import { Check, ChevronLeft, ChevronRight, CircleAlert, FileText, Plus } from 'lucide-svelte';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import type { CandidateQuestion } from './questionStudioTypes';

	interface Props {
		candidate: CandidateQuestion;
		index: number;
		total: number;
		isIncluded: boolean;
		onToggleInclude: () => void;
		onPrev: () => void;
		onNext: () => void;
	}

	let { candidate, index, total, isIncluded, onToggleInclude, onPrev, onNext }: Props = $props();

	const riskBadge = $derived(
		candidate.duplicateRisk === 'high'
			? 'badge-error'
			: candidate.duplicateRisk === 'medium'
				? 'badge-warning'
				: 'badge-success'
	);
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Header -->
	<div class="flex shrink-0 items-center justify-between border-b border-base-300 p-4">
		<div class="flex items-center gap-3">
			<span class="whitespace-nowrap text-sm font-medium">Candidate #{index + 1}</span>
			<span class="badge badge-xs badge-ghost">of {total}</span>
		</div>
		<div class="flex items-center gap-1">
			<button
				class="btn btn-ghost btn-sm btn-circle"
				aria-label="Previous candidate"
				disabled={index <= 0}
				onclick={onPrev}
			>
				<ChevronLeft size={16} />
			</button>
			<button
				class="btn btn-ghost btn-sm btn-circle"
				aria-label="Next candidate"
				disabled={index >= total - 1}
				onclick={onNext}
			>
				<ChevronRight size={16} />
			</button>
		</div>
	</div>

	<!-- Body -->
	<div class="min-h-0 flex-1 overflow-y-auto p-5 pb-10">
		<div class="mb-4 flex flex-wrap items-center gap-1.5">
			<span class="badge badge-sm badge-outline capitalize">{candidate.reasoningOrder} order</span>
			<span class="badge badge-sm {riskBadge}">{candidate.duplicateRisk} dup risk</span>
			<span class="badge badge-sm badge-ghost gap-1">
				<FileText size={11} />
				pages {candidate.sourcePageNumbers.join(', ')}
			</span>
		</div>

		<!-- Stem -->
		<div class="mb-6 text-lg font-medium leading-relaxed text-base-content tiptap-content">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html sanitizeHtml(candidate.stem)}
		</div>

		<!-- Options -->
		<div class="mb-6">
			<div class="mb-3 text-xs font-semibold uppercase tracking-wide text-base-content/60">
				Options
			</div>
			<div class="space-y-3">
				{#each candidate.options as option, optIndex (optIndex)}
					{@const correct = candidate.correctAnswers.includes(option)}
					<div
						class="flex items-center rounded-full border-2 p-2 transition-colors {correct
							? 'border-success bg-success/5'
							: 'border-base-300 bg-base-200'}"
					>
						<span
							class="ms-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border {correct
								? 'border-success bg-success text-success-content'
								: 'border-base-300'}"
						>
							{#if correct}<Check size={12} />{/if}
						</span>
						<span class="ml-3 grow break-words text-sm">
							<span class="mr-2 select-none font-semibold"
								>{String.fromCharCode(65 + optIndex)}.</span
							>
							<span class="tiptap-content">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html sanitizeHtml(option)}
							</span>
						</span>
						{#if correct}
							<span class="mr-3 shrink-0 text-xs font-medium text-success">✓ Correct</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Rationale -->
		<div class="mb-6">
			<div class="mb-3 text-xs font-semibold uppercase tracking-wide text-base-content/60">
				Rationale
			</div>
			<div class="rounded-2xl border border-base-300 bg-base-200/30 p-4">
				<p class="text-sm leading-relaxed text-base-content/80">{candidate.rationale}</p>
			</div>
		</div>

		{#if candidate.duplicateRisk !== 'low'}
			<div
				class="mb-2 flex items-start gap-2 rounded-2xl border border-warning/30 bg-warning/10 p-3"
			>
				<CircleAlert size={15} class="mt-0.5 shrink-0 text-warning" />
				<p class="text-xs leading-relaxed text-base-content/70">
					{#if candidate.similarQuestionIds.length > 0}
						Similar to existing questions: {candidate.similarQuestionIds.join(', ')}.
					{:else}
						Review wording for overlap with existing questions.
					{/if}
				</p>
			</div>
		{/if}

		<div class="mt-6 border-t border-base-200 pt-4 text-xs text-base-content/40">
			Drafted by {candidate.metadata.model} · topic “{candidate.topicTitle}”
		</div>
	</div>

	<!-- Footer action -->
	<div class="shrink-0 border-t border-base-300 p-3">
		<button
			class="btn btn-sm w-full gap-2 rounded-full {isIncluded
				? 'btn-primary'
				: 'btn-ghost border border-base-300'}"
			onclick={onToggleInclude}
		>
			{#if isIncluded}
				<Check size={15} />
				Included in save
			{:else}
				<Plus size={15} />
				Include in save
			{/if}
		</button>
	</div>
</div>
