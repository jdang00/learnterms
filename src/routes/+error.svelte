<script lang="ts">
	import { page } from '$app/state';
	import { asset, resolve } from '$app/paths';
</script>

<section
	class="error-page relative isolate flex items-center justify-center overflow-hidden px-6 py-20 text-center"
>
	{#if page.status === 404}
		<img
			src={asset('/images/404-lobby.webp')}
			alt=""
			aria-hidden="true"
			width="1536"
			height="1024"
			fetchpriority="high"
			class="error-landscape absolute inset-0 -z-20 h-full w-full object-cover"
		/>
		<div class="error-mist pointer-events-none absolute inset-0 -z-10" aria-hidden="true"></div>
	{/if}

	<div class="error-content relative mx-auto w-full max-w-xl">
		<p class="error-code font-semibold tracking-tight text-base-content/35">{page.status}</p>
		<h1 class="mt-2 font-display text-4xl font-bold text-base-content sm:text-5xl">
			{page.status === 404 ? 'Page not found' : 'Something went wrong'}
		</h1>
		<p class="mx-auto mt-5 max-w-sm text-base leading-relaxed text-base-content/75 sm:text-lg">
			{page.status === 404
				? 'Take a breath. You’re just a little off course. Let’s find your way back.'
				: 'We couldn’t load this page. Please try again, or contact us if the problem continues.'}
		</p>
		<div class="mt-8 flex flex-wrap justify-center gap-3">
			<a href={resolve('/')} class="btn btn-primary">Back to home</a>
			<a
				href={resolve('/contact')}
				class="btn btn-outline border-base-content/25 bg-base-100/50 backdrop-blur-sm"
				>Contact support</a
			>
		</div>
	</div>
</section>

<style>
	.error-page {
		min-height: max(640px, calc(100svh - 5rem));
	}

	.error-landscape {
		object-position: center 55%;
		filter: saturate(0.8);
	}

	.error-mist {
		background:
			radial-gradient(
				ellipse at 50% 48%,
				var(--color-base-100) 0%,
				color-mix(in oklab, var(--color-base-100) 93%, transparent) 22%,
				color-mix(in oklab, var(--color-base-100) 48%, transparent) 48%,
				transparent 76%
			),
			linear-gradient(
				to bottom,
				color-mix(in oklab, var(--color-base-100) 22%, transparent),
				color-mix(in oklab, var(--color-base-100) 12%, transparent) 65%,
				var(--color-base-100)
			);
	}

	.error-code {
		font-size: clamp(5rem, 11vw, 8rem);
		line-height: 1;
		letter-spacing: -0.065em;
	}

	@media (max-width: 640px) {
		.error-page {
			min-height: max(620px, calc(100svh - 4rem));
		}

		.error-landscape {
			object-position: 58% center;
		}

		.error-mist {
			background:
				radial-gradient(
					ellipse at 50% 48%,
					color-mix(in oklab, var(--color-base-100) 97%, transparent) 8%,
					color-mix(in oklab, var(--color-base-100) 88%, transparent) 30%,
					color-mix(in oklab, var(--color-base-100) 20%, transparent) 72%
				),
				linear-gradient(to bottom, transparent 65%, var(--color-base-100));
		}
	}
</style>
