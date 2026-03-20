import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();
	if (!userId) return redirect(307, '/sign-in');
	return redirect(307, '/admin/badges');
};
