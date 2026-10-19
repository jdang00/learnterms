import { requireConvexSession } from '$lib/server/convex';
import { convexLoad } from 'convex-svelte/sveltekit';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = requireConvexSession(locals);
	const classId = params.classId as Id<'class'>;
	try {
		// The module list requires class staff, so it doubles as the access gate.
		const [modules, classInfo, userData, subscription] = await Promise.all([
			convexLoad(api.module.getAdminModulesWithQuestionCounts, { classId }),
			convexLoad(api.class.getClassById, { id: classId }),
			convexLoad(api.users.getUserById, { id: userId }),
			convexLoad(api.polar.getCurrentUserWithSubscription, {})
		]);
		return { classId: params.classId, modules, classInfo, userData, subscription };
	} catch {
		redirect(307, '/admin');
	}
};
