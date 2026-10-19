import { createConvexHttpClient } from 'convex-svelte/sveltekit';
import { PUBLIC_CONVEX_URL } from '$app/env/public';
import { redirect } from '@sveltejs/kit';

/** Redirect signed-out visitors before a load reads Convex with the request's token. */
export function requireConvexSession(locals: App.Locals): string {
	const { userId } = locals.auth();
	if (!userId || !locals.convexToken) throw redirect(307, '/sign-in');
	return userId;
}

/** Forward the current session on server-side calls; never fall back to anonymous access. */
export function authenticatedConvexClient(locals: App.Locals) {
	requireConvexSession(locals);
	return createConvexHttpClient({ url: PUBLIC_CONVEX_URL, token: locals.convexToken });
}
