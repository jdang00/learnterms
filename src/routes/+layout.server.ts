import { buildClerkProps } from 'svelte-clerk/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const auth = locals.auth();
	let token: string | null = null;
	try {
		token = await auth.getToken({ template: "convex" });
	} catch {
		// Clerk token fetch can fail for unauthenticated users or during outages
	}
	return {
		token,
		...buildClerkProps(auth),
	};
};
