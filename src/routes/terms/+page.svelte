<script lang="ts">
	import { Star } from 'lucide-svelte';
	import supabase from '$lib/supabaseClient';
	import { PUBLIC_USERCARD_TABLE } from '$env/static/public';
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

	function isCardStarred(cardId: string): boolean {
		return starredCards.some((sc) => sc.card_id === cardId);
	}

	$: sortedFlashcards = [...flashcards].sort((a, b) => {
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
			sortedFlashcards = [...sortedFlashcards];
		} catch (error) {
			console.error('Error toggling star:', error);
		}
	}
</script>

<div class="w-full flex flex-row gap-5 justify-center mt-5 invisible md:visible"></div>
<div class="flex flex-col items-center mt-5">
	<div class="flex flex-wrap justify-center max-w-5xl gap-4 items-center p-8">
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th></th>
						<th>Term</th>
						<th>Definition</th>
					</tr>
				</thead>
				<tbody>
					{#each sortedFlashcards as flashcard (flashcard.id)}
						<tr>
							<th>
								<button class="btn btn-ghost btn-circle" on:click={() => toggleStar(flashcard)}>
									<Star
										size={24}
										class={isCardStarred(flashcard.id)
											? 'fill-yellow-400 stroke-yellow-400'
											: 'stroke-current'}
									/>
								</button>
							</th>
							<td class="font-semibold">{flashcard.term}</td>
							<td>{flashcard.meaning}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
