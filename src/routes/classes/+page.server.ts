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

		// Extract primary email
		const primaryEmail = user.emailAddresses?.find(
			(e) => e.id === user.primaryEmailAddressId
		)?.emailAddress;

		if (userData === null && user.fullName) {
			await client.mutation(api.users.addUser, {
				clerkUserId: user.id,
				name: user.fullName,
				firstName: user.firstName || undefined,
				lastName: user.lastName || undefined,
				email: primaryEmail || undefined,
				username: user.username || undefined,
				imageUrl: user.imageUrl || undefined,
				lastSignInAt: user.lastSignInAt || undefined,
				createdAt: user.createdAt || undefined,
				lastActiveAt: user.lastActiveAt || undefined
			});
			return redirect(307, '/join-class');
		} else if (userData?.cohortId === undefined) {
			return redirect(307, '/join-class');
		} else {
			await client.mutation(api.users.syncUserFromClerk, {
				clerkUserId: user.id,
				firstName: user.firstName || undefined,
				lastName: user.lastName || undefined,
				email: primaryEmail || undefined,
				username: user.username || undefined,
				imageUrl: user.imageUrl || undefined,
				lastSignInAt: user.lastSignInAt || undefined,
				lastActiveAt: user.lastActiveAt || undefined
			});
		}

		return {
			userData,
			seo: {
				title: 'My Classes — LearnTerms',
				description: 'View and manage your classes on LearnTerms.'
			}
		};
	} catch (error) {
		console.error('Failed to load classes page data:', error);
		throw error;
	}
};
