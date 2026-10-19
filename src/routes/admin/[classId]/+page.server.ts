import { authenticatedConvexClient } from '$lib/server/convex';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { userId } = locals.auth();

	if (!userId) {
		return redirect(307, '/sign-in');
	}
	const client = authenticatedConvexClient(locals);
	try {
		// Access gate only; the page subscribes to the module list itself.
		await client.query(api.module.getAdminModule, { id: params.classId as Id<'class'> });
	} catch {
		redirect(307, '/admin');
	}
	return { classId: params.classId };
};
