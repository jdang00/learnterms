import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { clerkClient } from 'svelte-clerk/server';
import { authenticatedConvexClient } from '$lib/server/convex';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';

type ExtendedUser = Doc<'users'> & {
	cohortName?: string | null;
	schoolName?: string | null;
};

export const load: PageServerLoad = async ({ locals }) => {
	if (!PUBLIC_CONVEX_URL) {
		throw new Error('PUBLIC_CONVEX_URL is not configured');
	}

	const { userId } = locals.auth();

	if (!userId) {
		return redirect(307, '/sign-in');
	}
	try {
		const client = await authenticatedConvexClient(locals);
		const user = await clerkClient.users.getUser(userId);
		const userData = (await client.query(api.users.getUserById, { id: user.id })) as ExtendedUser;
		return { userData };
	} catch (error) {
		console.error('Failed to load progress page data:', error);
		throw error;
	}
};
