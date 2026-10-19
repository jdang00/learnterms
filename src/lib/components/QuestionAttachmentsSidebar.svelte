<script lang="ts">
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { useQuestionMedia } from '#lib/utils/useQuestionMedia.svelte.js';
	import type { Doc, Id } from '../../convex/_generated/dataModel';

	type Attachment = Doc<'questionMedia'>;

	let {
		questionId,
		showSolution = false,
		solutionOnlyBehavior = 'blur',
		collapsed = false,
		showSolutionBadges = false,
		showHiddenNote = false
	}: {
		questionId?: Id<'question'> | null;
		showSolution?: boolean;
		solutionOnlyBehavior?: 'blur' | 'hide' | 'show';
		collapsed?: boolean;
		showSolutionBadges?: boolean;
		showHiddenNote?: boolean;
	} = $props();

	let selectedAttachment = $state<Attachment | null>(null);
	let attachmentOpen = $state(false);
	let showCompactAttachments = $state(false);
	let attachmentZoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isDragging = $state(false);
	let lastMouseX = $state(0);
	let lastMouseY = $state(0);
	let imageContainer = $state<HTMLElement | null>(null);

	const mediaQuery = useQuestionMedia(() => questionId);

	const allMedia = $derived(((mediaQuery.data ?? []) as Attachment[]).filter((m) => !m.deletedAt));
	const visibleMedia = $derived.by(() => {
		if (solutionOnlyBehavior !== 'hide' || showSolution) return allMedia;
		return allMedia.filter((m) => !m.showOnSolution);
	});
	const hiddenCount = $derived.by(() => {
		if (solutionOnlyBehavior !== 'hide' || showSolution) return 0;
		return allMedia.filter((m) => m.showOnSolution).length;
	});

	function shouldBlurAttachment(attachment: Attachment) {
		return solutionOnlyBehavior === 'blur' && !showSolution && (attachment.showOnSolution ?? false);
	}

	function handleZoomIn() {
		attachmentZoom = Math.min(attachmentZoom + 0.25, 3);
	}

	function handleZoomOut() {
		attachmentZoom = Math.max(attachmentZoom - 0.25, 0.25);
	}

	function handleFitToScreen() {
		attachmentZoom = 1;
		panX = 0;
		panY = 0;
	}

	function handleZoomToggle() {
		if (attachmentZoom > 1) {
			attachmentZoom = 1;
			panX = 0;
			panY = 0;
		} else {
			attachmentZoom = Math.min(attachmentZoom + 0.5, 3);
		}
	}

	function handleMouseDown(event: MouseEvent) {
		if (attachmentZoom > 1) {
			isDragging = true;
			lastMouseX = event.clientX;
			lastMouseY = event.clientY;
			event.preventDefault();
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (isDragging && attachmentZoom > 1) {
			const deltaX = event.clientX - lastMouseX;
			const deltaY = event.clientY - lastMouseY;
			const w = imageContainer?.clientWidth ?? 800;
			const h = imageContainer?.clientHeight ?? 600;
			const maxPanX = (w * (attachmentZoom - 1)) / (2 * attachmentZoom);
			const maxPanY = (h * (attachmentZoom - 1)) / (2 * attachmentZoom);
			panX = Math.max(-maxPanX, Math.min(maxPanX, panX + deltaX));
			panY = Math.max(-maxPanY, Math.min(maxPanY, panY + deltaY));
			lastMouseX = event.clientX;
			lastMouseY = event.clientY;
			event.preventDefault();
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleAttachmentClick(attachment: Attachment) {
		selectedAttachment = attachment;
		attachmentZoom = 1;
		panX = 0;
		panY = 0;
		attachmentOpen = true;
	}

	function closeAttachmentDialog() {
		attachmentOpen = false;
		selectedAttachment = null;
	}

	function handleCollapsedAttachmentClick() {
		if (visibleMedia.length === 0) return;
		if (visibleMedia.length === 1) {
			handleAttachmentClick(visibleMedia[0]);
			return;
		}
		showCompactAttachments = !showCompactAttachments;
	}

	function closeCompactAttachments() {
		showCompactAttachments = false;
	}

	$effect(() => {
		if (!selectedAttachment) return;
		const current = visibleMedia.find((m) => m._id === selectedAttachment?._id);
		if (!current && !mediaQuery.isLoading) {
			closeAttachmentDialog();
		} else if (
			current &&
			(current.url !== selectedAttachment.url || current.updatedAt !== selectedAttachment.updatedAt)
		) {
			selectedAttachment = current;
		}
	});
</script>

{#if mediaQuery.error}
	<p class="text-sm text-error-ink p-3" role="alert">
		Question images could not be loaded. Refresh the page to try again.
	</p>
{/if}

{#if !collapsed}
	{#if visibleMedia.length > 0 || (showHiddenNote && hiddenCount > 0)}
		<div class="mt-6 surface shadow-xl shadow-black/5">
			<div class="flex flex-col gap-2 p-6">
				<h3 class="text-lg font-semibold">Attachments</h3>
				{#if visibleMedia.length > 0}
					<div class="grid grid-cols-2 gap-3 mt-2">
						{#each visibleMedia as attachment (attachment._id)}
							<button
								class="group border-2 border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-primary"
								onclick={() => handleAttachmentClick(attachment)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										handleAttachmentClick(attachment);
									}
								}}
								aria-label={`View attachment: ${attachment.altText}`}
								tabindex="0"
							>
								<div class="relative overflow-hidden">
									<img
										src={attachment.url}
										alt={attachment.altText}
										class:blur-md={shouldBlurAttachment(attachment)}
										class="w-full h-28 object-cover group-hover:brightness-110 group-hover:scale-105 transition-all duration-200"
									/>
									{#if showSolutionBadges && attachment.showOnSolution}
										<Badge size="xs" class="absolute top-2 left-2">Rationale</Badge>
									{/if}
									<div
										class="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-200"
									></div>
								</div>
								{#if attachment.caption}
									<div
										class="p-2 text-xs text-foreground/70 group-hover:text-foreground/90 transition-colors duration-200 break-words hyphens-auto"
									>
										{attachment.caption}
									</div>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
				{#if showHiddenNote && hiddenCount > 0}
					<div class="text-xs text-foreground/50 mt-3">
						{hiddenCount} attachment{hiddenCount === 1 ? '' : 's'} will appear in review after submission.
					</div>
				{/if}
			</div>
		</div>
	{/if}
{:else if visibleMedia.length > 0}
	<Button
		variant="soft"
		tone="info"
		size="lg"
		shape="circle"
		class="relative group"
		onclick={handleCollapsedAttachmentClick}
		title="View {visibleMedia.length} attachment{visibleMedia.length > 1 ? 's' : ''}"
		aria-label="View attachments ({visibleMedia.length})"
	>
		<Paperclip size={20} />
		{#if visibleMedia.length > 1}
			<span
				class="absolute -top-1 -right-1 bg-error text-error-foreground text-xs rounded-full min-w-[1.2rem] h-5 flex items-center justify-center font-bold px-1"
			>
				{visibleMedia.length}
			</span>
		{:else}
			<span
				class="absolute -top-1 -right-1 bg-info text-info-foreground text-xs rounded-full w-3 h-3 flex items-center justify-center"
			>
				✓
			</span>
		{/if}
	</Button>
{/if}

<Dialog.Root
	open={showCompactAttachments && visibleMedia.length > 1}
	onOpenChange={(open) => {
		if (!open) closeCompactAttachments();
	}}
>
	<Dialog.Content sheet class="max-h-[80vh] gap-4 overflow-y-auto sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Attachments ({visibleMedia.length})</Dialog.Title>
		</Dialog.Header>
		<div class="grid grid-cols-2 gap-3">
			{#each visibleMedia as attachment (attachment._id)}
				<button
					class="group border-2 border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-primary"
					onclick={() => {
						handleAttachmentClick(attachment);
						closeCompactAttachments();
					}}
					aria-label={`View attachment: ${attachment.altText}`}
				>
					<div class="relative">
						<img
							src={attachment.url}
							alt={attachment.altText}
							class:blur-md={shouldBlurAttachment(attachment)}
							class="w-full h-20 object-cover group-hover:brightness-110 transition-all duration-200"
						/>
						{#if showSolutionBadges && attachment.showOnSolution}
							<Badge size="xs" class="absolute top-1.5 left-1.5">Rationale</Badge>
						{/if}
						{#if attachment.caption}
							<div
								class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2"
							>
								<p class="text-white text-xs truncate">{attachment.caption}</p>
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root
	open={attachmentOpen}
	onOpenChange={(open) => {
		if (!open) closeAttachmentDialog();
	}}
>
	<Dialog.Content class="flex h-[90vh] w-full flex-col gap-0 sm:max-w-4xl">
		{#if selectedAttachment}
			<div class="flex flex-col h-full">
				<Dialog.Title class="mb-4 pe-10 text-lg font-semibold"
					>{selectedAttachment.altText}</Dialog.Title
				>
				<div
					bind:this={imageContainer}
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
						class="w-full h-full focus:outline-hidden focus:ring-2 focus:ring-primary {attachmentZoom >
						1
							? isDragging
								? 'cursor-grabbing'
								: 'cursor-grab'
							: 'cursor-zoom-in'}"
						onclick={attachmentZoom <= 1 ? handleZoomToggle : undefined}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								if (attachmentZoom <= 1) handleZoomToggle();
							}
						}}
						aria-label={attachmentZoom > 1 ? 'Pan image' : 'Zoom in'}
						tabindex="0"
						role="button"
					>
						<img
							src={selectedAttachment.url}
							alt={selectedAttachment.altText}
							class:blur-md={shouldBlurAttachment(selectedAttachment)}
							class="max-w-full max-h-full object-contain absolute inset-0 m-auto select-none"
							style="transform: scale({attachmentZoom ||
								1}) translate({panX}px, {panY}px); transform-origin: center; transition: transform 0.1s ease-out;"
							draggable="false"
						/>
					</div>
				</div>

				{#if selectedAttachment.caption}
					<div class="mt-4 p-3 bg-muted rounded-2xl">
						<p class="text-sm text-foreground/70">{selectedAttachment.caption}</p>
					</div>
				{/if}

				<div class="flex justify-center gap-2 mt-4">
					<Button
						variant="outline"
						tone="neutral"
						size="sm"
						shape="circle"
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
						variant="outline"
						tone="neutral"
						size="sm"
						shape="circle"
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
						variant="outline"
						tone="neutral"
						size="sm"
						shape="circle"
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
