<script lang="ts">
	import { formatBytes } from '$lib/utils/format';
	import { untrack } from 'svelte';
	import { CheckCircle2, FileUp, X } from 'lucide-svelte';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api.js';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { addDocumentUploads, uploadDocumentBatch, type DocumentUpload } from './documentUploads';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge, type BadgeTone } from '$lib/components/ui/badge';
	import * as FileDropZone from '$lib/components/ui/file-drop-zone';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Progress } from '$lib/components/ui/progress';

	let {
		isAddModalOpen,
		closeAddModal,
		userData,
		onUploaded = () => {},
		incomingFiles = []
	}: {
		isAddModalOpen: boolean;
		closeAddModal: () => void;
		userData: { cohortId?: string | null } | null | undefined;
		onUploaded?: () => void;
		/** Files dropped on the page; they join the queue when the panel opens. */
		incomingFiles?: File[];
	} = $props();

	const client = useConvexClient();

	let isSubmitting = $state(false);
	let uploads = $state<DocumentUpload[]>([]);
	const remaining = $derived(
		uploads.filter((item) => item.status === 'pending' || item.status === 'error').length
	);
	const queued = $derived(uploads.filter((item) => item.status === 'queued').length);

	function toBaseTitle(name: string): string {
		const withoutExt = name.replace(/\.[^/.]+$/, '');
		const trimmed = withoutExt.trim();
		return trimmed.length === 0 ? 'Untitled Document' : trimmed.slice(0, 100);
	}

	function addFiles(files: File[]) {
		if (isSubmitting) return;
		uploads = addDocumentUploads(uploads, files);
	}

	$effect(() => {
		if (isAddModalOpen && incomingFiles.length) untrack(() => addFiles(incomingFiles));
	});

	const STATUS: Record<DocumentUpload['status'], { label: string; tone: BadgeTone }> = {
		pending: { label: 'Ready', tone: 'neutral' },
		checking: { label: 'Checking', tone: 'info' },
		uploading: { label: 'Uploading', tone: 'primary' },
		saving: { label: 'Queuing', tone: 'primary' },
		queued: { label: 'Queued', tone: 'success' },
		error: { label: 'Failed', tone: 'error' },
		invalid: { label: 'Can’t upload', tone: 'error' }
	};

	function close() {
		if (isSubmitting) return;
		uploads = [];
		closeAddModal();
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

<Dialog.Root
	open={isAddModalOpen}
	onOpenChange={(open) => {
		if (!open) close();
	}}
>
	<Dialog.Content
		class="max-h-[90dvh] overflow-y-auto sm:max-w-xl"
		showCloseButton={false}
		onEscapeKeydown={(event) => {
			if (isSubmitting) event.preventDefault();
		}}
		onInteractOutside={(event) => event.preventDefault()}
	>
		<Dialog.CornerClose onclick={close} disabled={isSubmitting} label="Close" />

		<div class="space-y-6">
			<div>
				<Dialog.Title class="text-xl font-bold tracking-tight">Upload PDFs</Dialog.Title>
				<Dialog.Description class="mt-1 text-sm text-foreground/60">
					Select or drop multiple PDFs at once. Each PDF can be up to 150 pages and 30 MB. Keep this
					page open until all uploads finish. Processing continues in the background once queued.
				</Dialog.Description>
			</div>

			{#if !userData?.cohortId}
				<Alert.Root tone="warning" class="text-sm">
					<Alert.Description
						>You need to be assigned to a cohort before creating documents.</Alert.Description
					>
				</Alert.Root>
			{/if}

			<FileDropZone.Root
				accept=".pdf,application/pdf"
				disabled={isSubmitting || !userData?.cohortId}
				onUpload={async (files) => addFiles(files)}
				onFileRejected={({ file }) =>
					toastStore.error(`${file.name}: only PDF files are supported.`)}
			>
				<FileDropZone.Trigger>
					<div
						class="graph-stage flex min-h-40 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-6 text-center transition-all duration-200 group-hover/file-drop-zone-trigger:cursor-pointer group-aria-disabled/file-drop-zone-trigger:pointer-events-none group-aria-disabled/file-drop-zone-trigger:opacity-60 group-data-dragging/file-drop-zone-trigger:scale-[1.01] group-data-dragging/file-drop-zone-trigger:border-primary group-data-dragging/file-drop-zone-trigger:bg-primary/8 {uploads.length >
						0
							? 'border-success/50 bg-success/5'
							: 'border-border bg-muted/40 group-hover/file-drop-zone-trigger:border-primary/40'}"
					>
						<div
							class="flex size-14 items-center justify-center rounded-2xl bg-background ring-1 ring-border transition-transform duration-200 group-data-dragging/file-drop-zone-trigger:-translate-y-1 group-data-dragging/file-drop-zone-trigger:bg-primary group-data-dragging/file-drop-zone-trigger:text-primary-foreground {uploads.length >
							0
								? 'text-success-ink'
								: 'text-primary-ink'}"
						>
							{#if uploads.length > 0}<CheckCircle2 size={26} />{:else}<FileUp size={26} />{/if}
						</div>
						<div>
							<p class="font-semibold">
								{uploads.length > 0 ? 'Add more PDFs' : 'Drop PDFs here, or click to browse'}
							</p>
							<p class="mt-0.5 text-sm text-muted-foreground">Up to 150 pages and 30 MB each</p>
						</div>
					</div>
				</FileDropZone.Trigger>
			</FileDropZone.Root>

			{#if uploads.length > 0}
				<ul class="flex max-h-72 flex-col gap-2 overflow-y-auto" aria-label="Selected PDFs">
					{#each uploads as item (item.id)}
						{@const status = STATUS[item.status]}
						<li
							class="flex items-center gap-3 rounded-2xl border bg-background p-3 transition-colors {item.status ===
								'error' || item.status === 'invalid'
								? 'border-error/30 bg-error/5'
								: item.status === 'queued'
									? 'border-success/30'
									: ''}"
						>
							<div
								class="grid size-10 shrink-0 place-items-center rounded-xl font-mono text-[0.625rem] font-bold {item.status ===
								'queued'
									? 'bg-success/15 text-success-ink'
									: item.status === 'error' || item.status === 'invalid'
										? 'bg-error/15 text-error-ink'
										: 'bg-muted-strong text-muted-foreground'}"
								aria-hidden="true"
							>
								{#if item.status === 'queued'}<CheckCircle2 size={18} />{:else}PDF{/if}
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<p class="truncate text-sm font-medium">{item.file.name}</p>
									<Badge size="xs" tone={status.tone} class="shrink-0">{status.label}</Badge>
								</div>
								<p
									class="mt-0.5 truncate text-xs text-muted-foreground"
									class:text-error-ink={item.status === 'error' || item.status === 'invalid'}
								>
									{#if item.error}
										{item.error}
									{:else if item.status === 'checking'}
										Checking page count…
									{:else if item.status === 'uploading'}
										{formatBytes(item.file.size, 'Unknown size')} · {item.progress}%
									{:else if item.status === 'saving'}
										Queuing for processing…
									{:else if item.status === 'queued'}
										Uploaded · processing in the background
									{:else}
										{formatBytes(item.file.size, 'Unknown size')}
									{/if}
								</p>
								{#if item.status === 'uploading'}
									<Progress
										value={item.progress}
										max={100}
										class="mt-2 h-1.5"
										aria-label={`Uploading ${item.file.name}`}
									/>
								{/if}
							</div>
							{#if item.status !== 'queued'}
								<Button
									variant="ghost"
									tone="neutral"
									size="xs"
									shape="circle"
									disabled={isSubmitting}
									aria-label={`Remove ${item.file.name}`}
									onclick={() => (uploads = uploads.filter((upload) => upload.id !== item.id))}
								>
									<X size={14} />
								</Button>
							{/if}
						</li>
					{/each}
				</ul>
				<p class="text-sm text-muted-foreground" role="status">
					{queued} of {uploads.length} PDFs uploaded and queued for processing.
					{#if uploads.some((item) => item.status === 'error')}
						Retry failed uploads below; completed uploads will be kept.
					{/if}
				</p>
			{/if}

			<Dialog.Footer class="mt-6">
				<Button variant="ghost" tone="neutral" onclick={close} disabled={isSubmitting}
					>{queued > 0 ? 'Done' : 'Cancel'}</Button
				>
				<Button
					onclick={uploadDocuments}
					disabled={!remaining || !userData?.cohortId || isSubmitting}
					loading={isSubmitting}
				>
					{#if isSubmitting}
						Uploading…
					{:else if uploads.some((item) => item.status === 'error')}
						Retry {remaining} {remaining === 1 ? 'PDF' : 'PDFs'}
					{:else}
						Upload{remaining > 0 ? ` ${remaining}` : ''} {remaining === 1 ? 'PDF' : 'PDFs'}
					{/if}
				</Button>
			</Dialog.Footer>
		</div>
	</Dialog.Content>
</Dialog.Root>
