import type { LayoutLoad } from './$types';

export const ssr = true;
export const csr = true;
export const trailingSlash = 'never';

export const load: LayoutLoad = async ({ data }) => {
	return { ...data };
};
