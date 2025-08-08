<script lang="ts">
	let { handledocView, currentDocView, currentDocument } = $props();
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id, Doc } from '../../convex/_generated/dataModel';
	import { Upload, FileText, AlignLeft, Type, Tags } from 'lucide-svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import DeleteConfirmationModal from './DeleteConfirmationModal.svelte';

	const client = useConvexClient();

	let getDocumentChunks = useQuery(api.chunkContent.getChunkByDocumentId, () => ({
		documentId: currentDocView as Id<'contentLib'>
	}));

	let isProcessing = $state(false);
	let processingError = $state('');
	let selectedFile: File | null = $state(null);
	let fileInput: HTMLInputElement | null = $state(null);
	let loadingSkeletons = $state(0);
	let loadingInterval: ReturnType<typeof setInterval> | null = null;

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

	const keywordColors = ['badge-primary', 'badge-secondary', 'badge-accent', 'badge-info', 'badge-success', 'badge-warning'];

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

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		
		if (!file) {
			selectedFile = null;
			return;
		}

		// Validate file type
		if (file.type !== 'application/pdf') {
			processingError = 'Please select a PDF file only';
			selectedFile = null;
			target.value = '';
			return;
		}

		// Validate file size (max 10MB)
		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			processingError = 'File size must be less than 10MB';
			selectedFile = null;
			target.value = '';
			return;
		}

		selectedFile = file;
		processingError = '';
	}

	async function processPDF() {
		if (!selectedFile) {
			processingError = 'Please select a PDF file';
			return;
		}

		isProcessing = true;
		processingError = '';
		loadingSkeletons = 0;

		// Start the progressive skeleton loading animation
		loadingInterval = setInterval(() => {
			if (loadingSkeletons < 8) {
				loadingSkeletons++;
			}
		}, 800); // Add a new skeleton every 800ms

		try {
			const formData = new FormData();
			formData.append('pdf', selectedFile);
			const documentId = typeof currentDocView === 'string'
				? currentDocView
				: (currentDocView ? String(currentDocView) : '');
			if (!documentId) {
				throw new Error('Invalid document id');
			}
			formData.append('documentId', documentId);

			const response = await fetch('/api/processdoc', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to process PDF');
			}

			const result = await response.json();

			if (result.success && Array.isArray(result.chunks)) {
				let inserted = 0;
				for (const chunk of result.chunks) {
					await client.mutation(api.chunkContent.insertChunkContent, {
						title: chunk.title,
						summary: chunk.summary,
						content: chunk.content,
						keywords: chunk.keywords,
						chunk_type: chunk.chunk_type,
						documentId: currentDocView as Id<'contentLib'>,
						metadata: {},
						updatedAt: Date.now()
					});
					inserted++;
				}
				console.log(`Created ${inserted.toString()} chunks from PDF`);
			} else {
				throw new Error('Failed to process PDF - no chunks returned');
			}
			
			// Reset form
			selectedFile = null;
			if (fileInput) fileInput.value = '';
			
		} catch (error) {
			processingError = error instanceof Error ? error.message : 'Failed to process PDF';
		} finally {
			isProcessing = false;
			loadingSkeletons = 0;
			if (loadingInterval !== null) {
				clearInterval(loadingInterval);
				loadingInterval = null;
			}
		}
	}


</script>

