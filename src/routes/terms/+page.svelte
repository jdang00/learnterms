<script lang="ts">
	import { AlignJustify } from 'lucide-svelte';
	import { LayoutGrid } from 'lucide-svelte';
	import supabase from '$lib/supabaseClient'; // Adjust the import path as necessary

	export let data: { flashcards: Card[] };

	type Card = {
		card_id: string;
		is_starred: boolean;
		flashcards: {
			id: string;
			term: string;
			meaning: string;
			lesson: string;
		};
	};

	let cards: Card[] = data.flashcards.map((item) => ({
		card_id: item.card_id,
		is_starred: item.is_starred,
		flashcards: {
			id: item.flashcards.id,
			term: item.flashcards.term,
			meaning: item.flashcards.meaning,
			lesson: item.flashcards.lesson
		}
	}));

	let listMode: boolean = false;

	async function toggleStar(card: Card) {
		const originalStarredStatus = card.is_starred;
		card.is_starred = !card.is_starred;

		try {
			await updateCardStarredStatus(card.card_id, card.is_starred);
		} catch (error) {
			console.error('Error updating starred status:', error);
			card.is_starred = originalStarredStatus;
		}
	}

	async function updateCardStarredStatus(card_id: string, is_starred: boolean) {
		const { error } = await supabase
			.from('user_cards')
			.update({ is_starred })
			.eq('card_id', card_id);

		if (error) {
			console.error('Error updating starred status:', error);
		}
	}
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

{#if !listMode}
	<div class="flex flex-col items-center mt-5">
		<div class="flex flex-wrap justify-center max-w-4xl gap-4 items-center p-8">
			{#each cards as card}
				<div class="card bg-base-100 w-full shadow-xl">
					<div class="card-body flex flex-row space-x-6 items-center">
						<label class="swap swap-flip text-xl">
							<input type="checkbox" checked={card.is_starred} on:click={() => toggleStar(card)} />
							{#if card.is_starred}
								<div class="swap-on">⭐️</div>
							{:else}
								<div class="swap-off">✅</div>
							{/if}
						</label>
						<h2 class="font-semibold text-lg text-left w-2/5 break-words">
							{card.flashcards.term}
						</h2>
						<div class="divider divider-horizontal"></div>
						<p class="text-right w-2/5 break-words">{card.flashcards.meaning}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
{:else}
	<div class="flex flex-col items-center mt-5">
		<div class="grid grid-cols-2 max-w-4xl gap-4 items-center p-8">
			{#each cards as card}
				<div class="card bg-base-100 w-full shadow-xl">
					<div class="card-body flex flex-row space-x-6 h-56 items-center">
						<h2 class="font-semibold text-lg text-left w-2/5 break-words">
							{card.flashcards.term}
						</h2>
						<div class="divider divider-horizontal"></div>
						<p class=" text-right w-2/5 break-words">{card.flashcards.meaning}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
