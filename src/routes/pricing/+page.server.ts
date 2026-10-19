import type { PageServerLoad } from './$types';
import { convexLoad } from 'convex-svelte/sveltekit';
import { api } from '../../convex/_generated/api';

const seo = {
	title: 'Pricing — LearnTerms',
	description:
		'Explore LearnTerms access for students and subscription options for curators building class-aligned question banks.'
};

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();

	// Not logged in - show pricing page (they can browse)
	if (!userId) {
		return { isAuthenticated: false, account: null, seo };
	}

	try {
		const account = await convexLoad(api.polar.getUserWithSubscriptionByClerkId, {
			clerkUserId: userId
		});
		return { isAuthenticated: true, account, seo };
	} catch (error) {
		console.error('Failed to load pricing page data:', error);
		return { isAuthenticated: true, account: null, seo };
	}
};
