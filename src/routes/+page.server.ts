import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';
import { PRIVATE_FLASHCARD_TABLE, PRIVATE_USER_TABLE } from '$env/static/private';
import { PUBLIC_LESSON } from '$env/static/public';

type Flashcard = {
	id: string;
	term: string;
	meaning: string;
	lesson: number;
};

export const load = async ({ locals }) => {
	const user = locals.session;
	let userid = '';

	const { data: allFlashcards, error: flashcardsError } = await supabase
		.from(PRIVATE_FLASHCARD_TABLE)
		.select('id, term, meaning, lesson')
		.eq('lesson', PUBLIC_LESSON)
		.returns<Flashcard[]>();
	if (flashcardsError) {
		console.error('Error fetching flashcards:', flashcardsError);
		throw error(500, 'Error fetching flashcards');
	}

	// Calling users table twice. Considering fixing to call once and get data
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
			const { error: insertError } = await supabase
				.from(PRIVATE_USER_TABLE)
				.insert({ clerk_user_id: user.userId, name: user.claims.userName })
				.select()
				.single();

			if (insertError) {
				console.error('Error creating new user:', insertError);
				throw error(500, 'Error creating new user');
			}
		}

		if (user) {
			const { data: userID } = await supabase
				.from(PRIVATE_USER_TABLE)
				.select('id')
				.eq('clerk_user_id', user.userId);

			const userIdValue = userID?.[0]?.id || null;
			userid = userIdValue;
		}
	}

	return {
		flashcards: allFlashcards ?? [],
		user: userid
	};
};
