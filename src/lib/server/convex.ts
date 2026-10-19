import { createConvexHttpClient } from 'convex-svelte/sveltekit';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { redirect } from '@sveltejs/kit';

/** Forward the current session on server-side calls; never fall back to anonymous access. */
export function authenticatedConvexClient(locals: App.Locals) {
	if (!locals.auth().userId || !locals.convexToken) throw redirect(307, '/sign-in');
	return createConvexHttpClient({ url: PUBLIC_CONVEX_URL, token: locals.convexToken });
}
