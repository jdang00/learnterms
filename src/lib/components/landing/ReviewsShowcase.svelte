<script lang="ts">
	import { Quote, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { landingReviews } from './reviews.data';

	let activeIndex = $state(0);
	const total = landingReviews.length;

	function go(dir: -1 | 1) {
		activeIndex = (activeIndex + dir + total) % total;
	}

	const review = $derived(landingReviews[activeIndex]);
</script>

<div>
	<div class="mb-8 max-w-3xl">
		<h2 class="text-3xl font-bold sm:text-4xl">Students are using it daily</h2>
		<p class="mt-2 text-base-content/75">
			Real feedback from healthcare learners running LearnTerms as part of their study routine.
		</p>
	</div>

	{#if review}
		<!-- Mobile: single card with arrows -->
		<div class="lg:hidden">
			<div class="review-card">
				<Quote size={20} class="text-primary/30 mb-3 shrink-0" />
				<blockquote class="text-base leading-relaxed text-base-content/80">
					{review.quote}
				</blockquote>
				<div class="mt-4 pt-3 border-t border-base-300/30">
					<p class="font-semibold text-sm">{review.name}</p>
					<p class="text-xs text-base-content/55">{review.program} &middot; {review.year}</p>
				</div>
			</div>
			<div class="mt-3 flex items-center justify-between">
				<div class="flex gap-1.5">
					{#each landingReviews as _, i}
						<button
							aria-label="Review {i + 1}"
							class="h-1.5 rounded-full transition-all duration-300 {i === activeIndex ? 'w-6 bg-primary' : 'w-1.5 bg-base-content/15 hover:bg-base-content/25'}"
							onclick={() => activeIndex = i}
						></button>
					{/each}
				</div>
				<div class="flex gap-1">
					<button class="btn btn-ghost btn-sm btn-circle" onclick={() => go(-1)}>
						<ChevronLeft size={16} />
					</button>
					<button class="btn btn-ghost btn-sm btn-circle" onclick={() => go(1)}>
						<ChevronRight size={16} />
					</button>
				</div>
			</div>
		</div>

		<!-- Desktop: staggered grid -->
		<div class="hidden lg:grid lg:grid-cols-3 gap-4">
			{#each landingReviews as r, i}
				<div class="review-card {i % 3 === 1 ? 'lg:translate-y-4' : ''}">
					<Quote size={16} class="text-primary/25 mb-2 shrink-0" />
					<blockquote class="text-sm leading-relaxed text-base-content/75">
						{r.quote}
					</blockquote>
					<div class="mt-auto pt-3 border-t border-base-300/30">
						<p class="font-semibold text-sm">{r.name}</p>
						<p class="text-xs text-base-content/50">{r.program} &middot; {r.year}</p>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.review-card {
		display: flex;
		flex-direction: column;
		padding: 1.1rem;
		border-radius: 1.1rem;
		border: 1px solid color-mix(in oklab, var(--color-base-content) 12%, transparent);
		background: color-mix(in oklab, var(--color-base-200) 50%, var(--color-base-100) 50%);
		transition:
			border-color 0.25s ease,
			transform 0.25s ease,
			box-shadow 0.25s ease;
	}

	.review-card:hover {
		border-color: color-mix(in oklab, var(--color-primary) 30%, transparent);
		transform: translateY(-2px);
		box-shadow: 0 8px 24px color-mix(in oklab, var(--color-primary) 10%, transparent);
	}
</style>
