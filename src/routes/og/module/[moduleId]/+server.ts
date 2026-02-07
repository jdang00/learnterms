import type { RequestHandler } from './$types';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';

const fontBold = readFileSync(resolve('static/fonts/Inter-Bold.ttf'));
const fontRegular = readFileSync(resolve('static/fonts/Inter-Regular.ttf'));

// Convert emoji codepoints to Twemoji CDN SVG URL
function emojiToTwemojiUrl(emoji: string): string {
	const codepoints = [...emoji]
		.map((c) => c.codePointAt(0)!.toString(16))
		.filter((cp) => cp !== 'fe0f')
		.join('-');
	return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg`;
}

export const GET: RequestHandler = async ({ params, getClientAddress }) => {
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

	const svg = await satori(
		{
			type: 'div',
			props: {
				style: {
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					backgroundColor: colors['base-100'],
					fontFamily: 'Inter'
				},
				children: [
					// Accent bar at top (primary gradient, like the glow effect on the landing page)
					{
						type: 'div',
						props: {
							style: {
								width: '100%',
								height: '6px',
								background: `linear-gradient(90deg, ${colors.primary} 0%, #a855f7 100%)`
							}
						}
					},
					// Content area
					{
						type: 'div',
						props: {
							style: {
								display: 'flex',
								flexDirection: 'column',
								justifyContent: 'space-between',
								flexGrow: 1,
								padding: '48px 64px 56px'
							},
							children: [
								// Top: LearnTerms branding
								{
									type: 'div',
									props: {
										style: {
											fontSize: '42px',
											fontWeight: 700,
											color: colors.primary
										},
										children: 'LearnTerms'
									}
								},
								// Middle: emoji + title + description
								{
									type: 'div',
									props: {
										style: {
											display: 'flex',
											flexDirection: 'column',
											gap: '16px'
										},
										children: [
											// Emoji
											{
												type: 'div',
												props: {
													style: { fontSize: '52px', lineHeight: '1' },
													children: emoji
												}
											},
											// Title
											{
												type: 'div',
												props: {
													style: {
														fontSize: '52px',
														fontWeight: 700,
														lineHeight: '1.15',
														letterSpacing: '-0.02em',
														color: colors['base-content']
													},
													children: title
												}
											},
											// Description (regular weight)
											{
												type: 'div',
												props: {
													style: {
														fontSize: '24px',
														fontWeight: 400,
														color: '#6b7280',
														lineHeight: '1.5',
														maxWidth: '900px'
													},
													children: truncatedDesc
												}
											}
										]
									}
								},
								// Bottom: metadata bar
								{
									type: 'div',
									props: {
										style: {
											display: 'flex',
											alignItems: 'center',
											gap: '12px',
											borderTop: `1px solid ${colors['base-300']}`,
											paddingTop: '20px'
										},
										children: metaParts
											.map((text, i) => {
												const parts = [];
												if (i > 0) {
													parts.push({
														type: 'span',
														props: {
															style: {
																color: colors['base-300'],
																fontSize: '20px'
															},
															children: '|'
														}
													});
												}
												parts.push({
													type: 'span',
													props: {
														style: {
															fontSize: '20px',
															fontWeight: 400,
															color: '#6b7280'
														},
														children: text
													}
												});
												return parts;
											})
											.flat()
									}
								}
							]
						}
					}
				]
			}
		},
		{
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
			],
			loadAdditionalAsset: async (languageCode, segment) => {
				if (languageCode === 'emoji') {
					try {
						const url = emojiToTwemojiUrl(segment);
						const res = await fetch(url);
						if (res.ok) {
							return `data:image/svg+xml;base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
						}
					} catch {
						// Fall through — satori will skip the emoji
					}
				}
				return [];
			}
		}
	);

	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: 1200 }
	});
	const pngData = resvg.render();
	const pngBuffer = pngData.asPng();

	return new Response(new Uint8Array(pngBuffer), {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
		}
	});
};
