import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();

	if (userId) {
		throw redirect(307, '/classes');
	}
	return {
		seo: {
			title: 'LearnTerms is Smarter Studying, Simplified.',
			description:
				'LearnTerms gives you a live quiz workspace where answers, flags, and progress sync instantly, so every study session stays focused and uninterrupted.',
			image: 'https://axcaluti7p.ufs.sh/f/DYlXFqnaImOr0iRZZjwE17POUXjVTyuaLZCAI0p9cgf4lt6w'
		}
	};
};
