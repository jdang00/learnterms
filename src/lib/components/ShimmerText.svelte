<script lang="ts">
	interface Props {
		text?: string;
		tone?: 'base' | 'primary';
		class?: string;
	}

	let { text = '', tone = 'base', class: className = '' }: Props = $props();
</script>

<span class="lt-shimmer {className}" data-tone={tone}>{text}</span>

<style>
	.lt-shimmer {
		--lt-shimmer-base: var(--color-base-content);
		--lt-shimmer-sheen: color-mix(in oklch, var(--color-base-content) 74%, var(--color-base-100));
		color: var(--lt-shimmer-base);
		background-image: linear-gradient(
			100deg,
			currentColor 0%,
			currentColor 38%,
			var(--lt-shimmer-sheen) 50%,
			currentColor 62%,
			currentColor 100%
		);
		background-size: 220% 100%;
		background-repeat: no-repeat;
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: color-mix(in oklch, currentColor 88%, transparent);
		animation: lt-shimmer-sweep 1.7s ease-in-out infinite;
	}

	.lt-shimmer[data-tone='primary'] {
		--lt-shimmer-base: var(--color-primary);
		--lt-shimmer-sheen: color-mix(in oklch, var(--color-primary) 68%, var(--color-primary-content));
	}

	@keyframes lt-shimmer-sweep {
		0% {
			background-position: 160% 0;
		}
		100% {
			background-position: -60% 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lt-shimmer {
			animation: none;
			background-image: none;
			-webkit-text-fill-color: currentColor;
		}
	}
</style>
