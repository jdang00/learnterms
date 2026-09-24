import type { RequestHandler } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { createElement as h } from 'react';
import { ogText, ogTitle, renderOgCard } from '$lib/server/ogCard';

export const GET: RequestHandler = async ({ params, getClientAddress, fetch }) => {
	const ip = getClientAddress();
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);

	const rateLimitResult = await client.mutation(api.ogRateLimit.checkOgRateLimit, { key: ip });
	if (!rateLimitResult.ok) {
		const retryAfterMs = rateLimitResult.retryAfter ?? 60_000;
		return new Response('Too Many Requests', {
			status: 429,
			headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) }
		});
	}
	const moduleId = params.moduleId as Id<'module'>;

	let moduleData;
	try {
		moduleData = await client.query(api.publicQueries.getModuleMetadata, { id: moduleId });
	} catch {
		return new Response('Not Found', { status: 404 });
	}

	if (!moduleData) {
		return new Response('Not Found', { status: 404 });
	}

	const { title, emoji: rawEmoji, description, questionCount, className, classCode } = moduleData;
	const emoji = rawEmoji || '\u{1F4DA}'; // 📚 fallback (matches codebase default)

	const truncatedDesc = description.length > 140 ? description.slice(0, 137) + '...' : description;

	const metaParts = [
		classCode,
		className,
		`${questionCount} question${questionCount !== 1 ? 's' : ''}`
	].filter(Boolean);

	return renderOgCard(fetch, {
		body: [
			h('div', { style: { fontSize: '56px', lineHeight: 1 } }, emoji),
			ogTitle(title),
			ogText(truncatedDesc)
		],
		footer: [h('div', {}, metaParts.join('  ·  ')), h('div', {}, 'learnterms.com')]
	});
};
