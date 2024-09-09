import supabase from '$lib/supabaseClient';

export async function load() {
	const { data } = await supabase.from('flashcards').select();
	return {
		flashcards: data ?? []
	};
}
