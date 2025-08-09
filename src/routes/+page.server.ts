import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
<<<<<<< HEAD
	const { userId } = locals.auth();
	console.log(userId);
=======
        const auth = locals.auth();
>>>>>>> 5b946e762b8b0d7ceae3b2322bcf05f5446e5d14

	if (userId) {
		return redirect(307, '/classes');
	}
};
