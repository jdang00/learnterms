import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { clerkClient } from 'svelte-clerk/server';

import type { Question, Chapter } from '$lib/types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { userId } = locals.auth;

	if (!userId) {
		return redirect(307, '/sign-in');
	}

	const user = await clerkClient.users.getUser(userId);

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
		chapters: chapters as Chapter,
		user: JSON.parse(JSON.stringify(user))
	};
};
