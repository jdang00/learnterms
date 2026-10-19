<script lang="ts">
	type Attachment = {
		_id: string;
		url: string;
		altText: string;
		caption?: string;
	};

	interface Props {
		isOpen: boolean;
		attachment: Attachment | null;
		onClose: () => void;
	}

	let { isOpen, attachment, onClose }: Props = $props();

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';

	let zoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isDragging = $state(false);
	let lastMouseX = $state(0);
	let lastMouseY = $state(0);

	// Reset state when modal opens with new attachment
	$effect(() => {
		if (isOpen && attachment) {
			zoom = 1;
			panX = 0;
			panY = 0;
		}
	});

	function handleZoomIn() {
		zoom = Math.min(zoom + 0.25, 3);
	}

	function handleZoomOut() {
		zoom = Math.max(zoom - 0.25, 0.25);
	}

	function handleFitToScreen() {
		zoom = 1;
		panX = 0;
		panY = 0;
	}

	function handleZoomToggle() {
		if (zoom > 1) {
			zoom = 1;
			panX = 0;
			panY = 0;
		} else {
			zoom = Math.min(zoom + 0.5, 3);
		}
	}

	function handleMouseDown(event: MouseEvent) {
		if (zoom > 1) {
			isDragging = true;
			lastMouseX = event.clientX;
			lastMouseY = event.clientY;
			event.preventDefault();
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (isDragging && zoom > 1) {
			const deltaX = event.clientX - lastMouseX;
			const deltaY = event.clientY - lastMouseY;

			const maxPan = (zoom - 1) * 100;
			panX = Math.max(-maxPan, Math.min(maxPan, panX + deltaX));
			panY = Math.max(-maxPan, Math.min(maxPan, panY + deltaY));

			lastMouseX = event.clientX;
			lastMouseY = event.clientY;
			event.preventDefault();
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleClose() {
		onClose();
	}
</script>

<Dialog.Root
	open={isOpen}
	onOpenChange={(o) => {
		if (!o) handleClose();
	}}
>
	<Dialog.Content class="h-[90vh] sm:max-w-4xl">
		{#if attachment}
			<div class="flex flex-col h-full">
				<Dialog.Title class="text-lg font-bold mb-4">{attachment.altText}</Dialog.Title>

				<div
					class="flex-1 relative overflow-hidden bg-muted rounded-2xl"
					onmousedown={handleMouseDown}
					onmousemove={handleMouseMove}
					onmouseup={handleMouseUp}
					onmouseleave={handleMouseUp}
					role="button"
					tabindex="0"
					aria-label="Image viewer - click to zoom, drag to pan when zoomed"
				>
					<div
						class="w-full h-full focus:outline-hidden focus:ring-2 focus:ring-primary {zoom > 1
							? isDragging
								? 'cursor-grabbing'
								: 'cursor-grab'
							: 'cursor-zoom-in'}"
						onclick={zoom <= 1 ? handleZoomToggle : undefined}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								if (zoom <= 1) {
									handleZoomToggle();
								}
							}
						}}
						aria-label={zoom > 1 ? 'Pan image' : 'Zoom in'}
						tabindex="0"
						role="button"
					>
						<img
							src={attachment.url}
							alt={attachment.altText}
							class="max-w-full max-h-full object-contain absolute inset-0 m-auto select-none"
							style="transform: scale({zoom ||
								1}) translate({panX}px, {panY}px); transform-origin: center; transition: transform 0.1s ease-out;"
							draggable="false"
						/>
					</div>
				</div>

				{#if attachment.caption}
					<div class="mt-4 p-3 bg-muted rounded-2xl">
						<p class="text-sm text-foreground/70">{attachment.caption}</p>
					</div>
				{/if}

				<div class="flex justify-center gap-2 mt-4">
					<Button
						size="sm"
						variant="outline"
						tone="neutral"
						onclick={handleZoomOut}
						aria-label="Zoom out"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
							/>
						</svg>
					</Button>
					<Button
						size="sm"
						variant="outline"
						tone="neutral"
						onclick={handleFitToScreen}
						aria-label="Fit to screen"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
							/>
						</svg>
					</Button>
					<Button
						size="sm"
						variant="outline"
						tone="neutral"
						onclick={handleZoomIn}
						aria-label="Zoom in"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
							/>
						</svg>
					</Button>
				</div>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
