import { buildClerkProps } from 'svelte-clerk/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const auth = locals.auth();
	return {
		// Minted once per request in hooks.server.ts; keeps Convex signed in while Clerk loads.
		token: locals.convexToken ?? null,
		...buildClerkProps(auth)
	};
};
