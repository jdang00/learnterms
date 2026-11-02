import { dev } from '$app/env';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Study Space is a fixture-only mock; keep it out of production like /design-system.
export const load: PageServerLoad = () => {
	if (!dev) error(404, 'Not found');
	return {};
};
