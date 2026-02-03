<script lang="ts">
	import type { Id } from '../../convex/_generated/dataModel';
	import { Flag, Shuffle, ArrowRight, ArrowLeft } from 'lucide-svelte';
	import { Confetti } from 'svelte-confetti';
	import { QUESTION_TYPES } from '$lib/utils/questionType';
	import posthog from 'posthog-js';
	import { browser } from '$app/environment';

	let { qs = $bindable(), currentlySelected, classId }: { qs: any; currentlySelected: any; classId: Id<'class'> } = $props();
	let showConfetti = $state(false);

	$effect(() => {
		if (qs.checkResult === 'Correct!') {
			showConfetti = false;
			requestAnimationFrame(() => {
				showConfetti = true;
				setTimeout(() => (showConfetti = false), 1200);
			});
		}
	});

	function handleCheck() {
		if (currentlySelected) {
			const selectedAnswers = [...qs.selectedAnswers];
			const eliminatedOptions = [...qs.eliminatedAnswers];
			const correctAnswers = currentlySelected.correctAnswers || [];
			let isCorrect = false;

			if (currentlySelected.type === QUESTION_TYPES.FILL_IN_THE_BLANK) {
				const text = selectedAnswers[0] || '';
				qs.checkFillInTheBlank(text, currentlySelected);
				// For FITB, checkResult is set async via setTimeout, so defer tracking
				if (browser) {
					setTimeout(() => {
						posthog.capture('question_answered', {
							questionId: currentlySelected._id,
							moduleId: currentlySelected.moduleId,
							classId: classId,
							questionType: currentlySelected.type,
							selectedOptions: selectedAnswers,
							eliminatedOptions: eliminatedOptions,
							isCorrect: qs.checkResult === 'Correct!'
						});
					}, 1);
				}
			} else if (currentlySelected.type === QUESTION_TYPES.MATCHING) {
				qs.checkMatching(currentlySelected);
				// For matching, compare arrays
				isCorrect = correctAnswers.length === selectedAnswers.length &&
					correctAnswers.every((answer: string) => selectedAnswers.includes(answer));
				trackQuestionAnswered(selectedAnswers, eliminatedOptions, isCorrect);
			} else {
				// Multiple choice - compare sorted arrays
				const sortedCorrect = [...correctAnswers].sort();
				const sortedSelected = [...selectedAnswers].sort();
				isCorrect = sortedCorrect.length === sortedSelected.length &&
					sortedCorrect.every((answer: string, index: number) => answer === sortedSelected[index]);
				qs.checkAnswer(correctAnswers, selectedAnswers);
				trackQuestionAnswered(selectedAnswers, eliminatedOptions, isCorrect);
			}
		}
		qs.scheduleSave?.();
	}

	function trackQuestionAnswered(selectedAnswers: string[], eliminatedOptions: string[], isCorrect: boolean) {
		if (browser && currentlySelected) {
			posthog.capture('question_answered', {
				questionId: currentlySelected._id,
				moduleId: currentlySelected.moduleId,
				classId: classId,
				questionType: currentlySelected.type,
				selectedOptions: selectedAnswers,
				eliminatedOptions: eliminatedOptions,
				isCorrect: isCorrect
			});
		}
	}

	async function handleClear() {
		qs.selectedAnswers = [];
		qs.eliminatedAnswers = [];
		qs.checkResult = '';
		qs.scheduleSave?.();
	}

	async function handleFlag() {
		qs.toggleFlag();
		qs.scheduleSave?.();
	}

	async function handleNext() {
		await qs.goToNextQuestion();
		qs.scheduleSave?.();
	}

	async function handlePrevious() {
		await qs.goToPreviousQuestion();
		qs.scheduleSave?.();
	}

	function handleShuffle() {
		qs.toggleShuffle();
		qs.scheduleSave?.();
	}
</script>

<div
	class="items-center gap-2 px-3 sm:px-4 md:px-5 lg:px-6 py-3 sm:py-4 md:py-5 rounded-full backdrop-blur-md border border-base-300 shadow-xl w-auto fixed left-1/2 -translate-x-1/2 bottom-4 z-40 hidden md:inline-flex"
>
	<button class="btn btn-sm btn-outline" onclick={handleClear}>Clear</button>
	<div class="relative inline-block">
		<button class="btn btn-sm btn-success btn-soft" onclick={handleCheck}>Check</button>
		{#if showConfetti && qs.checkResult === 'Correct!'}
			<div class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-[65] w-0 h-0">
				<Confetti />
			</div>
		{/if}
	</div>
	<button class="btn btn-sm btn-warning btn-soft" onclick={handleFlag} aria-label="flag question">
		<Flag />
	</button>
	<button class="btn btn-sm btn-secondary" onclick={handleShuffle}>
		<Shuffle size="18" />
		{qs.isShuffled ? 'Unshuffle' : 'Shuffle'}
	</button>

	<div class="divider divider-horizontal mx-1"></div>

	<button
		class="btn btn-sm btn-outline {!qs.canGoPrevious() ? 'btn-disabled' : ''}"
		onclick={handlePrevious}
		disabled={!qs.canGoPrevious()}
	>
		<ArrowLeft />
	</button>

	<button
		class="btn btn-sm btn-outline {!qs.canGoNext() ? 'btn-disabled' : ''}"
		onclick={handleNext}
		disabled={!qs.canGoNext()}
	>
		<ArrowRight />
	</button>
</div>
