<script lang="ts">
	import { onMount } from 'svelte';

	export let ref: HTMLElement | null = null;
	onMount(() => {
		if (ref) {
			ref.focus();
		}
	});

	import { flashcards } from '$lib/flashcards'; // Import the flashcards

	let currentFlashcardIndex = 0;
	let input: string = '';
	let answer: string = flashcards[currentFlashcardIndex].term; // Set the initial answer
	let meaning: string = flashcards[currentFlashcardIndex].meaning; // Set the initial meaning
	let answerstatus: boolean = false;

	function checkAnswer(): boolean {
		if (input.trim().toLowerCase() === answer.trim().toLowerCase()) {
			answerstatus = true;
			setTimeout(nextFlashcard, 100); // Move to the next flashcard after a brief delay
			return true;
		} else {
			answerstatus = false;
			console.log('FALSE');
			return false;
		}
	}

	function nextFlashcard() {
		currentFlashcardIndex = (currentFlashcardIndex + 1) % flashcards.length;
		answer = flashcards[currentFlashcardIndex].term;
		meaning = flashcards[currentFlashcardIndex].meaning;
		input = ''; // Clear the input for the next flashcard
		answerstatus = false; // Reset the answer status
	}
</script>

<div class="flex items-center justify-between w-full flex-col p-8 min-h-screen">
	<div class="w-full max-w-3xl">
		<h1 class="font-medium mt-3 text-3xl">Introduction to Optometry Terms</h1>
		<div class="border-b-2 border-gray-300 my-5"></div>
		<p class="mt-3 text-xl">{meaning}</p>

		<form>
			{#if answerstatus === true}
				<input
					type="text"
					placeholder="Type here"
					class="input input-bordered w-full max-w-xs mt-5"
					bind:value={input}
				/>
			{:else}
				<input
					type="text"
					placeholder="Type here"
					class="input input-bordered input-error w-full max-w-xs mt-5"
					bind:value={input}
					bind:this={ref}
				/>
			{/if}
			<button type="submit" class="btn btn-primary mt-3" on:click={checkAnswer}>Enter</button>
		</form>
	</div>
</div>

<footer class="footer footer-center text-base-content p-4">
	<aside>
		<p>Copyright © {new Date().getFullYear()} - Justin A. Dang</p>
	</aside>
</footer>
