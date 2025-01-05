import type { PageServerLoad } from './$types';
import { auth } from '$lib/auth.svelte';

export const load: PageServerLoad = async () => {
	return {
		auth
	};
};
