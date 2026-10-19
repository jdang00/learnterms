import type { PageServerLoad } from './$types';
import { convexLoad } from 'convex-svelte/sveltekit';
import { requireConvexSession } from '#lib/server/convex.js';
import { getErrorText } from '#lib/utils/errorHandling.js';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireConvexSession(locals);
	try {
		const runner = await convexLoad(api.tests.attempts.getAttemptRunnerBundle, {
			attemptId: params.attemptId as Id<'quizAttempts'>
		});
		return { runner, loadError: null };
	} catch (error) {
		// Not the owner, no access, or a bad id: the page shows the reason inline.
		return { runner: null, loadError: getErrorText(error) };
	}
};
