<script lang="ts">
	export let data: { flashcards: Card[] };

	type Card = {
		id: string;
		is_starred: boolean;
		flashcards: {
			id: number;
			term: string;
			meaning: string;
			lesson: string;
		};
	};

	import { onMount } from 'svelte';
	import { Eye, ChevronLeft, ChevronRight, Shuffle, RefreshCw } from 'lucide-svelte';
	import { Confetti } from 'svelte-confetti';

	let ref: HTMLElement | null = null;

	onMount(() => {
		if (ref) {
			ref.focus();
		}
		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	enum AnswerStatus {
		empty,
		correct,
		incorrect
	}

	function shuffleArray(array: Card[]): Card[] {
		let shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}

	let originalCards: Card[] = data.flashcards.map((item) => ({
		id: item.id,
		is_starred: item.is_starred,
		flashcards: {
			id: item.flashcards.id,
			term: item.flashcards.term,
			meaning: item.flashcards.meaning,
			lesson: item.flashcards.lesson
		}
	}));

	let cards: Card[] = [...originalCards];
	let wrongCards: Card[] = [];
	let isShuffled: boolean = false;
	let isFinished: boolean = false;
	let isReviewingWrongCards: boolean = false;

	function toggleShuffle() {
		isShuffled = !isShuffled;
		if (isShuffled) {
			cards = shuffleArray(cards);
		} else {
			cards = [...originalCards];
		}
		resetProgress();
	}

	let currentFlashcardIndex = 0;
	let input: string = '';
	let answer: string = cards[currentFlashcardIndex].flashcards.term;
	let meaning: string = cards[currentFlashcardIndex].flashcards.meaning;
	let answerstatus: AnswerStatus = AnswerStatus.empty;
	let showAnswer: boolean = false;

	let totalCards: number = cards.length;
	let correctAnswers: number = 0;
	let incorrectAnswers: number = 0;
	let progress: number = 0;

	function updateProgress() {
		progress = (correctAnswers / totalCards) * 100;
	}

	function checkAnswer(): boolean {
		if (input.trim().toLowerCase() === answer.trim().toLowerCase()) {
			answerstatus = AnswerStatus.correct;
			correctAnswers++;
			if (correctAnswers === totalCards) {
				isFinished = true;
			} else {
				setTimeout(() => {
					nextFlashcard(false);
					setTimeout(() => {
						if (ref) {
							ref.focus();
						}
					}, 50);
				}, 1000);
			}
			return true;
		} else {
			answerstatus = AnswerStatus.incorrect;
			incorrectAnswers++;
			if (!isReviewingWrongCards) {
				wrongCards.push(cards[currentFlashcardIndex]);
			}
			setTimeout(() => {
				if (ref) {
					ref.focus();
				}
			}, 50);
			return false;
		}
	}

	function nextFlashcard(shouldFocus: boolean = true) {
		showAnswer = false;
		currentFlashcardIndex = (currentFlashcardIndex + 1) % cards.length;
		answer = cards[currentFlashcardIndex].flashcards.term;
		meaning = cards[currentFlashcardIndex].flashcards.meaning;
		input = '';
		answerstatus = AnswerStatus.empty;
		updateProgress();
		if (shouldFocus) {
			setTimeout(() => {
				if (ref) {
					ref.focus();
				}
			}, 50);
		}
	}

	function handleNextButtonClick() {
		nextFlashcard(true);
	}

	function previousFlashcard() {
		currentFlashcardIndex = (currentFlashcardIndex - 1 + cards.length) % cards.length;
		answer = cards[currentFlashcardIndex].flashcards.term;
		meaning = cards[currentFlashcardIndex].flashcards.meaning;
		input = '';
		answerstatus = AnswerStatus.empty;
		if (ref) {
			ref.focus();
		}
	}

	function resetProgress() {
		currentFlashcardIndex = 0;
		correctAnswers = 0;
		incorrectAnswers = 0;
		answer = cards[currentFlashcardIndex].flashcards.term;
		meaning = cards[currentFlashcardIndex].flashcards.meaning;
		updateProgress();
		input = '';
		answerstatus = AnswerStatus.empty;
		isFinished = false;
		isReviewingWrongCards = false;
		if (ref) {
			ref.focus();
		}
	}

	function toggleAnswer() {
		showAnswer = !showAnswer;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Tab') {
			event.preventDefault();
			toggleAnswer();
		}

		if (event.key === 'ArrowRight') {
			nextFlashcard();
		}
		if (event.key === 'ArrowLeft') {
			previousFlashcard();
		}
	}

	function resetWithWrongCards() {
		if (wrongCards.length > 0) {
			cards = [...wrongCards];
			wrongCards = [];
			totalCards = cards.length;
			isReviewingWrongCards = true;
			resetProgress();
		} else {
			cards = [...originalCards];
			totalCards = cards.length;
			isReviewingWrongCards = false;
			resetProgress();
		}
	}
</script>

<div class="border-b-2 border-gray-300 my-5"></div>

<div class="flex flex-col items-center">
	<p class="mt-3 text-xl">{meaning}</p>

	<form class="flex items-center">
		{#if isFinished}
			<Confetti />

			<div class="input input-bordered w-full max-w-lg mt-5 flex items-center justify-center">
				<span class="text-success font-bold">Finished!</span>
			</div>
		{:else if answerstatus === AnswerStatus.correct}
			<Confetti />
			<input
				type="text"
				placeholder="Type here"
				class="input input-bordered input-success w-full max-w-lg mt-5"
				bind:this={ref}
				bind:value={input}
			/>
		{:else if answerstatus === AnswerStatus.empty}
			<input
				type="text"
				placeholder="Type here"
				class="input input-bordered w-full max-w-xs mt-5"
				bind:this={ref}
				bind:value={input}
			/>
		{:else}
			<input
				type="text"
				placeholder="Type here"
				class="input input-bordered input-error w-full max-w-xs mt-5"
				bind:this={ref}
				bind:value={input}
			/>
		{/if}
		<button
			type="submit"
			class="btn btn-primary ms-3 mt-5"
			on:click={checkAnswer}
			disabled={isFinished}>Enter</button
		>
	</form>
</div>

<div class="flex justify-center mt-5 space-x-4 items-center">
	<button class="btn" on:click={() => previousFlashcard()} disabled={isFinished}
		><ChevronLeft /></button
	>

	<div class="card bg-base-100 w-96 shadow-md mt-6">
		<div class="card-body">
			{#if showAnswer === false}
				<div class="flex">
					<h2 class="card-title blur">{answer}</h2>
				</div>
				<button class="btn mt-5" on:click={() => (showAnswer = true)}><Eye /></button>
			{:else}
				<div class="flex">
					<h2 class="card-title">{answer}</h2>
				</div>
				<button class="btn mt-5" on:click={() => (showAnswer = false)}><Eye /></button>
			{/if}
		</div>
	</div>

	<button class="btn mt-5" on:click={() => handleNextButtonClick()} disabled={isFinished}
		><ChevronRight /></button
	>
</div>

<p class="text-gray-500">Press tab to reveal term.</p>
<progress class="progress progress-success w-96" value={progress} max="100"></progress>

<div class="mt-5 text-center">
	<p>Card {currentFlashcardIndex + 1} / {totalCards}</p>
	<p>Correct: {correctAnswers} | Incorrect: {incorrectAnswers}</p>
	{#if isReviewingWrongCards}
		<p class="text-warning">Reviewing wrong cards</p>
	{/if}
</div>
<div class="flex flex-row gap-2 justify-center">
	<div class="mt-3 text-center">
		<button class="btn" on:click={toggleShuffle}>
			<Shuffle class="mr-2" />
			{isShuffled ? 'Unshuffled' : 'Shuffle'}
		</button>
	</div>
	{#if isFinished}
		<button class="btn mt-3" on:click={resetProgress}>
			<RefreshCw class="mr-2" />
			{incorrectAnswers === 0 ? 'Start Over' : 'Reset Progress'}
		</button>
	{:else}
		<button class="btn mt-3" on:click={resetProgress}>Reset Progress</button>
	{/if}
	{#if isFinished && incorrectAnswers !== 0}
		<button class="btn mt-3" on:click={resetWithWrongCards}>
			<RefreshCw class="mr-2" />
			Review Wrong Cards
		</button>
	{/if}
</div>
