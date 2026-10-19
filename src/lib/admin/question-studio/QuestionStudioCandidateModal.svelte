<script lang="ts">
	import QuestionStudioCandidateInspector from './QuestionStudioCandidateInspector.svelte';
	import { acceptedReviews, objectiveForCandidate } from './questionStudioRun';
	import type { AgentJob, CandidateReview } from './questionStudioRun';
	import type { CandidateQuestion } from './questionStudioTypes';
	import * as Dialog from '$lib/components/ui/dialog';
	import { MediaQuery } from 'svelte/reactivity';

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
	// From lg up the inspector sits inline, so this sheet only opens below that.
	const isDesktop = new MediaQuery('(min-width: 1024px)');
	const isOpen = $derived(
		!isDesktop.current &&
			selectedCandidateIndex !== null &&
			Boolean(candidates[selectedCandidateIndex])
	);
</script>

<Dialog.Root
	open={isOpen}
	onOpenChange={(open) => {
		if (!open && !editing) selectedCandidateIndex = null;
	}}
>
	<Dialog.Content
		class="max-h-[90vh] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl"
		showCloseButton={false}
	>
		<Dialog.Title class="sr-only">Question draft</Dialog.Title>
		{#if selectedCandidateIndex !== null && candidates[selectedCandidateIndex]}
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
		{/if}
	</Dialog.Content>
</Dialog.Root>
