import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { convexLoad } from 'convex-svelte/sveltekit';
import { api } from '../../../convex/_generated/api';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();
	if (!userId) {
		return redirect(307, '/sign-in');
	}

	const userData = await convexLoad(api.users.getUserById, { id: userId });

	if (!userData.data) {
		return redirect(307, '/classes');
	}

	const role = userData.data.role ?? 'student';
	if (!(role === 'dev' || role === 'admin')) {
		return redirect(307, '/classes');
	}

	return {
		userData,
		seo: {
			title: 'Badge Catalog — LearnTerms',
			description: 'Admin badge catalog for LearnTerms.'
		}
	};
};
