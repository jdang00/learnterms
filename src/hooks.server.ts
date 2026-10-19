import { dev } from '$app/env';
import { getRouteSeo, SITE_ORIGIN } from '#lib/seo.js';
import { withClerkHandler } from 'svelte-clerk/server';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { authenticatedConvexClient } from '#lib/server/convex.js';
import { withServerConvexToken } from 'convex-svelte/sveltekit/server';
import { convexLoadHydration } from 'convex-svelte/sveltekit/server/hydration';
import { api } from './convex/_generated/api';

// Fetch the signed-in user's Convex token once per request and keep it in scope for
// `convexLoad()` and `createConvexHttpClient()` during server rendering.
const convexAuth: Handle = async ({ event, resolve }) => {
	let token: string | undefined;
	const auth = event.locals.auth();
	if (auth.userId) {
		try {
			token = (await auth.getToken({ template: 'convex' })) ?? undefined;
		} catch {
			// Clerk token fetch can fail during outages; the request continues unauthenticated.
		}
	}
	event.locals.convexToken = token;
	return withServerConvexToken(token, () => resolve(event));
};
const protectAdmin: Handle = async ({ event, resolve }) => {
	const url = new URL(event.request.url);
	if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
		const { userId } = event.locals.auth();
		if (!userId) throw redirect(307, '/sign-in');

		try {
			const client = authenticatedConvexClient(event.locals);
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

const siteHygiene: Handle = async ({ event, resolve }) => {
	if (!dev && event.url.hostname === 'www.learnterms.com') {
		const canonicalUrl = new URL(event.url);
		canonicalUrl.protocol = 'https:';
		canonicalUrl.hostname = 'learnterms.com';
		return new Response(null, { status: 308, headers: { Location: canonicalUrl.href } });
	}
	if (!dev && event.url.origin === SITE_ORIGIN && /^\/docs(?:\/|$)/.test(event.url.pathname)) {
		const docsUrl = new URL(event.url);
		docsUrl.hostname = 'docs.learnterms.com';
		docsUrl.pathname =
			{
				'/docs/getting-started': '/docs/quickstart',
				'/docs/lt-models': '/docs/ai/learnterms-models'
			}[event.url.pathname] ?? event.url.pathname;
		return new Response(null, { status: 308, headers: { Location: docsUrl.href } });
	}
	// The Vercel adapter supplies the public request URL after TLS termination.
	// Keep HTTP available to local development servers.
	if (!dev && event.url.protocol === 'http:') {
		const secureUrl = new URL(event.url);
		secureUrl.protocol = 'https:';
		return new Response(null, { status: 308, headers: { Location: secureUrl.href } });
	}
	const response = await resolve(event);
	const headers = new Headers(response.headers);
	if (!dev && event.url.protocol === 'https:') {
		headers.set('Strict-Transport-Security', 'max-age=63072000');
	}
	if (
		event.url.pathname !== '/robots.txt' &&
		event.url.pathname !== '/sitemap.xml' &&
		(event.url.origin !== SITE_ORIGIN ||
			!getRouteSeo(event.route.id, event.url.pathname, response.status).indexable)
	) {
		headers.set('X-Robots-Tag', 'noindex, follow');
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
};

export const handle = sequence(
	siteHygiene,
	withClerkHandler(),
	convexAuth,
	convexLoadHydration,
	protectAdmin
);
