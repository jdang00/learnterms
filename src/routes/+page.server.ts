import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';
import { PRIVATE_FLASHCARD_TABLE } from '$env/static/private';
import { PUBLIC_LESSON } from '$env/static/public';

type Flashcard = {
	id: string;
	term: string;
	meaning: string;
	lesson: number;
};

export const load = async ({ locals }) => {
	const user = locals.session;

	const { data: allFlashcards, error: flashcardsError } = await supabase
		.from(PRIVATE_FLASHCARD_TABLE)
		.select('id, term, meaning, lesson')
		.eq('lesson', PUBLIC_LESSON)
		.returns<Flashcard[]>();
	if (flashcardsError) {
		console.error('Error fetching flashcards:', flashcardsError);
		throw error(500, 'Error fetching flashcards');
	}

	return {
		flashcards: allFlashcards ?? []
	};
};
