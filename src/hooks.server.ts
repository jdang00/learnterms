import { sequence } from '@sveltejs/kit/hooks';
import { handleClerk } from 'clerk-sveltekit/server';
import { auth } from '$lib/auth.svelte';
import { CLERK_SECRET_KEY } from '$env/static/private';

export const handle = sequence(
	handleClerk(CLERK_SECRET_KEY, {
		debug: true,
		protectedPaths: ['/admin', '/pharm'],
		signInUrl: '/sign-in'
	}),
	async ({ event, resolve }) => {
		const user = event.locals.session;

		auth.loggedIn = !!user;
		auth.userName = user?.claims?.userName || 'Guest';

		return resolve(event);
	}
);
