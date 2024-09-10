import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const user = locals.session;
	console.log(user);

	let existingUser;

	if (user) {
		const { data: foundUser, error: userError } = await supabase
			.from('users')
			.select()
			.eq('clerk_user_id', user.userId)
			.single();

		if (userError && userError.code !== 'PGRST116') {
			console.error('Error checking for existing user:', userError);
			throw error(500, 'Error checking user status');
		}

		if (!foundUser) {
			const { data: newUser, error: insertError } = await supabase
				.from('users')
				.insert({ clerk_user_id: user.userId })
				.select()
				.single();

			if (insertError) {
				console.error('Error creating new user:', insertError);
				throw error(500, 'Error creating new user');
			}

			existingUser = newUser;
		} else {
			existingUser = foundUser;
		}
	}

	if (!existingUser) {
		throw error(401, 'User not authenticated');
	}

	const { data: data, error: cardsError } = await supabase
		.from('user_cards')
		.select(
			`
          card_id,
          is_starred,
          flashcards!inner (id, term, meaning, lesson)
      `
		)
		.eq('user_id', existingUser.id)
		.order('is_starred', { ascending: false });

	if (cardsError) {
		console.error('Error fetching cards:', cardsError);
		throw error(500, 'Error fetching cards');
	}
	return {
		flashcards: data ?? []
	};
};
