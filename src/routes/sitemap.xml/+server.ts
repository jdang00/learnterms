import type { RequestHandler } from './$types';

const staticPaths = [
  '/',
  '/pricing',
  '/changelog',
  '/docs',
  '/blog',
  '/status',
  '/about-us',
  '/contact',
  '/sign-in',
  '/sign-up',
  '/join-class'
];

export const GET: RequestHandler = async ({ url }) => {
  const origin = url?.origin || 'https://learnterms.com';
  const urls = staticPaths.map((p) => `  <url><loc>${origin}${p}</loc></url>`).join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' }
  });
};


