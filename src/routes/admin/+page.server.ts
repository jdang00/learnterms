import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { data: questions, error: questionsError } = await supabase
		.from('pharmquestions')
		.select('id, question_data, chapter')
		.order('chapter', { ascending: true });

	if (questionsError) {
		throw error(500, `Failed to load questions: ${questionsError.message}`);
	}

	return {
		questions
	};
};
