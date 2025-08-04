import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import type { Id } from '../../../../../convex/_generated/dataModel';

export const load: PageServerLoad = async ({ params, locals }) => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL!);

	const { userId } = locals.auth();

	if (!userId) {
		return redirect(307, '/sign-in');
	}

	const moduleId = params.moduleId as Id<'module'>;

	const module = await client.query(api.question.getQuestionsByModule, {
		id: moduleId
	});

	const moduleInfo = await client.query(api.module.getModuleById, {
		id: moduleId
	});

	const convexID = await client.query(api.users.getUserById, {
		id: userId
	});

	return { moduleInfo, module, moduleId, convexID, classId: params.classId };
};
