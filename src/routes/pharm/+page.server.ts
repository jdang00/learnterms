import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';

import type { Chapter, authLog } from '$lib/types';

export const load = async ({ locals }) => {
	const user = locals.session;
	console.log(user);

	const log: authLog = {
		loggedIn: true,
		userName: user.claims.userName
	};

	const { data: chapters, error: chaptersError } = await supabase
		.from('pharmchapters')
		.select('chapter, name, desc, numprobs');

	if (chaptersError) {
		throw error(500, `Failed to load chapters: ${chaptersError.message}`);
	}

	return {
		chapters: chapters as Chapter[],
		log
	};
};
