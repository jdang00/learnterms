import type { PageServerLoad } from './$types';
import { convexLoad } from 'convex-svelte/sveltekit';
import { requireConvexSession } from '$lib/server/convex';
import { api } from '../../../convex/_generated/api';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireConvexSession(locals);
	const [convexUser, semesters, currentGenerationJob] = await Promise.all([
		convexLoad(api.users.getUserById, { id: userId }),
		convexLoad(api.semester.getAllSemesters, {}),
		convexLoad(api.questionStudio.jobs.getCurrentGenerationJob, {})
	]);
	const cohortId = convexUser.data?.cohortId;
	const classes = await convexLoad(api.class.getUserClasses, cohortId ? { id: cohortId } : 'skip');
	return { convexUser, semesters, currentGenerationJob, classes };
};
