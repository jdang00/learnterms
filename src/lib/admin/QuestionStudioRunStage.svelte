<script lang="ts">
	import { MousePointerClick, RotateCcw, Save } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import { fade } from 'svelte/transition';
	import ShimmerText from '$lib/components/ShimmerText.svelte';
	import QuestionStudioCandidateCard from './QuestionStudioCandidateCard.svelte';
	import QuestionStudioCandidateInspector from './QuestionStudioCandidateInspector.svelte';
	import QuestionStudioSlotRow from './QuestionStudioSlotRow.svelte';
	import { objectiveForCandidate } from './questionStudioRun';
	import type { AgentJob, CandidateReview, RunRow } from './questionStudioRun';
	import type { CandidateQuestion } from './questionStudioTypes';

	interface Props {
		job?: AgentJob | null;
		rows: RunRow[];
		candidates: CandidateQuestion[];
		reviews: CandidateReview[];
		selectedCandidateIndexes: Set<number>;
		savedIndexes: Set<number>;
		displayIndex: number | null;
		canEdit?: boolean;
		editing?: boolean;
		isSaving: boolean;
		isReady: boolean;
		moduleTitle: string;
		savedDraftsLink: { classId: string; moduleId: string; query: string } | null;
		onEditingChange?: (editing: boolean) => void;
		onSelectCandidate: (index: number) => void;
		onToggleCandidate: (index: number) => void;
		onSelectAllCandidates: (selected: boolean) => void;
		onSaveSelected: () => void;
		onStartNewRun: () => void;
		onNavigateCandidate: (direction: 'prev' | 'next') => void;
	}

	let {
		job = null,
		rows,
		candidates,
		reviews,
		selectedCandidateIndexes,
		savedIndexes,
		displayIndex,
		canEdit = false,
		editing = false,
		isSaving,
		isReady,
		moduleTitle,
		savedDraftsLink,
		onEditingChange,
		onSelectCandidate,
		onToggleCandidate,
		onSelectAllCandidates,
		onSaveSelected,
		onStartNewRun,
		onNavigateCandidate
	}: Props = $props();

	const keptReviews = $derived(reviews.filter((review) => review.verdict !== 'reject'));
	const selectableCount = $derived(candidates.length - savedIndexes.size);
	const selectedCount = $derived(
		[...selectedCandidateIndexes].filter((index) => !savedIndexes.has(index)).length
	);
	const activeCandidate = $derived(displayIndex !== null ? candidates[displayIndex] : undefined);
	// Nothing left to commit — the run is done, so the way forward is a fresh one.
	const runFinished = $derived(
		!isSaving && selectableCount === 0 && (isReady || candidates.length === 0)
	);
</script>

