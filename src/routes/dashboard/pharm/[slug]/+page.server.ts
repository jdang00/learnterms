import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { clerkClient } from 'svelte-clerk/server';
import { SECRET_USER_TABLE } from '$env/static/private';

import type { Question, Chapter, QuestionProgress } from '$lib/types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { userId } = locals.auth;

	if (!userId) {
		return redirect(307, '/sign-in');
	}

	const user = await clerkClient.users.getUser(userId);

	const { data: userInTable, error: userCheckError } = await supabase
		.from(SECRET_USER_TABLE)
		.select('clerk_user_id')
		.eq('clerk_user_id', userId)
		.single();

	if (userCheckError && userCheckError.code !== 'PGRST116') {
		throw error(500, `Error checking user in table: ${userCheckError.message}`);
	}

	if (!userInTable) {
		const { error: insertError } = await supabase.from(SECRET_USER_TABLE).insert([
			{
				clerk_user_id: userId,
				name: user.fullName,
				email: user.primaryEmailAddress?.emailAddress
			}
		]);

		if (insertError) {
			throw error(500, `Error inserting user into table: ${insertError.message}`);
		}
	}

	const chapter: number = parseInt(params.slug);

	const [questionsQuery, chaptersQuery] = await Promise.all([
		supabase.from('pharmquestions').select('id, question_data').eq('chapter', chapter),
		supabase
			.from('pharmchapters')
			.select('name, desc, numprobs, chapter')
			.eq('chapter', chapter)
			.limit(1)
			.single()
	]);

	const { data: questions, error: questionsError } = questionsQuery;
	const { data: chapters, error: chaptersError } = chaptersQuery;

	if (questionsError) throw error(500, `Failed to load questions: ${questionsError.message}`);
	if (chaptersError) throw error(500, `Failed to load chapters: ${chaptersError.message}`);

	// Get question IDs for the current chapter
	const questionIds = questions?.map((q) => q.id) || [];

	// Get progress only for these questions
	const { data: progressData, error: progressDataError } = await supabase
		.from('user_question_interactions')
		.select('question_id, selected_options, eliminated_options, is_flagged')
		.eq('user_id', userId)
		.in('question_id', questionIds); // Use the extracted IDs

	if (progressDataError) {
		throw error(500, `Failed to load progress: ${progressDataError.message}`);
	}

	return {
		progressData: progressData as QuestionProgress[],
		userId: userId,
		questions: questions as Question[],
		chapters: chapters as Chapter,
		user: JSON.parse(JSON.stringify(user))
	};
};
