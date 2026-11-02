import type { Component } from 'svelte';

// Dev-only showcases of UI we've built or reworked. Each `showcases/*.svelte` file exports a
// `meta` and appears at /design-system/<file name in kebab case> and in the sidebar.
export type ShowcaseMeta = {
	title: string;
	summary: string;
	/** ISO date of the last meaningful change, newest first in the sidebar. */
	updated: string;
	/** Files the showcase exercises, so they are easy to find from the page. */
	sources?: string[];
};

type ShowcaseModule = { default: Component; meta: ShowcaseMeta };

const modules = import.meta.glob<ShowcaseModule>('./showcases/*.svelte', { eager: true });

export const showcases = Object.entries(modules)
	.map(([path, module]) => ({
		slug: path
			.replace(/^.*\/(.+)\.svelte$/, '$1')
			.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
			.toLowerCase(),
		...module.meta,
		component: module.default
	}))
	.sort((a, b) => b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title));

export function findShowcase(slug: string) {
	return showcases.find((showcase) => showcase.slug === slug);
}
