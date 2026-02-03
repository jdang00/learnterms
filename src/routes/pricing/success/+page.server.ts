import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { clerkClient } from 'svelte-clerk/server';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../../convex/_generated/api';

export const load: PageServerLoad = async ({ locals }) => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
	const { userId } = locals.auth();

	// Must be logged in to see success page
	if (!userId) {
		throw redirect(307, '/sign-in');
	}

	try {
		const user = await clerkClient.users.getUser(userId);
		const userData = await client.query(api.polar.getUserWithSubscriptionByClerkId, {
			clerkUserId: user.id
		});

		return {
			userName: userData?.firstName || userData?.name || 'there',
			plan: userData?.isPro ? 'pro' : 'free'
		};
	} catch (error) {
		console.error('Failed to load success page data:', error);
		return {
			userName: 'there',
			plan: null
		};
	}
};
