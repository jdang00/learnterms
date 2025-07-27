import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import { PUBLIC_CONVEX_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ params, locals }) => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL!);

	const { userId } = locals.auth();

	if (!userId) {
		return redirect(307, '/sign-in');
	}

	const moduleId: string = params.moduleId;

	const firstQuestion = await client.query(api.question.getFirstQuestionInModule, {
		id: moduleId
	});

	return { moduleId, firstQuestion };
};
