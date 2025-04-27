import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { clerkClient } from 'svelte-clerk/server';
import { SECRET_USER_TABLE } from '$env/static/private';
import type { ChallengeQuestion, Chapter, QuestionProgress } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
	// Extract userId from locals.auth
	const { userId } = locals.auth();

	// Redirect to sign-in if no userId is present
	if (!userId) {
		return redirect(307, '/sign-in');
	}

	// Fetch user details from Clerk
	const user = await clerkClient.users.getUser(userId);

	// Check if the user exists in the SECRET_USER_TABLE
	const { data: userInTable, error: userCheckError } = await supabase
		.from(SECRET_USER_TABLE)
		.select('clerk_user_id')
		.eq('clerk_user_id', userId)
		.single();

	if (userCheckError && userCheckError.code !== 'PGRST116') {
		throw error(500, `Error checking user in table: ${userCheckError.message}`);
	}

	// Insert user into the table if they don’t exist
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

	const { data: pharmchallengeData, error: pharmchallengeError } = await supabase
		.from('pharmchallenge')
		.select('*')
		.in('chapter', [5, 13, 14, 15])
		.order('created_at', { ascending: true });

	if (pharmchallengeError) {
		throw error(500, `Failed to load pharmchallenge data: ${pharmchallengeError.message}`);
	}

	// Extract question IDs from pharmchallengeData
	const questionIds = pharmchallengeData?.map((item) => item.id) || [];

	// Fetch user progress for challenge questions from 'user_challenge_interactions'
	const { data: progressData, error: progressDataError } = await supabase
		.from('user_challenge_interactions')
		.select('question_id, selected_options, eliminated_options, is_flagged')
		.eq('user_id', userId)
		.in('question_id', questionIds);

	if (progressDataError) {
		throw error(500, `Failed to load challenge progress: ${progressDataError.message}`);
	}

	// Define mock chapters as a single Chapter object
	const mockChapters: Chapter = {
		name: 'Challenge Questions',
		desc: 'Can you answer these challenge questions? 🧠',
		numprobs: pharmchallengeData ? pharmchallengeData.length : 0,
		chapter: 0,
		emoji: '📚'
	};

	// Return the data with consistent types
	return {
		progressData: progressData as QuestionProgress[],
		userId: userId,
		questions: pharmchallengeData as ChallengeQuestion[],
		chapters: mockChapters,
		user: JSON.parse(JSON.stringify(user))
	};
};
