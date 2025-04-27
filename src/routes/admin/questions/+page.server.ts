import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();

	if (!userId) {
		return redirect(307, '/sign-in');
	}

	const { data: questions, error: questionsError } = await supabase
		.from('pharmquestions')
		.select('id, question_data, chapter, created_at')
		.order('chapter', { ascending: true });

	if (questionsError) {
		throw error(500, `Failed to load questions: ${questionsError.message}`);
	}

	return {
		questions
	};
};
