import { error } from '@sveltejs/kit';
import { findShowcase } from '../showcases';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	if (!findShowcase(params.showcase)) error(404, 'Not found');
	return { slug: params.showcase };
};
