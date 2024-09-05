<script lang="ts">
	import { flashcards } from '$lib/flashcards';

	interface Flashcard {
		term: string;
		meaning: string;
		status: 'done' | 'incomplete';
	}

	let cardList: Flashcard[] = flashcards.map((card) => ({
		...card,
		status: 'incomplete'
	}));
</script>

<div class="flex items-center justify-between w-full flex-col p-8 min-h-screen">
	<div class="w-full max-w-3xl">
		<div class="flex space-x-3 items-end">
			<a class="font-medium mt-3 text-3xl" href="/">Introduction to Optometry Terms</a>
			<div class="divider"></div>

			<p class="font-bold text-gray-400">BETA</p>
		</div>
		<div class="flex flex-col space-y-4 items-center p-8 mt-5">
			{#each cardList as card}
				<div
					class="card bg-base-100 w-full shadow-xl transform transition duration-300 hover:scale-110"
				>
					<div class="card-body flex flex-row space-x-6 items-center">
						<h2 class="font-semibold text-lg text-left w-2/5 break-words">{card.term}</h2>
						<div class="divider divider-horizontal"></div>
						<p class="text-gray-700 text-right w-2/5 break-words">{card.meaning}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
