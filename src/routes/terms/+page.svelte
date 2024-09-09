<script lang="ts">
	import { AlignJustify } from 'lucide-svelte';
	import { LayoutGrid } from 'lucide-svelte';

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

	let listMode: boolean = false;
</script>

<div class="flex items-center justify-between w-full flex-col p-8 min-h-screen">
	<div class="w-full">
		<div class="flex flex-wrap items-end space-x-3">
			<a class="font-medium mt-3 text-3xl" href="/">Introduction to Optometry Terms</a>
			<div class="divider"></div>

			<p class="font-bold text-gray-400">BETA</p>
		</div>

		<div class="w-full flex flex-row gap-5 justify-center mt-5 invisible md:visible">
			<AlignJustify />
			<input
				type="checkbox"
				class="toggle toggle-primary justify-self-center"
				on:click={() => (listMode = !listMode)}
			/>
			<LayoutGrid />
		</div>

		{#if listMode === false}
			<div class="flex flex-col items-center mt-5">
				<div class="flex flex-wrap justify-center max-w-4xl gap-4 items-center p-8">
					{#each cardList as card}
						<div class="card bg-base-100 w-full shadow-xl">
							<div class="card-body flex flex-row space-x-6 items-center">
								<h2 class="font-semibold text-lg text-left w-2/5 break-words">{card.term}</h2>
								<div class="divider divider-horizontal"></div>
								<p class="text-gray-700 text-right w-2/5 break-words">{card.meaning}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="flex flex-col items-center mt-5">
				<div class="grid grid-cols-2 max-w-4xl gap-4 items-center p-8">
					{#each cardList as card}
						<div class="card bg-base-100 w-full shadow-xl">
							<div class="card-body flex flex-row space-x-6 h-56 items-center">
								<h2 class="font-semibold text-lg text-left w-2/5 break-words">{card.term}</h2>
								<div class="divider divider-horizontal"></div>
								<p class="text-gray-700 text-right w-2/5 break-words">{card.meaning}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
