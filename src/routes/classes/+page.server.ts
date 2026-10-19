import { userDisplayName } from '#lib/userDisplayName.js';
import type { PageServerLoad } from './$types';
import { isRedirect, redirect } from '@sveltejs/kit';
import { clerkClient } from 'svelte-clerk/server';
import { convexLoad } from 'convex-svelte/sveltekit';
import { authenticatedConvexClient } from '#lib/server/convex.js';
import { api } from '../../convex/_generated/api';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();

	if (!userId) {
		return redirect(307, '/sign-in');
	}

	try {
		const client = authenticatedConvexClient(locals);
		const [user, userData] = await Promise.all([
			clerkClient.users.getUser(userId),
			convexLoad(api.users.getUserById, { id: userId })
		]);

		// Extract primary email
		const primaryEmail = user.emailAddresses?.find(
			(e) => e.id === user.primaryEmailAddressId
		)?.emailAddress;

		if (userData.data === null) {
			await client.mutation(api.users.addUser, {
				clerkUserId: user.id,
				name: userDisplayName(user),
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
		} else if (userData.data?.cohortId === undefined) {
			return redirect(307, '/join-class');
		}

		const [classes, featureAnnouncement, overview] = await Promise.all([
			convexLoad(api.class.getUserClasses, { id: userData.data.cohortId }),
			convexLoad(api.featureAnnouncements.getCurrentForViewer, {}),
			convexLoad(api.studyOverview.getMine, {}),
			client.mutation(api.users.syncUserFromClerk, {
				clerkUserId: user.id,
				name: user.fullName?.trim() || undefined,
				firstName: user.firstName || undefined,
				lastName: user.lastName || undefined,
				email: primaryEmail || undefined,
				username: user.username || undefined,
				imageUrl: user.imageUrl || undefined,
				lastSignInAt: user.lastSignInAt || undefined,
				lastActiveAt: user.lastActiveAt || undefined
			})
		]);

		return {
			userData,
			classes,
			featureAnnouncement,
			overview,
			seo: {
				title: 'My Classes — LearnTerms',
				description: 'View and manage your classes on LearnTerms.'
			}
		};
	} catch (error) {
		if (isRedirect(error)) throw error;
		console.error('Failed to load classes page data:', error);
		throw error;
	}
};
