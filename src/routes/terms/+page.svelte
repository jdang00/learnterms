<script lang="ts">
	import { AlignJustify } from 'lucide-svelte';
	import { LayoutGrid } from 'lucide-svelte';

	import { flashcards } from '$lib/flashcards';

	interface Flashcard {
		term: string;
		meaning: string;
		status: 'done' | 'incomplete';
		flag: boolean;
	}

	let cardList: Flashcard[] = flashcards.map((card) => ({
		...card,
		status: 'incomplete',
		flag: false
	}));

	let listMode: boolean = false;
</script>

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
						<label class="swap swap-flip text-xl">
							<input type="checkbox" on:click={() => (card.flag = !card.flag)} />
							{#if card.flag === true}
								<div class="swap-on">⭐️</div>
							{:else}
								<div class="swap-off">✅</div>
							{/if}
						</label>
						<h2 class="font-semibold text-lg text-left w-2/5 break-words">{card.term}</h2>
						<div class="divider divider-horizontal"></div>
						<p class="text-right w-2/5 break-words">{card.meaning}</p>
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
