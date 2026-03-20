import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { PUBLIC_CONVEX_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!PUBLIC_CONVEX_URL) {
		throw new Error('PUBLIC_CONVEX_URL is not configured');
	}
	const { userId } = locals.auth();

	if (!userId) {
		return redirect(307, '/sign-in');
	}
	return { classId: params.classId };
};
