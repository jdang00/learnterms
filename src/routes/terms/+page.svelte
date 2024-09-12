<script lang="ts">
	import { AlignJustify, LayoutGrid, Star } from 'lucide-svelte';
	import supabase from '$lib/supabaseClient';
	import { fade, fly } from 'svelte/transition';

	export let data: { flashcards: Card[] };
	type Card = {
		id: string;
		is_starred: boolean;
		flashcards: {
			id: string;
			term: string;
			meaning: string;
			lesson: string;
		};
		review: boolean;
	};

	let cards: Card[] = data.flashcards.map((item) => ({
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

	let listMode: boolean = false;

	$: sortedCards = cards.sort((a, b) => {
		if (a.is_starred === b.is_starred) {
			return 0;
		}
		return a.is_starred ? -1 : 1;
	});

	async function toggleStar(card: Card) {
		const originalStarredStatus = card.is_starred;
		card.is_starred = !card.is_starred;
		try {
			await updateCardStarredStatus(card.id, card.is_starred);
			cards = [...cards];
		} catch (error) {
			console.error('Error updating starred status:', error);
			card.is_starred = originalStarredStatus;
		}
	}

	async function updateCardStarredStatus(id: string, is_starred: boolean) {
		const { error } = await supabase.from('user_cards').update({ is_starred }).eq('id', id);
		if (error) {
			console.error('Error updating starred status:', error);
			throw error;
		}
	}
</script>

<div class="w-full flex flex-row gap-5 justify-center mt-5 invisible md:visible">
	<AlignJustify />
	<input
		type="checkbox"
		class="toggle toggle-primary justify-self-center"
		bind:checked={listMode}
	/>
	<LayoutGrid />
</div>

<div class="flex flex-col items-center mt-5">
	<div
		class={!listMode
			? 'flex flex-wrap justify-center max-w-4xl gap-4 items-center p-8'
			: 'grid grid-cols-2 max-w-4xl gap-4 items-center p-8'}
	>
		{#each sortedCards as card (card.id)}
			<div
				class="card bg-base-100 w-full shadow-xl"
				in:fly={{ y: 20, duration: 300 }}
				out:fade={{ duration: 300 }}
			>
				<div class="card-body flex flex-row space-x-6 items-center {listMode ? 'h-56' : ''}">
					{#if !listMode}
						<button class="btn btn-ghost btn-circle" on:click={() => toggleStar(card)}>
							<Star
								size={24}
								class={card.is_starred ? 'fill-yellow-400 stroke-yellow-400' : 'stroke-current'}
							/>
						</button>
					{/if}
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
