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

	const client = await authenticatedConvexClient(locals);
	const user = await clerkClient.users.getUser(userId);
	const userData = (await client.query(api.users.getUserById, {
		id: user.id
	})) as ExtendedUser | null;

	if (!userData) {
		return redirect(307, '/classes');
	}

	const role = userData.role ?? 'student';
	if (!(role === 'dev' || role === 'admin')) {
		return redirect(307, '/classes');
	}

	return {
		userData,
		seo: {
			title: 'Badge Catalog — LearnTerms',
			description: 'Admin badge catalog for LearnTerms.'
		}
	};
};
