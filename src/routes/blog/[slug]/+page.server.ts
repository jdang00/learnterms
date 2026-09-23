import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { blogPosts, findBlogPost } from '$lib/content/blog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const legacy = blogPosts.find((post) => post.legacySlug === params.slug);
	if (legacy) redirect(308, resolve('/blog/[slug]', { slug: legacy.slug }));
	const post = findBlogPost(params.slug);
	if (!post) error(404, 'This blog post could not be found.');
	return { post };
};
