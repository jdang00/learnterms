import { withClerkHandler, clerkClient } from 'svelte-clerk/server';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const protectAdmin: Handle = async ({ event, resolve }) => {
	const url = new URL(event.request.url);
	if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
		const { userId } = event.locals.auth();
		if (!userId) throw redirect(307, '/sign-in');

		try {
			const user = await clerkClient.users.getUser(userId);
			const publicMetadata = user?.publicMetadata;

			let isAdmin = false;
			if (publicMetadata && typeof publicMetadata === 'object' && !Array.isArray(publicMetadata)) {
				const roleValue = (publicMetadata as Record<string, unknown>).role;
				const createValue = (publicMetadata as Record<string, unknown>).create;
				const role = typeof roleValue === 'string' ? roleValue : undefined;
				const create = typeof createValue === 'string' ? createValue : undefined;
				isAdmin = role === 'admin' || create === 'contributor';
			}

			if (!isAdmin) throw redirect(307, '/');
		} catch {
			throw redirect(307, '/');
		}
	}
	return resolve(event);
};

const protectClasses: Handle = async ({ event, resolve }) => {
	const url = new URL(event.request.url);
	if (url.pathname === '/classes' || url.pathname.startsWith('/classes/')) {
		const { userId } = event.locals.auth();
		if (!userId) throw redirect(307, '/');
	}
	return resolve(event);
};

export const handle = sequence(withClerkHandler(), protectClasses, protectAdmin);
