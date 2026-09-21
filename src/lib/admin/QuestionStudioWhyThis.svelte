<script lang="ts">
	import { FileText, LoaderCircle } from 'lucide-svelte';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import { getPostHog } from '$lib/analytics/posthogClient';
	import { questionTypeLabel } from './questionStudioTypes';
	import type { CandidateQuestion } from './questionStudioTypes';
	import type { CandidateReview } from './questionStudioRun';

	interface Props {
		candidate: CandidateQuestion;
		index: number;
		review?: CandidateReview;
		objective?: string;
		compact?: boolean;
	}

	let { candidate, index, review, objective = '', compact = false }: Props = $props();

	const client = useConvexClient();
	let openingCitationId = $state<string | null>(null);
	let evidenceError = $state('');

	const citations = $derived(candidate.sourceCitations ?? []);
	const checks = $derived(
		candidate.metadata.reviewMode === 'local'
			? 'Quotes and answer structure checked. Verify the answer and distractors before publishing; no separate AI review was run.'
			: [
					review &&
						{
							strong: 'Well supported by the document.',
							partial: 'Partly supported by the document.',
							weak: 'Weakly supported by the document.'
						}[review.sourceSupport],
					review &&
						(review.answerQuality === 'clear'
							? 'The answer is clear.'
							: 'More than one option could be read as correct.'),
					{
						low: 'No overlap with existing questions.',
						medium: 'May overlap with an existing question.',
						high: 'Likely repeats an existing question.'
					}[candidate.duplicateRisk],
					review?.revisedStem && 'The reviewer rewrote the wording.'
				]
					.filter(Boolean)
					.join(' ')
	);
	const intent = $derived(
		[
			`Planned as a ${questionTypeLabel(candidate.questionType).toLowerCase()} question on ${candidate.topicTitle}.`,
			objective
		]
			.filter(Boolean)
			.join(' ')
	);

	async function openEvidence(citationId: string, pageNumber: number) {
		evidenceError = '';
		const sourceWindow = window.open('about:blank', '_blank');
		if (!sourceWindow) {
			evidenceError = 'Allow pop-ups to open the document.';
			return;
		}
		sourceWindow.opener = null;
		openingCitationId = citationId;

		try {
			const signedUrl = await client.query(api.r2Documents.getDocumentUrl, {
				documentId: candidate.metadata.sourceDocumentId
			});
			const sourceUrl = `${signedUrl.split('#')[0]}#page=${Math.max(1, Math.floor(pageNumber))}`;
			sourceWindow.location.replace(sourceUrl);
			void getPostHog().then((posthog) =>
				posthog?.capture('question_generation_evidence_opened', {
					job_id: candidate.metadata.jobId,
					candidate_index: index,
					page_number: pageNumber,
					harness_version: candidate.metadata.harnessVersion
				})
			);
		} catch (error) {
			sourceWindow.close();
			evidenceError = error instanceof Error ? error.message : 'Unable to open the document.';
		} finally {
			openingCitationId = null;
		}
	}
</script>

<section class="border-t border-base-300 {compact ? 'pt-4' : 'pt-6'}">
	<h3 class="mb-2 text-sm font-semibold">Why this question</h3>
	<div class="space-y-2 text-sm leading-relaxed text-base-content/70">
		<p>{intent}</p>
		{#if checks}<p>{checks}</p>{/if}
		<div class="flex flex-wrap items-center gap-1.5">
			{#if citations.length}
				<span>From</span>
				{#each citations as citation, citationIndex (`${citation.citationId}:${citationIndex}`)}
					<button
						type="button"
						class="btn btn-ghost btn-xs gap-1 rounded-full border border-base-300 font-normal"
						title={citation.quote || `Open the document at page ${citation.pageNumber}`}
						disabled={openingCitationId !== null}
						onclick={() => openEvidence(citation.citationId, citation.pageNumber)}
					>
						{#if openingCitationId === citation.citationId}
							<LoaderCircle size={11} class="animate-spin" />
						{:else}
							<FileText size={11} />
						{/if}
						page {citation.pageNumber}
					</button>
				{/each}
			{:else}
				<span class="text-base-content/45">No page reference was attached.</span>
			{/if}
		</div>
		{#if evidenceError}
			<p class="text-xs text-error" role="alert">{evidenceError}</p>
		{/if}
	</div>
</section>
