import { resolve } from '$app/paths';

// resolve() only accepts literal app paths; quick links are paths stored in Convex.
const resolvePath = resolve as (pathname: string) => string;

/** Quick links are stored with a leading slash ("/classes"); resolve() takes paths without it. */
export function resolveQuickLink(href: string) {
	return resolvePath(href.replace(/^\//, ''));
}
