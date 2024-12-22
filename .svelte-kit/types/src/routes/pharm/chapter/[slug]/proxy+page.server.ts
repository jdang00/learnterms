// @ts-nocheck
import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import type { Question, Chapter } from './types.ts';

export const load = async ({ params }: Parameters<PageServerLoad>[0]) => {
	const chapter: number = parseInt(params.slug);

	const [questionsQuery, chaptersQuery] = await Promise.all([
		supabase.from('pharmquestions').select('question_data').eq('chapter', chapter),
		supabase
			.from('pharmchapters')
			.select('name, desc, numprobs, chapter')
			.eq('chapter', chapter)
			.limit(1)
			.single()
	]);

	const { data: questions, error: questionsError } = questionsQuery;
	const { data: chapters, error: chaptersError } = chaptersQuery;

	if (questionsError) {
		throw error(500, `Failed to load questions: ${questionsError.message}`);
	}

	if (chaptersError) {
		throw error(500, `Failed to load chapters: ${chaptersError.message}`);
	}

	return {
		questions: questions as Question[],
		chapters: chapters as Chapter
	};
};
