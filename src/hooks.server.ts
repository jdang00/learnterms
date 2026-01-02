import { withClerkHandler, clerkClient } from 'svelte-clerk/server';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const POSTHOG_HOST = 'https://us.i.posthog.com';

const posthogProxy: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Proxy requests to /ingest/* to PostHog
	if (pathname.startsWith('/ingest/')) {
		const posthogPath = pathname.replace('/ingest', '');
		const posthogUrl = `${POSTHOG_HOST}${posthogPath}${event.url.search}`;

		const headers = new Headers(event.request.headers);
		headers.delete('host');

		const response = await fetch(posthogUrl, {
			method: event.request.method,
			headers,
			body: event.request.method !== 'GET' ? await event.request.text() : undefined
		});

		return new Response(response.body, {
			status: response.status,
			headers: response.headers
		});
	}

	// Also handle the static assets path
	if (pathname.startsWith('/ingest')) {
		const posthogPath = pathname.replace('/ingest', '');
		const posthogUrl = posthogPath
			? `${POSTHOG_HOST}${posthogPath}${event.url.search}`
			: `${POSTHOG_HOST}${event.url.search}`;

		const headers = new Headers(event.request.headers);
		headers.delete('host');

		const response = await fetch(posthogUrl, {
			method: event.request.method,
			headers,
			body: event.request.method !== 'GET' ? await event.request.text() : undefined
		});

		return new Response(response.body, {
			status: response.status,
			headers: response.headers
		});
	}

	return resolve(event);
};

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

export const handle = sequence(posthogProxy, withClerkHandler(), protectClasses, protectAdmin);
