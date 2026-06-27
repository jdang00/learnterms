<script lang="ts">
	import QuestionStudioCandidateInspector from './QuestionStudioCandidateInspector.svelte';
	import type { CandidateQuestion } from './questionStudioTypes';

	interface Props {
		candidates: CandidateQuestion[];
		selectedCandidateIndexes: Set<number>;
		selectedCandidateIndex?: number | null;
		onToggleCandidate: (index: number) => void;
		onNavigateCandidate: (direction: 'prev' | 'next') => void;
	}

	let {
		candidates,
		selectedCandidateIndexes,
		selectedCandidateIndex = $bindable<number | null>(null),
		onToggleCandidate,
		onNavigateCandidate
	}: Props = $props();
</script>

{#if selectedCandidateIndex !== null && candidates[selectedCandidateIndex]}
	<div class="modal modal-open">
		<div class="modal-box max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl p-0">
			<div class="flex h-[85vh] flex-col">
				<QuestionStudioCandidateInspector
					candidate={candidates[selectedCandidateIndex]}
					index={selectedCandidateIndex}
					total={candidates.length}
					isIncluded={selectedCandidateIndexes.has(selectedCandidateIndex)}
					onToggleInclude={() => onToggleCandidate(selectedCandidateIndex!)}
					onPrev={() => onNavigateCandidate('prev')}
					onNext={() => onNavigateCandidate('next')}
					onClose={() => (selectedCandidateIndex = null)}
				/>
			</div>
		</div>
		<button
			type="button"
			class="modal-backdrop bg-black/50"
			aria-label="Close candidate"
			onclick={() => (selectedCandidateIndex = null)}
		></button>
	</div>
{/if}
