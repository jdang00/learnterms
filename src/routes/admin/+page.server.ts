import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { clerkClient } from 'svelte-clerk/server';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure authentication is required for this route
	const { userId } = locals.auth;

	// Early return if no user is authenticated
	if (!userId) {
		throw redirect(307, '/sign-in');
	}

	try {
		// Fetch user with error handling
		const user = await clerkClient.users.getUser(userId);

		// Explicit role check with more robust validation
		const userRole = user.publicMetadata.role;
		if (userRole !== 'admin') {
			throw redirect(307, '/');
		}

		// Safely serialize user data
		return {
			user: structuredClone(user)
		};
	} catch (err: unknown) {
		// Type-safe error handling with redirects
		if (err instanceof Error) {
			// Log unexpected errors for server-side tracking
			console.error('Admin route access error:', err.message);
		} else {
			// Handle non-Error objects
			console.error('Unexpected error in admin route:', err);
		}

		// Redirect to home page or sign-in on any error
		throw redirect(307, '/');
	}
};
