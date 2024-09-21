import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';
import {
	PRIVATE_USERCARD_TABLE,
	PRIVATE_USER_TABLE,
	PRIVATE_FLASHCARD_TABLE
} from '$env/static/private';

type Flashcard = {
	id: string;
	term: string;
	meaning: string;
	lesson: number;
};

type StarredCard = {
	id: string;
	card_id: string;
	review: boolean;
};

export const load = async ({ locals }) => {
	const user = locals.session;

	let existingUser;
	let id;
	if (user) {
		const { data: foundUser, error: userError } = await supabase
			.from(PRIVATE_USER_TABLE)
			.select()
			.eq('clerk_user_id', user.userId)
			.single();

		if (userError && userError.code !== 'PGRST116') {
			console.error('Error checking for existing user:', userError);
			throw error(500, 'Error checking user status');
		}

		if (!foundUser) {
			const { data: newUser, error: insertError } = await supabase
				.from(PRIVATE_USER_TABLE)
				.insert({ clerk_user_id: user.userId })
				.select()
				.single();

			if (insertError) {
				console.error('Error creating new user:', insertError);
				throw error(500, 'Error creating new user');
			}

			existingUser = newUser;
		} else {
			id = foundUser.id;
			existingUser = foundUser;
		}
	}

	const { data: allFlashcards, error: flashcardsError } = await supabase
		.from(PRIVATE_FLASHCARD_TABLE)
		.select('id, term, meaning, lesson')
		.eq('lesson', 4)
		.returns<Flashcard[]>();
	if (flashcardsError) {
		console.error('Error fetching flashcards:', flashcardsError);
		throw error(500, 'Error fetching flashcards');
	}

	let starredCards: StarredCard[] = [];

	if (existingUser) {
		const { data: userStarredCards, error: starredCardsError } = await supabase
			.from(PRIVATE_USERCARD_TABLE)
			.select('id, card_id, review')
			.eq('user_id', existingUser.id)
			.returns<StarredCard[]>();

		if (starredCardsError) {
			console.error('Error fetching starred cards:', starredCardsError);
			throw error(500, 'Error fetching starred cards');
		}

		starredCards = userStarredCards ?? [];
	}

	return {
		flashcards: allFlashcards ?? [],
		starredCards: starredCards,
		userID: id
	};
};
