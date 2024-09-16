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
		review: boolean;
	};

	import { onMount } from 'svelte';
	import { Eye, ChevronLeft, ChevronRight, Shuffle, RefreshCw, BookOpen } from 'lucide-svelte';
	import { Confetti } from 'svelte-confetti';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import supabase from '$lib/supabaseClient';
	import { Sound } from 'svelte-sound';
	import correct from '$lib/training-program-correct2-88734.mp3';

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
		},
		review: item.review
	}));

	let cards: Card[] = [...originalCards];
	let wrongCards: Card[] = [];
	let reviewDeck: Card[] = [];
	let isShuffled: boolean = false;
	let isFinished: boolean = false;
	let isReviewingWrongCards: boolean = false;
	let isQuizingReviewDeck: boolean = false;

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
	let currentCard: Card;
	$: currentCard = cards[currentFlashcardIndex];
	let input: string = '';
	$: answer = currentCard?.flashcards.term || '';
	$: meaning = currentCard?.flashcards.meaning || '';
	let answerstatus: AnswerStatus = AnswerStatus.empty;
	let showAnswer: boolean = false;

	$: totalCards = cards.length;
	let correctAnswers: number = 0;
	let incorrectAnswers: number = 0;
	$: progress = (correctAnswers / totalCards) * 100;

	let cardSlide: string = 'right';

	const correct_sound = new Sound(correct);

	function checkAnswer(): boolean {
		if (input.trim().toLowerCase() === answer.trim().toLowerCase()) {
			answerstatus = AnswerStatus.correct;
			correct_sound.play();
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
			if (cards[currentFlashcardIndex].review === false) toggleReview(cards[currentFlashcardIndex]);
			incorrectAnswers++;
			if (!isReviewingWrongCards && !isQuizingReviewDeck) {
				wrongCards = [...wrongCards, cards[currentFlashcardIndex]];
				if (!reviewDeck.some((card) => card.id === cards[currentFlashcardIndex].id)) {
					reviewDeck = [...reviewDeck, cards[currentFlashcardIndex]];
				}
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
		cardSlide = 'left';
		showAnswer = false;
		currentFlashcardIndex = (currentFlashcardIndex + 1) % cards.length;
		input = '';
		answerstatus = AnswerStatus.empty;
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
		cardSlide = 'right';
		currentFlashcardIndex = (currentFlashcardIndex - 1 + cards.length) % cards.length;
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
		input = '';
		answerstatus = AnswerStatus.empty;
		isFinished = false;
		isReviewingWrongCards = false;
		isQuizingReviewDeck = false;
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
			isReviewingWrongCards = true;
			isQuizingReviewDeck = false;
			resetProgress();
		} else {
			cards = [...originalCards];
			isReviewingWrongCards = false;
			isQuizingReviewDeck = false;
			resetProgress();
		}
	}

	function quizReviewDeck() {
		if (reviewDeck.length > 0) {
			cards = [...reviewDeck];
			isQuizingReviewDeck = true;
			isReviewingWrongCards = false;
			resetProgress();
		}
	}

	async function toggleReview(card: Card) {
		const originalStarredStatus = card.review;
		card.review = !card.review;
		try {
			await updateCardStarredStatus(card.id, card.review);
			cards = [...cards];
		} catch (error) {
			console.error('Error updating starred status:', error);
			card.is_starred = originalStarredStatus;
		}
	}

	async function updateCardStarredStatus(id: string, review: boolean) {
		const { error } = await supabase.from('user_cards').update({ review }).eq('id', id);
		if (error) {
			console.error('Error updating starred status:', error);
			throw error;
		}
	}
</script>

<div class="my-5"></div>

<div class="flex flex-col items-center p-8">
	{#key currentCard}
		<p class="mt-3 text-xl">
			{meaning}
		</p>
	{/key}

	<form class="flex items-center" on:submit|preventDefault={checkAnswer}>
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
		<button type="submit" class="btn btn-primary ms-3 mt-5" disabled={isFinished}>Enter</button>
	</form>
</div>

<div
	class="flex flex-col md:flex-row justify-center items-center mt-5 space-y-4 md:space-y-0 md:space-x-4"
>
	<button class="btn hidden md:block" on:click={previousFlashcard} disabled={isFinished}>
		<ChevronLeft />
	</button>

	{#key currentCard}
		<div
			class="card bg-base-100 w-96 shadow-md mt-6"
			in:fly={{ duration: 250, x: cardSlide === 'left' ? 100 : -100, easing: quintOut }}
		>
			<div class="card-body">
				{#if showAnswer === false}
					<div class="flex">
						<h2 class="card-title blur">{answer}</h2>
					</div>
				{:else}
					<div class="flex">
						<h2 class="card-title">{answer}</h2>
					</div>
				{/if}
				<button class="btn mt-5" on:click={toggleAnswer}><Eye /></button>
			</div>
		</div>
	{/key}

	<button class="btn hidden md:block" on:click={handleNextButtonClick} disabled={isFinished}>
		<ChevronRight />
	</button>

	<div class="flex space-x-4 md:hidden">
		<button class="btn" on:click={previousFlashcard} disabled={isFinished}>
			<ChevronLeft />
		</button>
		<button class="btn" on:click={handleNextButtonClick} disabled={isFinished}>
			<ChevronRight />
		</button>
	</div>
</div>
<p class="text-gray-500">Press tab to reveal term.</p>

<progress class="progress progress-success w-96" value={progress} max="100"></progress>

<div class="mt-5 text-center">
	<p>Card {currentFlashcardIndex + 1} / {totalCards}</p>
	{#if isReviewingWrongCards}
		<p class="text-warning">Reviewing wrong cards</p>
	{:else if isQuizingReviewDeck}
		<p class="text-info">Quizzing review deck</p>
	{/if}
</div>
<div class="flex flex-row gap-2 justify-center flex-wrap">
	<div class="mt-3 text-center">
		<button class="btn btn-secondary" on:click={toggleShuffle}>
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
	{#if reviewDeck.length > 0}
		<button class="btn mt-3" on:click={quizReviewDeck}>
			<BookOpen class="mr-2" />
			Quiz Review Deck ({reviewDeck.length})
		</button>
	{/if}
</div>
