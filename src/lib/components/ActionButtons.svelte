<script lang="ts">
	let { qs = $bindable(), currentlySelected } = $props();
	import { Flag, Shuffle, ArrowRight, ArrowLeft } from 'lucide-svelte';

	function handleCheck() {
		if (currentlySelected) {
			qs.checkAnswer(currentlySelected.correctAnswers, qs.selectedAnswers);
		}
	}

	function handleClear() {
		qs.selectedAnswers = [];
		qs.eliminatedAnswers = [];
		qs.checkResult = '';
	}

	function handleNext() {
		qs.goToNextQuestion();
	}

	function handlePrevious() {
		qs.goToPreviousQuestion();
	}

	function handleShuffle() {
		qs.toggleShuffle();
	}
</script>

<div class=" flex-row justify-center mt-8 gap-4 hidden lg:flex">
	<button class="btn btn-outline" onclick={handleClear}>Clear</button>
	<button class="btn btn-soft btn-success" onclick={handleCheck}>Check</button>
	<button class="btn btn-warning btn-soft">
		<Flag />
	</button>
	<button class="btn btn-secondary" onclick={handleShuffle}>
		<Shuffle size="18" />
		{qs.isShuffled ? 'Unshuffle' : 'Shuffle'}
	</button>

	<button
		class="btn btn-outline {!qs.canGoPrevious() ? 'btn-disabled' : ''}"
		onclick={handlePrevious}
		disabled={!qs.canGoPrevious()}
	>
		<ArrowLeft />
	</button>

	<button
		class="btn btn-outline {!qs.canGoNext() ? 'btn-disabled' : ''}"
		onclick={handleNext}
		disabled={!qs.canGoNext()}
	>
		<ArrowRight />
	</button>
</div>

{#if qs.checkResult !== null && qs.checkResult !== ''}
	<div
		class="my-4 text-center font-bold {qs.checkResult === 'Correct!'
			? 'text-green-500'
			: 'text-red-500'}"
	>
		{qs.checkResult}
	</div>
{/if}