<div class="flex h-full min-h-0 flex-col gap-3">
	<div class="grid min-h-0 flex-1 gap-3 lg:grid-cols-12">
		<!-- Question list -->
		<aside
			class="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xs lg:col-span-5 xl:col-span-4"
		>
			<div class="flex shrink-0 items-center gap-2 border-b border-base-300 px-3 py-2">
				<h2 class="text-sm font-semibold">Questions</h2>
				<span class="text-xs text-base-content/45">
					{selectedCount} of {selectableCount} selected
				</span>
				<div class="ml-auto flex items-center gap-0.5">
					<button
						class="btn btn-ghost btn-xs rounded-full"
						disabled={editing || isSaving || selectableCount === 0}
						onclick={() => onSelectAllCandidates(true)}
					>
						All
					</button>
					<button
						class="btn btn-ghost btn-xs rounded-full"
						disabled={editing || isSaving || selectedCount === 0}
						onclick={() => onSelectAllCandidates(false)}
					>
						None
					</button>
				</div>
			</div>

			<div class="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2" inert={editing || isSaving}>
				{#each rows as row, rowIndex (row.key)}
					{#if row.kind === 'candidate'}
						<div in:fade={{ duration: 180 }}>
							<QuestionStudioCandidateCard
								candidate={row.candidate}
								index={row.index}
								isActive={displayIndex === row.index}
								isIncluded={selectedCandidateIndexes.has(row.index)}
								isSaved={row.saved}
								review={row.review}
								onSelect={() => onSelectCandidate(row.index)}
								onToggleInclude={() => onToggleCandidate(row.index)}
							/>
						</div>
					{:else if row.kind === 'pending'}
						<QuestionStudioSlotRow
							slot={row.slot}
							index={rowIndex}
							variant="pending"
							writing={row.writing}
						/>
					{:else}
						<QuestionStudioSlotRow
							slot={row.slot}
							index={rowIndex}
							variant="cut"
							reason={row.reason}
						/>
					{/if}
				{/each}
			</div>
		</aside>

		<!-- Inspector -->
		<section
			class="hidden min-h-0 overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xs lg:col-span-7 lg:flex xl:col-span-8"
		>
			{#if activeCandidate && displayIndex !== null}
				<QuestionStudioCandidateInspector
					{canEdit}
					{onEditingChange}
					candidate={activeCandidate}
					index={displayIndex}
					total={candidates.length}
					isIncluded={selectedCandidateIndexes.has(displayIndex)}
					isSaved={savedIndexes.has(displayIndex)}
					review={keptReviews[displayIndex]}
					objective={objectiveForCandidate(job, activeCandidate)}
					onToggleInclude={() => onToggleCandidate(displayIndex)}
					onPrev={() => onNavigateCandidate('prev')}
					onNext={() => onNavigateCandidate('next')}
				/>
			{:else}
				<div class="flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center">
					<span
						class="flex h-10 w-10 items-center justify-center rounded-full bg-base-200 text-base-content/35"
					>
						<MousePointerClick size={18} />
					</span>
					<p class="max-w-56 text-sm text-base-content/45">
						Pick a question to read it here while the rest are written.
					</p>
				</div>
			{/if}
		</section>
	</div>

	<!-- Commit bar -->
	<div
		class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-base-300 bg-base-100 px-3 py-2 shadow-xs"
	>
		{#if editing}
			<p class="text-xs text-base-content/55">Apply or cancel this edit to keep saving drafts.</p>
		{:else}
			<p class="text-xs text-base-content/55">
				{#if savedIndexes.size > 0}
					<span class="font-medium text-success">{savedIndexes.size} saved</span>
					to {moduleTitle} — publish {savedIndexes.size === 1 ? 'it' : 'them'} from the module when ready.
				{:else}
					Drafts stay private until you publish them from the module.
				{/if}
			</p>
			<p class="hidden items-center gap-1 text-xs text-base-content/35 sm:flex">
				<kbd class="kbd kbd-xs">↑</kbd>
				<kbd class="kbd kbd-xs">↓</kbd> browse ·
				<kbd class="kbd kbd-xs">space</kbd> select
			</p>
			<div class="ml-auto flex items-center gap-2">
				{#if savedDraftsLink}
					<a
						class="btn btn-ghost btn-sm rounded-full"
						href="{resolve('/admin/[classId]/module/[moduleId]', {
							classId: savedDraftsLink.classId,
							moduleId: savedDraftsLink.moduleId
						})}?{savedDraftsLink.query}"
					>
						Open module
					</a>
				{/if}
				{#if runFinished}
					<button class="btn btn-primary btn-sm gap-1.5 rounded-full" onclick={onStartNewRun}>
						<RotateCcw size={14} />
						Start a new run
					</button>
				{:else}
					<button
						class="btn btn-primary btn-sm gap-1.5 rounded-full"
						disabled={selectedCount === 0 || isSaving || !isReady}
						onclick={onSaveSelected}
					>
						<Save size={14} />
						{#if isSaving}
							<ShimmerText text="Saving…" class="font-medium" />
						{:else}
							Save {selectedCount} draft{selectedCount === 1 ? '' : 's'}
						{/if}
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>
