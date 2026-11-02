import type { Component } from 'svelte';

// Concept drafts: shadcn-svelte pieces composed for places they could live in LearnTerms.
// Nothing here is wired into the product. Each `areas/*.svelte` file exports a `meta`.
export type ConceptAreaMeta = {
	title: string;
	summary: string;
	/** Sidebar and index order. */
	order: number;
};

type AreaModule = { default: Component; meta: ConceptAreaMeta };

const modules = import.meta.glob<AreaModule>('./areas/*.svelte', { eager: true });

export const conceptAreas = Object.entries(modules)
	.map(([path, module]) => ({
		slug: path
			.replace(/^.*\/(.+)\.svelte$/, '$1')
			.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
			.toLowerCase(),
		...module.meta,
		component: module.default
	}))
	.sort((a, b) => a.order - b.order);

export function findConceptArea(slug: string) {
	return conceptAreas.find((area) => area.slug === slug);
}
