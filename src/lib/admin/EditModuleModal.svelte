<script lang="ts">
	let { isEditModalOpen, closeEditModal, editingModule, classId } = $props();

	import { X, BookOpenText, AlignLeft, Hash } from 'lucide-svelte';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id } from '../../convex/_generated/dataModel';

	const client = useConvexClient();

	let moduleTitle: string = $state('');
	let moduleDescription: string = $state('');
	let moduleStatus: string = $state('draft');
	let isSubmitting: boolean = $state(false);
	let validationErrors: Record<string, string> = $state({});
	let submitError: string = $state('');

	$effect(() => {
		if (editingModule) {
			moduleTitle = editingModule.title;
			moduleDescription = editingModule.description || '';
			moduleStatus = editingModule.status;
		}
	});

	function validateField(field: string, value: string): string {
		const trimmed = value.trim();
		
		switch (field) {
			case 'moduleTitle':
				if (!trimmed) return 'Module title is required';
				if (trimmed.length < 2) return 'Module title must be at least 2 characters';
				if (trimmed.length > 100) return 'Module title cannot exceed 100 characters';
				break;

			case 'moduleDescription':
				if (!trimmed) return 'Description is required';
				if (trimmed.length < 10) return 'Description must be at least 10 characters';
				if (trimmed.length > 500) return 'Description cannot exceed 500 characters';
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
		moduleTitle.trim() && 
		moduleDescription.trim() && 
		Object.keys(validationErrors).length === 0
	);

	async function handleSubmit() {
		if (!editingModule) return;

		// Validate all fields first
		validateOnInput('moduleTitle', moduleTitle);
		validateOnInput('moduleDescription', moduleDescription);

		if (!isFormValid) return;

		isSubmitting = true;
		submitError = '';

		try {
			await client.mutation(api.module.updateModule, {
				moduleId: editingModule._id,
				classId: classId as Id<'class'>,
				title: moduleTitle.trim(),
				description: moduleDescription.trim(),
				status: moduleStatus
			});

			validationErrors = {};
			submitError = '';
			closeEditModal();
		} catch (error) {
			submitError = error instanceof Error ? error.message : 'Failed to update module';
			console.error("Failed to update module:", submitError);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<dialog class="modal p-6" class:modal-open={isEditModalOpen}>
	<div class="modal-box w-full max-w-2xl rounded-2xl border border-base-300 shadow-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
				onclick={closeEditModal}
				aria-label="Close"
			>
				<X size={18} />
			</button>
		</form>

		<div class="mb-6 flex items-center gap-2">
			<h3 class="text-2xl font-extrabold tracking-tight">Edit Module</h3>
		</div>

		{#if submitError}
			<div class="alert alert-error mb-6">
				<span>❌ {submitError}</span>
			</div>
		{/if}

		{#if !editingModule}
			<div class="alert alert-error mb-6">
				<span>No module selected for editing.</span>
			</div>
		{:else}
			<!-- Responsive form: description snaps to top on mobile -->
			<div class="flex flex-col gap-6">
				<!-- Description block (first on mobile, later in grid on md+) -->
				<div class="md:hidden">
					<label
						class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80"
						for="module-description"
					>
						<AlignLeft size={18} class="text-primary/80" />
						<span>Description</span>
					</label>
					<textarea
						id="module-description"
						class="textarea textarea-bordered w-full min-h-48"
						bind:value={moduleDescription}
						placeholder="Enter module description..."
					></textarea>
				</div>

				<!-- Two-column label/field grid for md+; single column on mobile -->
				<div class="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-[auto_1fr]">
					<label
						class="label m-0 hidden items-center gap-2 p-0 text-base font-medium text-base-content/80 md:flex"
						for="module-title"
					>
						<BookOpenText size={18} class="text-primary/80" />
						<span>Module Title</span>
					</label>
					<div class="md:contents">
						<label
							for="module-title"
							class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden"
						>
							<BookOpenText size={18} class="text-primary/80" />
							<span>Module Title</span>
						</label>
						<div class="form-control w-full">
							<input
								id="module-title"
								type="text"
								placeholder="e.g., Introduction to Optics"
								class="input input-bordered w-full"
								class:input-error={validationErrors.moduleTitle}
								bind:value={moduleTitle}
								oninput={() => validateOnInput('moduleTitle', moduleTitle)}
								maxlength="100"
							/>
							<div class="label">
								<span class="label-text-alt text-xs text-base-content/60">
									2-100 characters • Must be unique
								</span>
								<span class="label-text-alt text-xs text-base-content/40">
									{moduleTitle.length}/100
								</span>
							</div>
							{#if validationErrors.moduleTitle}
								<div class="label">
									<span class="label-text-alt text-error text-xs">
										{validationErrors.moduleTitle}
									</span>
								</div>
							{/if}
						</div>
					</div>

					<label
						class="label m-0 hidden items-center gap-2 p-0 text-base font-medium text-base-content/80 md:flex"
						for="module-status"
					>
						<Hash size={18} class="text-primary/80" />
						<span>Status</span>
					</label>
					<div class="md:contents">
						<label
							for="module-status"
							class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden"
						>
							<Hash size={18} class="text-primary/80" />
							<span>Status</span>
						</label>
						<select
							id="module-status"
							class="select select-bordered w-full"
							bind:value={moduleStatus}
						>
							<option value="draft">Draft</option>
							<option value="published">Published</option>
							<option value="archived">Archived</option>
						</select>
					</div>

					<label
						class="label m-0 hidden items-center gap-2 self-start p-0 text-base font-medium text-base-content/80 md:flex"
						for="module-description"
					>
						<AlignLeft size={18} class="text-primary/80" />
						<span>Description</span>
					</label>
					<textarea
						id="module-description"
						class="textarea textarea-bordered hidden w-full min-h-48 md:block"
						bind:value={moduleDescription}
						placeholder="Enter module description..."
					></textarea>
				</div>
			</div>

			<div class="modal-action mt-8">
				<form method="dialog" class="flex gap-3">
					<button class="btn btn-ghost" onclick={closeEditModal} disabled={isSubmitting}
						>Cancel</button
					>
					<button
						class="btn btn-primary gap-2"
						onclick={handleSubmit}
						disabled={isSubmitting || !isFormValid}
						title={!isFormValid ? 'Please fill all fields correctly before saving changes' : ''}
					>
						{#if isSubmitting}
							<span class="loading loading-spinner loading-sm"></span>
							<span>Updating...</span>
						{:else}
							<span>Update Module</span>
						{/if}
					</button>
				</form>
			</div>
		{/if}
	</div>
</dialog>
