import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { clerkClient } from 'svelte-clerk/server';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

export const load: PageServerLoad = async ({ locals, params }) => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL!);
	const moduleId = params.moduleId;

	const { userId } = locals.auth();

	if (!userId) {
		return redirect(307, '/sign-in');
	}
	const user = await clerkClient.users.getUser(userId);

	const userData = await client.query(api.users.getUserById, { id: user.id });

	const questions = await client.query(api.question.getQuestionsByModuleAdmin, {
		id: moduleId as Id<'module'>
	});

	return { userData: userData, questions: questions, moduleId: moduleId };
};
