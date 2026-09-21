import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { redirect } from '@sveltejs/kit';

/** Forward the current session on server-side calls; never fall back to anonymous access. */
export async function authenticatedConvexClient(locals: App.Locals) {
	const auth = locals.auth();
	if (!auth.userId) throw redirect(307, '/sign-in');
	const token = await auth.getToken({ template: 'convex' });
	if (!token) throw redirect(307, '/sign-in');
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
	client.setAuth(token);
	return client;
}
