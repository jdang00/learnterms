<script lang="ts">
	import { BookmarkCheck, ChartPie, Eye, EyeOff, Flag, ListRestart } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { cameFrom } from '$lib/utils/backNavigation';
	import { hasRationale } from '$lib/utils/rationale';
	import type { Doc } from '../../convex/_generated/dataModel';
	import MobileStudyBar from './MobileStudyBar.svelte';
	import ProgressRing from './ProgressRing.svelte';
	import QuestionNavigatorSheet, { type NavigatorItem } from './QuestionNavigatorSheet.svelte';
	import QuizToolsBar from './quiz-dock/QuizToolsBar.svelte';

	let { module, qs, classId, handleSelect, handleFilterToggle } = $props();
	let navigatorOpen = $state(false);

	const summary = $derived(qs.getCompletionSummary());
	const statusById = $derived(
		new Map<string, NavigatorItem['status']>(
			summary.results.map((result: { questionId: string; status: NavigatorItem['status'] }) => [
				result.questionId,
				result.status
			])
		)
	);
	const filtered: Doc<'question'>[] = $derived(qs.getFilteredQuestions());
	const items: NavigatorItem[] = $derived(
		filtered.map((question) => {
			const status = statusById.get(question._id) ?? 'unanswered';
			return {
				id: question._id,
				status:
					status === 'unanswered' && qs.liveInteractedQuestions.includes(question._id)
						? 'answered'
						: status,
				flagged: qs.liveFlaggedQuestions.includes(question._id)
			};
		})
	);
	const position = $derived(Math.min(qs.currentQuestionIndex + 1, filtered.length));
	const subtitle = $derived(
		!filtered.length
			? 'No questions'
			: qs.showFlagged
				? `${position} of ${filtered.length} flagged`
				: qs.showIncomplete
					? `${position} of ${filtered.length} unanswered`
					: `Question ${position} of ${filtered.length}`
	);
	const ringPercent = (n: number) => (summary.total ? Math.round((n / summary.total) * 100) : 0);

	type Filter = 'all' | 'flagged' | 'incomplete';
	const activeFilter: Filter = $derived(
		qs.showFlagged ? 'flagged' : qs.showIncomplete ? 'incomplete' : 'all'
	);

	async function setFilter(next: Filter) {
		if (next === activeFilter) return;
		if (qs.showFlagged) await handleFilterToggle('flagged');
		if (qs.showIncomplete) await handleFilterToggle('incomplete');
		if (next !== 'all') await handleFilterToggle(next);
	}

	// The phone version of the sidebar's eye: reveal the answer, then read why.
	const canShowRationale = $derived(hasRationale(qs.getCurrentFilteredQuestion()));
	function showRationale() {
		if (!qs.showSolution) qs.handleSolution();
		else if (!canShowRationale) {
			qs.handleSolution();
			return;
		}
		if (canShowRationale) qs.isModalOpen = true;
	}

	async function goToModuleSelection() {
		if (cameFrom('/classes')) history.back();
		else await goto(resolve('/classes'), { state: { classId } });
	}
</script>

<MobileStudyBar
	title={module.data?.title ?? 'Study module'}
	emoji={module.data?.emoji || '📘'}
	{subtitle}
	backLabel="Back to modules"
	onback={goToModuleSelection}
	onnavigate={() => (navigatorOpen = true)}
>
	{#snippet trailing()}
		<button
			type="button"
			class="grid size-11 shrink-0 place-items-center rounded-full active:bg-base-200"
			aria-label="Progress overview: {summary.answered} of {summary.total} answered"
			onclick={() => qs.openCompletion()}
		>
			<ProgressRing
				correct={ringPercent(summary.correct)}
				review={ringPercent(summary.incorrect)}
				label={summary.completion}
				size="size-10"
			/>
		</button>
	{/snippet}
	{#snippet tools()}
		<button
			type="button"
			class="btn btn-ghost btn-circle size-11 shrink-0 {qs.showSolution
				? 'text-success'
				: 'text-base-content/70'}"
			aria-label={canShowRationale
				? qs.showSolution
					? 'Show rationale'
					: 'Reveal answer and rationale'
				: qs.showSolution
					? 'Hide answer'
					: 'Reveal answer'}
			onclick={showRationale}
		>
			{#if qs.showSolution && !canShowRationale}<EyeOff size={20} />{:else}<Eye size={20} />{/if}
		</button>
		<QuizToolsBar variant="sheet" />
	{/snippet}
</MobileStudyBar>

<QuestionNavigatorSheet
	bind:open={navigatorOpen}
	title={module.data?.title ?? 'Questions'}
	description="{summary.answered} of {summary.total} answered"
	{items}
	currentIndex={qs.currentQuestionIndex}
	onselect={(index) => {
		const question = filtered[index];
		if (question) void handleSelect(question);
	}}
>
	{#snippet filters()}
		{@const flaggedCount = qs.liveFlaggedQuestions.length}
		<button
			type="button"
			class="btn btn-sm min-h-10 shrink-0 rounded-full {activeFilter === 'all'
				? 'btn-neutral'
				: 'btn-ghost bg-base-200'}"
			aria-pressed={activeFilter === 'all'}
			onclick={() => setFilter('all')}>All {summary.total}</button
		>
		<button
			type="button"
			class="btn btn-sm min-h-10 shrink-0 rounded-full {activeFilter === 'flagged'
				? 'btn-warning'
				: 'btn-ghost bg-base-200'}"
			aria-pressed={activeFilter === 'flagged'}
			disabled={!flaggedCount && activeFilter !== 'flagged'}
			onclick={() => setFilter('flagged')}><Flag size={14} /> Flagged {flaggedCount}</button
		>
		<button
			type="button"
			class="btn btn-sm min-h-10 shrink-0 rounded-full {activeFilter === 'incomplete'
				? 'btn-primary'
				: 'btn-ghost bg-base-200'}"
			aria-pressed={activeFilter === 'incomplete'}
			disabled={!summary.unanswered && activeFilter !== 'incomplete'}
			onclick={() => setFilter('incomplete')}
			><BookmarkCheck size={14} /> Unanswered {summary.unanswered}</button
		>
	{/snippet}
	{#snippet footer()}
		<div class="flex gap-2">
			<button
				type="button"
				class="btn btn-ghost min-h-11 flex-1 rounded-full"
				onclick={() => {
					navigatorOpen = false;
					qs.openCompletion();
				}}><ChartPie size={16} /> Progress overview</button
			>
			<button
				type="button"
				class="btn btn-ghost min-h-11 flex-1 rounded-full text-error"
				onclick={() => {
					navigatorOpen = false;
					qs.isResetModalOpen = true;
				}}><ListRestart size={16} /> Reset module</button
			>
		</div>
	{/snippet}
</QuestionNavigatorSheet>
