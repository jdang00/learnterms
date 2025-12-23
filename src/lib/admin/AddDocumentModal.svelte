<script lang="ts">
	let { isAddModalOpen, closeAddModal, userData } = $props();

	import { X } from 'lucide-svelte';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id, Doc } from '../../convex/_generated/dataModel';
	import { createUploader } from '$lib/utils/uploadthing';
	import { UploadDropzone } from '@uploadthing/svelte';

	const client = useConvexClient();

	let isSubmitting: boolean = $state(false);
	let submitError: string = $state('');

	function toBaseTitle(name: string): string {
		const withoutExt = name.replace(/\.[^/.]+$/, '');
		const trimmed = withoutExt.trim();
		return trimmed.length === 0 ? 'Untitled Document' : trimmed.slice(0, 100);
	}

	function generateUniqueTitleFromExisting(base: string, existingTitlesLower: string[]): string {
		const existing = new Set(existingTitlesLower);
		if (!existing.has(base.toLowerCase())) return base;
		for (let i = 2; i < 1000; i++) {
			const candidate = `${base} (${i})`;
			if (!existing.has(candidate.toLowerCase())) return candidate;
		}
		return `${base} (${Date.now().toString()})`;
	}

	const uploader = createUploader('pdfUploader', {
		onClientUploadComplete: async (res) => {
			try {
				isSubmitting = true;
				submitError = '';
				const file = Array.isArray(res) ? res[0] : null;
				if (!file) throw new Error('Upload failed');
				const fileName = (file as any)?.name ?? 'Document.pdf';
				const sizeBytes = Number((file as any)?.size ?? 0);
				const sizeMB = sizeBytes > 0 ? (sizeBytes / 1024 / 1024).toFixed(2) : undefined;
				const base = toBaseTitle(fileName);
				let existingTitlesLower: string[] = [];
				try {
					const cohortId = userData?.cohortId as Id<'cohort'> | undefined;
					if (cohortId) {
						const existingDocs = (await client.query(api.contentLib.getContentLibByCohort, {
							cohortId
						})) as Doc<'contentLib'>[];
						existingTitlesLower = existingDocs.map((d) => d.title.toLowerCase());
					}
				} catch {}
				const title = generateUniqueTitleFromExisting(base, existingTitlesLower);
				const description = sizeMB
					? `${fileName} • ${sizeMB} MB • uploaded via UploadThing`
					: `${fileName} • uploaded via UploadThing`;
				const documentId = await client.mutation(api.contentLib.insertDocument, {
					title,
					description,
					cohortId: userData?.cohortId as Id<'cohort'>,
					metadata: {
						uploadthingKey: (file as any)?.key ?? null,
						uploadthingUrl: (file as any)?.ufsUrl ?? (file as any)?.url ?? null,
						originalFileName: fileName,
						sizeBytes: sizeBytes || undefined
					}
				});

				const pdfUrl = (file as any)?.ufsUrl ?? (file as any)?.url;
				const fileKey = (file as any)?.key ?? (file as any)?.fileKey;
				// Defer processing to the document page via query params

				// Navigate to the new document's chunk page immediately so the user sees the chunks view
				try {
					const url = new URL(window.location.href);
					url.searchParams.set('open', (documentId as string) ?? '');
					url.searchParams.set('processing', '1');
					if (pdfUrl) url.searchParams.set('pdfUrl', pdfUrl);
					if (fileKey) url.searchParams.set('fileKey', fileKey as string);
					window.location.assign(url.toString());
				} catch {}
				closeAddModal();
			} catch (e) {
				submitError = e instanceof Error ? e.message : 'Failed to create document';
			} finally {
				isSubmitting = false;
			}
		},
		onUploadError: (error: Error) => {
			submitError = error.message;
		}
	});
</script>

<dialog class="modal p-6" class:modal-open={isAddModalOpen}>
	<div class="modal-box w-full max-w-2xl rounded-2xl border border-base-300 shadow-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
				onclick={closeAddModal}
				aria-label="Close"
			>
				<X size={18} />
			</button>
		</form>

		<div class="mb-6 flex items-center gap-2">
			<h3 class="text-2xl font-extrabold tracking-tight">Add New Document</h3>
		</div>

		{#if submitError}
			<div class="alert alert-error mb-6">
				<span>❌ {submitError}</span>
			</div>
		{/if}

		{#if !userData?.cohortId}
			<div class="alert alert-warning mb-6">
				<span>⚠️ You need to be assigned to a cohort before creating documents.</span>
			</div>
		{/if}

		<div class="card bg-base-100 border border-base-300 shadow-md">
			<div class="card-body">
				<h4 class="font-semibold mb-4 text-center">Upload Document</h4>
				<div class="ut-flex ut-flex-col ut-items-center ut-justify-center ut-gap-4">
					<UploadDropzone {uploader} />
					<p class="text-sm text-base-content/70 mt-2 text-center">
						Max file size: 16MB. PDFs only.<br />Optimized for up to 100 pages/slides.
					</p>
				</div>
				{#if submitError}
					<div class="alert alert-error alert-sm mt-4">
						<span class="text-sm">{submitError}</span>
					</div>
				{/if}
			</div>
		</div>

		<div class="modal-action mt-8">
			<form method="dialog" class="flex gap-3">
				<button class="btn btn-ghost" onclick={closeAddModal} disabled={isSubmitting}>Cancel</button
				>
			</form>
		</div>
	</div>
</dialog>