<div class="border border-base-300 mt-12 rounded-lg shadow-sm bg-base-100 p-8" in:fade={{ duration: 180 }} out:fade={{ duration: 120 }}>
    <div class="flex flex-row justify-between">
        <h2 class="text-2xl font-semibold">{currentDocument.title}</h2>
    </div>

		{#if getDocumentChunks.isLoading || isProcessing}
		<!-- Dynamic Processing Loading -->
		<div class="mt-6" in:fade={{ duration: 150 }}>
			{#if isProcessing}
				<div class="text-center mb-6">
					<div class="flex items-center justify-center gap-3 mb-2">
						<span class="loading loading-spinner loading-md text-primary"></span>
						<h3 class="text-lg font-semibold">Processing PDF Document</h3>
					</div>
					<p class="text-sm text-base-content/70">Analyzing content and generating chunks...</p>
				</div>
			{:else}
				<div class="skeleton h-8 w-48 mb-6"></div>
			{/if}
			
			<div class="space-y-4">
				{#each Array(isProcessing ? loadingSkeletons : 3) as _, index}
					<div 
						class="card bg-base-100 border border-base-300 {isProcessing ? 'animate-pulse' : ''}"
						style="animation-delay: {index * 200}ms"
						in:fly={{ y: 8, duration: 180, delay: index * 40, opacity: 0.2 }}
					>
						<div class="card-body p-6">
							<div class="flex justify-between items-start">
								<div class="flex-1 space-y-3">
									<div class="skeleton h-6 w-3/4"></div>
									<div class="skeleton h-4 w-full"></div>
									<div class="skeleton h-4 w-5/6"></div>
									<div class="flex gap-2 mt-3">
										<div class="skeleton h-5 w-20"></div>
										<div class="skeleton h-4 w-32"></div>
										<div class="skeleton h-4 w-24"></div>
									</div>
								</div>
								<div class="skeleton h-8 w-8"></div>
							</div>
						</div>
					</div>
				{/each}
				
				{#if isProcessing && loadingSkeletons < 8}
					<div class="flex items-center justify-center py-4">
						<div class="flex items-center gap-2 text-sm text-base-content/60">
							<span class="loading loading-dots loading-sm"></span>
							<span>Generating more chunks...</span>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{:else if getDocumentChunks.error}
		<div class="alert alert-error mt-6">
			<span>Error loading chunks: {getDocumentChunks.error.message}</span>
		</div>
	{:else if getDocumentChunks.data.length === 0}
		<!-- Empty State with PDF Upload -->
		<div class="flex flex-col items-center justify-center py-12 mt-6" in:fade={{ duration: 150 }}>
			<div class="text-center mb-8">
				<div class="w-24 h-24 mx-auto bg-base-200 rounded-full flex items-center justify-center mb-4">
					<FileText class="w-12 h-12 text-base-content/40" />
				</div>
				<h3 class="text-xl font-semibold mb-2">No content chunks yet</h3>
				<p class="text-base-content/70 max-w-md">
					Upload a PDF document to automatically extract and organize content into learning chunks.
				</p>
			</div>

			<!-- PDF Upload Card -->
			<div class="card bg-base-100 border border-base-300 shadow-md w-full max-w-md" in:scale={{ duration: 180, start: 0.96 }}>
				<div class="card-body">
					<h4 class="font-semibold mb-4 text-center">Upload PDF Document</h4>
					
					<div class="form-control">
						<label 
							class="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-primary/30 rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all duration-200"
							for="pdf-upload"
						>
							<div class="flex flex-col items-center justify-center space-y-4">
								<div class="p-4 bg-primary/10 rounded-full">
									<Upload class="w-12 h-12 text-primary" />
								</div>
								{#if selectedFile}
									<div class="text-center">
										<p class="text-lg font-semibold text-success mb-1">{selectedFile.name}</p>
										<p class="text-sm text-base-content/60">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB PDF file</p>
									</div>
								{:else}
									<div class="text-center">
										<p class="text-lg font-semibold mb-2">Drop your PDF here</p>
										<p class="text-base text-base-content/80 mb-1">or click to browse files</p>
										<p class="text-sm text-base-content/60">Maximum file size: 10MB</p>
									</div>
								{/if}
							</div>
						</label>
						<input 
							id="pdf-upload"
							type="file" 
							accept=".pdf,application/pdf"
							class="hidden" 
							bind:this={fileInput}
							onchange={handleFileSelect}
							disabled={isProcessing}
						/>
					</div>
					
					{#if processingError}
						<div class="alert alert-error alert-sm mt-4">
							<span class="text-sm">{processingError}</span>
						</div>
					{/if}
					
					{#if selectedFile}
						<button 
							class="btn btn-primary btn-block mt-4" 
							onclick={processPDF}
							disabled={isProcessing}
						>
							{#if isProcessing}
								<span class="loading loading-spinner loading-sm"></span>
								Processing PDF...
							{:else}
								<FileText class="w-4 h-4" />
								Process Document
							{/if}
						</button>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<!-- Chunks Display -->
		<div class="mt-6" in:fade={{ duration: 160 }}>
			<div class="flex justify-between items-center mb-6">
				<div>
					<h3 class="text-xl font-semibold">Content Chunks</h3>
					<p class="text-sm text-base-content/70">{getDocumentChunks.data.length} chunks extracted</p>
				</div>
				<!-- Upload action removed per request -->
			</div>
			
			<div class="grid gap-4">
				{#each getDocumentChunks.data as chunk (chunk._id)}
					<div class="card bg-base-100 border border-base-300 hover:border-primary/30 hover:shadow-lg transition-all duration-200" in:fly={{ y: 10, duration: 180 }}>
						<div class="card-body p-6">
							<div class="flex justify-between items-start gap-4">
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-2">
										<h4 class="font-semibold text-lg truncate">{chunk.title}</h4>
										<div class="badge badge-soft badge-primary badge-sm capitalize">{chunk.chunk_type}</div>
									</div>
									<p class="text-base-content/80 text-sm mb-3 line-clamp-2">{chunk.summary}</p>
									<div class="flex flex-wrap gap-1">
										{#each chunk.keywords.slice(0, 4) as keyword}
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
											<path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
										</svg>
									</div>
									<ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-44 z-20 border border-base-300">
											<li><button class="text-sm" onclick={() => openEdit(chunk)}>Edit chunk</button></li>
											<li><button class="text-sm text-error" onclick={() => openDelete(chunk)}>Delete chunk</button></li>
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
            <button class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4" onclick={closeEdit} aria-label="Close">
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
                <label class="label m-0 hidden items-center gap-2 p-0 text-base font-medium text-base-content/80 md:flex" for="chunk-title">
                    <FileText size={18} class="text-primary/80" />
                    <span>Title</span>
                </label>
                <div class="md:contents">
                    <label for="chunk-title" class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden">
                        <FileText size={18} class="text-primary/80" />
                        <span>Title</span>
                    </label>
                    <div class="form-control w-full">
                        <input id="chunk-title" type="text" class="input input-bordered w-full" bind:value={editTitle} maxlength="200" />
                    </div>
                </div>

                <label class="label m-0 hidden items-center gap-2 p-0 text-base font-medium text-base-content/80 md:flex" for="chunk-type">
                    <Type size={18} class="text-primary/80" />
                    <span>Chunk Type</span>
                </label>
                <div class="md:contents">
                    <label for="chunk-type" class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden">
                        <Type size={18} class="text-primary/80" />
                        <span>Chunk Type</span>
                    </label>
                    <div class="form-control w-full">
                        <input id="chunk-type" type="text" class="input input-bordered w-full" bind:value={editChunkType} />
                    </div>
                </div>

                <label class="label m-0 hidden items-center gap-2 p-0 text-base font-medium text-base-content/80 md:flex" for="chunk-keywords">
                    <Tags size={18} class="text-primary/80" />
                    <span>Keywords</span>
                </label>
                <div class="md:contents">
                    <label for="chunk-keywords" class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden">
                        <Tags size={18} class="text-primary/80" />
                        <span>Keywords (comma separated)</span>
                    </label>
                    <div class="form-control w-full">
                        <input id="chunk-keywords" type="text" class="input input-bordered w-full" bind:value={editKeywords} />
                        <div class="label">
                            <span class="label-text-alt text-xs text-base-content/60">Comma separated</span>
                        </div>
                    </div>
                </div>

                <label class="label m-0 hidden items-center gap-2 self-start p-0 text-base font-medium text-base-content/80 md:flex" for="chunk-summary">
                    <AlignLeft size={18} class="text-primary/80" />
                    <span>Summary</span>
                </label>
                <div class="form-control md:block">
                    <label for="chunk-summary" class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden">
                        <AlignLeft size={18} class="text-primary/80" />
                        <span>Summary</span>
                    </label>
                    <textarea id="chunk-summary" class="textarea textarea-bordered w-full min-h-40" bind:value={editSummary} maxlength="1000"></textarea>
                </div>

                <label class="label m-0 hidden items-center gap-2 self-start p-0 text-base font-medium text-base-content/80 md:flex" for="chunk-content">
                    <FileText size={18} class="text-primary/80" />
                    <span>Content</span>
                </label>
                <div class="form-control md:block">
                    <label for="chunk-content" class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden">
                        <FileText size={18} class="text-primary/80" />
                        <span>Content</span>
                    </label>
                    <textarea id="chunk-content" class="textarea textarea-bordered w-full min-h-72" bind:value={editContent}></textarea>
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
