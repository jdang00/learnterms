import type { RequestHandler } from '@sveltejs/kit';
import { createElement as h } from 'react';
import { og, ogText, ogTitle, renderOgCard } from '$lib/server/ogCard';

export const GET: RequestHandler = ({ fetch }) =>
	renderOgCard(fetch, {
		body: [
			ogTitle('Join your class', 76),
			ogText('Enter your class code to access your class’s study resources.', 28)
		],
		footer: [h('div', { style: { color: og.muted } }, 'learnterms.com/join-class')]
	});
