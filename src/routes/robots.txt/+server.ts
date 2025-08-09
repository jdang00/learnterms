import type { RequestHandler } from './$types';

const origin = 'https://learnterms.com';

export const GET: RequestHandler = async () => {
  const body = `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' }
  });
};


