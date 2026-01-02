<script lang="ts">
	let { isEditModalOpen, closeEditModal, editingModule, classId } = $props();

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
	let selectedTagIds: string[] = $state([]);

	const tags = useQuery(api.tags.getTagsForClass, {
		classId: classId as Id<'class'>
	});
	let moduleTagsQuery = $state<{
		isLoading: boolean;
		error: any;
		data?: { _id: string }[];
	}>({ isLoading: false, error: null, data: [] });
	let lastModuleId = $state<string | null>(null);

	$effect(() => {
		if (editingModule) {
			moduleTitle = editingModule.title;
			moduleDescription = editingModule.description || '';
			moduleStatus = editingModule.status;
			moduleEmoji = (editingModule as any).emoji || '';
		}
	});
	$effect(() => {
		if (editingModule) {
			moduleTagsQuery = useQuery(api.tags.getTagsForModule, {
				moduleId: editingModule._id as Id<'module'>
			}) as typeof moduleTagsQuery;
		} else {
			moduleTagsQuery = { isLoading: false, error: null, data: [] };
		}
	});
	$effect(() => {
		if (!editingModule) {
			selectedTagIds = [];
			lastModuleId = null;
			return;
		}
		if (moduleTagsQuery.data && lastModuleId !== editingModule._id) {
			selectedTagIds = moduleTagsQuery.data.map((tag) => tag._id);
			lastModuleId = editingModule._id;
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
		if (!editingModule) return;

		validateOnInput('moduleTitle', moduleTitle);
		validateOnInput('moduleDescription', moduleDescription);
		validateOnInput('moduleEmoji', moduleEmoji);

		if (!isFormValid) return;

		isSubmitting = true;
		submitError = '';

		try {
			await client.mutation(api.module.updateModule, {
				moduleId: editingModule._id,
				classId: classId as Id<'class'>,
				title: moduleTitle.trim(),
				emoji: sanitizeEmoji(moduleEmoji) || undefined,
				description: moduleDescription.trim(),
				status: moduleStatus
			});
			await client.mutation(api.tags.setModuleTags, {
				moduleId: editingModule._id as Id<'module'>,
				tagIds: selectedTagIds as Id<'tags'>[]
			});

			validationErrors = {};
			submitError = '';
			closeEditModal();
		} catch (error) {
			submitError = error instanceof Error ? error.message : 'Failed to update module';
			console.error('Failed to update module:', submitError);
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
			<div class="flex flex-col gap-6">
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
						for="module-tags"
					>
						<Hash size={18} class="text-primary/80" />
						<span>Tags</span>
					</label>
					<div class="md:contents">
						<label
							for="module-tags"
							class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden"
						>
							<Hash size={18} class="text-primary/80" />
							<span>Tags</span>
						</label>
						<div class="form-control w-full" id="module-tags">
							{#if tags.isLoading || moduleTagsQuery.isLoading}
								<div class="flex items-center gap-2 text-xs text-base-content/60">
									<span class="loading loading-spinner loading-xs"></span>
									<span>Loading tags...</span>
								</div>
							{:else if tags.error || moduleTagsQuery.error}
								<div class="text-xs text-error">Failed to load tags.</div>
							{:else if !tags.data || tags.data.length === 0}
								<div class="text-xs text-base-content/60">
									No tags yet. Add tags from the class page.
								</div>
							{:else}
								<div class="space-y-2">
									<div class="flex flex-wrap gap-2">
										{#each tags.data as tag (tag._id)}
											<label
												class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm cursor-pointer transition-all hover:border-primary/50 hover:bg-base-200/50 {selectedTagIds.includes(tag._id) ? 'border-primary' : 'border-base-300'}"
											>
												<input
													type="checkbox"
													class="checkbox checkbox-xs checkbox-primary"
													value={tag._id}
													bind:group={selectedTagIds}
													disabled={selectedTagIds.length >= 10 && !selectedTagIds.includes(tag._id)}
												/>
												<span
													class="h-2 w-2 rounded-full"
													style={`background-color: ${tag.color || '#94a3b8'}`}
												></span>
												<span>{tag.name}</span>
											</label>
										{/each}
									</div>
									<div class="text-xs text-base-content/60">
										{selectedTagIds.length} of 10 tags selected
										{#if selectedTagIds.length >= 10}
											<span class="text-warning ml-1">(max reached)</span>
										{/if}
									</div>
								</div>
							{/if}
						</div>
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
								class="input input-bordered w-28"
								bind:value={moduleEmoji}
								oninput={() => validateOnInput('moduleEmoji', moduleEmoji)}
								maxlength="8"
							/>
							{#if validationErrors.moduleEmoji}
								<div class="label">
									<span class="label-text-alt text-error text-xs"
										>{validationErrors.moduleEmoji}</span
									>
								</div>
							{/if}
						</div>
					</div>
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
