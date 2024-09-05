<script lang="ts">
	import { flashcards } from '$lib/flashcards';
	import { onMount } from 'svelte';
	import { Eye, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { Confetti } from 'svelte-confetti';

	export let ref: HTMLElement | null = null;
	onMount(() => {
		if (ref) {
			ref.focus();
		}
	});

	// Define flashcard structure with progress tracking
	interface Flashcard {
		term: string;
		meaning: string;
		status: 'done' | 'incomplete';
	}

	enum AnswerStatus {
		empty,
		correct,
		incorrect
	}

	function shuffle(array: Flashcard[]): Flashcard[] {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	}

	let shuffledFlashcards: Flashcard[] = shuffle(
		flashcards.map((card) => ({ ...card, status: 'incomplete' }))
	);
	let currentFlashcardIndex = 0;
	let input: string = '';
	let answer: string = shuffledFlashcards[currentFlashcardIndex].term;
	let meaning: string = shuffledFlashcards[currentFlashcardIndex].meaning;
	let answerstatus: AnswerStatus = AnswerStatus.empty;
	let showAnswer: boolean = false;

	// Check answer and move to the next card
	function checkAnswer(): boolean {
		if (input.trim().toLowerCase() === answer.trim().toLowerCase()) {
			answerstatus = AnswerStatus.correct;
			shuffledFlashcards[currentFlashcardIndex].status = 'done';
			setTimeout(nextFlashcard, 1000);

			return true;
		} else {
			answerstatus = AnswerStatus.incorrect;
			if (ref) {
				console.log(ref);
				ref.focus();
			}
			return false;
		}
	}

	function nextFlashcard() {
		showAnswer = false;
		currentFlashcardIndex = (currentFlashcardIndex + 1) % shuffledFlashcards.length;
		answer = shuffledFlashcards[currentFlashcardIndex].term;
		meaning = shuffledFlashcards[currentFlashcardIndex].meaning;
		input = '';
		answerstatus = AnswerStatus.empty;
		if (ref) {
			ref.focus();
		}
	}

	function previousFlashcard() {
		currentFlashcardIndex =
			(currentFlashcardIndex - 1 + shuffledFlashcards.length) % shuffledFlashcards.length;
		answer = shuffledFlashcards[currentFlashcardIndex].term;
		meaning = shuffledFlashcards[currentFlashcardIndex].meaning;
		input = '';
		answerstatus = AnswerStatus.empty;
		if (ref) {
			ref.focus();
		}
	}

	// Reset progress (optional feature)
	function resetProgress() {
		shuffledFlashcards = shuffle(
			shuffledFlashcards.map((card) => ({ ...card, status: 'incomplete' }))
		);
		currentFlashcardIndex = 0;
		nextFlashcard();
	}
</script>

<div class="flex items-center justify-between w-full flex-col p-8 min-h-screen">
	<div class="w-full max-w-3xl">
		<div class="flex space-x-3 items-end">
			<h1 class="font-medium mt-3 text-3xl">Introduction to Optometry Terms</h1>
			<p class="font-bold text-gray-400">BETA</p>
		</div>

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
				<button type="submit" class="btn btn-primary ms-3 mt-5" on:click={checkAnswer}>Enter</button
				>
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
	</div>
</div>

<footer class="footer footer-center text-base-content p-4">
	<aside>
		<p>Copyright © {new Date().getFullYear()} - Justin A. Dang</p>
	</aside>
</footer>
