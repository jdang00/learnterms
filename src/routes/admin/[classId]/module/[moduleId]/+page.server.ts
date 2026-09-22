import { authenticatedConvexClient } from '$lib/server/convex';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { PUBLIC_CONVEX_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!PUBLIC_CONVEX_URL) {
		throw new Error('PUBLIC_CONVEX_URL is not configured');
	}
	const { userId } = locals.auth();
	if (!userId) {
		return redirect(307, '/sign-in');
	}
	const client = await authenticatedConvexClient(locals);
	try {
		await client.query(api.module.getAdminModule, { id: params.classId as Id<'class'> });
		const module = await client.query(api.module.getModuleById, {
			id: params.moduleId as Id<'module'>
		});
		if (!module || module.classId !== params.classId) redirect(307, '/admin');
	} catch {
		redirect(307, '/admin');
	}
	return { moduleId: params.moduleId };
};
