<script lang="ts">
	let { isAddModalOpen, closeAddModal, classId } = $props();

	import { X, BookOpenText, AlignLeft, Hash, Laugh } from 'lucide-svelte';
	import { isSingleEmoji, sanitizeEmoji } from '$lib/utils/emoji';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id } from '../../convex/_generated/dataModel';

	const client = useConvexClient();

	let moduleTitle: string = $state('');
	let moduleDescription: string = $state('');
	let moduleEmoji: string = $state('');
	let moduleStatus: string = $state('draft');
	let isSubmitting: boolean = $state(false);
	let validationErrors: Record<string, string> = $state({});
	let submitError: string = $state('');

	// Get current modules to calculate next order number
	const modules = useQuery(api.module.getAdminModule, {
		id: classId as Id<'class'>
	});

	function validateField(field: string, value: string): string {
		const trimmed = value.trim();

		switch (field) {
			case 'moduleTitle':
				if (!trimmed) return 'Module title is required';
				if (trimmed.length < 2) return 'Module title must be at least 2 characters';
				if (trimmed.length > 100) return 'Module title cannot exceed 100 characters';

				// Check for duplicate titles (case-insensitive)
				const existingTitles = modules.data?.map((m) => m.title.toLowerCase()) || [];
				if (existingTitles.includes(trimmed.toLowerCase())) {
					return 'A module with this title already exists';
				}
				break;

			case 'moduleDescription':
				if (!trimmed) return 'Description is required';
				if (trimmed.length < 10) return 'Description must be at least 10 characters';
				if (trimmed.length > 500) return 'Description cannot exceed 500 characters';
				break;

			case 'moduleEmoji':
				if (!trimmed) return '';
				if (!isSingleEmoji(trimmed)) return 'Enter a single valid emoji';
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
		moduleTitle.trim() && moduleDescription.trim() && Object.keys(validationErrors).length === 0
	);

	async function handleSubmit() {
		validateOnInput('moduleTitle', moduleTitle);
		validateOnInput('moduleDescription', moduleDescription);
		validateOnInput('moduleEmoji', moduleEmoji);

		if (!isFormValid) return;

		isSubmitting = true;
		submitError = '';

		try {
			// Calculate next order number
			const nextOrder = modules.data?.length
				? Math.max(...modules.data.map((m) => m.order)) + 1
				: 0;

			await client.mutation(api.module.insertModule, {
				title: moduleTitle.trim(),
				emoji: sanitizeEmoji(moduleEmoji) || undefined,
				description: moduleDescription.trim(),
				status: moduleStatus.toLowerCase(),
				classId: classId as Id<'class'>,
				order: nextOrder,
				metadata: {},
				updatedAt: Date.now()
			});

			// Reset form
			moduleTitle = '';
			moduleDescription = '';
			moduleStatus = 'draft';
			moduleEmoji = '';
			validationErrors = {};
			submitError = '';
			closeAddModal();
		} catch (error) {
			submitError = error instanceof Error ? error.message : 'Failed to create module';
			console.error('Failed to create module:', submitError);
		} finally {
			isSubmitting = false;
		}
	}
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
			<h3 class="text-2xl font-extrabold tracking-tight">Add New Module</h3>
		</div>

		{#if submitError}
			<div class="alert alert-error mb-6">
				<span>❌ {submitError}</span>
			</div>
		{/if}

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
				<div class="form-control w-full">
					<textarea
						id="module-description"
						class="textarea textarea-bordered w-full min-h-48"
						class:textarea-error={validationErrors.moduleDescription}
						bind:value={moduleDescription}
						placeholder="Describe what this module covers..."
						oninput={() => validateOnInput('moduleDescription', moduleDescription)}
						maxlength="500"
					></textarea>
					<div class="label">
						<span class="label-text-alt text-xs text-base-content/60"> 10-500 characters </span>
						<span class="label-text-alt text-xs text-base-content/40">
							{moduleDescription.length}/500
						</span>
					</div>
					{#if validationErrors.moduleDescription}
						<div class="label">
							<span class="label-text-alt text-error text-xs">
								{validationErrors.moduleDescription}
							</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Two-column grid; include Emoji row first so columns align across rows -->
			<div class="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-[auto_1fr] items-center">
				<label
					class="label m-0 hidden items-center gap-2 p-0 text-base font-medium text-base-content/80 md:flex"
					for="module-emoji"
				>
					<Laugh size={18} class="text-primary/80" />
					<span>Emoji</span>
				</label>
				<div class="md:contents">
					<label
						for="module-emoji"
						class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden"
					>
						<Laugh size={18} class="text-primary/80" />
						<span>Emoji</span>
					</label>
					<div class="form-control w-full">
						<input
							id="module-emoji"
							type="text"
							placeholder="e.g., 📘"
							class="input input-bordered w-full max-w-28"
							bind:value={moduleEmoji}
							oninput={() => validateOnInput('moduleEmoji', moduleEmoji)}
							maxlength="8"
						/>
						{#if validationErrors.moduleEmoji}
							<div class="label">
								<span class="label-text-alt text-error text-xs">{validationErrors.moduleEmoji}</span
								>
							</div>
						{/if}
					</div>
				</div>

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
				<div class="form-control hidden w-full md:block">
					<textarea
						id="module-description"
						class="textarea textarea-bordered w-full min-h-48"
						class:textarea-error={validationErrors.moduleDescription}
						bind:value={moduleDescription}
						placeholder="Describe what this module covers..."
						oninput={() => validateOnInput('moduleDescription', moduleDescription)}
						maxlength="500"
					></textarea>
					<div class="label">
						<span class="label-text-alt text-xs text-base-content/60"> 10-500 characters </span>
						<span class="label-text-alt text-xs text-base-content/40">
							{moduleDescription.length}/500
						</span>
					</div>
					{#if validationErrors.moduleDescription}
						<div class="label">
							<span class="label-text-alt text-error text-xs">
								{validationErrors.moduleDescription}
							</span>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="modal-action mt-8">
			<form method="dialog" class="flex gap-3">
				<button class="btn btn-ghost" onclick={closeAddModal} disabled={isSubmitting}>Cancel</button
				>
				<button
					class="btn btn-primary gap-2"
					onclick={handleSubmit}
					disabled={isSubmitting || !isFormValid}
					title={!isFormValid ? 'Please fill all fields correctly before creating the module' : ''}
				>
					{#if isSubmitting}
						<span class="loading loading-spinner loading-sm"></span>
						<span>Creating...</span>
					{:else}
						<span>Create Module</span>
					{/if}
				</button>
			</form>
		</div>
	</div>
</dialog>
