<script lang="ts">
	let { isEditModalOpen, closeEditModal, editingClass, semesters, userData } = $props();

	import { X, CalendarDays, BookOpenText, Hash, AlignLeft } from 'lucide-svelte';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id, Doc } from '../../convex/_generated/dataModel';

	const client = useConvexClient();

	let semesterEditName: string = $state('');
	let className: string = $state('');
	let classCode: string = $state('');
	let classDescription: string = $state('');
	let isSubmitting: boolean = $state(false);
	let validationErrors: Record<string, string> = $state({});
	let submitError: string = $state('');

	// Reset form when editingClass changes
	$effect(() => {
		if (isEditModalOpen && editingClass) {
			className = editingClass.name || '';
			classCode = editingClass.code || '';
			classDescription = editingClass.description || '';
			semesterEditName = editingClass.semester?.name || '';
		}
	});

	// Set default semester if none is set
	$effect(() => {
		if (isEditModalOpen && !semesterEditName && semesters.data && semesters.data.length > 0) {
			semesterEditName = semesters.data[0].name;
		}
	});

	function validateField(field: string, value: string): string {
		const trimmed = value.trim();
		
		switch (field) {
			case 'className':
				if (!trimmed) return 'Class name is required';
				if (trimmed.length < 2) return 'Class name must be at least 2 characters';
				if (trimmed.length > 100) return 'Class name cannot exceed 100 characters';
				break;

			case 'classCode':
				if (!trimmed) return 'Class code is required';
				if (trimmed.length < 2) return 'Class code must be at least 2 characters';
				if (trimmed.length > 20) return 'Class code cannot exceed 20 characters';
				
				const codePattern = /^[a-zA-Z0-9\-_\s]+$/;
				if (!codePattern.test(trimmed)) {
					return 'Code can only contain letters, numbers, hyphens, underscores, and spaces';
				}
				break;

			case 'classDescription':
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
		className.trim() && 
		classCode.trim() && 
		classDescription.trim() && 
		semesterEditName && 
		userData?.cohortId &&
		Object.keys(validationErrors).length === 0
	);

	async function handleSubmit() {
		if (!editingClass) return;

		// Validate all fields first
		validateOnInput('className', className);
		validateOnInput('classCode', classCode);
		validateOnInput('classDescription', classDescription);

		if (!isFormValid) return;

		isSubmitting = true;
		submitError = '';

		try {
			const selectedSemester = semesters.data?.find(
				(s: Doc<'semester'>) => s.name === semesterEditName
			);
			if (!selectedSemester) {
				submitError = 'Selected semester not found';
				return;
			}

			await client.mutation(api.class.updateClass, {
				classId: editingClass._id,
				cohortId: userData?.cohortId as Id<'cohort'>,
				name: className.trim(),
				code: classCode.trim(),
				description: classDescription.trim(),
				semesterId: selectedSemester._id
			});

			validationErrors = {};
			submitError = '';
			closeEditModal();
		} catch (error) {
			submitError = error instanceof Error ? error.message : 'Failed to update class';
			console.error("Failed to update class:", submitError);
		} finally {
			isSubmitting = false;
		}
	}

	function resetForm() {
		className = '';
		classCode = '';
		classDescription = '';
		semesterEditName = '';
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
			<h3 class="text-2xl font-extrabold tracking-tight">Edit Class</h3>
		</div>

		{#if submitError}
			<div class="alert alert-error mb-6">
				<span>❌ {submitError}</span>
			</div>
		{/if}

		{#if semesters.isLoading}
			<div class="mb-6 flex items-center gap-3 text-base-content/70">
				<span class="loading loading-spinner loading-md"></span>
				<span>Loading semesters…</span>
			</div>
		{:else if semesters.error != null}
			<div class="alert alert-error mb-6">
				<span>Failed to load: {semesters.error.toString()}</span>
			</div>
		{:else if !semesters.data || semesters.data.length === 0}
			<div class="alert alert-warning mb-6">
				<span>No semesters available. Please create a semester first.</span>
			</div>
		{:else}
			<div class="mb-6 grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-2">
				<label
					class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80"
					for="semester-trigger"
				>
					<CalendarDays size={18} class="text-primary/80" />
					<span>Semester</span>
				</label>

				<div class="relative inline-block">
					<button
						id="edit-semester-trigger"
						class="btn btn-sm ms-4 md:btn-md"
						popovertarget="edit-popover-1"
						style="anchor-name: --edit-anchor-1"
						type="button"
						aria-haspopup="listbox"
						aria-expanded="false"
						aria-controls="edit-popover-1"
					>
						{semesterEditName || 'Select semester'}
					</button>

					<ul
						class="menu dropdown z-50 mt-2 w-64 rounded-xl border border-base-300 bg-base-100 p-2 shadow-2xl"
						popover
						id="edit-popover-1"
						style="position-anchor: --edit-anchor-1"
						role="listbox"
						aria-labelledby="edit-semester-trigger"
					>
						{#each semesters.data as semester (semester._id)}
							<li>
								<button
									type="button"
									onclick={() => {
										semesterEditName = semester.name;
										document.getElementById('edit-popover-1')?.hidePopover();
									}}
									class="flex items-center gap-2 rounded-lg p-2 transition-colors duration-150 hover:bg-base-200"
								>
									<CalendarDays size={16} class="text-primary/70" />
									<span>{semester.name}</span>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		{/if}

		{#if editingClass}
			<!-- Responsive form: description snaps to top on mobile -->
			<div class="flex flex-col gap-6">
				<!-- Description block (first on mobile, later in grid on md+) -->
				<div class="md:hidden">
					<label
						class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80"
						for="class-description"
					>
						<AlignLeft size={18} class="text-primary/80" />
						<span>Description</span>
					</label>
					<textarea
						id="class-description"
						class="textarea textarea-bordered w-full min-h-48"
						bind:value={classDescription}
						placeholder="Enter class description..."
					></textarea>
				</div>

				<!-- Two-column label/field grid for md+; single column on mobile -->
				<div class="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-[auto_1fr]">
					<label
						class="label m-0 hidden items-center gap-2 p-0 text-base font-medium text-base-content/80 md:flex"
						for="class-name"
					>
						<BookOpenText size={18} class="text-primary/80" />
						<span>Class Name</span>
					</label>
					<div class="md:contents">
						<label
							for="class-name"
							class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden"
						>
							<BookOpenText size={18} class="text-primary/80" />
							<span>Class Name</span>
						</label>
						<div class="form-control w-full">
							<input
								id="class-name"
								type="text"
								placeholder="e.g., Advanced Calculus"
								class="input input-bordered w-full"
								class:input-error={validationErrors.className}
								bind:value={className}
								oninput={() => validateOnInput('className', className)}
								maxlength="100"
							/>
							<div class="label">
															<span class="label-text-alt text-xs text-base-content/60">
								2-100 characters • Must be unique
							</span>
								<span class="label-text-alt text-xs text-base-content/40">
									{className.length}/100
								</span>
							</div>
							{#if validationErrors.className}
								<div class="label">
									<span class="label-text-alt text-error text-xs">
										{validationErrors.className}
									</span>
								</div>
							{/if}
						</div>
					</div>

					<label
						class="label m-0 hidden items-center gap-2 p-0 text-base font-medium text-base-content/80 md:flex"
						for="class-code"
					>
						<Hash size={18} class="text-primary/80" />
						<span>Code</span>
					</label>
					<div class="md:contents">
						<label
							for="class-code"
							class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden"
						>
							<Hash size={18} class="text-primary/80" />
							<span>Code</span>
						</label>
						<div class="form-control w-full">
							<input
								id="class-code"
								type="text"
								placeholder="e.g., MATH301"
								class="input input-bordered w-full"
								class:input-error={validationErrors.classCode}
								bind:value={classCode}
								oninput={() => validateOnInput('classCode', classCode)}
								maxlength="20"
							/>
							<div class="label">
								<span class="label-text-alt text-xs text-base-content/60">
									2-20 characters • Must be unique
								</span>
								<span class="label-text-alt text-xs text-base-content/40">
									{classCode.length}/20
								</span>
							</div>
							{#if validationErrors.classCode}
								<div class="label">
									<span class="label-text-alt text-error text-xs">
										{validationErrors.classCode}
									</span>
								</div>
							{/if}
						</div>
					</div>

					<label
						class="label m-0 hidden items-center gap-2 self-start p-0 text-base font-medium text-base-content/80 md:flex"
						for="class-description"
					>
						<AlignLeft size={18} class="text-primary/80" />
						<span>Description</span>
					</label>
					<div class="form-control hidden w-full md:block">
						<textarea
							id="class-description"
							class="textarea textarea-bordered w-full min-h-48"
							class:textarea-error={validationErrors.classDescription}
							bind:value={classDescription}
							placeholder="Describe what this class covers..."
							oninput={() => validateOnInput('classDescription', classDescription)}
							maxlength="500"
						></textarea>
						<div class="label">
							<span class="label-text-alt text-xs text-base-content/60">
								10-500 characters
							</span>
							<span class="label-text-alt text-xs text-base-content/40">
								{classDescription.length}/500
							</span>
						</div>
						{#if validationErrors.classDescription}
							<div class="label">
								<span class="label-text-alt text-error text-xs">
									{validationErrors.classDescription}
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
