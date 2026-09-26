<script lang="ts">
	import { formatBytes } from '$lib/utils/format';
	import { CheckCircle2, FileUp, X } from 'lucide-svelte';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api.js';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { addDocumentUploads, uploadDocumentBatch, type DocumentUpload } from './documentUploads';

	let { isAddModalOpen, closeAddModal, userData, onUploaded = () => {} } = $props();

	const client = useConvexClient();

	let isSubmitting = $state(false);
	let uploads = $state<DocumentUpload[]>([]);
	const remaining = $derived(
		uploads.filter((item) => item.status === 'pending' || item.status === 'error').length
	);
	const queued = $derived(uploads.filter((item) => item.status === 'queued').length);
	let isDragging = $state(false);
	let dragDepth = 0;

	function toBaseTitle(name: string): string {
		const withoutExt = name.replace(/\.[^/.]+$/, '');
		const trimmed = withoutExt.trim();
		return trimmed.length === 0 ? 'Untitled Document' : trimmed.slice(0, 100);
	}

	function addFiles(files: File[]) {
		if (isSubmitting) return;
		uploads = addDocumentUploads(uploads, files);
	}

	function handleFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		addFiles(Array.from(input.files ?? []));
		input.value = '';
	}

	function close() {
		if (isSubmitting) return;
		uploads = [];
		isDragging = false;
		dragDepth = 0;
		closeAddModal();
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

		addFiles(Array.from(event.dataTransfer?.files ?? []));
	}

	function uploadToSignedUrl(
		url: string,
		file: File,
		onProgress: (progress: { loaded: number; total: number }) => void
	) {
		return new Promise<void>((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open('PUT', url);
			xhr.setRequestHeader('Content-Type', 'application/pdf');
			xhr.timeout = 120000;
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
			xhr.ontimeout = () => reject(new Error('Upload timed out. Try again.'));
			xhr.send(file);
		});
	}

	async function uploadDocuments() {
		if (isSubmitting || !remaining || !userData?.cohortId) return;
		isSubmitting = true;
		const cohortId = userData.cohortId as Id<'cohort'>;
		const previousQueued = queued;
		try {
			await uploadDocumentBatch(uploads, {
				upload: async (file, onProgress) => {
					const { key, url } = await client.mutation(api.r2Documents.generateUploadUrl, {
						cohortId,
						fileName: file.name
					});
					await uploadToSignedUrl(url, file, ({ loaded, total }) => {
						onProgress(total > 0 ? Math.round((loaded / total) * 100) : 0);
					});
					return key;
				},
				save: async (file, key) => {
					await client.mutation(api.r2Documents.syncMetadata, { key });
					return await client.mutation(api.contentLib.insertR2Document, {
						title: toBaseTitle(file.name),
						description: `${file.name} - ${formatBytes(file.size, 'Unknown size')}`,
						cohortId,
						metadata: {
							originalFileName: file.name,
							sizeBytes: file.size,
							storageProvider: 'r2',
							r2Key: key,
							mimeType: 'application/pdf'
						}
					});
				},
				queue: (documentId) =>
					client.action(api.ragKnowledge.indexing.indexR2Document, { documentId })
			});
			if (queued > previousQueued) onUploaded();
		} finally {
			isSubmitting = false;
		}
	}
</script>

