import type { PageServerLoad } from './$types';
import { isRedirect, redirect } from '@sveltejs/kit';
import { convexLoad, createConvexHttpClient } from 'convex-svelte/sveltekit';
import { api } from '../../../../../convex/_generated/api';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { rateLimit } from '$lib/server/rateLimit';

export const load: PageServerLoad = async ({
	params,
	locals,
	url,
	getClientAddress,
	setHeaders
}) => {
	const auth = locals.auth();
	const userId = auth.userId;
	const moduleId = params.moduleId as Id<'module'>;
	const origin = url.origin;

	// Unauthenticated path: serve minimal SEO metadata for all unauthenticated requests
	// (enables OG previews on any platform, not just known crawlers)
	if (!userId) {
		const ip = getClientAddress();
		const { ok } = rateLimit(ip, { maxRequests: 60, windowMs: 60_000 });
		if (!ok) {
			return redirect(307, '/sign-in');
		}
		setHeaders({ 'Cache-Control': 'public, max-age=300' });

		const fallbackSeo = {
			isPublicView: true as const,
			moduleInfo: undefined,
			module: undefined,
			moduleId,
			convexID: undefined,
			classId: params.classId,
			seo: {
				title: 'LearnTerms Module',
				description: 'Sign in to view this module on LearnTerms',
				image: `${origin}/og/module/${moduleId}`
			}
		};

		// A one-shot public read: nothing on the signed-out page subscribes to it.
		const client = createConvexHttpClient({ url: PUBLIC_CONVEX_URL });
		try {
			const metadata = await client.query(api.publicQueries.getModuleMetadata, {
				id: moduleId
			});
			if (!metadata) {
				return fallbackSeo;
			}
			return {
				...fallbackSeo,
				seo: {
					title: `${metadata.title} — LearnTerms`,
					description: metadata.description,
					image: `${origin}/og/module/${moduleId}`
				}
			};
		} catch (err) {
			console.error('Convex query failed', err);
			return fallbackSeo;
		}
	}

	if (!locals.convexToken) {
		return redirect(307, '/sign-in');
	}

	try {
		const [module, moduleInfo, convexID] = await Promise.all([
			convexLoad(api.questions.read.getQuestionsByModule, { id: moduleId }),
			convexLoad(api.module.getModuleById, { id: moduleId }),
			convexLoad(api.users.getUserById, { id: userId })
		]);
		if (!moduleInfo.data || moduleInfo.data.classId !== params.classId) redirect(307, '/classes');

		return {
			isPublicView: false as const,
			moduleInfo,
			module,
			moduleId,
			convexID,
			classId: params.classId,
			seo: {
				title: `${moduleInfo.data.title} — LearnTerms`,
				description: moduleInfo.data.description,
				image: `${origin}/og/module/${moduleId}`
			}
		};
	} catch (error) {
		if (isRedirect(error)) throw error;
		console.error('Failed to load module page data:', error);
		redirect(307, '/classes');
	}
};
