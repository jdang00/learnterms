<script lang="ts">
	import '@fontsource/space-grotesk/latin-600.css';
	import { resolve } from '$app/paths';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';

	let { class: className = '' }: { class?: string } = $props();

	let hovered = $state(false);
	let focused = $state(false);
	const active = $derived(hovered || focused);
	const flipDuration = 320;
	const rotation = new Tween(0, { duration: flipDuration, easing: cubicInOut });
	const angle = $derived((rotation.current * Math.PI) / 180);

	function project(x: number, y: number, radians: number) {
		const z = -x * Math.sin(radians);
		const scale = 36 / (36 - z);
		return { z, scale, cx: 24 + x * Math.cos(radians) * scale, cy: 24 + y * scale };
	}

	const ringPath = $derived.by(() => {
		return (
			Array.from({ length: 64 }, (_, i) => {
				const position = (i / 64) * Math.PI * 2;
				const point = project(20 * Math.cos(position), 20 * Math.sin(position), angle);
				return `${i === 0 ? 'M' : 'L'}${point.cx},${point.cy}`;
			}).join(' ') + ' Z'
		);
	});
	const dots = [
		{ id: 'solid-top', x: 9.19, y: -9.19, solid: true },
		{ id: 'solid-bottom', x: -9.19, y: 9.19, solid: true },
		{ id: 'open-top', x: -9.19, y: -9.19, solid: false },
		{ id: 'open-bottom', x: 9.19, y: 9.19, solid: false }
	];
	const projectedDots = $derived.by(() => {
		return dots
			.map((dot) => {
				// Rotate each point around the handle, then project its depth onto the mark.
				return {
					...dot,
					...project(dot.x, dot.y, angle)
				};
			})
			.sort((a, b) => a.z - b.z);
	});

	$effect(() => {
		rotation.set(active ? 180 : 0, { duration: prefersReducedMotion.current ? 0 : flipDuration });
	});
</script>

<a
	href={resolve('/')}
	class="brand-logo {className}"
	class:active
	aria-label="LearnTerms home"
	onpointerenter={(e) => (hovered = e.pointerType !== 'touch')}
	onpointerleave={() => (hovered = false)}
	onfocus={() => (focused = true)}
	onblur={() => (focused = false)}
>
	<svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
		<path class="jcc-ring" class:visible={active} d={ringPath} />
		{#each projectedDots as dot (dot.id)}
			<circle
				class:solid-dot={dot.solid}
				cx={dot.cx}
				cy={dot.cy}
				r={(dot.solid ? 6 : 5) * dot.scale}
				fill={dot.solid ? 'currentColor' : 'var(--color-base-100)'}
				stroke={dot.solid ? 'none' : 'currentColor'}
				stroke-width={3.5 * dot.scale}
			/>
		{/each}
	</svg>
	<span class="brand-wordmark">LearnTerms</span>
</a>

<style>
	.brand-logo {
		display: inline-block;
		white-space: nowrap;
		line-height: 1;
		color: inherit;
		text-decoration: none;
	}

	.brand-mark {
		display: inline-block;
		width: 1.25em;
		height: 1.25em;
		margin-right: 0.1em;
		vertical-align: -0.25em;
		overflow: visible;
	}

	.jcc-ring {
		fill: none;
		stroke: currentColor;
		stroke-width: 1;
		opacity: 0;
		transition: opacity 160ms ease;
	}

	.jcc-ring.visible {
		opacity: 0.25;
	}

	.solid-dot {
		transition: color 180ms ease;
	}

	.active .solid-dot {
		color: var(--color-secondary);
	}

	@media (prefers-reduced-motion: reduce) {
		.solid-dot,
		.jcc-ring {
			transition: none;
		}
	}

	.brand-wordmark {
		font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif;
		font-weight: 600;
		letter-spacing: -0.03em;
		line-height: 1;
	}
</style>
