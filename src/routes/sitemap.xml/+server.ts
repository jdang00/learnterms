import { publicPaths, SITE_ORIGIN } from '$lib/seo';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () =>
	new Response(
		`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicPaths.map((path) => `  <url><loc>${SITE_ORIGIN}${path}</loc></url>`).join('\n')}
</urlset>`,
		{
			headers: {
				'Content-Type': 'application/xml; charset=utf-8',
				'Cache-Control': 'public, max-age=3600'
			}
		}
	);
