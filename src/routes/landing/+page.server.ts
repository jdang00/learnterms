import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = ({ url }) => {
	redirect(308, `/${url.search}`);
};
