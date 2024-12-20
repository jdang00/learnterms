// @ts-nocheck
import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import type { Question } from '$lib/types';

export const load = async ({ params }: Parameters<PageServerLoad>[0]) => {
	const chapter: number = parseInt(params.slug);

	const { data: questions, error: questionsError } = await supabase
		.from('pharmquestions')
		.select('question_data')
		.eq('chapter', chapter);

	if (questionsError) {
		throw error(500, `Failed to load questions: ${questionsError.message}`);
	}

	return {
		questions: questions as Question[]
	};
};
