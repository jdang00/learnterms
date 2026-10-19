import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// The design reference is a development tool; keep it out of production.
export const load: PageServerLoad = () => {
	if (!dev) error(404, 'Not found');
	return {};
};
