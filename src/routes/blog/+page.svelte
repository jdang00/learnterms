<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowUpRight } from 'lucide-svelte';
	import { blogPosts } from '$lib/content/blog';
</script>

<div id="main-content" class="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
	<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Blog</h1>
	<p class="mt-4 text-base-content/65">
		Notes on building LearnTerms, with a few posts from the early days.
	</p>
	<div class="mt-8 divide-y divide-base-300 border-y border-base-300">
		{#each blogPosts as post (post.slug)}
			<article class="py-7">
				<time datetime={post.date} class="text-sm text-base-content/55">{post.displayDate}</time>
				<h2 class="mt-2 text-xl font-semibold tracking-tight">
					<a
						class="group inline-flex items-start gap-2 hover:text-primary"
						href={resolve('/blog/[slug]', { slug: post.slug })}
						>{post.title}<ArrowUpRight
							size={18}
							class="mt-1 shrink-0 opacity-40 group-hover:opacity-100"
						/></a
					>
				</h2>
				<p class="mt-2 leading-relaxed text-base-content/70">{post.summary}</p>
			</article>
		{/each}
	</div>
</div>
