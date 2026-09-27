<script lang="ts">
	import {
		clampOffset,
		isFusedOffset,
		presetOffset,
		W4D_SNAP,
		worth4DotPercept,
		type Eye,
		type Offset,
		type Worth4DotState
	} from '$lib/examFindings/worth4dot';

	let {
		reading,
		redEye,
		onMove,
		ghost = false,
		class: className = ''
	}: {
		reading: Worth4DotState;
		redEye: Eye;
		// Makes the red image draggable; null means it snapped back into fusion.
		onMove?: (offset: Offset | null) => void;
		// Dims the dots, for an editor row with nothing recorded yet.
		ghost?: boolean;
		class?: string;
	} = $props();

	const uid = $props.id();
	const RED = '#ff5c5c';
	const GREEN = '#3ddc84';
	const MIXED = '#ffd166';
	const R = 0.3;

	const greenEye = $derived<Eye>(redEye === 'OD' ? 'OS' : 'OD');
	const fused = $derived(reading.response === 'Fusion');
	const alternating = $derived(reading.response === 'Alternating suppression');
	const showRed = $derived(reading.response !== `Suppression ${redEye}`);
	const showGreen = $derived(reading.response !== `Suppression ${greenEye}`);
	const offset = $derived(
		reading.response === 'Diplopia'
			? (reading.offset ?? presetOffset('uncrossed', redEye))
			: { x: 0, y: 0 }
	);
	const draggable = $derived(Boolean(onMove) && (fused || reading.response === 'Diplopia'));
	const white = $derived(reading.white?.trim().toLowerCase());
	const fusedFill = $derived(white === 'red' ? RED : white === 'green' ? GREEN : MIXED);
	const percept = $derived(worth4DotPercept(reading, redEye));

	let svg = $state<SVGSVGElement | null>(null);
	let drag = $state<{ x: number; y: number; from: Offset } | null>(null);

	function toSvg(event: PointerEvent) {
		const matrix = svg?.getScreenCTM();
		return matrix
			? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
			: null;
	}

	function move(next: Offset) {
		const clamped = clampOffset(next);
		onMove?.(isFusedOffset(clamped) ? null : clamped);
	}

	function handlePointerDown(event: PointerEvent) {
		if (!draggable || !(event.target as Element).closest('[data-red-image]')) return;
		const point = toSvg(event);
		if (!point) return;
		event.preventDefault();
		svg?.setPointerCapture(event.pointerId);
		drag = { x: point.x, y: point.y, from: offset };
	}

	function handlePointerMove(event: PointerEvent) {
		if (!drag) return;
		const point = toSvg(event);
		if (point) move({ x: drag.from.x + point.x - drag.x, y: drag.from.y + point.y - drag.y });
	}

	function handleKeydown(event: KeyboardEvent) {
		const step = event.shiftKey ? 0.5 : 0.1;
		const deltas: Record<string, [number, number]> = {
			ArrowLeft: [-step, 0],
			ArrowRight: [step, 0],
			ArrowUp: [0, -step],
			ArrowDown: [0, step]
		};
		const delta = deltas[event.key];
		if (event.key === 'Home') onMove?.(null);
		else if (!delta) return;
		else {
			const next = { x: offset.x + delta[0], y: offset.y + delta[1] };
			// From fusion, the first step jumps past the snap radius so the images actually split.
			move(
				fused && isFusedOffset(next)
					? { x: Math.sign(delta[0]) * W4D_SNAP, y: Math.sign(delta[1]) * W4D_SNAP }
					: next
			);
		}
		event.preventDefault();
	}
</script>

{#snippet redImage()}
	<circle class="hit" cx="0" cy="0" r="1.55" fill="transparent" />
	{@render dot(0, -1, RED)}
	{#if fused}
		<circle cx="0" cy="1" r={R} fill="transparent" />
	{:else}
		{@render dot(0, 1, RED)}
	{/if}
{/snippet}

{#snippet dot(x: number, y: number, fill: string, extra = '')}
	<circle cx={x} cy={y} r={R} {fill} filter="url(#{uid}-glow)" class={extra} />
{/snippet}

<svg
	bind:this={svg}
	viewBox="-3 -2.7 6 5.4"
	class="block w-full touch-none select-none {drag ? 'dragging' : ''} {className}"
	role={onMove ? 'group' : 'img'}
	aria-label={onMove ? 'Worth 4 Dot, patient view' : `Worth 4 Dot, patient view: ${percept}`}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={() => (drag = null)}
	onpointercancel={() => (drag = null)}
>
	<defs>
		<filter id="{uid}-glow" x="-1" y="-1" width="3" height="3">
			<feGaussianBlur stdDeviation="0.09" result="blur" />
			<feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
		</filter>
	</defs>
	<rect x="-3" y="-2.7" width="6" height="5.4" rx="0.45" fill="#0c1020" />
	{#each [[0, -1], [-1, 0], [1, 0], [0, 1]] as [x, y] (`${x},${y}`)}
		<circle cx={x} cy={y} r={R + 0.08} fill="none" stroke="#ffffff14" stroke-width="0.04" />
	{/each}
	<text x="-2.72" y="2.5" font-size="0.3" fill="#ffffff55">L</text>
	<text x="2.52" y="2.5" font-size="0.3" fill="#ffffff55">R</text>

	<g opacity={ghost ? 0.35 : 1}>
		{#if showGreen}
			<g class={alternating ? 'alt-green' : ''}>
				{@render dot(-1, 0, GREEN)}
				{@render dot(1, 0, GREEN)}
				{#if !fused}{@render dot(0, 1, GREEN)}{/if}
			</g>
		{/if}
		{#if fused}
			{@render dot(0, 1, fusedFill, white === 'alternates' ? 'alt-white' : '')}
		{/if}
		{#if showRed && draggable}
			<g
				data-red-image
				class="shift cursor-grab outline-none"
				style="transform: translate({offset.x}px, {offset.y}px)"
				tabindex="0"
				role="button"
				aria-label="Red image. Drag or use arrow keys to move it; Home fuses it again."
				onkeydown={handleKeydown}
			>
				{@render redImage()}
			</g>
		{:else if showRed}
			<g
				class="shift {alternating ? 'alt-red' : ''}"
				style="transform: translate({offset.x}px, {offset.y}px)"
			>
				{@render redImage()}
			</g>
		{/if}
	</g>
</svg>

<style>
	.shift {
		transition: transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.shift:focus-visible > .hit {
		stroke: #ffffffaa;
		stroke-width: 0.04;
		stroke-dasharray: 0.14 0.1;
	}
	.dragging .shift {
		transition: none;
		cursor: grabbing;
	}
	.alt-red {
		animation: alt-red 3.2s infinite;
	}
	.alt-green {
		animation: alt-green 3.2s infinite;
	}
	.alt-white {
		animation: alt-white 2.4s infinite;
	}
	@keyframes alt-red {
		0%,
		45%,
		100% {
			opacity: 1;
		}
		50%,
		95% {
			opacity: 0;
		}
	}
	@keyframes alt-green {
		0%,
		45%,
		100% {
			opacity: 0;
		}
		50%,
		95% {
			opacity: 1;
		}
	}
	@keyframes alt-white {
		0%,
		45%,
		100% {
			fill: #ff5c5c;
		}
		50%,
		95% {
			fill: #3ddc84;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.shift {
			transition: none;
		}
		.alt-red {
			animation: none;
			opacity: 0;
		}
		.alt-green,
		.alt-white {
			animation: none;
		}
	}
</style>
