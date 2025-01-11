import { buildClerkProps } from 'svelte-clerk/server';

// To enable Clerk SSR support, add initial state props to the load function
export const load = ({ locals }) => {
	return {
		...buildClerkProps(locals.auth)
	};
};
