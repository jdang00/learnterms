import supabase from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const user = locals.session;

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

	let data;

	if (!existingUser) {
		const { data: returnData, error: cardsError } = await supabase
			.from('user_cards')
			.select(
				`
          id,
          is_starred,
          flashcards!inner (id, term, meaning, lesson),
          review
      `
			)
			.eq('user_id', '367b2142-deb6-4dcd-87d5-803b49825e04')
			.eq('flashcards.lesson', 4)
			.order('is_starred', { ascending: false });
		data = returnData;

		if (cardsError) {
			console.error('Error fetching cards:', cardsError);
			throw error(500, 'Error fetching cards');
		}
	} else {
		const { data: returnData, error: cardsError } = await supabase
			.from('user_cards')
			.select(
				`
          id,
          is_starred,
          flashcards!inner (id, term, meaning, lesson),
          review
      `
			)
			.eq('user_id', existingUser.id)
			.eq('flashcards.lesson', 4)
			.order('is_starred', { ascending: false });

		data = returnData;

		if (cardsError) {
			console.error('Error fetching cards:', cardsError);
			throw error(500, 'Error fetching cards');
		}
	}
	return {
		flashcards: data ?? []
	};
};
