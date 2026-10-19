import { authenticatedConvexClient, requireConvexSession } from '#lib/server/convex.js';
import { convexLoad } from 'convex-svelte/sveltekit';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';
import type { PageServerLoad } from './$types';
import { isRedirect, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = requireConvexSession(locals);
	const client = authenticatedConvexClient(locals);
	try {
		const [, moduleInfo, userData] = await Promise.all([
			// Access gate only; the page subscribes to the module itself.
			client.query(api.module.getAdminModule, { id: params.classId as Id<'class'> }),
			convexLoad(api.module.getModuleById, { id: params.moduleId as Id<'module'> }),
			convexLoad(api.users.getUserById, { id: userId })
		]);
		if (!moduleInfo.data || moduleInfo.data.classId !== params.classId) redirect(307, '/admin');
		return { moduleId: params.moduleId, moduleInfo, userData };
	} catch (error) {
		if (isRedirect(error)) throw error;
		redirect(307, '/admin');
	}
};
