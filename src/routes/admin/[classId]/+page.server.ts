import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { clerkClient } from 'svelte-clerk/server';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!PUBLIC_CONVEX_URL) {
		throw new Error('PUBLIC_CONVEX_URL is not configured');
	}
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
	const classId = params.classId;

	const { userId } = locals.auth();

	if (!userId) {
		return redirect(307, '/sign-in');
	}
	try {
		const user = await clerkClient.users.getUser(userId);
		const userData = await client.query(api.users.getUserById, { id: user.id });
		const modules = await client.query(api.module.getAdminModulesWithQuestionCounts, {
			classId: classId as Id<'class'>
		});
		return { userData: userData, modules: modules, classId: classId };
	} catch (error) {
		console.error('Failed to load class admin page data:', error);
		throw error;
	}
};
