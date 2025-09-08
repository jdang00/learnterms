<script lang="ts">
	import { PanelRight, Eye, Info, ChevronLeft, Settings, Paperclip } from 'lucide-svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id } from '../../convex/_generated/dataModel';

	let { qs = $bindable(), module, currentlySelected, userId, moduleId, client, classId } = $props();
	let hideSidebar = $state(false);
	let isInfoModalOpen = $state(false);
	let isSolutionModalOpen = $state(false);
	let isSettingsModalOpen = $state(false);
	let isAttachmentModalOpen = $state(false);
	let selectedAttachment = $state<{
		_id: string;
		url: string;
		altText: string;
		caption?: string;
	} | null>(null);
	let attachmentZoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isDragging = $state(false);
	let lastMouseX = $state(0);
	let lastMouseY = $state(0);
	let showCompactAttachments = $state(false);

	let media: {
		data: Array<{ _id: string; url: string; altText: string; caption?: string }>;
		isLoading: boolean;
		error: any;
	} = $state({
		data: [],
		isLoading: false,
		error: null
	});

	$effect(() => {
		const qid = currentlySelected?._id as Id<'question'> | undefined;
		if (qid) {
			const q = useQuery((api as any).questionMedia.getByQuestionId, { questionId: qid });
			media = q as unknown as typeof media;
		} else {
			media = { data: [], isLoading: false, error: null } as typeof media;
		}
	});

	async function handleReset() {
		if (userId && moduleId && client) {
			await qs.reset(userId, moduleId, client);
			qs.isResetModalOpen = false;
		}
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

			// Calculate maximum pan limits based on zoom level
			const maxPan = (attachmentZoom - 1) * 100;
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

	function handleAttachmentClick(attachment: {
		_id: string;
		url: string;
		altText: string;
		caption?: string;
	}) {
		selectedAttachment = attachment;
		attachmentZoom = 1;
		panX = 0;
		panY = 0;
		isAttachmentModalOpen = true;
	}

	function handleCollapsedAttachmentClick() {
		if (media && media.data && media.data.length > 0) {
			if (media.data.length === 1) {
				// If only one attachment, open it directly in full modal
				handleAttachmentClick(media.data[0]);
			} else {
				// If multiple attachments, show compact viewer
				showCompactAttachments = !showCompactAttachments;
			}
		}
	}

	function closeCompactAttachments() {
		showCompactAttachments = false;
	}
</script>

<div
	class="
	 hidden lg:flex lg:flex-col relative
	 overflow-y-auto
	 border border-base-300
	 rounded-xl
	 p-3
	 transition-all duration-200 ease-out
	 bg-base-100 backdrop-blur-md bg-opacity-80 shadow-lg
	 flex-shrink-0 h-full
	 {hideSidebar ? 'w-[72px]' : 'w-[min(22rem,30vw)] xl:w-[min(24rem,28vw)]'}

	"
>
	<button
		class="btn btn-ghost btn-square btn-sm w-9 h-9 absolute top-6 left-5"
		onclick={() => (hideSidebar = !hideSidebar)}
		aria-label="Toggle sidebar"
	>
		<PanelRight
			size={18}
			class="transition-transform duration-300 {hideSidebar ? 'rotate-180' : ''}"
		/>
	</button>

	{#if !hideSidebar}
		<div class="p-4 md:p-5 lg:p-6 pt-12 pl-12 mt-8">
			<h4 class="font-bold text-sm tracking-wide text-secondary -ms-6">
				<a class="btn btn-ghost font-bold" href={`/classes?classId=${classId}`}>
					<ChevronLeft size={16} /> MODULE {module.data.order + 1}
				</a>
			</h4>
			<h2 class="font-semibold text-3xl mt-2 flex items-center gap-3">
				<span class="text-3xl">{module.data?.emoji || '📘'}</span>
				<span>{module.data.title}</span>
			</h2>
			<p class="text-base-content/70 mt-2">{module.data.description}</p>

			<div class="mt-6">
				<p class="text-base-content/60 mb-2">{qs.getProgressPercentage()}% done.</p>
				<progress
					class="progress progress-success w-full transition-colors"
					value={qs.getProgressPercentage()}
					max="100"
				></progress>
			</div>
		</div>

		<div class="flex flex-col justify-center m-4">
			{#if media && media.data && media.data.length > 0}
				<div class="card bg-base-100 shadow-xl mt-8 lg:mt-12">
					<div class="card-body">
						<h3 class="card-title">Attachments</h3>
						<div class="grid grid-cols-2 gap-3 mt-2">
							{#each media.data as m (m._id)}
								<button
									class="group border-2 border-base-300 rounded-lg overflow-hidden cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
									onclick={() => handleAttachmentClick(m)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											handleAttachmentClick(m);
										}
									}}
									aria-label={`View attachment: ${m.altText}`}
									tabindex="0"
								>
									<div class="relative overflow-hidden">
										<img
											src={m.url}
											alt={m.altText}
											class="w-full h-28 object-cover group-hover:brightness-110 group-hover:scale-105 transition-all duration-200"
										/>
										<div
											class="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-200"
										></div>
										<div
											class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
										>
											<div class="bg-primary/90 text-primary-content rounded-full p-1">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
													></path>
												</svg>
											</div>
										</div>
									</div>
									{#if m.caption}
										<div
											class="p-2 text-xs text-base-content/70 group-hover:text-base-content/90 transition-colors duration-200"
										>
											{m.caption}
										</div>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			{#if typeof currentlySelected.explanation === 'string' && (() => {
					const t = currentlySelected.explanation.trim().toLowerCase();
					return t.length > 0 && t !== 'undefined' && t !== 'null';
				})()}
				<div class="card bg-base-100 shadow-xl mt-6">
					<div class="card-body">
						<div class="flex flex-row flex-wrap justify-between border-b pb-2">
							<h2 class="card-title">Solution</h2>
							<div class="flex flex-row">
								<kbd class="kbd kbd-sm hidden xl:block self-center me-1">tab</kbd>
								<button class="btn btn-ghost btn-circle" onclick={() => qs.handleSolution()}>
									<Eye />
								</button>
							</div>
						</div>
						<p
							class={`mt-2 transition-all duration-300 ${qs.showSolution ? 'blur-none' : 'blur-sm'}`}
						>
							{currentlySelected.explanation}
						</p>
					</div>
				</div>
			{/if}

			<div class="flex flex-row mt-6 justify-center">
				<button class="btn btn-soft btn-sm" onclick={() => (isSettingsModalOpen = true)}>
					<Settings size={16} />
					<span class="ml-1 hidden sm:inline">Settings</span>
				</button>
			</div>
		</div>
	{:else}
		<div class="mt-16 justify-self-center flex flex-col items-center space-y-4 ms-1">
			<div class="flex flex-col items-center space-y-4">
				<a
					class="group flex items-center justify-center font-bold text-secondary-content bg-secondary text-center w-full rounded-full transition-colors"
					href={`/classes?classId=${classId}`}
				>
					<span class="group-hover:hidden">{module.data.order + 1}</span>
					<span class="hidden group-hover:inline-flex items-center justify-center"
						><ChevronLeft size={24} /></span
					>
				</a>

				<button
					class="btn btn-circle btn-lg btn-soft btn-primary"
					onclick={() => (isInfoModalOpen = true)}><Info /></button
				>

				<div
					class="radial-progress text-success text-xs bg-base-300"
					style="--value:{qs.getProgressPercentage()}; --size:3rem; --thickness: 3px;"
					aria-valuenow="70"
					role="progressbar"
				>
					{qs.getProgressPercentage()}%
				</div>
				<button class="btn btn-circle btn-lg btn-soft" onclick={() => (isSolutionModalOpen = true)}
					><Eye /></button
				>

				{#if media && media.data && media.data.length > 0}
					<button
						class="btn btn-circle btn-lg btn-soft btn-info relative group"
						onclick={() => handleCollapsedAttachmentClick()}
						title="View {media.data.length} attachment{media.data.length > 1 ? 's' : ''}"
						aria-label="View attachments ({media.data.length})"
					>
						<Paperclip size={20} />
						{#if media.data.length > 1}
							<span
								class="absolute -top-1 -right-1 bg-error text-error-content text-xs rounded-full min-w-[1.2rem] h-5 flex items-center justify-center font-bold px-1"
							>
								{media.data.length}
							</span>
						{:else}
							<span
								class="absolute -top-1 -right-1 bg-info text-info-content text-xs rounded-full w-3 h-3 flex items-center justify-center"
							>
								✓
							</span>
						{/if}

						<!-- Tooltip on hover -->
						<div
							class="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10"
						>
							<div
								class="bg-base-100 text-base-content px-2 py-1 rounded-lg shadow-lg border border-base-300 text-sm whitespace-nowrap"
							>
								{media.data.length} attachment{media.data.length > 1 ? 's' : ''}
							</div>
						</div>
					</button>
				{/if}
			</div>

			<div class="border-t border-base-300 w-full my-2"></div>

			<button
				class="btn btn-circle btn-lg mt-3 btn-soft"
				onclick={() => (isSettingsModalOpen = true)}
				title="Settings"
			>
				<Settings />
			</button>
		</div>
	{/if}

	<!-- Compact Attachment Viewer for Collapsed Sidebar -->
	{#if showCompactAttachments && media && media.data && media.data.length > 1}
		<div
			class="fixed inset-0 z-40 flex items-center justify-center"
			role="dialog"
			aria-modal="true"
			aria-labelledby="compact-attachments-title"
		>
			<button
				class="fixed inset-0 bg-black/50 cursor-default"
				onclick={closeCompactAttachments}
				onkeydown={(e) => {
					if (e.key === 'Escape') {
						closeCompactAttachments();
					}
				}}
				aria-label="Close attachments viewer"
				tabindex="-1"
			></button>

			<div
				class="bg-base-100 rounded-xl shadow-2xl border border-base-300 p-4 max-w-sm w-full mx-4 max-h-[80vh] overflow-y-auto relative z-10"
				role="document"
			>
				<div class="flex items-center justify-between mb-4">
					<h3 id="compact-attachments-title" class="font-semibold text-lg">
						Attachments ({media.data.length})
					</h3>
					<button
						class="btn btn-sm btn-ghost btn-circle"
						onclick={closeCompactAttachments}
						aria-label="Close attachments"
					>
						✕
					</button>
				</div>

				<div class="grid grid-cols-2 gap-3">
					{#each media.data as attachment (attachment._id)}
						<button
							class="group border-2 border-base-300 rounded-lg overflow-hidden cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
							onclick={() => {
								handleAttachmentClick(attachment);
								closeCompactAttachments();
							}}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleAttachmentClick(attachment);
									closeCompactAttachments();
								}
							}}
							aria-label={`View attachment: ${attachment.altText}`}
						>
							<div class="relative">
								<img
									src={attachment.url}
									alt={attachment.altText}
									class="w-full h-20 object-cover group-hover:brightness-110 transition-all duration-200"
								/>
								<div
									class="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-200"
								></div>
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

				<div class="mt-4 pt-4 border-t border-base-300">
					<p class="text-sm text-base-content/60 text-center">
						Click any attachment to view in full size
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<dialog class="modal max-w-full p-4" class:modal-open={isInfoModalOpen}>
	<div class="modal-box">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={() => (isInfoModalOpen = false)}>✕</button
			>
		</form>
		<h3 class="font-bold">Module Information</h3>
		<p class="py-4"></p>
		<p class="font-2xl font-semibold">Module {module.data.order + 1}: {module.data.title}</p>
		<p class="text-base-content/70">{module.data.description}</p>
		<div class="modal-action">
			<button class="btn" onclick={() => (isInfoModalOpen = false)}>Close</button>
		</div>
	</div>
</dialog>

<dialog class="modal max-w-full p-4" class:modal-open={isSolutionModalOpen}>
	<div class="modal-box">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={() => (isSolutionModalOpen = false)}>✕</button
			>
		</form>
		<h3 class="text-lg font-bold">Solution</h3>
		{#if typeof currentlySelected.explanation === 'string' && currentlySelected.explanation.trim().length > 0}
			<p class="py-4">{currentlySelected.explanation}</p>
		{/if}
	</div>
</dialog>

<SettingsModal bind:qs bind:isOpen={isSettingsModalOpen} />

<dialog class="modal max-w-full p-4" class:modal-open={qs.isResetModalOpen}>
	<div class="modal-box">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={() => (qs.isResetModalOpen = false)}
			>
				✕
			</button>
		</form>
		<h3 class="text-lg font-bold">Reset Progress</h3>
		<p class="py-4">
			Do you want to start over? All current progress for this module will be lost.
		</p>
		<div class="flex justify-end space-x-2">
			<button class="btn btn-outline" onclick={() => (qs.isResetModalOpen = false)}>
				Cancel
			</button>
			<button class="btn btn-error" onclick={() => handleReset()}>Reset</button>
		</div>
	</div>
</dialog>

<dialog class="modal max-w-full p-4" class:modal-open={isAttachmentModalOpen}>
	<div class="modal-box max-w-4xl w-full h-[90vh]">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10"
				onclick={() => {
					isAttachmentModalOpen = false;
					selectedAttachment = null;
				}}>✕</button
			>
		</form>

		{#if selectedAttachment}
			<div class="flex flex-col h-full">
				<h3 class="font-bold text-lg mb-4">{selectedAttachment.altText}</h3>

				<div
					class="flex-1 relative overflow-hidden bg-base-200 rounded-lg"
					onmousedown={handleMouseDown}
					onmousemove={handleMouseMove}
					onmouseup={handleMouseUp}
					onmouseleave={handleMouseUp}
					role="button"
					tabindex="0"
					aria-label="Image viewer - click to zoom, drag to pan when zoomed"
				>
					<div
						class="w-full h-full focus:outline-none focus:ring-2 focus:ring-primary {attachmentZoom >
						1
							? isDragging
								? 'cursor-grabbing'
								: 'cursor-grab'
							: 'cursor-zoom-in'}"
						onclick={attachmentZoom <= 1 ? handleZoomToggle : undefined}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								if (attachmentZoom <= 1) {
									handleZoomToggle();
								}
							}
						}}
						aria-label={attachmentZoom > 1 ? 'Pan image' : 'Zoom in'}
						tabindex="0"
						role="button"
					>
						<img
							src={selectedAttachment.url}
							alt={selectedAttachment.altText}
							class="max-w-full max-h-full object-contain absolute inset-0 m-auto select-none"
							style="transform: scale({attachmentZoom ||
								1}) translate({panX}px, {panY}px); transform-origin: center; transition: transform 0.1s ease-out;"
							draggable="false"
						/>
					</div>
				</div>

				{#if selectedAttachment.caption}
					<div class="mt-4 p-3 bg-base-200 rounded-lg">
						<p class="text-sm text-base-content/70">{selectedAttachment.caption}</p>
					</div>
				{/if}

				<div class="flex justify-center gap-2 mt-4">
					<button class="btn btn-sm btn-outline" onclick={handleZoomOut} aria-label="Zoom out">
						<svg
							class="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"
							></path>
						</svg>
						<span class="sr-only">Zoom out</span>
					</button>
					<button
						class="btn btn-sm btn-outline"
						onclick={handleFitToScreen}
						aria-label="Fit to screen"
					>
						<span class="text-xs">Fit</span>
					</button>
					<button class="btn btn-sm btn-outline" onclick={handleZoomIn} aria-label="Zoom in">
						<svg
							class="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							></path>
						</svg>
						<span class="sr-only">Zoom in</span>
					</button>
				</div>
			</div>
		{/if}
	</div>
</dialog>
