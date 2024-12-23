// @ts-nocheck
import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import type { Chapter } from './types.ts';

export const load = async ({}: Parameters<PageServerLoad>[0]) => {
	const { data: chapters, error: chaptersError } = await supabase
		.from('pharmchapters')
		.select('chapter, name, desc, numprobs');

	if (chaptersError) {
		throw error(500, `Failed to load chapters: ${chaptersError.message}`);
	}

	return {
		chapters: chapters as Chapter[]
	};
};
