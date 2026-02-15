import { withClerkHandler } from 'svelte-clerk/server';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from './convex/_generated/api';
const protectAdmin: Handle = async ({ event, resolve }) => {
	const url = new URL(event.request.url);
	if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
		const { userId } = event.locals.auth();
		if (!userId) throw redirect(307, '/sign-in');

		try {
			const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
			const userData = await client.query(api.users.getUserById, { id: userId });
			const role = userData?.role;
			if (!(role === 'dev' || role === 'admin' || role === 'curator')) throw redirect(307, '/');
		} catch (e) {
			if (e && typeof e === 'object' && 'status' in e) throw e;
			throw redirect(307, '/');
		}
	}
	return resolve(event);
};

const protectClasses: Handle = async ({ event, resolve }) => {
	const url = new URL(event.request.url);
	if (url.pathname === '/classes' || url.pathname.startsWith('/classes/')) {
		const { userId } = event.locals.auth();
		if (!userId) {
			return resolve(event);
		}
	}
	return resolve(event);
};

export const handle = sequence(withClerkHandler(), protectClasses, protectAdmin);
