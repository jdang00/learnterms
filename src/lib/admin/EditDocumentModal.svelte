<script lang="ts">
	let { isEditModalOpen, closeEditModal, editingDocument, userData } = $props();

	import { X, BookOpenText, AlignLeft } from 'lucide-svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id, Doc } from '../../convex/_generated/dataModel';

	const client = useConvexClient();

	let documentTitle: string = $state('');
	let documentDescription: string = $state('');
	let isSubmitting: boolean = $state(false);
	let validationErrors: Record<string, string> = $state({});
	let submitError: string = $state('');

	// Get current documents to check for duplicates (excluding current document)
	const documents = useQuery(api.contentLib.getContentLibByCohort, {
		cohortId: userData?.cohortId as Id<'cohort'>
	});

	// Reset form when editingDocument changes
	$effect(() => {
		if (isEditModalOpen && editingDocument) {
			documentTitle = editingDocument.title || '';
			documentDescription = editingDocument.description || '';
		}
	});

	function validateField(field: string, value: string): string {
		const trimmed = value.trim();

		switch (field) {
			case 'documentTitle':
				if (!trimmed) return 'Document title is required';
				if (trimmed.length < 2) return 'Document title must be at least 2 characters';
				if (trimmed.length > 100) return 'Document title cannot exceed 100 characters';

				// Check for duplicate titles (case-insensitive, excluding current document)
				const existingTitles = documents.data
					?.filter((d) => d._id !== editingDocument?._id)
					.map((d) => d.title.toLowerCase()) || [];
				if (existingTitles.includes(trimmed.toLowerCase())) {
					return 'A document with this title already exists';
				}
				break;

			case 'documentDescription':
				if (trimmed && trimmed.length < 10) return 'Description must be at least 10 characters';
				if (trimmed && trimmed.length > 500) return 'Description cannot exceed 500 characters';
				break;
		}

		return '';
	}

	function validateOnInput(field: string, value: string) {
		const error = validateField(field, value);
		if (error) {
			validationErrors[field] = error;
		} else {
			delete validationErrors[field];
		}
		validationErrors = { ...validationErrors };
	}

	const isFormValid = $derived(
		documentTitle.trim() &&
			userData?.cohortId &&
			Object.keys(validationErrors).length === 0
	);

	async function handleSubmit() {
		if (!editingDocument) return;

		// Validate all fields first
		validateOnInput('documentTitle', documentTitle);
		validateOnInput('documentDescription', documentDescription);

		if (!isFormValid) return;

		isSubmitting = true;
		submitError = '';

		try {
			await client.mutation(api.contentLib.updateDocument, {
				documentId: editingDocument._id,
				title: documentTitle.trim(),
				description: documentDescription.trim() || undefined,
				cohortId: userData?.cohortId as Id<'cohort'>
			});

			validationErrors = {};
			submitError = '';
			closeEditModal();
		} catch (error) {
			submitError = error instanceof Error ? error.message : 'Failed to update document';
			console.error('Failed to update document:', submitError);
		} finally {
			isSubmitting = false;
		}
	}

	function resetForm() {
		documentTitle = '';
		documentDescription = '';
		validationErrors = {};
		submitError = '';
	}
</script>