<dialog class="modal p-6" class:modal-open={isAddModalOpen}>
	<div class="modal-box w-full max-w-xl rounded-lg border border-base-300 shadow-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
				onclick={close}
				aria-label="Close"
				disabled={isSubmitting}
			>
				<X size={18} />
			</button>
		</form>

		<div class="mb-6">
			<h3 class="text-xl font-bold tracking-tight">Upload PDFs</h3>
			<p class="mt-1 text-sm text-base-content/60">
				Select or drop multiple PDFs at once. Each PDF can be up to 150 pages and 30 MB. Keep this
				page open until all uploads finish. Processing continues in the background once queued.
			</p>
		</div>

		{#if !userData?.cohortId}
			<div class="alert alert-warning mb-5 text-sm">
				<span>You need to be assigned to a cohort before creating documents.</span>
			</div>
		{/if}

		<label
			class="group relative flex min-h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed p-6 text-center transition
				{isDragging
				? 'border-primary bg-primary/10 shadow-inner'
				: uploads.length > 0
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
					: uploads.length > 0
						? 'bg-success/15 text-success'
						: 'bg-primary/10 text-primary group-hover:bg-primary/15'}"
			>
				{#if uploads.length > 0 && !isDragging}
					<CheckCircle2 size={32} />
				{:else}
					<FileUp size={32} />
				{/if}
			</div>
			<span class="text-sm font-semibold">
				{#if isDragging}
					Drop to add these PDFs
				{:else if uploads.length > 0}
					Add more PDFs
				{:else}
					Drag PDFs here or click to browse
				{/if}
			</span>
			<span class="mt-1 text-xs text-base-content/60"> Up to 150 pages and 30 MB per PDF </span>
			<span class="mt-3 badge badge-ghost badge-sm">PDF only</span>
			<input
				class="hidden"
				type="file"
				multiple
				accept=".pdf,application/pdf"
				onchange={handleFileChange}
				disabled={isSubmitting}
				aria-label="Select PDFs"
			/>
		</label>

		{#if uploads.length > 0}
			<ul class="mt-4 max-h-60 divide-y divide-base-300 overflow-y-auto" aria-label="Selected PDFs">
				{#each uploads as item (item.id)}
					<li class="flex items-start gap-3 py-3">
						<div class="min-w-0 flex-1">
							<p class="break-words text-sm font-medium">{item.file.name}</p>
							<p class="text-xs text-base-content/60">
								{formatBytes(item.file.size, 'Unknown size')}
							</p>
							<p
								class="mt-1 text-xs"
								class:text-error={item.status === 'error' || item.status === 'invalid'}
								class:text-success={item.status === 'queued'}
							>
								{#if item.error}
									{item.error}
								{:else if item.status === 'checking'}
									Checking page count…
								{:else if item.status === 'uploading'}
									Uploading · {item.progress}%
								{:else if item.status === 'saving'}
									Queuing for processing…
								{:else if item.status === 'queued'}
									Uploaded · processing queued
								{:else}
									Ready to upload
								{/if}
							</p>
							{#if item.status === 'uploading'}
								<progress
									class="progress progress-primary mt-1 w-full"
									value={item.progress}
									max="100"
									aria-label={`Uploading ${item.file.name}`}
								></progress>
							{/if}
						</div>
						{#if item.status === 'queued'}
							<CheckCircle2 size={18} class="mt-1 shrink-0 text-success" />
						{:else}
							<button
								class="btn btn-ghost btn-xs btn-circle"
								disabled={isSubmitting}
								aria-label={`Remove ${item.file.name}`}
								onclick={() => (uploads = uploads.filter((upload) => upload.id !== item.id))}
							>
								<X size={14} />
							</button>
						{/if}
					</li>
				{/each}
			</ul>
			<p class="mt-3 text-sm text-base-content/60" role="status">
				{queued} of {uploads.length} PDFs uploaded and queued for processing.
				{#if uploads.some((item) => item.status === 'error')}
					Retry failed uploads below; completed uploads will be kept.
				{/if}
			</p>
		{/if}

		<div class="modal-action mt-6">
			<button class="btn btn-ghost" onclick={close} disabled={isSubmitting}
				>{queued > 0 ? 'Done' : 'Cancel'}</button
			>
			<button
				class="btn btn-primary"
				onclick={uploadDocuments}
				disabled={!remaining || !userData?.cohortId || isSubmitting}
			>
				{#if isSubmitting}
					<span class="loading loading-spinner loading-sm"></span>
					Uploading…
				{:else if uploads.some((item) => item.status === 'error')}
					Retry {remaining} {remaining === 1 ? 'PDF' : 'PDFs'}
				{:else}
					Upload{remaining > 0 ? ` ${remaining}` : ''} {remaining === 1 ? 'PDF' : 'PDFs'}
				{/if}
			</button>
		</div>
	</div>
</dialog>
