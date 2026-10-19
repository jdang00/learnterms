import type { PageServerLoad } from './$types';
import { convexLoad } from 'convex-svelte/sveltekit';
import { requireConvexSession } from '#lib/server/convex.js';
import { getErrorText } from '#lib/utils/errorHandling.js';
import { api } from '../../../../../../convex/_generated/api';
import type { Id } from '../../../../../../convex/_generated/dataModel';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireConvexSession(locals);
	try {
		const results = await convexLoad(api.tests.results.getAttemptResults, {
			attemptId: params.attemptId as Id<'quizAttempts'>
		});
		return { results, loadError: null };
	} catch (error) {
		// Not the owner, not submitted yet, or a bad id: the page shows the reason inline.
		return { results: null, loadError: getErrorText(error) };
	}
};
