<script lang="ts">
	let {
		variant = 'landing'
	}: {
		/** landing = the home hero with the accent spark; page = a quieter wash for inner pages. */
		variant?: 'landing' | 'page';
	} = $props();

	let scrollY = $state(0);
	let glowContainer = $state<HTMLElement>();
	const parallax = $derived(variant === 'landing' ? 0.12 : 0.08);

	$effect(() => {
		if (!glowContainer) return;
		glowContainer.style.transform = `translateY(${scrollY * parallax}px)`;
	});
</script>

<svelte:window bind:scrollY />

<!-- Graph paper and the breathing primary/secondary glows behind a public page hero. -->
<div class="hero-glow {variant} pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
	<div class="bg-graph-paper absolute inset-0"></div>
	<div bind:this={glowContainer} class="glow-wrap">
		<div class="glow glow-focus"></div>
		<div class="glow glow-momentum"></div>
		{#if variant === 'landing'}<div class="glow glow-spark"></div>{/if}
	</div>
</div>

<style>
	.hero-glow {
		--focus-peak: 0.6;
		--focus-low: 0.45;
		--streak-angle: -22deg;
		--streak-peak: 0.55;
		--streak-low: 0.45;
	}

	.hero-glow.page {
		--focus-peak: 0.5;
		--focus-low: 0.38;
		--streak-angle: -18deg;
		--streak-peak: 0.45;
		--streak-low: 0.35;
	}

	.glow-wrap {
		position: absolute;
		inset: 0;
		will-change: transform;
	}

	.glow {
		position: absolute;
		pointer-events: none;
	}

	/* Wide primary wash behind the hero text, weighted left like a reading lamp. */
	.glow-focus {
		top: 6rem;
		left: 2%;
		width: 55%;
		height: 28rem;
		border-radius: 40% 60% 55% 45%;
		background: radial-gradient(
			ellipse at 40% 50%,
			color-mix(in oklab, var(--primary) 48%, transparent),
			color-mix(in oklab, var(--primary) 18%, transparent) 55%,
			transparent 100%
		);
		filter: blur(64px);
		opacity: var(--focus-peak);
		animation: focus-breathe 7s ease-in-out infinite;
	}

	.page .glow-focus {
		top: 4rem;
		left: 5%;
		width: 50%;
		height: 22rem;
		background: radial-gradient(
			ellipse at 40% 50%,
			color-mix(in oklab, var(--primary) 40%, transparent),
			color-mix(in oklab, var(--primary) 14%, transparent) 55%,
			transparent 100%
		);
	}

	/* Diagonal secondary streak across the right side. */
	.glow-momentum {
		top: 10rem;
		right: -2rem;
		width: 36rem;
		height: 10rem;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			transparent 5%,
			color-mix(in oklab, var(--secondary) 50%, transparent) 35%,
			color-mix(in oklab, var(--secondary) 60%, transparent) 55%,
			color-mix(in oklab, var(--secondary) 20%, transparent) 85%,
			transparent
		);
		filter: blur(44px);
		opacity: var(--streak-peak);
		transform: rotate(var(--streak-angle));
		animation: streak-drift 9s ease-in-out infinite;
	}

	.page .glow-momentum {
		top: 8rem;
		right: -1rem;
		width: 28rem;
		height: 8rem;
		background: linear-gradient(
			90deg,
			transparent 5%,
			color-mix(in oklab, var(--secondary) 40%, transparent) 35%,
			color-mix(in oklab, var(--secondary) 50%, transparent) 55%,
			color-mix(in oklab, var(--secondary) 15%, transparent) 85%,
			transparent
		);
	}

	/* Accent spark, lower left, as a vivid counterpoint. */
	.glow-spark {
		bottom: 22%;
		left: 12%;
		width: 14rem;
		height: 12rem;
		border-radius: 30% 70% 55% 45%;
		background: radial-gradient(
			ellipse at 55% 45%,
			color-mix(in oklab, var(--accent) 60%, transparent),
			color-mix(in oklab, var(--accent) 22%, transparent) 55%,
			transparent 100%
		);
		filter: blur(40px);
		opacity: 0.5;
		animation: spark-pulse 5s ease-in-out infinite;
	}

	@keyframes focus-breathe {
		0%,
		100% {
			opacity: var(--focus-peak);
			transform: scale(1) translate(0, 0);
		}
		50% {
			opacity: var(--focus-low);
			transform: scale(1.06) translate(0.5rem, -0.3rem);
		}
	}

	@keyframes streak-drift {
		0%,
		100% {
			transform: rotate(var(--streak-angle)) translateX(0);
			opacity: var(--streak-peak);
		}
		50% {
			transform: rotate(calc(var(--streak-angle) + 3deg)) translateX(2rem);
			opacity: var(--streak-low);
		}
	}

	@keyframes spark-pulse {
		0%,
		100% {
			opacity: 0.5;
			transform: scale(1) rotate(0deg);
		}
		50% {
			opacity: 0.65;
			transform: scale(1.15) rotate(3deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.glow {
			animation: none;
		}
	}
</style>
