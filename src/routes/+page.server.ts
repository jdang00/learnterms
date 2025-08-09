import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();
	console.log(userId);

	if (userId) {
		return redirect(307, '/classes');
	}
};
