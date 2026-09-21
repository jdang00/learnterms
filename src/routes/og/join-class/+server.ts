import type { RequestHandler } from '@sveltejs/kit';
import { ImageResponse } from '@vercel/og';
import { createElement as h } from 'react';

export const GET: RequestHandler = async ({ fetch }) => {
	const [fontBoldResponse, fontRegularResponse] = await Promise.all([
		fetch('/fonts/Inter-Bold.ttf'),
		fetch('/fonts/Inter-Regular.ttf')
	]);

	if (!fontBoldResponse.ok || !fontRegularResponse.ok) {
		return new Response('Font loading failed', { status: 500 });
	}

	const fontBold = await fontBoldResponse.arrayBuffer();
	const fontRegular = await fontRegularResponse.arrayBuffer();

	const element = h(
		'div',
		{
			style: {
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				backgroundColor: '#ffffff',
				fontFamily: 'Inter',
				borderTop: '6px solid #570df8',
				padding: '56px 64px',
				justifyContent: 'space-between'
			}
		},
		h('div', { style: { fontSize: '38px', fontWeight: 700, color: '#570df8' } }, 'LearnTerms'),
		h(
			'div',
			{ style: { display: 'flex', flexDirection: 'column', gap: '24px' } },
			h(
				'div',
				{
					style: {
						fontSize: '72px',
						fontWeight: 700,
						lineHeight: '1.1',
						letterSpacing: '-0.03em',
						color: '#1f2937'
					}
				},
				'Join your class'
			),
			h(
				'div',
				{ style: { fontSize: '30px', lineHeight: '1.5', color: '#6b7280', maxWidth: '950px' } },
				'Enter your class code to access your class’s study resources.'
			)
		),
		h('div', { style: { fontSize: '22px', color: '#6b7280' } }, 'learnterms.com/join-class')
	);

	const response = new ImageResponse(element, {
		width: 1200,
		height: 630,
		fonts: [
			{
				name: 'Inter',
				data: fontBold,
				weight: 700,
				style: 'normal'
			},
			{
				name: 'Inter',
				data: fontRegular,
				weight: 400,
				style: 'normal'
			}
		]
	});

	response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800');

	return response;
};
