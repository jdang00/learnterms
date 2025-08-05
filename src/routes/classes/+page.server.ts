import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { clerkClient } from 'svelte-clerk/server';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../convex/_generated/api';

export const load: PageServerLoad = async ({ locals }) => {
	if (!PUBLIC_CONVEX_URL) {
		throw new Error('PUBLIC_CONVEX_URL is not configured');
	}
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);

	const { userId } = locals.auth();

	if (!userId) {
		return redirect(307, '/sign-in');
	}
	try {
		const user = await clerkClient.users.getUser(userId);
		const userData = await client.query(api.users.getUserById, { id: user.id });

		if (userData === null && user.fullName != null) {
			await client.mutation(api.users.addUser, { clerkUserId: user.id, name: user.fullName });
			return redirect(307, '/join-class');
		} else if (userData?.cohortId === undefined) {
			return redirect(307, '/join-class');
		}

		return { userData };
	} catch (error) {
		console.error('Failed to load classes page data:', error);
		throw error;
	}
};
