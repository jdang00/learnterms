import supabase from '$lib/supabaseClient';
import type { PageServerLoad } from './$types';

import { error } from '@sveltejs/kit';
import { auth } from '$lib/auth.svelte';

import type { Chapter } from '$lib/types';

export const load: PageServerLoad = async () => {
	const { data: chapters, error: chaptersError } = await supabase
		.from('pharmchapters')
		.select('chapter, name, desc, numprobs');

	if (chaptersError) {
		throw error(500, `Failed to load chapters: ${chaptersError.message}`);
	}

	return {
		chapters: chapters as Chapter[],
		auth
	};
};
