import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { convexLoad } from 'convex-svelte/sveltekit';
import { api } from '../../../convex/_generated/api';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();

	// Must be logged in to see success page
	if (!userId) {
		throw redirect(307, '/sign-in');
	}

	try {
		const account = await convexLoad(api.polar.getUserWithSubscriptionByClerkId, {
			clerkUserId: userId
		});
		return { account };
	} catch (error) {
		console.error('Failed to load success page data:', error);
		return { account: null };
	}
};
