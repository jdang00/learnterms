import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';

import type { Question } from '$lib/types';

export const load = async () => {
	const { data: questions, error: questionsError } = await supabase
		.from('pharmquestions')
		.select('question_data');

	if (questionsError) {
		throw error(500, `Failed to load questions: ${questionsError.message}`);
	}

	return {
		questions: questions as Question[]
	};
};
