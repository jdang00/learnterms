import { buildClerkProps } from 'svelte-clerk/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const auth = locals.auth();
	const token = await auth.getToken({ template: "convex" });
	return {
		token,
		...buildClerkProps(auth),
	};
};
