<script lang="ts">
	export let data: { flashcards: Card[] };

	type Card = {
		id: number;
		term: string;
		meaning: string;
		lesson: string;
	};

	import { onMount } from 'svelte';
	import { Eye, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { Confetti } from 'svelte-confetti';

	let ref: HTMLElement | null = null;
	onMount(() => {
		if (ref) {
			ref.focus();
		}
	});

	enum AnswerStatus {
		empty,
		correct,
		incorrect
	}

	function shuffle(array: Card[]): Card[] {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	}

	let cards: Card[] = shuffle(
		data.flashcards.map((item) => ({
			id: item.id, // Directly use the id as cardid
			term: item.term,
			meaning: item.meaning,
			lesson: item.lesson
		}))
	);

	let currentFlashcardIndex = 0;
	let input: string = '';
	let answer: string = cards[currentFlashcardIndex].term;
	let meaning: string = cards[currentFlashcardIndex].meaning;
	let answerstatus: AnswerStatus = AnswerStatus.empty;
	let showAnswer: boolean = false;

	function checkAnswer(): boolean {
		if (input.trim().toLowerCase() === answer.trim().toLowerCase()) {
			answerstatus = AnswerStatus.correct;
			setTimeout(nextFlashcard, 1000);

			return true;
		} else {
			answerstatus = AnswerStatus.incorrect;
			if (ref) {
				ref.focus();
			}
			return false;
		}
	}

	function nextFlashcard() {
		showAnswer = false;
		currentFlashcardIndex = (currentFlashcardIndex + 1) % cards.length;
		answer = cards[currentFlashcardIndex].term;
		meaning = cards[currentFlashcardIndex].meaning;
		input = '';
		answerstatus = AnswerStatus.empty;
		if (ref) {
			ref.focus();
		}
	}

	// Function to go back to the previous flashcard
	function previousFlashcard() {
		currentFlashcardIndex = (currentFlashcardIndex - 1 + cards.length) % cards.length;
		answer = cards[currentFlashcardIndex].term;
		meaning = cards[currentFlashcardIndex].meaning;
		input = '';
		answerstatus = AnswerStatus.empty;
		if (ref) {
			ref.focus();
		}
	}

	// Optional: Reset progress
	function resetProgress() {
		cards = shuffle(cards.map((card) => ({ ...card, status: 'incomplete' })));
		currentFlashcardIndex = 0;
		nextFlashcard();
	}
</script>

<div class="border-b-2 border-gray-300 my-5"></div>

<div class="flex flex-col items-center">
	<p class="mt-3 text-xl">{meaning}</p>

	<form class="flex items-center">
		{#if answerstatus === AnswerStatus.correct}
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
		<button type="submit" class="btn btn-primary ms-3 mt-5" on:click={checkAnswer}>Enter</button>
	</form>
</div>

<div class="flex justify-center mt-5 space-x-4 items-center">
	<button class="btn" on:click={() => previousFlashcard()}><ChevronLeft /></button>

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

	<button class="btn mt-5" on:click={() => nextFlashcard()}><ChevronRight /></button>
</div>
