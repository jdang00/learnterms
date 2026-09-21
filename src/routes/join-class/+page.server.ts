import type { PageServerLoad } from './$types';
import { clerkClient } from 'svelte-clerk/server';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../convex/_generated/api';

function displayName(user: Awaited<ReturnType<typeof clerkClient.users.getUser>>) {
	return (
		user.fullName ||
		user.username ||
		user.emailAddresses?.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ||
		'LearnTerms User'
	);
}

const seo = {
	title: 'Join Your Class — LearnTerms',
	description: 'Enter your class code to access your class’s study resources.',
	image: 'https://learnterms.com/og/join-class?v=2'
};

export const load: PageServerLoad = async ({ locals }) => {
	if (!PUBLIC_CONVEX_URL) {
		throw new Error('PUBLIC_CONVEX_URL is not configured');
	}

	const { userId } = locals.auth();
	if (!userId) {
		return { seo };
	}

	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);

	try {
		const user = await clerkClient.users.getUser(userId);
		const userData = await client.query(api.users.getUserById, { id: user.id });
		const primaryEmail = user.emailAddresses?.find(
			(email) => email.id === user.primaryEmailAddressId
		)?.emailAddress;

		if (userData === null) {
			await client.mutation(api.users.addUser, {
				clerkUserId: user.id,
				name: displayName(user),
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
		console.error('Failed to prepare join class page:', error);
		throw error;
	}
};
