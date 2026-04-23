import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	return {
		seo: {
			title: 'Grade Calculator — LearnTerms',
			description:
				'Track your current standing, test target outcomes, and see what you need on remaining coursework without sending any grades to a server.',
			image: `${url.origin}/og/grade-calculator`
		}
	};
};
