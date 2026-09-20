<script lang="ts">
	import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
	import { withPdfRenderSlot } from './pdfRenderQueue';
	let {
		document,
		pageNumber,
		thumbnail = false
	}: {
		document: PDFDocumentProxy;
		pageNumber: number;
		thumbnail?: boolean;
	} = $props();
	let host = $state<HTMLDivElement>();
	let canvas = $state<HTMLCanvasElement>();
	let ready = $state(false);
	let failed = $state(false);

	$effect(() => {
		const pdf = document,
			number = pageNumber,
			target = canvas,
			container = host,
			small = thumbnail;
		if (!target || !container) return;
		let cancelled = false,
			started = false;
		let render: RenderTask | undefined;
		ready = false;
		failed = false;
		async function draw() {
			if (started) return;
			started = true;
			await withPdfRenderSlot(async () => {
				if (cancelled) return;
				try {
					const page = await pdf.getPage(number);
					if (cancelled) return;
					const original = page.getViewport({ scale: 1 });
					const scale = small
						? Math.min(250 / original.width, 300 / original.height)
						: Math.min(1200 / original.width, 2000 / original.height);
					const viewport = page.getViewport({ scale });
					target!.width = Math.ceil(viewport.width);
					target!.height = Math.ceil(viewport.height);
					render = page.render({ canvas: target!, viewport });
					await render.promise;
					if (!cancelled) ready = true;
				} catch {
					if (!cancelled) failed = true;
				}
			});
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					observer.disconnect();
					void draw();
				}
			},
			{ rootMargin: '120px' }
		);
		if (small) observer.observe(container);
		else void draw();
		return () => {
			cancelled = true;
			observer.disconnect();
			render?.cancel();
		};
	});
</script>

<div bind:this={host} class="pdf-page" class:thumbnail>
	<canvas bind:this={canvas} class:invisible={!ready} aria-label={`Original page ${pageNumber}`}
	></canvas>
	{#if !ready}<div class="placeholder">
			{#if failed}<span>Preview unavailable</span>{:else}<span
					class="loading loading-spinner loading-xs text-base-content/30"
				></span>{/if}
		</div>{/if}
</div>

<style>
	.pdf-page {
		position: relative;
		width: 100%;
		min-height: 120px;
		display: flex;
		align-items: flex-start;
		justify-content: center;
	}
	.pdf-page canvas {
		display: block;
		max-width: 100%;
		height: auto;
		background: white;
		box-shadow: 0 2px 12px #0000000d;
	}
	.pdf-page.thumbnail {
		height: 100%;
		min-height: 0;
		align-items: center;
	}
	.thumbnail canvas {
		max-height: 100%;
		width: auto;
		object-fit: contain;
		box-shadow: 0 2px 5px #00000015;
	}
	.placeholder {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-size: 10px;
		color: #94a3b8;
		text-align: center;
	}
</style>
