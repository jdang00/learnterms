import type { RequestHandler } from '@sveltejs/kit';
import { createElement as h } from 'react';
import { og, ogText, ogTitle, renderOgCard } from '$lib/server/ogCard';

const pill = (text: string) =>
	h(
		'div',
		{
			style: {
				display: 'flex',
				padding: '10px 18px',
				borderRadius: '999px',
				border: `1px solid ${og.line}`,
				backgroundColor: og.chip,
				fontSize: '20px',
				color: og.text
			}
		},
		text
	);

export const GET: RequestHandler = ({ fetch }) =>
	renderOgCard(fetch, {
		body: [
			ogTitle('Grade calculator', 72),
			ogText(
				'Track your standing, model remaining coursework, and see exactly what score you need next.'
			),
			h(
				'div',
				{ style: { display: 'flex', gap: '14px', marginTop: '8px' } },
				pill('Current grade'),
				pill('Target scenarios'),
				pill('Need-to-score breakdown')
			)
		],
		footer: [
			h('div', { style: { color: og.text } }, 'Private by default. Nothing you enter is stored.'),
			h('div', {}, 'learnterms.com/tools/grade-calculator')
		]
	});
