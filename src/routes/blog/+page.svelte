<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import { blogPosts } from '#lib/content/blog.js';
	import PublicPage from '#lib/components/landing/PublicPage.svelte';
</script>

<PublicPage
	title="Blog"
	lede="Notes on building LearnTerms, with a few posts from the early days."
	width="narrow"
>
	<div class="divide-y divide-foreground/10 border-y border-foreground/10">
		{#each blogPosts as post (post.slug)}
			<article class="py-7">
				<time datetime={post.date} class="text-sm text-foreground/55">{post.displayDate}</time>
				<h2 class="mt-2 text-xl font-semibold">
					<a
						class="group inline-flex items-start gap-2 hover:text-primary-ink"
						href={resolve('/blog/[slug]', { slug: post.slug })}
						>{post.title}<ArrowUpRight
							size={18}
							class="mt-1 shrink-0 opacity-40 group-hover:opacity-100"
						/></a
					>
				</h2>
				<p class="mt-2 leading-relaxed text-foreground/70">{post.summary}</p>
			</article>
		{/each}
	</div>
</PublicPage>
