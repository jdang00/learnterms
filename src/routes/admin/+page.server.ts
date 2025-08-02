import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { clerkClient } from 'svelte-clerk/server';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../convex/_generated/api';

export const load: PageServerLoad = async ({ locals }) => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL!);

	const { userId } = locals.auth();

	if (!userId) {
		return redirect(307, '/sign-in');
	}
	const user = await clerkClient.users.getUser(userId);

	const userData = await client.query(api.users.getUserById, { id: user.id });

	return { userData };
};
