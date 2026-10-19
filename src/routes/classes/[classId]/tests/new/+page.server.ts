import type { PageServerLoad } from './$types';
import { convexLoad } from 'convex-svelte/sveltekit';
import { requireConvexSession } from '$lib/server/convex';
import { getErrorText } from '$lib/utils/errorHandling';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireConvexSession(locals);
	const classId = params.classId as Id<'class'>;
	try {
		const [builder, attempts] = await Promise.all([
			convexLoad(api.tests.builder.getClassQuizBuilderData, { classId }),
			convexLoad(api.tests.results.getUserAttemptsForClass, { classId })
		]);
		return { builder, attempts, loadError: null };
	} catch (error) {
		// No access to the class or a bad id: the page shows the reason inline.
		return { builder: null, attempts: null, loadError: getErrorText(error) };
	}
};
