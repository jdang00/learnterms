import type { PageServerLoad } from './$types';
import { clerkClient } from 'svelte-clerk/server';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../convex/_generated/api';

export const load: PageServerLoad = async ({ locals }) => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
	const { userId } = locals.auth();

	const seo = {
		title: 'Pricing — LearnTerms',
		description: 'Choose the right plan for your study needs. Free and Pro plans available.'
	};

	// Not logged in - show pricing page (they can browse)
	if (!userId) {
		return {
			isAuthenticated: false,
			isCuratorOrAdmin: false,
			role: null,
			plan: null,
			seo
		};
	}

	try {
		const user = await clerkClient.users.getUser(userId);
		const userData = await client.query(api.polar.getUserWithSubscriptionByClerkId, {
			clerkUserId: user.id
		});

		const role = userData?.role;
		const isCuratorOrAdmin = role === 'dev' || role === 'admin' || role === 'curator';
		const plan = userData?.isPro ? 'pro' : 'free';

		return {
			isAuthenticated: true,
			isCuratorOrAdmin,
			role: role || 'student',
			plan: plan,
			seo
		};
	} catch (error) {
		console.error('Failed to load pricing page data:', error);
		return {
			isAuthenticated: true,
			isCuratorOrAdmin: false,
			role: 'student',
			plan: null,
			seo
		};
	}
};
