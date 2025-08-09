import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
        const auth = locals.auth();

        if (auth?.userId) {
                return redirect(307, '/classes');
        }
};
