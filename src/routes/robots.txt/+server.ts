import { SITE_ORIGIN } from '$lib/seo';
import type { RequestHandler } from './$types';

// Allow HTML crawling so search engines can see account pages' noindex tags.
// Authentication, not robots.txt, controls access to private data.
export const GET: RequestHandler = ({ url }) =>
	new Response(
		url.origin === SITE_ORIGIN
			? `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`
			: 'User-agent: *\nDisallow: /\n',
		{
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'public, max-age=3600'
			}
		}
	);
