<script lang="ts">
	import {
		CircleCheck,
		CircleHelp,
		Copy,
		ExternalLink,
		FileText,
		LoaderCircle,
		ShieldAlert,
		ShieldCheck,
		Target,
		Wand2
	} from 'lucide-svelte';
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
	}

	let { candidate, index, review, objective = '' }: Props = $props();

	const client = useConvexClient();
	let openingCitationId = $state<string | null>(null);
	let evidenceError = $state('');

	const citations = $derived(candidate.sourceCitations ?? []);
	const weakSource = $derived(review?.sourceSupport === 'weak');
	const unclearAnswer = $derived(review?.answerQuality === 'ambiguous');
	const overlaps = $derived(candidate.duplicateRisk !== 'low');
	const flagged = $derived(weakSource || unclearAnswer || overlaps);
	const warning = $derived.by(() => {
		if (overlaps)
			return candidate.similarQuestionIds.length > 0
				? `Overlaps existing questions: ${candidate.similarQuestionIds.join(', ')}.`
				: 'Check the wording for overlap with existing questions.';
		if (weakSource || unclearAnswer) return review?.reasons[0] ?? '';
		return '';
	});
	const intent = $derived(
		[
			`Planned as a ${questionTypeLabel(candidate.questionType)} question on ${candidate.topicTitle}`,
			objective
		]
			.filter(Boolean)
			.join(' — ')
	);

	async function openEvidence(citationId: string, pageNumber: number) {
		evidenceError = '';
		const sourceWindow = window.open('about:blank', '_blank');
		if (!sourceWindow) {
			evidenceError = 'Allow pop-ups to open the source PDF.';
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
			evidenceError = error instanceof Error ? error.message : 'Unable to open the source PDF.';
		} finally {
			openingCitationId = null;
		}
	}
</script>

<div class="shrink-0 border-t border-base-300 bg-base-100 px-4 py-2">
	<div class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
		{#each citations as citation, citationIndex (`${citation.citationId}:${citationIndex}`)}
			<div
				class="tooltip tooltip-top tooltip-start"
				data-tip={citation.quote || `Open the source PDF at page ${citation.pageNumber}`}
			>
				<button
					type="button"
					class="btn btn-ghost btn-xs gap-1 rounded-full border border-base-300 font-normal text-base-content/65"
					disabled={openingCitationId !== null}
					onclick={() => openEvidence(citation.citationId, citation.pageNumber)}
				>
					{#if openingCitationId === citation.citationId}
						<LoaderCircle size={11} class="animate-spin" />
					{:else}
						<FileText size={11} />
					{/if}
					p. {citation.pageNumber}
					<ExternalLink size={9} class="text-base-content/30" />
				</button>
			</div>
		{:else}
			<span class="text-xs text-base-content/35">No source excerpt attached</span>
		{/each}

		<div class="ml-auto flex items-center gap-1.5 pr-1">
			{#if intent}
				<div class="tooltip tooltip-top tooltip-end" data-tip={intent}>
					<Target size={14} class="text-base-content/30" />
				</div>
			{/if}
			{#if review?.revisedStem}
				<div class="tooltip tooltip-top tooltip-end" data-tip="The reviewer rewrote this question">
					<Wand2 size={14} class="text-base-content/40" />
				</div>
			{/if}
			<div
				class="tooltip tooltip-top tooltip-end"
				data-tip="Source support: {review?.sourceSupport ?? 'not checked'}"
			>
				{#if weakSource}
					<ShieldAlert size={14} class="text-error" />
				{:else}
					<ShieldCheck
						size={14}
						class={review?.sourceSupport === 'strong' ? 'text-success' : 'text-warning'}
					/>
				{/if}
			</div>
			<div
				class="tooltip tooltip-top tooltip-end"
				data-tip="Answer: {review?.answerQuality ?? 'not checked'}"
			>
				{#if unclearAnswer}
					<CircleHelp size={14} class="text-warning" />
				{:else}
					<CircleCheck
						size={14}
						class={review?.answerQuality === 'clear' ? 'text-success' : 'text-base-content/30'}
					/>
				{/if}
			</div>
			<div
				class="tooltip tooltip-top tooltip-end"
				data-tip="Overlap: {candidate.duplicateRisk} risk"
			>
				<Copy
					size={14}
					class={candidate.duplicateRisk === 'high'
						? 'text-error'
						: candidate.duplicateRisk === 'medium'
							? 'text-warning'
							: 'text-success'}
				/>
			</div>
		</div>
	</div>

	{#if flagged && warning}
		<p class="mt-2 text-xs leading-relaxed text-warning">{warning}</p>
	{/if}
	{#if evidenceError}
		<p class="mt-2 text-xs text-error" role="alert">{evidenceError}</p>
	{/if}
</div>
