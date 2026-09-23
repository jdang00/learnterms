<!-- Graph paper and a soft primary wash behind the top of a public page. -->
<div class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]" aria-hidden="true">
	<div class="bg-graph-paper absolute inset-0"></div>
	<div class="glow glow-focus"></div>
	<div class="glow glow-counter"></div>
</div>

<style>
	.glow {
		position: absolute;
		pointer-events: none;
	}

	.glow-focus {
		top: 4rem;
		left: 0;
		width: 50%;
		height: 22rem;
		border-radius: 40% 60% 55% 45%;
		background: radial-gradient(
			ellipse at 40% 50%,
			color-mix(in oklab, var(--color-primary) 40%, transparent),
			color-mix(in oklab, var(--color-primary) 12%, transparent) 55%,
			transparent 100%
		);
		filter: blur(64px);
		opacity: 0.5;
	}

	.glow-counter {
		top: 7rem;
		right: -4rem;
		width: 28rem;
		height: 8rem;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			transparent,
			color-mix(in oklab, var(--color-secondary) 45%, transparent) 45%,
			transparent
		);
		filter: blur(48px);
		opacity: 0.4;
		transform: rotate(-18deg);
	}
</style>
