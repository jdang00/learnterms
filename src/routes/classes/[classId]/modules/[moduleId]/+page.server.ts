import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { userId } = locals.auth();

	if (!userId) {
		return redirect(307, '/sign-in');
	}

	const moduleId: string = params.moduleId;

	return { moduleId };
};
