import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		seo: {
			title: 'LearnTerms — Smarter Studying, Simplified',
			description:
				'Adaptive learning for optometry. Study astigmatism, anterior blepharitis, retina, and ocular disease while building board prep as you learn.',
			image: 'https://axcaluti7p.ufs.sh/f/DYlXFqnaImOr0iRZZjwE17POUXjVTyuaLZCAI0p9cgf4lt6w'
		}
	};
};
