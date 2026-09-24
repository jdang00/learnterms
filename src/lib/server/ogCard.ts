import { ImageResponse } from '@vercel/og';
import { createElement as h, type ReactNode } from 'react';

type Fetch = typeof fetch;

export const og = {
	background: '#09090b',
	text: '#fafafa',
	muted: '#a1a1aa',
	line: 'rgba(255, 255, 255, 0.12)',
	chip: 'rgba(255, 255, 255, 0.06)'
};

// Role colors from the brand sheet, dark-theme primary last.
const roleDots = ['#ff627d', '#fcb700', '#00d390', '#00bafe', '#00d3bb', '#f43098', '#605dff'];

const markDots = [
	{ cx: 33.19, cy: 14.81, solid: true },
	{ cx: 14.81, cy: 33.19, solid: true },
	{ cx: 14.81, cy: 14.81, solid: false },
	{ cx: 33.19, cy: 33.19, solid: false }
];

export const ogTitle = (text: string, fontSize = 64) =>
	h(
		'div',
		{
			style: {
				fontFamily: 'Space Grotesk',
				fontSize: `${fontSize}px`,
				fontWeight: 700,
				lineHeight: 1.08,
				letterSpacing: '-0.035em',
				color: og.text,
				display: 'block',
				lineClamp: 2
			}
		},
		text
	);

export const ogText = (text: string, fontSize = 26) =>
	h(
		'div',
		{
			style: {
				fontSize: `${fontSize}px`,
				lineHeight: 1.45,
				color: og.muted,
				display: 'block',
				lineClamp: 2
			}
		},
		text
	);

function lockup() {
	return h(
		'div',
		{ style: { display: 'flex', alignItems: 'center', gap: '14px' } },
		h(
			'svg',
			{ width: 54, height: 54, viewBox: '0 0 48 48' },
			...markDots.map((dot) =>
				h('circle', {
					key: `${dot.cx}-${dot.cy}`,
					cx: dot.cx,
					cy: dot.cy,
					r: dot.solid ? 6 : 5,
					fill: dot.solid ? og.text : 'none',
					stroke: dot.solid ? 'none' : og.text,
					strokeWidth: 3.5
				})
			)
		),
		h(
			'div',
			{
				style: {
					fontFamily: 'Space Grotesk',
					fontSize: '44px',
					fontWeight: 600,
					letterSpacing: '-0.035em',
					color: og.text
				}
			},
			'LearnTerms'
		)
	);
}

/** Renders a 1200×630 share card in the brand frame used by static/og.png. */
export async function renderOgCard(
	fetch: Fetch,
	{ body, footer }: { body: ReactNode[]; footer: ReactNode[] }
): Promise<Response> {
	// SvelteKit's fetch serves static files without a self-referencing HTTP hop on Vercel.
	const fontResponses = await Promise.all([
		fetch('/fonts/Inter-Regular.ttf'),
		fetch('/fonts/SpaceGrotesk-SemiBold.woff'),
		fetch('/fonts/SpaceGrotesk-Bold.woff')
	]);
	if (fontResponses.some((response) => !response.ok)) {
		return new Response('Font loading failed', { status: 500 });
	}
	const [inter, groteskSemiBold, groteskBold] = await Promise.all(
		fontResponses.map((response) => response.arrayBuffer())
	);

	const grid = 'rgba(255, 255, 255, 0.045)';
	const element = h(
		'div',
		{
			style: {
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				padding: '64px 75px 56px',
				backgroundColor: og.background,
				backgroundImage: `linear-gradient(${grid} 1px, transparent 1px), linear-gradient(90deg, ${grid} 1px, transparent 1px)`,
				backgroundSize: '40px 40px',
				fontFamily: 'Inter',
				color: og.text
			}
		},
		h(
			'div',
			{ style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
			lockup(),
			h(
				'div',
				{ style: { display: 'flex', gap: '16px' } },
				...roleDots.map((color) =>
					h('div', {
						key: color,
						style: { width: '24px', height: '24px', borderRadius: '999px', backgroundColor: color }
					})
				)
			)
		),
		h(
			'div',
			{ style: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px' } },
			...body
		),
		h(
			'div',
			{
				style: {
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '24px',
					fontSize: '22px',
					color: og.muted
				}
			},
			...footer
		)
	);

	const response = new ImageResponse(element, {
		width: 1200,
		height: 630,
		fonts: [
			{ name: 'Inter', data: inter, weight: 400, style: 'normal' },
			{ name: 'Space Grotesk', data: groteskSemiBold, weight: 600, style: 'normal' },
			{ name: 'Space Grotesk', data: groteskBold, weight: 700, style: 'normal' }
		]
	});

	// Cache at CDN for 7 days, browser for 1 day
	response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800');

	return response;
}
