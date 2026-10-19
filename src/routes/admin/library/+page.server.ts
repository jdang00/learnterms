import type { PageServerLoad } from './$types';
import { convexLoad } from 'convex-svelte/sveltekit';
import { requireConvexSession } from '$lib/server/convex';
import { api } from '../../../convex/_generated/api';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireConvexSession(locals);
	const userData = await convexLoad(api.users.getUserById, { id: userId });
	const cohortId = userData.data?.cohortId;
	const documents = await convexLoad(
		api.contentLib.getR2DocumentsByCohort,
		cohortId ? { cohortId } : 'skip'
	);
	return { userData, documents };
};