<dialog class="modal p-6" class:modal-open={isEditModalOpen}>
	<div class="modal-box w-full max-w-2xl rounded-2xl border border-base-300 shadow-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
				onclick={() => {
					resetForm();
					closeEditModal();
				}}
				aria-label="Close"
			>
				<X size={18} />
			</button>
		</form>

		<div class="mb-6 flex items-center gap-2">
			<h3 class="text-2xl font-extrabold tracking-tight">Edit Document</h3>
		</div>

		{#if submitError}
			<div class="alert alert-error mb-6">
				<span>❌ {submitError}</span>
			</div>
		{/if}

		{#if editingDocument}
			<!-- Responsive form: description snaps to top on mobile -->
			<div class="flex flex-col gap-6">
				<!-- Description block (first on mobile, later in grid on md+) -->
				<div class="md:hidden">
					<label
						class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80"
						for="document-description"
					>
						<AlignLeft size={18} class="text-primary/80" />
						<span>Description</span>
					</label>
					<div class="form-control w-full">
						<textarea
							id="document-description"
							class="textarea textarea-bordered w-full min-h-48"
							class:textarea-error={validationErrors.documentDescription}
							bind:value={documentDescription}
							placeholder="Describe what this document contains..."
							oninput={() => validateOnInput('documentDescription', documentDescription)}
							maxlength="500"
						></textarea>
						<div class="label">
							<span class="label-text-alt text-xs text-base-content/60">Optional • 10-500 characters</span>
							<span class="label-text-alt text-xs text-base-content/40">
								{documentDescription.length}/500
							</span>
						</div>
						{#if validationErrors.documentDescription}
							<div class="label">
								<span class="label-text-alt text-error text-xs">
									{validationErrors.documentDescription}
								</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Two-column label/field grid for md+; single column on mobile -->
				<div class="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-[auto_1fr]">
					<label
						class="label m-0 hidden items-center gap-2 p-0 text-base font-medium text-base-content/80 md:flex"
						for="document-title"
					>
						<BookOpenText size={18} class="text-primary/80" />
						<span>Document Title</span>
					</label>
					<div class="md:contents">
						<label
							for="document-title"
							class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden"
						>
							<BookOpenText size={18} class="text-primary/80" />
							<span>Document Title</span>
						</label>
						<div class="form-control w-full">
							<input
								id="document-title"
								type="text"
								placeholder="e.g., Pharmacology Study Guide"
								class="input input-bordered w-full"
								class:input-error={validationErrors.documentTitle}
								bind:value={documentTitle}
								oninput={() => validateOnInput('documentTitle', documentTitle)}
								maxlength="100"
							/>
							<div class="label">
								<span class="label-text-alt text-xs text-base-content/60">
									2-100 characters • Must be unique in your cohort
								</span>
								<span class="label-text-alt text-xs text-base-content/40">
									{documentTitle.length}/100
								</span>
							</div>
							{#if validationErrors.documentTitle}
								<div class="label">
									<span class="label-text-alt text-error text-xs">
										{validationErrors.documentTitle}
									</span>
								</div>
							{/if}
						</div>
					</div>

					<label
						class="label m-0 hidden items-center gap-2 self-start p-0 text-base font-medium text-base-content/80 md:flex"
						for="document-description"
					>
						<AlignLeft size={18} class="text-primary/80" />
						<span>Description</span>
					</label>
					<div class="form-control hidden w-full md:block">
						<textarea
							id="document-description"
							class="textarea textarea-bordered w-full min-h-48"
							class:textarea-error={validationErrors.documentDescription}
							bind:value={documentDescription}
							placeholder="Describe what this document contains..."
							oninput={() => validateOnInput('documentDescription', documentDescription)}
							maxlength="500"
						></textarea>
						<div class="label">
							<span class="label-text-alt text-xs text-base-content/60">Optional • 10-500 characters</span>
							<span class="label-text-alt text-xs text-base-content/40">
								{documentDescription.length}/500
							</span>
						</div>
						{#if validationErrors.documentDescription}
							<div class="label">
								<span class="label-text-alt text-error text-xs">
									{validationErrors.documentDescription}
								</span>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<div class="modal-action mt-8">
			<form method="dialog" class="flex gap-3">
				<button
					class="btn btn-ghost"
					onclick={() => {
						resetForm();
						closeEditModal();
					}}
					disabled={isSubmitting}>Cancel</button
				>
				<button
					class="btn btn-primary gap-2"
					onclick={handleSubmit}
					disabled={isSubmitting || !isFormValid}
					title={!isFormValid ? 'Please fill all fields correctly before saving changes' : ''}
				>
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
