<script lang="ts" module>
	export type ViewerImage = { _id: string; url?: string | null; altText: string; caption?: string };
</script>

<script lang="ts">
	import { ChevronLeft, ChevronRight, X } from 'lucide-svelte';

	// Full-screen image viewer: pinch or double-tap to zoom, drag to pan, swipe to page.
	let {
		images,
		open = $bindable(false),
		index = $bindable(0)
	}: { images: ViewerImage[]; open?: boolean; index?: number } = $props();

	let dialog: HTMLDialogElement;
	let stage = $state<HTMLDivElement>();
	let scale = $state(1);
	let x = $state(0);
	let y = $state(0);
	let swipeX = $state(0);
	let gesturing = $state(false);

	const current = $derived(images[Math.min(index, images.length - 1)]);

	$effect(() => {
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});

	$effect(() => {
		void index;
		resetZoom();
	});

	function resetZoom() {
		scale = 1;
		x = 0;
		y = 0;
		swipeX = 0;
	}

	function go(step: number) {
		if (images.length < 2) return;
		index = (index + step + images.length) % images.length;
	}

	function zoomAt(clientX: number, clientY: number, next: number) {
		const rect = stage?.getBoundingClientRect();
		if (!rect) return;
		const cx = clientX - rect.left - rect.width / 2;
		const cy = clientY - rect.top - rect.height / 2;
		// Keep the point under the finger fixed while the scale changes.
		x = cx - ((cx - x) * next) / scale;
		y = cy - ((cy - y) * next) / scale;
		scale = next;
		if (scale <= 1.01) resetZoom();
	}

	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- pointer bookkeeping, not rendered
	const pointers = new Map<number, { x: number; y: number }>();
	let pinch: { distance: number; scale: number } | null = null;
	let pan: { x: number; y: number; startX: number; startY: number } | null = null;
	let lastTap = 0;
	let moved = false;

	const distance = () => {
		const [a, b] = [...pointers.values()];
		return Math.hypot(a.x - b.x, a.y - b.y);
	};
	const midpoint = () => {
		const [a, b] = [...pointers.values()];
		return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
	};

	function down(event: PointerEvent) {
		if ((event.target as Element).closest('button')) return;
		stage?.setPointerCapture(event.pointerId);
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		gesturing = true;
		moved = false;
		if (pointers.size === 2) {
			pinch = { distance: distance(), scale };
			pan = null;
		} else if (pointers.size === 1) {
			pan = { x: event.clientX, y: event.clientY, startX: x, startY: y };
		}
	}

	function move(event: PointerEvent) {
		const previous = pointers.get(event.pointerId);
		if (!previous) return;
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (pinch && pointers.size === 2) {
			moved = true;
			const mid = midpoint();
			zoomAt(mid.x, mid.y, Math.min(5, Math.max(1, (pinch.scale * distance()) / pinch.distance)));
		} else if (pan && pointers.size === 1) {
			const dx = event.clientX - pan.x;
			const dy = event.clientY - pan.y;
			if (Math.hypot(dx, dy) > 6) moved = true;
			if (scale > 1) {
				x = pan.startX + dx;
				y = pan.startY + dy;
			} else if (images.length > 1) {
				swipeX = dx;
			}
		}
	}

	function up(event: PointerEvent) {
		if (!pointers.delete(event.pointerId)) return;
		if (pointers.size === 1) {
			const [only] = [...pointers.values()];
			pinch = null;
			pan = { x: only.x, y: only.y, startX: x, startY: y };
			return;
		}
		if (pointers.size > 0) return;
		gesturing = false;
		pinch = null;
		pan = null;
		if (scale === 1 && Math.abs(swipeX) > 64) go(swipeX < 0 ? 1 : -1);
		swipeX = 0;
		if (!moved) {
			const now = event.timeStamp;
			if (now - lastTap < 300) {
				zoomAt(event.clientX, event.clientY, scale > 1 ? 1 : 2.5);
				lastTap = 0;
			} else lastTap = now;
		}
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowRight') go(1);
		else if (event.key === 'ArrowLeft') go(-1);
	}
</script>

<dialog
	bind:this={dialog}
	class="m-0 h-dvh max-h-none w-screen max-w-none bg-black p-0 text-white backdrop:bg-black"
	aria-label={current?.altText ?? 'Image'}
	onclose={() => {
		open = false;
		resetZoom();
	}}
	{onkeydown}
>
	{#if current}
		<div class="relative flex h-full flex-col">
			<div
				bind:this={stage}
				class="relative min-h-0 flex-1 touch-none overflow-hidden select-none"
				onpointerdown={down}
				onpointermove={move}
				onpointerup={up}
				onpointercancel={up}
				ondblclick={(event) => zoomAt(event.clientX, event.clientY, scale > 1 ? 1 : 2.5)}
				role="presentation"
			>
				<img
					src={current.url ?? ''}
					alt={current.altText}
					draggable="false"
					class="absolute inset-0 m-auto max-h-full max-w-full object-contain"
					style:transform="translate({x + swipeX}px, {y}px) scale({scale})"
					style:transition={gesturing ? 'none' : 'transform 200ms ease-out'}
				/>
			</div>

			<div
				class="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-2 pb-6"
				style="padding-top: max(0.5rem, env(safe-area-inset-top));"
			>
				<span class="px-2 text-sm tabular-nums text-white/80">
					{#if images.length > 1}{index + 1} of {images.length}{/if}
				</span>
				<form method="dialog" class="pointer-events-auto">
					<button class="btn btn-circle btn-ghost size-11 text-white" aria-label="Close image">
						<X size={22} />
					</button>
				</form>
			</div>

			{#if images.length > 1}
				<button
					type="button"
					class="btn btn-circle btn-ghost absolute left-2 top-1/2 hidden size-11 -translate-y-1/2 text-white sm:flex"
					aria-label="Previous image"
					onclick={() => go(-1)}><ChevronLeft size={24} /></button
				>
				<button
					type="button"
					class="btn btn-circle btn-ghost absolute right-2 top-1/2 hidden size-11 -translate-y-1/2 text-white sm:flex"
					aria-label="Next image"
					onclick={() => go(1)}><ChevronRight size={24} /></button
				>
			{/if}

			{#if current.caption}
				<p
					class="shrink-0 px-5 pt-3 text-sm text-white/80"
					style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
				>
					{current.caption}
				</p>
			{/if}
		</div>
	{/if}
</dialog>
