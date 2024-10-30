<script lang="ts">
	import { preventDefault } from 'svelte/legacy';

	import { PUBLIC_USERCARD_TABLE } from '$env/static/public';
	import { Confetti } from 'svelte-confetti';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import supabase from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import {
		Eye,
		ChevronLeft,
		ChevronRight,
		Shuffle,
		RefreshCw,
		BookOpen,
		Star
	} from 'lucide-svelte';
	interface Props {
		data: { flashcards: Card[]; user: string };
	}

	let { data }: Props = $props();

	type Card = {
		id: string;
		term: string;
		meaning: string;
		lesson: number;
	};

	enum AnswerStatus {
		empty,
		correct,
		incorrect
	}

	type StoredProgress = {
		currentIndex: number;
		correctAnswers: number;
		incorrectAnswers: number;
		missedCards: string[];
		isShuffled: boolean;
		shuffledCards?: Card[];
	};

	function saveProgress() {
		const progressData: StoredProgress = {
			currentIndex: currentFlashcardIndex,
			correctAnswers,
			incorrectAnswers,
			missedCards: Array.from(missedCards),
			isShuffled,
			shuffledCards: isShuffled ? cards : undefined
		};
		localStorage.setItem('flashcardProgress', JSON.stringify(progressData));
	}
	onMount(() => {
		if (ref) {
			ref.focus();
		}
		const savedProgress = localStorage.getItem('flashcardProgress');
		if (savedProgress) {
			const progress: StoredProgress = JSON.parse(savedProgress);
			currentFlashcardIndex = progress.currentIndex;
			correctAnswers = progress.correctAnswers;
			incorrectAnswers = progress.incorrectAnswers;
			missedCards = new Set(progress.missedCards);
			isShuffled = progress.isShuffled;

			if (isShuffled && progress.shuffledCards) {
				cards = progress.shuffledCards;
				shuffledCards = progress.shuffledCards;
			}
		}

		document.addEventListener('keydown', handleKeydown);

		if (data.user) {
			fetchStarredCards();
		}

		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	let ref: HTMLElement | null = $state(null);
	let starredCards: Set<string> = $state(new Set());

	async function fetchStarredCards() {
		const { data: starredData, error } = await supabase
			.from(PUBLIC_USERCARD_TABLE)
			.select('card_id')
			.eq('user_id', data.user)
			.eq('is_starred', true);

		if (error) {
			console.error('Error fetching starred cards:', error);
		} else {
			starredCards = new Set(starredData.map((item) => item.card_id));
		}
	}

	function shuffleArray(array: Card[]): Card[] {
		let shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}

	let originalCards: Card[] = data.flashcards.map((flashcard: Card) => ({
		id: flashcard.id,
		term: flashcard.term,
		meaning: flashcard.meaning,
		lesson: flashcard.lesson
	}));

	let cards: Card[] = $state([...originalCards]);
	let isShuffled: boolean = $state(false);
	let isFinished: boolean = $state(false);
	let missedCards: Set<string> = $state(new Set());
	let inReview: boolean = $state(false);

	let shuffledCards: Card[] = [];

	function toggleShuffle() {
		isShuffled = !isShuffled;
		if (isShuffled) {
			shuffledCards = shuffleArray([...cards]);
			cards = shuffledCards;
		} else {
			cards = [...originalCards];
		}
		resetProgress();
	}

	let currentFlashcardIndex = $state(0);
	let currentCard: Card = $derived(cards[currentFlashcardIndex]);
	
	let input: string = $state('');
	let answer = $derived(currentCard?.term || '');
	let meaning = $derived(currentCard?.meaning || '');
	let answerstatus: AnswerStatus = $state(AnswerStatus.empty);
	let showAnswer: boolean = $state(false);

	let totalCards = $derived(cards.length);
	let correctAnswers: number = $state(0);
	let incorrectAnswers: number = $state(0);
	let progress = $derived((correctAnswers / totalCards) * 100);

	let cardSlide: string = $state('right');

	async function toggleStar() {
		if (!data.user) return;

		const cardId = currentCard.id;
		if (starredCards.has(cardId)) {
			const { error } = await supabase
				.from(PUBLIC_USERCARD_TABLE)
				.delete()
				.eq('user_id', data.user)
				.eq('card_id', cardId);

			if (error) {
				console.error('Error removing star:', error);
			} else {
				starredCards.delete(cardId);
			}
		} else {
			const { error } = await supabase
				.from(PUBLIC_USERCARD_TABLE)
				.insert({ user_id: data.user, card_id: cardId, is_starred: true });

			if (error) {
				console.error('Error adding star:', error);
			} else {
				starredCards.add(cardId);
			}
		}
		starredCards = starredCards;
	}

	function checkAnswer(): boolean {
		if (input.trim().toLowerCase() === answer.trim().toLowerCase()) {
			answerstatus = AnswerStatus.correct;
			correctAnswers++;
			saveProgress();

			if (inReview) {
				if (cards.length === 0) {
					cards = [...originalCards];

					isFinished = true;
				}
				if (currentFlashcardIndex >= cards.length) {
					currentFlashcardIndex = 0;
				}
			} else if (correctAnswers === totalCards) {
				isFinished = true;
			}

			setTimeout(() => {
				if (!isFinished) {
					nextFlashcard(false);
					if (cards.length === 0) {
						cards = [...originalCards];
						isFinished = true;
					}
					setTimeout(() => {
						if (ref) {
							ref.focus();
						}
					}, 50);
				}
			}, 1000);

			return true;
		} else {
			answerstatus = AnswerStatus.incorrect;
			if (!inReview) {
				incorrectAnswers++;
			}
			missedCards.add(currentCard.id);
			setTimeout(() => {
				if (ref) {
					ref.focus();
				}
			}, 50);
			return false;
		}
	}

	function nextFlashcard(shouldFocus: boolean = true) {
		if (cards.length === 0) {
			isFinished = true;
			return;
		}
		cardSlide = 'left';
		showAnswer = false;

		if (!inReview) {
			currentFlashcardIndex = (currentFlashcardIndex + 1) % cards.length;
		} else {
			cards = cards.filter((_, index) => index !== currentFlashcardIndex);
		}
		input = '';
		answerstatus = AnswerStatus.empty;
		saveProgress();
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
		resetQuiz();

		missedCards.clear();
		if (!isShuffled) {
			cards = [...originalCards];
		}
		localStorage.removeItem('flashcardProgress');

		if (ref) {
			ref.focus();
		}
	}

	function toggleAnswer() {
		showAnswer = !showAnswer;
	}

	function handleKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key === 's') {
			event.preventDefault();
			toggleStar();
		}

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

	function resetQuiz() {
		currentFlashcardIndex = 0;
		correctAnswers = 0;
		incorrectAnswers = 0;
		input = '';
		answerstatus = AnswerStatus.empty;
		isFinished = false;
		inReview = false;
		localStorage.removeItem('flashcardProgress');
	}

	function redoMissedCards() {
		resetQuiz();
		inReview = true;
		cards = originalCards.filter((card) => missedCards.has(card.id));
	}

	function reviewStarredCards() {
		resetQuiz();
		cards = originalCards.filter((card) => starredCards.has(card.id));
	}
</script>

<div class="my-5"></div>

<div class="flex flex-col items-center p-8">
	{#key currentCard}
		<p class="mt-3 text-xl">
			{meaning}
		</p>
	{/key}

	<form class="flex items-center" onsubmit={preventDefault(checkAnswer)}>
		{#if isFinished}
			<Confetti />

			<div class="input input-bordered w-full max-w-lg mt-5 flex items-center justify-center">
				<span class="text-success font-bold">
					{inReview ? 'Review Complete!' : 'Finished!'}
				</span>
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
		{#if !isFinished}
			<button type="submit" class="btn btn-primary ms-3 mt-5">Enter</button>
		{/if}
	</form>
</div>

<div
	class="flex flex-col md:flex-row justify-center items-center mt-5 space-y-4 md:space-y-0 md:space-x-4"
>
	<button
		class="btn hidden md:block"
		aria-label="left"
		onclick={previousFlashcard}
		disabled={isFinished}
	>
		<ChevronLeft />
	</button>

	{#key currentCard}
		<div
			class="card bg-base-100 w-96 shadow-md mt-6"
			in:fly={{ duration: 250, x: cardSlide === 'left' ? 100 : -100, easing: quintOut }}
		>
			<div class="card-body">
				<div class="flex flex-row justify-between mb-8 mt-4">
					{#if showAnswer === false}
						<div class="flex">
							<h2 class="card-title blur">{answer}</h2>
						</div>
					{:else}
						<div class="flex">
							<h2 class="card-title">{answer}</h2>
						</div>
					{/if}
					{#if data.user}
						<button onclick={toggleStar}>
							<Star
								class={starredCards.has(currentCard.id)
									? 'fill-yellow-400 stroke-yellow-400'
									: 'stoke-current'}
							/>
						</button>
					{/if}
				</div>
				<button class="btn" onclick={toggleAnswer}><Eye /></button>
			</div>
		</div>
	{/key}

	<button
		class="btn hidden md:block"
		aria-label="right"
		onclick={handleNextButtonClick}
		disabled={isFinished}
	>
		<ChevronRight />
	</button>

	<div class="flex space-x-4 md:hidden">
		<button class="btn" onclick={previousFlashcard} aria-label="left" disabled={isFinished}>
			<ChevronLeft />
		</button>
		<button class="btn" onclick={handleNextButtonClick} aria-label="right" disabled={isFinished}>
			<ChevronRight />
		</button>
	</div>
</div>
<p class="text-gray-500">Press tab to reveal term.</p>

<progress class="progress progress-success w-96" value={progress} max="100"></progress>

<div class="mt-5 text-center">
	<p>Card {currentFlashcardIndex + 1} / {totalCards}</p>
</div>
<div class="flex flex-row gap-2 justify-center flex-wrap">
	<div class="mt-3 text-center">
		<button class="btn btn-secondary" onclick={toggleShuffle}>
			<Shuffle class="mr-2" />
			{isShuffled ? 'Unshuffled' : 'Shuffle'}
		</button>
	</div>

	<div class="flex flex-wrap gap-2 justify-center">
		{#if isFinished}
			<button class="btn mt-3" onclick={resetProgress}>
				<RefreshCw class="mr-2" />
				{inReview ? 'Start New Session' : incorrectAnswers === 0 ? 'Start Over' : 'Reset Progress'}
			</button>
			{#if missedCards.size > 0 && !inReview}
				<button class="btn mt-3" onclick={redoMissedCards}>
					Redo Missed Cards ({missedCards.size})
				</button>
			{/if}
		{:else}
			<button class="btn mt-3" onclick={resetProgress}>Reset Progress</button>
		{/if}
		{#if data.user}
			<button class="btn mt-3" onclick={reviewStarredCards} disabled={starredCards.size === 0}>
				<BookOpen />
				Quiz Starred Terms ({starredCards.size})
			</button>
		{/if}
	</div>
</div>
{#if !data.user}
	<div class="text-neutral">Login to star cards!</div>
{/if}
