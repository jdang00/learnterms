import { error, json } from '@sveltejs/kit';
import { Marp } from '@marp-team/marp-core';
import type { RequestHandler } from './$types';
import { buildMarpDeckMarkdown } from '$lib/admin/content-library/contentLibraryPreview';
import { sanitizeDeckHtml } from '$lib/utils/sanitizeHtml';

const MAX_MARKDOWN_CHARS = 400_000;
const MAX_PAGES = 2_000;

// Marp is a 3 MB client bundle; the admin hook already gates /admin to staff,
// so rendering here keeps the renderer and the deck sanitizer off the client.
const marp = new Marp({ html: false, math: 'katex', inlineSVG: true });

type DeckPage = { pageNumber: number; heading?: string; imageCount: number; tableCount: number };

function parsePages(value: unknown): DeckPage[] {
	if (!Array.isArray(value) || value.length > MAX_PAGES) return [];
	return value.flatMap((page) => {
		if (!page || typeof page !== 'object') return [];
		const { pageNumber, heading, imageCount, tableCount } = page as Record<string, unknown>;
		if (typeof pageNumber !== 'number') return [];
		return [
			{
				pageNumber,
				heading: typeof heading === 'string' ? heading : undefined,
				imageCount: typeof imageCount === 'number' ? imageCount : 0,
				tableCount: typeof tableCount === 'number' ? tableCount : 0
			}
		];
	});
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.auth().userId) error(401, 'Sign in required');
	const body: unknown = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') error(400, 'Expected a JSON body');
	const { title, markdown, pages } = body as Record<string, unknown>;
	if (typeof title !== 'string' || typeof markdown !== 'string') {
		error(400, 'title and markdown are required');
	}
	if (markdown.length > MAX_MARKDOWN_CHARS) error(413, 'Markdown is too large to render');
	const deck = buildMarpDeckMarkdown({ title, markdown, pages: parsePages(pages) });
	const rendered = marp.render(deck);
	return json({ html: sanitizeDeckHtml(rendered.html), css: rendered.css });
};
