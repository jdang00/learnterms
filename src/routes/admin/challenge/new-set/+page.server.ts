// src/routes/admin/challenge/new-set/+page.server.ts
import type { PageServerLoad } from './$types';
import supabase from '$lib/supabaseClient'; // Adjust path if necessary
import { error } from '@sveltejs/kit';

// Define a type for clarity
type ChapterInfo = {
	id: number; // The 'chapter' column (int2)
	name: string | null; // The 'name' column (varchar)
};

export const load: PageServerLoad = async () => {
	console.log('Loading existing chapters from pharmchapters...');

	// Fetch chapter ID and name from the pharmchapters table
	const { data, error: dbError } = await supabase
		.from('pharmchapters')
		.select('chapter, name') // Select the ID and name
		.order('chapter', { ascending: true }); // Sort by chapter number

	if (dbError) {
		console.error('Error fetching chapters:', dbError);
		error(500, 'Failed to load existing chapters from the database.');
	}

	// Map the data to the ChapterInfo type
	const existingChapters: ChapterInfo[] =
		data?.map((item) => ({
			id: item.chapter,
			// Provide a default name if null/empty, or adjust as needed
			name: item.name || `Chapter ${item.chapter}`
		})) || [];

	console.log('Loaded chapters:', existingChapters);

	return {
		// Pass the array of chapter objects to the page
		existingChapters: existingChapters
	};
};
