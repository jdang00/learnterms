<script lang="ts">
	let { handledocView, currentDocView, currentDocument } = $props();
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id, Doc } from '../../convex/_generated/dataModel';
	import { FileText, AlignLeft, Type, Tags, RefreshCw } from 'lucide-svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import DeleteConfirmationModal from './DeleteConfirmationModal.svelte';
	import { createUploader } from '$lib/utils/uploadthing';
	import { UploadDropzone } from '@uploadthing/svelte';

	const client = useConvexClient();

	let getDocumentChunks = useQuery(api.chunkContent.getChunkByDocumentId, () => ({
		documentId: currentDocView as Id<'contentLib'>
	}));

	let getJob = useQuery(api.pdfJobs.getJobByDocumentId, () => ({
		documentId: currentDocView as Id<'contentLib'>
	}));

	let isRetrying = $state(false);

	const isProcessing = $derived(
		getJob.data?.status === 'pending' || getJob.data?.status === 'processing'
	);
	const processingError = $derived(
		getJob.data?.status === 'failed' ? getJob.data.error : ''
	);
	const processingStatus = $derived(getJob.data?.progress?.currentStep ?? '');
	const chunksReceived = $derived(getJob.data?.progress?.chunksProcessed ?? 0);
	const totalChunks = $derived(getJob.data?.progress?.totalChunks ?? 0);

	let isEditModalOpen: boolean = $state(false);
	let editingChunk: Doc<'chunkContent'> | null = $state(null);
	let isDeleteModalOpen: boolean = $state(false);
	let deletingChunk: Doc<'chunkContent'> | null = $state(null);
	let isSubmitting: boolean = $state(false);
	let submitError: string = $state('');

	let editTitle: string = $state('');
	let editSummary: string = $state('');
	let editContent: string = $state('');
	let editKeywords: string = $state('');
	let editChunkType: string = $state('');

	const keywordColors = [
		'badge-primary',
		'badge-secondary',
		'badge-accent',
		'badge-info',
		'badge-success',
		'badge-warning'
	];

	function openEdit(chunk: Doc<'chunkContent'>) {
		editingChunk = chunk;
		editTitle = chunk.title;
		editSummary = chunk.summary;
		editContent = chunk.content;
		editKeywords = chunk.keywords.join(', ');
		editChunkType = chunk.chunk_type;
		isEditModalOpen = true;
	}

	function closeEdit() {
		isEditModalOpen = false;
		editingChunk = null;
		submitError = '';
	}

	async function saveEdit() {
		if (!editingChunk) return;
		isSubmitting = true;
		submitError = '';
		try {
			const keywords = editKeywords
				.split(',')
				.map((k) => k.trim())
				.filter(Boolean);
			await client.mutation(api.chunkContent.updateChunkContent, {
				chunkId: editingChunk._id,
				documentId: currentDocView as Id<'contentLib'>,
				title: editTitle,
				summary: editSummary,
				content: editContent,
				keywords,
				chunk_type: editChunkType,
				metadata: {}
			});
			closeEdit();
		} catch (error) {
			submitError = error instanceof Error ? error.message : 'Failed to update chunk';
		} finally {
			isSubmitting = false;
		}
	}

	function openDelete(chunk: Doc<'chunkContent'>) {
		deletingChunk = chunk;
		isDeleteModalOpen = true;
	}

	function closeDelete() {
		isDeleteModalOpen = false;
		deletingChunk = null;
	}

	async function confirmDelete() {
		if (!deletingChunk) return;
		try {
			await client.mutation(api.chunkContent.deleteChunkContent, {
				chunkId: deletingChunk._id,
				documentId: currentDocView as Id<'contentLib'>
			});
			closeDelete();
		} catch (error) {
			console.error('Failed to delete chunk:', error);
		}
	}

	async function retryFailedJob() {
		if (!getJob.data?._id) return;
		isRetrying = true;
		try {
			await client.mutation(api.pdfJobs.retryJob, { jobId: getJob.data._id });
		} catch (error) {
			console.error('Failed to retry job:', error);
		} finally {
			isRetrying = false;
		}
	}

	const uploader = createUploader('pdfUploader', {
		onClientUploadComplete: async (res) => {
			try {
				const uploaded = Array.isArray(res) ? res[0] : null;
				const pdfUrl = uploaded?.ufsUrl || uploaded?.url;
				const fileKey = (uploaded as any)?.key;
				if (!pdfUrl) {
					throw new Error('Upload complete but missing file URL');
				}

				await client.mutation(api.pdfJobs.createJob, {
					documentId: currentDocView as Id<'contentLib'>,
					pdfUrl,
					fileKey
				});
			} catch (e) {
				console.error('Failed to create job:', e);
			}
		},
		onUploadError: (error: Error) => {
			console.error('Upload error:', error.message);
		}
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		const shouldProcess = params.get('processing') === '1';
		const pdfUrl = params.get('pdfUrl');
		const fileKey = params.get('fileKey');

		if (shouldProcess && pdfUrl && !getJob.data) {
			client.mutation(api.pdfJobs.createJob, {
				documentId: currentDocView as Id<'contentLib'>,
				pdfUrl,
				fileKey: fileKey || undefined
			}).then(() => {
				params.delete('processing');
				params.delete('pdfUrl');
				params.delete('fileKey');
				const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
				history.replaceState({}, '', newUrl);
			}).catch(console.error);
		}
	});
