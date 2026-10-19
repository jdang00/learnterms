import { isRedirect, redirect } from '@sveltejs/kit';
import { userDisplayName } from '#lib/userDisplayName.js';
import type { PageServerLoad } from './$types';
import { clerkClient } from 'svelte-clerk/server';
import { convexLoad } from 'convex-svelte/sveltekit';
import { authenticatedConvexClient } from '#lib/server/convex.js';
import { api } from '../../convex/_generated/api';

const seo = {
	title: 'Join Your Class — LearnTerms',
	description: 'Enter your class code to access your class’s study resources.',
	image: 'https://learnterms.com/og/join-class?v=2'
};

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();
	if (!userId) {
		return { seo };
	}

	try {
		const client = authenticatedConvexClient(locals);
		const [user, userData] = await Promise.all([
			clerkClient.users.getUser(userId),
			convexLoad(api.users.getUserById, { id: userId }, { keepAlive: false })
		]);
		if (userData.data?.cohortId && userData.data.role !== 'dev') redirect(307, '/classes');
		const primaryEmail = user.emailAddresses?.find(
			(email) => email.id === user.primaryEmailAddressId
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
		} else {
			await client.mutation(api.users.syncUserFromClerk, {
				clerkUserId: user.id,
				name: user.fullName?.trim() || undefined,
				firstName: user.firstName || undefined,
				lastName: user.lastName || undefined,
				email: primaryEmail || undefined,
				username: user.username || undefined,
				imageUrl: user.imageUrl || undefined,
				lastSignInAt: user.lastSignInAt || undefined,
				lastActiveAt: user.lastActiveAt || undefined
			});
		}

		return { seo };
	} catch (error) {
		if (isRedirect(error)) throw error;
		console.error('Failed to prepare join class page:', error);
		throw error;
	}
};
