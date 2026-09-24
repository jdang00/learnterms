import { describe, expect, test } from 'bun:test';
import { Glob } from 'bun';
import { getRouteSeo, publicPaths, SITE_ORIGIN } from '../src/lib/seo';

describe('route metadata and indexing', () => {
	test('every page has specific metadata', async () => {
		for await (const file of new Glob('**/+page.svelte').scan('src/routes')) {
			const route = '/' + file.replace(/\/?\+page\.svelte$/, '');
			const seo = getRouteSeo(route, route);
			expect(seo.title, route).not.toBe('LearnTerms');
			expect(seo.description, route).not.toBe(
				'Study and manage your class-aligned learning materials on LearnTerms.'
			);
		}
	});
	test('the sitemap contains only indexable public pages', () => {
		const titles = new Set<string>();
		const descriptions = new Set<string>();
		for (const path of publicPaths) {
			const seo = getRouteSeo(path, path);
			expect(seo.indexable).toBe(true);
			expect(seo.canonical).toBe(`${SITE_ORIGIN}${path}`);
			expect(titles.has(seo.title), path).toBe(false);
			expect(descriptions.has(seo.description), path).toBe(false);
			titles.add(seo.title);
			descriptions.add(seo.description);
		}
		for (const path of [
			'/admin',
			'/classes',
			'/sign-in',
			'/join-class',
			'/cohort',
			'/pricing/success',
			'/study-space',
			'/status',
			'/docs',
			'/docs/getting-started'
		]) {
			expect(publicPaths as readonly string[]).not.toContain(path);
			expect(getRouteSeo(path, path).indexable).toBe(false);
		}
	});
	test('errors never inherit a public page title or indexing', () => {
		for (const status of [404, 500]) {
			const seo = getRouteSeo('/pricing', '/pricing', status);
			expect(seo.indexable).toBe(false);
			expect(seo.title).not.toContain('Pricing');
		}
		expect(getRouteSeo(null, '/missing', 404).title).toContain('Page Not Found');
	});
	test('canonical URLs use the production origin', () => {
		expect(getRouteSeo('/', '/').title).toBe('LearnTerms | Smarter Studying, Simplified');
		expect(getRouteSeo('/privacy', '/privacy/').canonical).toBe(`${SITE_ORIGIN}/privacy`);
	});
});
