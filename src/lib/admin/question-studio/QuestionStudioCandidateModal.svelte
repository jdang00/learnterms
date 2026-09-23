<script lang="ts">
	import QuestionStudioCandidateInspector from './QuestionStudioCandidateInspector.svelte';
	import { acceptedReviews, objectiveForCandidate } from './questionStudioRun';
	import type { AgentJob, CandidateReview } from './questionStudioRun';
	import type { CandidateQuestion } from './questionStudioTypes';

	interface Props {
		candidates: CandidateQuestion[];
		job?: AgentJob | null;
		reviews?: CandidateReview[];
		savedIndexes?: Set<number>;
		canEdit?: boolean;
		editing?: boolean;
		onEditingChange?: (editing: boolean) => void;
		selectedCandidateIndexes: Set<number>;
		selectedCandidateIndex?: number | null;
		onToggleCandidate: (index: number) => void;
		onNavigateCandidate: (direction: 'prev' | 'next') => void;
	}

	let {
		candidates,
		job = null,
		reviews = [],
		savedIndexes = new Set<number>(),
		canEdit = false,
		editing = false,
		onEditingChange,
		selectedCandidateIndexes,
		selectedCandidateIndex = $bindable<number | null>(null),
		onToggleCandidate,
		onNavigateCandidate
	}: Props = $props();

	const keptReviews = $derived(acceptedReviews(reviews));
</script>

{#if selectedCandidateIndex !== null && candidates[selectedCandidateIndex]}
	<div class="modal modal-open">
		<div class="modal-box max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl p-0">
			<div class="flex h-[85vh] flex-col">
				<QuestionStudioCandidateInspector
					{canEdit}
					{onEditingChange}
					candidate={candidates[selectedCandidateIndex]}
					index={selectedCandidateIndex}
					total={candidates.length}
					variant="mobile"
					isIncluded={selectedCandidateIndexes.has(selectedCandidateIndex)}
					isSaved={savedIndexes.has(selectedCandidateIndex)}
					review={keptReviews[selectedCandidateIndex]}
					objective={objectiveForCandidate(job, candidates[selectedCandidateIndex])}
					onToggleInclude={() => onToggleCandidate(selectedCandidateIndex!)}
					onPrev={() => onNavigateCandidate('prev')}
					onNext={() => onNavigateCandidate('next')}
					onClose={() => {
						if (!editing) selectedCandidateIndex = null;
					}}
				/>
			</div>
		</div>
		<button
			type="button"
			class="modal-backdrop bg-black/50"
			aria-label="Close candidate"
			disabled={editing}
			onclick={() => (selectedCandidateIndex = null)}
		></button>
	</div>
{/if}
