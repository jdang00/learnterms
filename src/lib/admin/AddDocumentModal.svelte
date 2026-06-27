<script lang="ts">
	import { CheckCircle2, FileUp, X } from 'lucide-svelte';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id } from '../../convex/_generated/dataModel';

	let { isAddModalOpen, closeAddModal, userData, onUploaded = () => {} } = $props();

	const client = useConvexClient();

	let isSubmitting = $state(false);
	let submitError = $state('');
	let selectedFile: File | null = $state(null);
	let uploadProgress = $state(0);
	let isDragging = $state(false);
	let dragDepth = 0;

	const maxBytes = 50 * 1024 * 1024;
	const allowedTypes = ['application/pdf'];

	function toBaseTitle(name: string): string {
		const withoutExt = name.replace(/\.[^/.]+$/, '');
		const trimmed = withoutExt.trim();
		return trimmed.length === 0 ? 'Untitled Document' : trimmed.slice(0, 100);
	}

	function formatSize(bytes: number) {
		if (!bytes) return 'Unknown size';
		return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
	}

	function setSelectedFile(file: File | null) {
		submitError = '';

		if (!file) {
			selectedFile = null;
			return;
		}
		if (!allowedTypes.includes(file.type)) {
			selectedFile = null;
			submitError = 'Upload a PDF file.';
			return;
		}
		if (file.size > maxBytes) {
			selectedFile = null;
			submitError = 'File must be 50MB or smaller.';
			return;
		}

		selectedFile = file;
	}

	function handleFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		setSelectedFile(input.files?.[0] ?? null);
	}

	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		if (isSubmitting) return;
		dragDepth += 1;
		isDragging = true;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = isSubmitting ? 'none' : 'copy';
		}
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragDepth = Math.max(0, dragDepth - 1);
		if (dragDepth === 0) {
			isDragging = false;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragDepth = 0;
		isDragging = false;
		if (isSubmitting) return;

		const files = event.dataTransfer?.files;
		setSelectedFile(files?.[0] ?? null);
	}

	function uploadToSignedUrl(
		url: string,
		file: File,
		onProgress: (progress: { loaded: number; total: number }) => void
	) {
		return new Promise<void>((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open('PUT', url);
			xhr.setRequestHeader('Content-Type', file.type);
			xhr.upload.onprogress = (event) => {
				onProgress({ loaded: event.loaded, total: event.total });
			};
			xhr.onload = () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					resolve();
				} else {
					reject(new Error(`R2 upload failed with ${xhr.status}`));
				}
			};
			xhr.onerror = () => reject(new Error('R2 upload failed'));
			xhr.send(file);
		});
	}

	async function uploadDocument() {
		if (!selectedFile || !userData?.cohortId) return;

		isSubmitting = true;
		submitError = '';
		uploadProgress = 0;

		try {
			const cohortId = userData.cohortId as Id<'cohort'>;
			const { key, url } = await client.mutation(api.r2Documents.generateUploadUrl, {
				cohortId,
				fileName: selectedFile.name
			});

			await uploadToSignedUrl(url, selectedFile, ({ loaded, total }) => {
				uploadProgress = total > 0 ? Math.round((loaded / total) * 100) : 0;
			});

			await client.mutation(api.r2Documents.syncMetadata, {
				key
			});

			const documentId = await client.mutation(api.contentLib.insertR2Document, {
				title: toBaseTitle(selectedFile.name),
				description: `${selectedFile.name} - ${formatSize(selectedFile.size)}`,
				cohortId,
				metadata: {
					originalFileName: selectedFile.name,
					sizeBytes: selectedFile.size,
					storageProvider: 'r2',
					r2Key: key,
					mimeType: selectedFile.type
				}
			});

			void client.action(api.ragKnowledge.indexR2Document, {
				documentId
			});

			selectedFile = null;
			isDragging = false;
			dragDepth = 0;
			onUploaded();
			closeAddModal();
		} catch (e) {
			submitError = e instanceof Error ? e.message : 'Failed to upload document';
		} finally {
			isSubmitting = false;
			uploadProgress = 0;
		}
	}
</script>

<dialog class="modal p-6" class:modal-open={isAddModalOpen}>
	<div class="modal-box w-full max-w-xl rounded-lg border border-base-300 shadow-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
				onclick={closeAddModal}
				aria-label="Close"
			>
				<X size={18} />
			</button>
		</form>

		<div class="mb-6">
			<h3 class="text-xl font-bold tracking-tight">Upload Document</h3>
			<p class="mt-1 text-sm text-base-content/60">
				Upload a PDF to make it available for AI indexing.
			</p>
		</div>

		{#if submitError}
			<div class="alert alert-error mb-5 text-sm">
				<span>{submitError}</span>
			</div>
		{/if}

		{#if !userData?.cohortId}
			<div class="alert alert-warning mb-5 text-sm">
				<span>You need to be assigned to a cohort before creating documents.</span>
			</div>
		{/if}

		<label
			class="group relative flex min-h-52 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed p-6 text-center transition
				{isDragging
				? 'border-primary bg-primary/10 shadow-inner'
				: selectedFile
					? 'border-success/60 bg-success/10'
					: 'border-base-300 bg-base-200/40 hover:border-primary/60 hover:bg-base-200'}
				{isSubmitting ? 'pointer-events-none opacity-70' : ''}"
			ondragenter={handleDragEnter}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			<div
				class="mb-3 rounded-full p-3 transition {isDragging
					? 'scale-110 bg-primary text-primary-content'
					: selectedFile
						? 'bg-success/15 text-success'
						: 'bg-primary/10 text-primary group-hover:bg-primary/15'}"
			>
				{#if selectedFile && !isDragging}
					<CheckCircle2 size={32} />
				{:else}
					<FileUp size={32} />
				{/if}
			</div>
			<span class="text-sm font-semibold">
				{#if isDragging}
					Drop to attach this file
				{:else if selectedFile}
					{selectedFile.name}
				{:else}
					Drag a file here or click to browse
				{/if}
			</span>
			<span class="mt-1 text-xs text-base-content/60">
				{selectedFile ? formatSize(selectedFile.size) : 'Maximum file size: 50MB'}
			</span>
			<span class="mt-3 badge badge-ghost badge-sm">PDF only</span>
			<input class="hidden" type="file" accept=".pdf,application/pdf" onchange={handleFileChange} />
		</label>

		{#if isSubmitting && uploadProgress > 0}
			<div class="mt-4">
				<progress class="progress progress-primary w-full" value={uploadProgress} max="100"
				></progress>
				<p class="mt-1 text-xs text-base-content/60">{uploadProgress}% uploaded</p>
			</div>
		{/if}

		<div class="modal-action mt-6">
			<button class="btn btn-ghost" onclick={closeAddModal} disabled={isSubmitting}>Cancel</button>
			<button
				class="btn btn-primary"
				onclick={uploadDocument}
				disabled={!selectedFile || !userData?.cohortId || isSubmitting}
			>
				{#if isSubmitting}
					<span class="loading loading-spinner loading-sm"></span>
				{/if}
				Upload
			</button>
		</div>
	</div>
</dialog>
