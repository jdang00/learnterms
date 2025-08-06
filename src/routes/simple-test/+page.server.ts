import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.auth()?.userId;
	
	return {
		auth: {
			authenticated: !!userId,
			userId,
			clerkUser: null,
			error: null
		},
		timestamp: Date.now()
	};
};