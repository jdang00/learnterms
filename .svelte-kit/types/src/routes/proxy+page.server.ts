// @ts-nocheck
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const user = event.locals.id;
	console.log(user);

	return user;
};

import type { PageServerLoad, Actions } from './$types';

export const load = (event: Parameters<PageServerLoad>[0]) => {
	return {
		user: event.locals.session
	};
};
