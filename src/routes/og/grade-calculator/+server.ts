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

	const colors = {
		'base-100': '#ffffff',
		'base-200': '#f9fafb',
		'base-300': '#e5e7eb',
		'base-content': '#1f2937',
		primary: '#570df8',
		accent: '#a855f7',
		success: '#16a34a',
		muted: '#6b7280'
	};

	const pillStyle = {
		display: 'flex',
		alignItems: 'center',
		padding: '10px 18px',
		borderRadius: '999px',
		border: `1px solid ${colors['base-300']}`,
		backgroundColor: colors['base-200'],
		fontSize: '20px',
		fontWeight: 500,
		color: colors['base-content']
	} as const;

	const element = h(
		'div',
		{
			style: {
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				backgroundColor: colors['base-100'],
				fontFamily: 'Inter'
			}
		},
		h('div', {
			style: {
				width: '100%',
				height: '6px',
				background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.accent} 100%)`
			}
		}),
		h(
			'div',
			{
				style: {
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					flexGrow: 1,
					padding: '48px 64px 56px'
				}
			},
			h(
				'div',
				{
					style: {
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center'
					}
				},
				h(
					'div',
					{
						style: {
							fontSize: '42px',
							fontWeight: 700,
							color: colors.primary
						}
					},
					'LearnTerms'
				),
				h(
					'div',
					{
						style: {
							display: 'flex',
							alignItems: 'center',
							gap: '10px',
							padding: '10px 18px',
							borderRadius: '999px',
							backgroundColor: '#ecfdf3',
							color: colors.success,
							fontSize: '20px',
							fontWeight: 600
						}
					},
					'Browser-only'
				)
			),
			h(
				'div',
				{
					style: {
						display: 'flex',
						flexDirection: 'column',
						gap: '20px',
						maxWidth: '950px'
					}
				},
				h(
					'div',
					{
						style: {
							fontSize: '52px',
							fontWeight: 700,
							lineHeight: '1.1',
							letterSpacing: '-0.03em',
							color: colors['base-content']
						}
					},
					'Grade calculator'
				),
				h(
					'div',
					{
						style: {
							fontSize: '26px',
							fontWeight: 400,
							lineHeight: '1.5',
							color: colors.muted
						}
					},
					'Track your standing, model remaining coursework, and see exactly what score you need next.'
				),
				h(
					'div',
					{
						style: {
							display: 'flex',
							gap: '14px',
							flexWrap: 'wrap'
						}
					},
					h('div', { style: pillStyle }, 'Current grade'),
					h('div', { style: pillStyle }, 'Target scenarios'),
					h('div', { style: pillStyle }, 'Need-to-score breakdown')
				)
			),
			h(
				'div',
				{
					style: {
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: '24px',
						borderTop: `1px solid ${colors['base-300']}`,
						paddingTop: '22px'
					}
				},
				h(
					'div',
					{
						style: {
							fontSize: '22px',
							fontWeight: 500,
							color: colors['base-content']
						}
					},
					'Private by default. Nothing you enter is stored on LearnTerms.'
				),
				h(
					'div',
					{
						style: {
							fontSize: '20px',
							fontWeight: 400,
							color: colors.muted
						}
					},
					'learnterms.com/tools/grade-calculator'
				)
			)
		)
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
