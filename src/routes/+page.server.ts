import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();

	if (userId) {
		return redirect(307, '/classes');
	}
    return {
        seo: {
            title: 'LearnTerms — Smarter Studying, Simplified',
            description: 'Adaptive learning powered by AI. Study smarter today—build your board prep as you learn.',
            image: 'https://axcaluti7p.ufs.sh/f/DYlXFqnaImOr0iRZZjwE17POUXjVTyuaLZCAI0p9cgf4lt6w'
        }
    };
};
