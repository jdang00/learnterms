<script lang="ts">
	let { qs = $bindable(), currentlySelected } = $props();
	import { Flag, Shuffle, ArrowRight, ArrowLeft } from 'lucide-svelte';
	import { Confetti } from 'svelte-confetti';
	import { QUESTION_TYPES } from '$lib/utils/questionType';
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
			if (currentlySelected.type === QUESTION_TYPES.FILL_IN_THE_BLANK) {
				const text = qs.selectedAnswers && qs.selectedAnswers[0] ? qs.selectedAnswers[0] : '';
				qs.checkFillInTheBlank(text, currentlySelected);
			} else {
				qs.checkAnswer(currentlySelected.correctAnswers, qs.selectedAnswers);
			}
		}
		qs.scheduleSave?.();
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
	class="items-center gap-2 px-3 sm:px-4 md:px-5 lg:px-6 py-3 sm:py-4 md:py-5 rounded-full backdrop-blur-md border border-base-300 shadow-xl w-auto {qs.fullscreenEnabled ? 'fixed left-1/2 -translate-x-1/2 bottom-4 z-40 hidden md:inline-flex' : 'hidden'}"
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
