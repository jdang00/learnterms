import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { rateLimit } from '$lib/server/rateLimit';

export const load: PageServerLoad = async ({ params, locals, url, getClientAddress }) => {
	if (!PUBLIC_CONVEX_URL) {
		throw new Error('PUBLIC_CONVEX_URL is not configured');
	}

	const auth = locals.auth();
	const userId = auth.userId;
	const moduleId = params.moduleId as Id<'module'>;
	const origin = url.origin;

	// Unauthenticated path: serve SEO metadata for crawlers
	if (!userId) {
		const ip = getClientAddress();
		const { ok } = rateLimit(ip, { maxRequests: 60, windowMs: 60_000 });
		if (!ok) {
			return redirect(307, '/sign-in');
		}

		const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
		try {
			const metadata = await client.query(api.publicQueries.getModuleMetadata, {
				id: moduleId
			});

			if (!metadata) {
				return redirect(307, '/sign-in');
			}

			return {
				isPublicView: true,
				moduleInfo: undefined,
				module: undefined,
				moduleId,
				convexID: undefined,
				classId: params.classId,
				seo: {
					title: `${metadata.title} — LearnTerms`,
					description: metadata.description,
					image: `${origin}/og/module/${moduleId}`
				}
			};
		} catch {
			return redirect(307, '/sign-in');
		}
	}

	const token = await auth.getToken({ template: "convex" });

	if (!token) {
		return redirect(307, '/sign-in');
	}

	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
	client.setAuth(token);

	try {
		const module = await client.query(api.question.getQuestionsByModule, {
			id: moduleId
		});

		const moduleInfo = await client.query(api.module.getModuleById, {
			id: moduleId
		});

		const convexID = await client.query(api.users.getUserById, {
			id: userId
		});

		return {
			isPublicView: false,
			moduleInfo,
			module,
			moduleId,
			convexID,
			classId: params.classId,
			seo: moduleInfo
				? {
						title: `${moduleInfo.title} — LearnTerms`,
						description: moduleInfo.description,
						image: `${origin}/og/module/${moduleId}`
					}
				: undefined
		};
	} catch (error) {
		console.error('Failed to load module page data:', error);
		throw error;
	}
};
