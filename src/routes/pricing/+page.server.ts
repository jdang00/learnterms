import type { PageServerLoad } from './$types';
import { convexLoad } from 'convex-svelte/sveltekit';
import { api } from '../../convex/_generated/api';

const seo = {
	title: 'Pricing — LearnTerms',
	description:
		'Explore LearnTerms access for students and subscription options for curators building class-aligned question banks.'
};

export const load: PageServerLoad = async ({ locals }) => {
	const { userId } = locals.auth();

	// Products are public, so signed-out visitors see live prices too; a failed read falls
	// back to list prices.
	const products = convexLoad(api.polar.listAllProducts, {}).catch((error) => {
		console.error('Failed to load pricing products:', error);
		return null;
	});
	// Not logged in - show pricing page (they can browse)
	if (!userId) {
		return { isAuthenticated: false, account: null, products: await products, seo };
	}

	try {
		const [account, loadedProducts] = await Promise.all([
			convexLoad(api.polar.getUserWithSubscriptionByClerkId, { clerkUserId: userId }),
			products
		]);
		return { isAuthenticated: true, account, products: loadedProducts, seo };
	} catch (error) {
		console.error('Failed to load pricing page data:', error);
		return { isAuthenticated: true, account: null, products: await products, seo };
	}
};
