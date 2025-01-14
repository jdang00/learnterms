import { redirect } from '@sveltejs/kit';
import { clerkClient } from 'svelte-clerk/server';
import type { PageServerLoad } from '../dashboard/$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth;

	if (!userId) {
		return redirect(307, '/sign-in');
	}
	const user = await clerkClient.users.getUser(userId);

	return {
		user: JSON.parse(JSON.stringify(user))
	};
};
