import { buildClerkProps } from 'svelte-clerk/server';

export const load = ({ locals }) => {
	return {
		...buildClerkProps(locals.auth)
	};
};
