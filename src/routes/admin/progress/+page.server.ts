import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth;

	if (!userId) {
		return redirect(307, '/sign-in');
	}

	const { data: userProgress, error: progressError } = await supabase
		.from('user_progress_per_chapter')
		.select('*')
		.order('chapter_number', { ascending: true })
		.order('user_id', { ascending: true });

	if (progressError) {
		throw error(500, `Failed to load user progress: ${progressError.message}`);
	}

	return {
		userProgress
	};
};
