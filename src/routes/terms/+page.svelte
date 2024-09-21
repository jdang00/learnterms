<script lang="ts">
	import { Star, Search, Grid, List } from 'lucide-svelte';
	import supabase from '$lib/supabaseClient';
	import { PUBLIC_USERCARD_TABLE } from '$env/static/public';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	export let data: { flashcards: Flashcard[]; starredCards: StarredCard[]; userID: string };

	type Flashcard = {
		id: string;
		term: string;
		meaning: string;
		lesson: string;
	};
	type StarredCard = {
		id: string;
		card_id: string;
		review: boolean;
		is_starred: boolean;
	};

	let flashcards: Flashcard[] = data.flashcards;
	let starredCards: StarredCard[] = data.starredCards;
	let searchTerm = '';
	let isTableView = true;
	let currentCardIndex = 0;
	let showingTerm = true;

	let tableKey = 0;

	function isCardStarred(cardId: string): boolean {
		return starredCards.some((sc) => sc.card_id === cardId);
	}

	$: filteredFlashcards = flashcards.filter(
		(card) =>
			card.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
			card.meaning.toLowerCase().includes(searchTerm.toLowerCase())
	);

	$: sortedFlashcards = filteredFlashcards.sort((a, b) => {
		const aIsStarred = isCardStarred(a.id);
		const bIsStarred = isCardStarred(b.id);
		if (aIsStarred && !bIsStarred) return -1;
		if (!aIsStarred && bIsStarred) return 1;
		return 0;
	});

	async function toggleStar(flashcard: Flashcard) {
		try {
			const { data: existingStarredCard, error: fetchError } = await supabase
				.from(PUBLIC_USERCARD_TABLE)
				.select('*')
				.eq('user_id', data.userID)
				.eq('card_id', flashcard.id)
				.single();

			if (fetchError && fetchError.code !== 'PGRST116') {
				console.error('Error fetching starred card status:', fetchError);
				throw fetchError;
			}

			if (existingStarredCard) {
				const { error: deleteError } = await supabase
					.from(PUBLIC_USERCARD_TABLE)
					.delete()
					.eq('id', existingStarredCard.id);

				if (deleteError) {
					console.error('Error removing starred card:', deleteError);
					throw deleteError;
				}

				starredCards = starredCards.filter((sc) => sc.id !== existingStarredCard.id);
			} else {
				const { data: newCard, error: insertError } = await supabase
					.from(PUBLIC_USERCARD_TABLE)
					.insert({ user_id: data.userID, card_id: flashcard.id, review: false, is_starred: true })
					.select()
					.single();

				if (insertError) {
					console.error('Error adding starred card:', insertError);
					throw insertError;
				}

				starredCards = [...starredCards, newCard];
			}
			tableKey += 1;
			sortedFlashcards = [...sortedFlashcards];
		} catch (error) {
			console.error('Error toggling star:', error);
		}
	}

	function nextCard() {
		cardSlide = 'left';
		currentCardIndex = (currentCardIndex + 1) % sortedFlashcards.length;
		showingTerm = true;
	}

	function prevCard() {
		cardSlide = 'right';
		currentCardIndex = (currentCardIndex - 1 + sortedFlashcards.length) % sortedFlashcards.length;
		showingTerm = true;
	}

	function flipCard() {
		showingTerm = !showingTerm;
	}

	let cardSlide: string = 'right';

	function handleKeydown(event: KeyboardEvent) {
		if (!isTableView) {
			if (event.key === 'ArrowLeft') {
				prevCard();
			} else if (event.key === 'ArrowRight') {
				nextCard();
			} else if (event.key === ' ') {
				event.preventDefault(); // Prevent scrolling
				flipCard();
			}
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="w-full flex flex-col items-center mt-5 p-4">
	<div class="flex justify-between w-full max-w-5xl mb-4">
		<div class="form-control">
			<div class="input-group flex gap-2">
				<input
					type="text"
					placeholder="Search"
					class="input input-bordered"
					bind:value={searchTerm}
				/>
				<button class="btn btn-square">
					<Search size={20} />
				</button>
			</div>
		</div>
		<button class="btn btn-primary" on:click={() => (isTableView = !isTableView)}>
			{#if isTableView}
				<Grid size={20} />
			{:else}
				<List size={20} />
			{/if}
		</button>
	</div>

	{#if isTableView}
		<div class="overflow-x-auto w-full max-w-5xl mt-5">
			<table class="table w-full">
				<thead>
					<tr>
						<th></th>
						<th>Term</th>
						<th>Definition</th>
					</tr>
				</thead>
				{#key tableKey}
					<tbody>
						{#each sortedFlashcards as flashcard (flashcard.id)}
							<tr>
								<th>
									{#if data.userID}
										<button class="btn btn-ghost btn-circle" on:click={() => toggleStar(flashcard)}>
											<Star
												size={24}
												class={isCardStarred(flashcard.id)
													? 'fill-yellow-400 stroke-yellow-400'
													: 'stroke-current'}
											/>
										</button>
									{/if}
								</th>
								<td class="font-semibold">{flashcard.term}</td>
								<td>{flashcard.meaning}</td>
							</tr>
						{/each}
					</tbody>
				{/key}
			</table>
		</div>
	{:else}
		{#key currentCardIndex}
			<div
				class="card w-96 h-72 bg-base-100 shadow-xl mt-12"
				in:fly={{ duration: 250, x: cardSlide === 'left' ? 100 : -100, easing: quintOut }}
			>
				<div class="card-body items-center text-center justify-center">
					<h2 class="card-title">
						{showingTerm
							? sortedFlashcards[currentCardIndex].term
							: sortedFlashcards[currentCardIndex].meaning}
					</h2>
				</div>
			</div>
		{/key}
		<div class="text-center mt-4">
			Card {currentCardIndex + 1} of {sortedFlashcards.length}
		</div>
		<div class="flex gap-2 mt-5">
			<button class="btn btn-ghost" on:click={prevCard}>&larr; Previous</button>
			<button class="btn btn-secondary" on:click={flipCard}>Flip</button>
			<button class="btn btn-ghost" on:click={nextCard}>Next &rarr;</button>
		</div>
		<div class="mt-4">
			<button
				class="btn btn-ghost btn-circle"
				on:click={() => toggleStar(sortedFlashcards[currentCardIndex])}
			>
				<Star
					size={24}
					class={isCardStarred(sortedFlashcards[currentCardIndex].id)
						? 'fill-yellow-400 stroke-yellow-400'
						: 'stroke-current'}
				/>
			</button>
		</div>
	{/if}
</div>
