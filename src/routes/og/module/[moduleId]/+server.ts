import type { RequestHandler } from '@sveltejs/kit';
import { ImageResponse } from '@vercel/og';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { createElement as h } from 'react';

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

	// Use SvelteKit's internal fetch for static files (avoids self-referencing HTTP on Vercel)
	const [fontBoldResponse, fontRegularResponse] = await Promise.all([
		fetch('/fonts/Inter-Bold.ttf'),
		fetch('/fonts/Inter-Regular.ttf')
	]);

	if (!fontBoldResponse.ok || !fontRegularResponse.ok) {
		return new Response('Font loading failed', { status: 500 });
	}

	const fontBold = await fontBoldResponse.arrayBuffer();
	const fontRegular = await fontRegularResponse.arrayBuffer();

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

	const truncatedDesc =
		description.length > 140 ? description.slice(0, 137) + '...' : description;

	// DaisyUI light theme semantic colors
	const colors = {
		'base-100': '#ffffff',
		'base-200': '#f9fafb',
		'base-300': '#e5e7eb',
		'base-content': '#1f2937',
		primary: '#570df8'
	};

	const metaParts = [
		classCode,
		className,
		`${questionCount} question${questionCount !== 1 ? 's' : ''}`
	].filter(Boolean);

	// Build the element tree using React.createElement
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
		// Accent bar
		h('div', {
			style: {
				width: '100%',
				height: '6px',
				background: `linear-gradient(90deg, ${colors.primary} 0%, #a855f7 100%)`
			}
		}),
		// Content area
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
			// Top: LearnTerms branding
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
			// Middle: emoji + title + description
			h(
				'div',
				{
					style: {
						display: 'flex',
						flexDirection: 'column',
						gap: '16px'
					}
				},
				// Emoji
				h('div', { style: { fontSize: '52px', lineHeight: '1' } }, emoji),
				// Title
				h(
					'div',
					{
						style: {
							fontSize: '52px',
							fontWeight: 700,
							lineHeight: '1.15',
							letterSpacing: '-0.02em',
							color: colors['base-content']
						}
					},
					title
				),
				// Description
				h(
					'div',
					{
						style: {
							fontSize: '24px',
							fontWeight: 400,
							color: '#6b7280',
							lineHeight: '1.5',
							maxWidth: '900px'
						}
					},
					truncatedDesc
				)
			),
			// Bottom: metadata bar
			h(
				'div',
				{
					style: {
						display: 'flex',
						alignItems: 'center',
						gap: '12px',
						borderTop: `1px solid ${colors['base-300']}`,
						paddingTop: '20px'
					}
				},
				...metaParts.flatMap((text, i) => [
					...(i > 0
						? [
								h(
									'span',
									{
										key: `sep-${i}`,
										style: { color: colors['base-300'], fontSize: '20px' }
									},
									'|'
								)
							]
						: []),
					h(
						'span',
						{
							key: `text-${i}`,
							style: {
								fontSize: '20px',
								fontWeight: 400,
								color: '#6b7280'
							}
						},
						text
					)
				])
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

	// Cache at CDN for 7 days, browser for 1 day
	response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800');

	return response;
};
