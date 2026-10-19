import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { convexLoad } from 'convex-svelte/sveltekit';
import { api } from '../../../convex/_generated/api';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();

	if (!userId) {
		return redirect(307, '/sign-in');
	}
	try {
		const userData = await convexLoad(api.users.getUserById, { id: userId });
		const cohortId = userData.data?.cohortId;
		const students = await convexLoad(
			api.progress.getStudentsWithProgress,
			cohortId ? { cohortId, includeSubscription: false } : 'skip'
		);
		return { userData, students };
	} catch (error) {
		console.error('Failed to load progress page data:', error);
		throw error;
	}
};