</script>

<div
	class="border border-base-300 mt-12 rounded-lg shadow-sm bg-base-100 p-8"
	in:fade={{ duration: 180 }}
	out:fade={{ duration: 120 }}
>
	<div class="flex flex-row justify-between">
		<h2 class="text-2xl font-semibold">{currentDocument.title}</h2>
	</div>

	<!-- Progress Bar (shown when processing) -->
	{#if isProcessing}
		<div class="mt-6 mb-4" in:fade={{ duration: 150 }}>
			<div class="bg-base-200 rounded-lg p-4">
				<div class="flex items-center justify-center gap-3 mb-3">
					<span class="loading loading-spinner loading-sm text-primary"></span>
					<h3 class="font-semibold">Processing PDF Document</h3>
				</div>
				<p class="text-sm text-center text-base-content/70 mb-3">
					{processingStatus || 'Analyzing content and generating chunks...'}
				</p>

				{#if totalChunks > 0}
					<div class="max-w-md mx-auto">
						<progress
							class="progress progress-primary w-full h-2"
							value={chunksReceived}
							max={totalChunks}
						></progress>
						<div class="flex justify-between items-center mt-2">
							<p class="text-xs text-base-content/60">
								{chunksReceived} of {totalChunks} chunks processed
							</p>
							<p class="text-xs text-base-content/50">
								{Math.round((chunksReceived / totalChunks) * 100)}%
							</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Error State with Retry -->
	{#if processingError}
		<div class="mt-6 mb-4" in:fade={{ duration: 150 }}>
			<div class="alert alert-error">
				<span>{processingError}</span>
				<button
					class="btn btn-sm btn-ghost gap-2"
					onclick={retryFailedJob}
					disabled={isRetrying}
				>
					{#if isRetrying}
						<span class="loading loading-spinner loading-xs"></span>
					{:else}
						<RefreshCw size={16} />
					{/if}
					Retry
				</button>
			</div>
		</div>
	{/if}

	{#if getDocumentChunks.isLoading && !isProcessing}
		<!-- Initial Loading State -->
		<div class="mt-6" in:fade={{ duration: 150 }}>
			<div class="skeleton h-8 w-48 mb-6"></div>
			<div class="space-y-4">
				{#each Array(3), index (index)}
					<div class="card bg-base-100 border border-base-300">
						<div class="card-body p-6">
							<div class="flex justify-between items-start">
								<div class="flex-1 space-y-3">
									<div class="skeleton h-6 w-3/4"></div>
									<div class="skeleton h-4 w-full"></div>
									<div class="skeleton h-4 w-5/6"></div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else if getDocumentChunks.error}
		<div class="alert alert-error mt-6">
			<span>Error loading chunks: {getDocumentChunks.error.message}</span>
		</div>
	{:else if getDocumentChunks.data && getDocumentChunks.data.length === 0 && !isProcessing}
		<!-- Empty State with PDF Upload -->
		<div class="flex flex-col items-center justify-center py-12 mt-6" in:fade={{ duration: 150 }}>
			<div class="text-center mb-8">
				<div
					class="w-24 h-24 mx-auto bg-base-200 rounded-full flex items-center justify-center mb-4"
				>
					<FileText class="w-12 h-12 text-base-content/40" />
				</div>
				<h3 class="text-xl font-semibold mb-2">No content chunks yet</h3>
				<p class="text-base-content/70 max-w-md">
					Upload a PDF document to automatically extract and organize content into learning chunks.
				</p>
			</div>

			<!-- PDF Upload Card (UploadThing) -->
			<div
				class="card bg-base-100 border border-base-300 shadow-md w-full max-w-md"
				in:scale={{ duration: 180, start: 0.96 }}
			>
				<div class="card-body">
					<h4 class="font-semibold mb-4 text-center">Upload PDF Document</h4>
					<div class="ut-flex ut-flex-col ut-items-center ut-justify-center ut-gap-4">
						<span class="ut-text-center ut-text-4xl ut-font-bold"> </span>
						<UploadDropzone {uploader} />
					</div>
					{#if processingError}
						<div class="alert alert-error alert-sm mt-4">
							<span class="text-sm">{processingError}</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Chunks Display -->
	{#if getDocumentChunks.data && getDocumentChunks.data.length > 0}
		<div class="mt-6" in:fade={{ duration: 160 }}>
			<div class="flex justify-between items-center mb-6">
				<div>
					<h3 class="text-xl font-semibold">Content Chunks</h3>
					<p class="text-sm text-base-content/70">
						{#if isProcessing && totalChunks > 0}
							{chunksReceived} of {totalChunks} chunks saved
						{:else}
							{getDocumentChunks.data.length} chunk{getDocumentChunks.data.length !== 1 ? 's' : ''} extracted
						{/if}
					</p>
				</div>
			</div>

			<div class="grid gap-4">
				{#each getDocumentChunks.data as chunk (chunk._id)}
					<div
						class="card bg-base-100 border border-base-300 hover:border-primary/30 hover:shadow-lg transition-all duration-200"
						in:fly={{ y: 10, duration: 180 }}
					>
						<div class="card-body p-6">
							<div class="flex justify-between items-start gap-4">
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-2">
										<h4 class="font-semibold text-lg truncate">{chunk.title}</h4>
										<div class="badge badge-soft badge-primary badge-sm capitalize">
											{chunk.chunk_type}
										</div>
									</div>
									<p class="text-base-content/80 text-sm mb-3 line-clamp-2">{chunk.summary}</p>
									<div class="flex flex-wrap gap-1">
										{#each chunk.keywords.slice(0, 4) as keyword, index (index)}
											<span class="badge badge-soft badge-secondary badge-xs">{keyword}</span>
										{/each}
										{#if chunk.keywords.length > 4}
											<span class="badge badge-ghost badge-xs">+{chunk.keywords.length - 4}</span>
										{/if}
									</div>
								</div>
								<div class="dropdown dropdown-end">
									<div tabindex="0" role="button" class="btn btn-ghost btn-sm btn-square">
										<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
											<path
												d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
											/>
										</svg>
									</div>
									<ul
										class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-44 z-20 border border-base-300"
									>
										<li>
											<button class="text-sm" onclick={() => openEdit(chunk)}>Edit chunk</button>
										</li>
										<li>
											<button class="text-sm text-error" onclick={() => openDelete(chunk)}
												>Delete chunk</button
											>
										</li>
									</ul>
								</div>
							</div>

							<div class="mt-4">
								<details class="collapse collapse-arrow bg-base-200">
									<summary class="collapse-title text-sm font-medium">View full content</summary>
									<div class="collapse-content">
										<div class="prose prose-sm max-w-none pt-2">
											<pre class="whitespace-pre-wrap text-xs leading-relaxed">{chunk.content}</pre>
										</div>
									</div>
								</details>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Edit Chunk Modal -->
<dialog class="modal p-6" class:modal-open={isEditModalOpen}>
	<div class="modal-box w-full max-w-3xl rounded-2xl border border-base-300 shadow-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
				onclick={closeEdit}
				aria-label="Close"
			>
				✕
			</button>
		</form>

		<div class="mb-6 flex items-center gap-2">
			<h3 class="text-2xl font-extrabold tracking-tight">Edit Chunk</h3>
		</div>

		{#if submitError}
			<div class="alert alert-error mb-6"><span>❌ {submitError}</span></div>
		{/if}

		{#if editingChunk}
			<div class="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-[auto_1fr]">
				<label
					class="label m-0 hidden items-center gap-2 p-0 text-base font-medium text-base-content/80 md:flex"
					for="chunk-title"
				>
					<FileText size={18} class="text-primary/80" />
					<span>Title</span>
				</label>
				<div class="md:contents">
					<label
						for="chunk-title"
						class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden"
					>
						<FileText size={18} class="text-primary/80" />
						<span>Title</span>
					</label>
					<div class="form-control w-full">
						<input
							id="chunk-title"
							type="text"
							class="input input-bordered w-full"
							bind:value={editTitle}
							maxlength="200"
						/>
					</div>
				</div>

				<label
					class="label m-0 hidden items-center gap-2 p-0 text-base font-medium text-base-content/80 md:flex"
					for="chunk-type"
				>
					<Type size={18} class="text-primary/80" />
					<span>Chunk Type</span>
				</label>
				<div class="md:contents">
					<label
						for="chunk-type"
						class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden"
					>
						<Type size={18} class="text-primary/80" />
						<span>Chunk Type</span>
					</label>
					<div class="form-control w-full">
						<input
							id="chunk-type"
							type="text"
							class="input input-bordered w-full"
							bind:value={editChunkType}
						/>
					</div>
				</div>

				<label
					class="label m-0 hidden items-center gap-2 p-0 text-base font-medium text-base-content/80 md:flex"
					for="chunk-keywords"
				>
					<Tags size={18} class="text-primary/80" />
					<span>Keywords</span>
				</label>
				<div class="md:contents">
					<label
						for="chunk-keywords"
						class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden"
					>
						<Tags size={18} class="text-primary/80" />
						<span>Keywords (comma separated)</span>
					</label>
					<div class="form-control w-full">
						<input
							id="chunk-keywords"
							type="text"
							class="input input-bordered w-full"
							bind:value={editKeywords}
						/>
						<div class="label">
							<span class="label-text-alt text-xs text-base-content/60">Comma separated</span>
						</div>
					</div>
				</div>

				<label
					class="label m-0 hidden items-center gap-2 self-start p-0 text-base font-medium text-base-content/80 md:flex"
					for="chunk-summary"
				>
					<AlignLeft size={18} class="text-primary/80" />
					<span>Summary</span>
				</label>
				<div class="form-control md:block">
					<label
						for="chunk-summary"
						class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden"
					>
						<AlignLeft size={18} class="text-primary/80" />
						<span>Summary</span>
					</label>
					<textarea
						id="chunk-summary"
						class="textarea textarea-bordered w-full min-h-40"
						bind:value={editSummary}
						maxlength="1000"
					></textarea>
				</div>

				<label
					class="label m-0 hidden items-center gap-2 self-start p-0 text-base font-medium text-base-content/80 md:flex"
					for="chunk-content"
				>
					<FileText size={18} class="text-primary/80" />
					<span>Content</span>
				</label>
				<div class="form-control md:block">
					<label
						for="chunk-content"
						class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden"
					>
						<FileText size={18} class="text-primary/80" />
						<span>Content</span>
					</label>
					<textarea
						id="chunk-content"
						class="textarea textarea-bordered w-full min-h-72"
						bind:value={editContent}
					></textarea>
				</div>
			</div>
		{/if}

		<div class="modal-action mt-8">
			<form method="dialog" class="flex gap-3">
				<button class="btn btn-ghost" onclick={closeEdit} disabled={isSubmitting}>Cancel</button>
				<button class="btn btn-primary gap-2" onclick={saveEdit} disabled={isSubmitting}>
					{#if isSubmitting}
						<span class="loading loading-spinner loading-sm"></span>
						<span>Saving...</span>
					{:else}
						<span>Save Changes</span>
					{/if}
				</button>
			</form>
		</div>
	</div>
</dialog>

<!-- Delete Chunk Modal -->
<DeleteConfirmationModal
	{isDeleteModalOpen}
	onCancel={closeDelete}
	onConfirm={confirmDelete}
	itemName={deletingChunk?.title}
	itemType="chunk"
/>
