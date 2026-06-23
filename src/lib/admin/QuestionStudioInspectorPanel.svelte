<script lang="ts">
	import { Network, ShieldCheck } from 'lucide-svelte';
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '../../convex/_generated/api';
	import ShimmerText from '$lib/components/ShimmerText.svelte';
	import QuestionStudioAgentTimeline from './QuestionStudioAgentTimeline.svelte';
	import QuestionStudioCandidateInspector from './QuestionStudioCandidateInspector.svelte';
	import type { CandidateQuestion } from './questionStudioTypes';

	type AgentJob = NonNullable<FunctionReturnType<typeof api.questionStudio.getGenerationJob>>;

	interface Props {
		activeJob?: AgentJob | null;
		candidates: CandidateQuestion[];
		selectedCandidateIndexes: Set<number>;
		selectedCandidateIndex: number | null;
		hasStudioContext: boolean;
		topicsLength: number;
		onToggleCandidate: (index: number) => void;
		onNavigateCandidate: (direction: 'prev' | 'next') => void;
	}

	let {
		activeJob = null,
		candidates,
		selectedCandidateIndexes,
		selectedCandidateIndex,
		hasStudioContext,
		topicsLength,
		onToggleCandidate,
		onNavigateCandidate
	}: Props = $props();
</script>

<aside
	class="hidden min-h-0 flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xs xl:col-span-4 xl:flex"
>
	{#if selectedCandidateIndex !== null && candidates[selectedCandidateIndex]}
		<QuestionStudioCandidateInspector
			candidate={candidates[selectedCandidateIndex]}
			index={selectedCandidateIndex}
			total={candidates.length}
			isIncluded={selectedCandidateIndexes.has(selectedCandidateIndex)}
			onToggleInclude={() => onToggleCandidate(selectedCandidateIndex!)}
			onPrev={() => onNavigateCandidate('prev')}
			onNext={() => onNavigateCandidate('next')}
		/>
	{:else if activeJob}
		<QuestionStudioAgentTimeline job={activeJob} />
	{:else}
		<div class="flex h-full flex-col items-center justify-center p-8 text-center">
			{#if hasStudioContext && topicsLength === 0}
				<span
					class="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary"
				>
					<Network size={24} />
				</span>
				<ShimmerText text="Reading source notes…" tone="primary" class="text-sm font-medium" />
			{:else}
				<span
					class="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-base-200 text-base-content/40"
				>
					<ShieldCheck size={24} />
				</span>
				<h3 class="text-sm font-semibold">Nothing to review yet</h3>
				<p class="mt-1 max-w-[15rem] text-xs text-base-content/55">
					The agent's live reasoning and each drafted question land here. Select a candidate to open
					it in full.
				</p>
			{/if}
		</div>
	{/if}
</aside>
