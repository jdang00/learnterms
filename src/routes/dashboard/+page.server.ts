import supabase from '$lib/supabaseClient';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type { Chapter } from '$lib/types';
import { redirect } from '@sveltejs/kit';
import { clerkClient } from 'svelte-clerk/server';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth;

	if (!userId) {
		return redirect(307, '/sign-in');
	}
	const user = await clerkClient.users.getUser(userId);

	const { data: chapters, error: chaptersError } = await supabase
		.from('pharmchapters')
		.select('chapter, name, desc, numprobs, emoji')
		.order('chapter');

	if (chaptersError) {
		throw error(500, `Failed to load chapters: ${chaptersError.message}`);
	}

	return {
		chapters: chapters as Chapter[],
		user: JSON.parse(JSON.stringify(user))
	};
};
