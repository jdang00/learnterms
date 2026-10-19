<script lang="ts">
	import QuestionSources from '#lib/components/QuestionSources.svelte';
	import ExamFindings from '#lib/components/exam-findings/ExamFindings.svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { formatClock } from '#lib/utils/format.js';
	import { getRationale, hasRationale } from '#lib/utils/rationale.js';
	import { sanitizeHtml } from '#lib/utils/sanitizeHtml.js';
	import Clock from '@lucide/svelte/icons/clock';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import MinusCircle from '@lucide/svelte/icons/minus-circle';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import {
		isFitb,
		isMatching,
		isSkippedItem,
		matchingReviewRows,
		matchingReviewStats,
		multiSelectAnalysis
	} from './results';
	import type { ReviewState } from './review.svelte';

	let { review }: { review: ReviewState } = $props();
</script>

{#if review.selectedItem}
	{@const selectedItem = review.selectedItem}
	<div class="text-md sm:text-lg lg:text-xl p-4 sm:pe-4">
		<div class="flex flex-row justify-between items-start mb-1">
			<div>
				<div class="text-xs text-foreground/40 font-medium">
					Question {review.selectedOriginalIndex + 1} of {review.reviewEntries.length}
					{#if review.reviewFilter !== 'all'}
						<span class="text-foreground/30 mx-1">·</span>
						<span>Filtered {review.selectedIndex + 1} of {review.filteredReviewEntries.length}</span
						>
					{/if}
					{#if selectedItem.moduleTitle}
						<span class="text-foreground/30 mx-1">·</span>
						<span>{selectedItem.moduleTitle}</span>
					{/if}
				</div>
				<div class="mt-1.5">
					<Badge
						variant="solid"
						size="sm"
						tone={isSkippedItem(selectedItem)
							? 'warning'
							: selectedItem.score?.isCorrect
								? 'success'
								: 'error'}
					>
						{isSkippedItem(selectedItem)
							? 'Skipped'
							: selectedItem.score?.isCorrect
								? 'Correct'
								: 'Incorrect'}
					</Badge>
					{#if selectedItem.response?.isFlagged}
						<Badge variant="solid" tone="warning" size="sm" class="ml-1">Flagged</Badge>
					{/if}
				</div>
			</div>
			<div class="text-xs text-foreground/40 flex items-center gap-1">
				<Clock size={12} />
				{formatClock(selectedItem.response?.timeSpentMs ?? 0)}
			</div>
		</div>

		<div class="text-base sm:text-xl leading-tight tiptap-content font-medium ms-2 mt-4">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html sanitizeHtml(selectedItem.question.stem)}
		</div>

		<ExamFindings
			findings={selectedItem.question.examFindings}
			compact={selectedItem.question.examFindingsStyle === 'compact'}
			class="ms-2"
		/>

		{#if isFitb(selectedItem.question.type)}
			<div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 ms-2">
				<div class="rounded-full border-2 border-border bg-muted p-3 px-6">
					<div class="text-xs text-foreground/40 mb-1">Your answer</div>
					<div class="font-medium text-sm">
						{selectedItem.response?.textResponse ||
							selectedItem.response?.selectedOptions?.[0] ||
							'No answer given'}
					</div>
				</div>
				<div class="rounded-full border-2 border-success/30 bg-success/5 p-3 px-6">
					<div class="text-xs text-foreground/40 mb-1">Correct answer</div>
					<div class="font-medium text-sm text-success-ink">
						{#each selectedItem.correctAnswerDisplay as ans, i (i)}
							{#if i > 0},
							{/if}{ans}
						{/each}
					</div>
				</div>
			</div>
		{:else if isMatching(selectedItem.question.type)}
			{@const rows = matchingReviewRows(selectedItem)}
			{@const stats = matchingReviewStats(selectedItem)}
			<div class="mt-5 ms-2 space-y-3">
				<div class="flex flex-wrap gap-2">
					<Badge variant="soft" size="md">
						Matched: {stats.correct}/{stats.total}
					</Badge>
					{#if stats.incorrect > 0}
						<Badge variant="soft" tone="error" size="md">
							Incorrect: {stats.incorrect}
						</Badge>
					{/if}
					{#if stats.unanswered > 0}
						<Badge variant="soft" tone="warning" size="md">
							Skipped: {stats.unanswered}
						</Badge>
					{/if}
				</div>

				{#if rows.length === 0}
					<div class="surface-sm p-4 text-sm text-foreground/50">
						No matching pairs found for this question.
					</div>
				{:else}
					<div class="surface-inset overflow-hidden divide-y divide-border/40">
						{#each rows as row (row.promptId)}
							<div
								class="flex items-start gap-2.5 px-3 py-2.5 {row.isCorrect
									? 'bg-success/[0.03]'
									: row.isAnswered
										? 'bg-error/[0.03]'
										: ''}"
							>
								<div class="pt-0.5 shrink-0">
									{#if row.isCorrect}
										<CheckCircle2 size={15} class="text-success" />
									{:else if row.isAnswered}
										<XCircle size={15} class="text-error" />
									{:else}
										<MinusCircle size={15} class="text-warning" />
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<div class="text-sm font-medium">{row.promptText}</div>
									{#if row.isCorrect}
										<div class="text-sm text-success-ink mt-0.5">
											{row.correctAnswerText}
										</div>
									{:else if row.isAnswered}
										<div class="text-sm text-error-ink line-through mt-0.5">
											{row.userAnswerText}
										</div>
										<div class="text-sm text-success-ink mt-0.5 flex items-center gap-1">
											<ArrowRight size={11} class="shrink-0 text-success/50" />
											{row.correctAnswerText}
										</div>
									{:else}
										<div class="text-sm text-warning-ink italic mt-0.5">No answer</div>
										<div class="text-sm text-success-ink mt-0.5 flex items-center gap-1">
											<ArrowRight size={11} class="shrink-0 text-success/50" />
											{row.correctAnswerText}
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			{@const mcqAnalysis = multiSelectAnalysis(selectedItem)}
			<div class="flex flex-wrap gap-2 mt-4 ms-2">
				<Badge variant="soft" size="md">
					Selected {selectedItem.response?.selectedOptions?.length ?? 0}
				</Badge>
				<Badge variant="soft" tone="success" size="md">
					Correct picks: {mcqAnalysis.correctlySelectedCount}
				</Badge>
				{#if mcqAnalysis.missedCorrectCount > 0}
					<Badge variant="soft" tone="warning" size="md">
						Missed correct: {mcqAnalysis.missedCorrectCount}
					</Badge>
				{/if}
				{#if mcqAnalysis.incorrectSelectedCount > 0}
					<Badge variant="soft" tone="error" size="md">
						Wrong picks: {mcqAnalysis.incorrectSelectedCount}
					</Badge>
				{/if}
				{#if !selectedItem.score?.isCorrect && mcqAnalysis.hasPartialCreditLikePattern}
					<Badge variant="soft" size="md">
						Partially correct selections (score still counted as incorrect)
					</Badge>
				{/if}
			</div>
			<div class="flex flex-col justify-start space-y-2 md:space-y-3 lg:space-y-4 mt-5">
				{#each selectedItem.question.options as option, i (option.id)}
					{@const selected = (selectedItem.response?.selectedOptions ?? []).includes(option.id)}
					{@const correct = (selectedItem.correctAnswerDisplay ?? []).includes(option.id)}
					<label
						class="rounded-full flex items-center transition-colors border-2 p-2 md:p-3
						{correct
							? 'border-success bg-success/5'
							: selected
								? 'border-error bg-error/5'
								: 'border-border bg-muted'}"
					>
						<Checkbox
							class="size-4 ms-4 disabled:opacity-100 {correct
								? 'border-success data-checked:border-success data-checked:bg-success data-checked:text-success-foreground'
								: selected
									? 'border-error data-checked:border-error data-checked:bg-error data-checked:text-error-foreground'
									: ''}"
							checked={selected}
							disabled
						/>
						<span class="grow text-wrap break-words ml-3 md:ml-4 my-3 text-sm md:text-base">
							<span class="font-semibold mr-2 select-none">{String.fromCharCode(65 + i)}.</span>
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							<span class="tiptap-content">{@html sanitizeHtml(option.text)}</span>
						</span>
						{#if correct}
							<Badge variant="soft" tone="success" size="sm" class="mr-4">Correct</Badge>
						{:else if selected}
							<Badge variant="soft" tone="error" size="sm" class="mr-4">Your pick</Badge>
						{/if}
					</label>
				{/each}
			</div>
		{/if}

		<!-- Rationale -->
		{#if hasRationale(selectedItem.question)}
			<Card.Root class="mt-6 ms-2 py-0 shadow-xl">
				<Card.Content class="p-8">
					<h3 class="text-base font-semibold">Rationale</h3>
					<div class="tiptap-content text-sm text-foreground/80">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html sanitizeHtml(getRationale(selectedItem.question))}
					</div>
					<QuestionSources source={selectedItem.question.source} />
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="surface-sm p-4 mt-6 ms-2">
				<div class="text-sm text-foreground/40">No rationale available for this question.</div>
			</div>
		{/if}
	</div>
{/if}
