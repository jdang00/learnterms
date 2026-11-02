import { error } from '@sveltejs/kit';
import { findConceptArea } from '../registry';

export function load({ params }) {
	if (!findConceptArea(params.area)) error(404, 'No concepts for that area');
	return { area: params.area };
}
