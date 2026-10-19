import type { PageServerLoad } from './$types';
import { convexLoad } from 'convex-svelte/sveltekit';
import { api } from '../../../convex/_generated/api';

export const load: PageServerLoad = async ({ url }) => {
	// The course catalog is public; a failed read shows the page's inline error.
	const workspace = await convexLoad(api.gradeCalculator.getScaffoldOverview, {}).catch((error) => {
		console.error('Failed to load grade calculator catalog:', error);
		return null;
	});
	return {
		workspace,
		seo: {
			title: 'Grade Calculator — LearnTerms',
			description:
				'Track your current standing, test target outcomes, and see what you need on remaining coursework without sending any grades to a server.',
			image: `${url.origin}/og/grade-calculator`
		}
	};
};
