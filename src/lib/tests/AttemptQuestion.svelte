<script lang="ts">
	import Matching from '#lib/components/Matching.svelte';
	import AnswerOptions from '#lib/components/AnswerOptions.svelte';
	import FillInTheBlank from '#lib/components/FillInTheBlank.svelte';
	import QuestionMediaStrip from '#lib/components/QuestionMediaStrip.svelte';
	import ExamFindings from '#lib/components/exam-findings/ExamFindings.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { sanitizeHtml } from '#lib/utils/sanitizeHtml.js';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Flag from '@lucide/svelte/icons/flag';
	import { isFitb, isMatching, type AttemptRunnerState } from './attempt.svelte';

	let { runner }: { runner: AttemptRunnerState } = $props();

	// Swipe the question sideways to move between questions on touch screens.
	let swipe: { x: number; y: number; time: number } | null = null;
	function swipeStart(event: TouchEvent) {
		const touch = event.touches[0];
		const target = event.target as Element;
		const nearEdge = touch.clientX < 24 || touch.clientX > window.innerWidth - 24;
		swipe =
			event.touches.length === 1 &&
			!nearEdge &&
			!target.closest('[data-option], input, textarea, [contenteditable], pre, table, button')
				? { x: touch.clientX, y: touch.clientY, time: event.timeStamp }
				: null;
	}
	function swipeEnd(event: TouchEvent) {
		if (!swipe) return;
		const touch = event.changedTouches[0];
		const dx = touch.clientX - swipe.x;
		const dy = touch.clientY - swipe.y;
		const quick = event.timeStamp - swipe.time < 600;
		swipe = null;
		if (!quick || Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.5) return;
		if (window.getSelection()?.toString()) return;
		if (dx < 0) runner.nextQuestion();
		else runner.previousQuestion();
	}
</script>

{#if runner.currentItem && runner.currentResponse}
	{@const currentItem = runner.currentItem}
	{@const currentResponse = runner.currentResponse}
	{@const fitb = isFitb(currentItem.question.type)}
	<!-- Swiping sideways is a shortcut for the previous/next buttons. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="sm:text-lg lg:text-xl p-3 sm:p-4" ontouchstart={swipeStart} ontouchend={swipeEnd}>
		<div class="hidden md:flex flex-row justify-between items-start mb-1">
			<div class="text-xs text-foreground/40 font-medium">
				Question {runner.currentIndex + 1} of {runner.itemCount}
			</div>
			<div class="flex items-center gap-2">
				<Button
					size="sm"
					shape="circle"
					tone="warning"
					variant={currentResponse.isFlagged ? 'solid' : 'soft'}
					onclick={() => runner.toggleFlag(currentItem)}
					aria-label={currentResponse.isFlagged ? 'Remove flag' : 'Flag for review'}
					title={currentResponse.isFlagged ? 'Remove flag' : 'Flag for review'}
				>
					<Flag size={16} />
				</Button>
			</div>
		</div>

		{#if !fitb}
			<div class="text-base sm:text-xl leading-tight tiptap-content font-medium ms-2 mt-3">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html sanitizeHtml(currentItem.question.stem)}
			</div>
		{/if}

		{#snippet examFindings()}
			<ExamFindings
				findings={currentItem.question.examFindings}
				compact={currentItem.question.examFindingsStyle === 'compact'}
				reveal={false}
				class="ms-2"
			/>
		{/snippet}
		{#if !fitb}
			{@render examFindings()}
		{/if}

		<QuestionMediaStrip questionId={currentItem.questionId} />

		{#if fitb}
			{#if runner.currentSharedQuestion}
				<FillInTheBlank
					qs={runner.uiAdapter}
					currentlySelected={runner.currentSharedQuestion}
					submitOnly={true}
					allowSolution={false}
					showAnswerPanel={false}
					showRevealHint={false}
					belowStem={examFindings}
				/>
			{/if}
		{:else if isMatching(currentItem.question.type)}
			<div class="mt-5 space-y-3 ms-2">
				<div class="text-xs text-foreground/50 font-medium">
					Match each prompt to one unique answer.
				</div>
				{#if runner.currentSharedQuestion}
					<Matching
						qs={runner.uiAdapter}
						currentlySelected={runner.currentSharedQuestion}
						allowSolution={false}
						allowClear={true}
					/>
				{/if}
			</div>
		{:else}
			<div class="text-foreground/60 font-medium text-base sm:text-lg leading-tight my-3 ms-2">
				Select {currentItem.question.correctAnswerCount ?? 'all that apply'}.
			</div>
			<div class="text-xs text-foreground/45 ms-2 mb-2">
				Selected {runner.selectedCountForCurrentItem()}
				{#if currentItem.question.correctAnswerCount}
					<span> / {currentItem.question.correctAnswerCount}</span>
				{/if}
			</div>
			{#if runner.currentSharedQuestion}
				<AnswerOptions
					qs={runner.uiAdapter}
					currentlySelected={runner.currentSharedQuestion}
					allowElimination={true}
				/>
			{/if}
		{/if}
	</div>

	{#if runner.submitError}
		<Alert.Root tone="error" class="mx-4 mt-2">
			<CircleAlert />
			<Alert.Title>{runner.submitError}</Alert.Title>
		</Alert.Root>
	{/if}
{/if}
