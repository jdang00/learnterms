import type { PageServerLoad } from './$types';
import { convexLoad } from 'convex-svelte/sveltekit';
import { requireConvexSession } from '$lib/server/convex';
import { api } from '../../../../convex/_generated/api';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireConvexSession(locals);
	const userData = await convexLoad(api.users.getUserById, { id: userId });
	const docs = await convexLoad(
		api.contentLib.getIndexedR2DocumentsForRagTester,
		userData.data ? {} : 'skip'
	);
	return { userData, docs };
};
