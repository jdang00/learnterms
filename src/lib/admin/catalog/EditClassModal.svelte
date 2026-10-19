<script lang="ts">
	import SemesterSelect from '$lib/components/SemesterSelect.svelte';
	let { isEditModalOpen, closeEditModal, editingClass, semesters, userData } = $props();

	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import Hash from '@lucide/svelte/icons/hash';
	import AlignLeft from '@lucide/svelte/icons/align-left';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api.js';
	import type { Id, Doc } from '../../../convex/_generated/dataModel';
	import { pickDefaultSemesterName } from '$lib/utils/semester';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Spinner } from '$lib/components/ui/spinner';
	import { Textarea } from '$lib/components/ui/textarea';

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
		if (isEditModalOpen && !semesterEditName && semesters.data) {
			semesterEditName = pickDefaultSemesterName(semesters.data);
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

			case 'classCode': {
				if (!trimmed) return 'Class code is required';
				if (trimmed.length < 2) return 'Class code must be at least 2 characters';
				if (trimmed.length > 20) return 'Class code cannot exceed 20 characters';

				const codePattern = /^[a-zA-Z0-9\-_\s]+$/;
				if (!codePattern.test(trimmed)) {
					return 'Code can only contain letters, numbers, hyphens, underscores, and spaces';
				}
				break;
			}

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
			console.error('Failed to update class:', submitError);
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

	function dismiss() {
		resetForm();
		closeEditModal();
	}
</script>

<Dialog.Root
	open={isEditModalOpen}
	onOpenChange={(open) => {
		if (!open) dismiss();
	}}
>
	<Dialog.Content class="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title class="text-2xl font-extrabold tracking-tight">Edit Class</Dialog.Title>
		</Dialog.Header>

		{#if submitError}
			<Alert.Root tone="error">
				<Alert.Title>❌ {submitError}</Alert.Title>
			</Alert.Root>
		{/if}

		{#if semesters.isLoading}
			<div class="flex items-center gap-3 text-foreground/70">
				<Spinner class="size-5" />
				<span>Loading semesters…</span>
			</div>
		{:else if semesters.error != null}
			<Alert.Root tone="error">
				<Alert.Title>Failed to load: {semesters.error.toString()}</Alert.Title>
			</Alert.Root>
		{:else if !semesters.data || semesters.data.length === 0}
			<Alert.Root tone="warning">
				<Alert.Title>No semesters available. Please create a semester first.</Alert.Title>
			</Alert.Root>
		{:else}
			<div class="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-2">
				<Label class="m-0 p-0 text-base font-medium text-foreground/80" for="edit-semester-trigger">
					<CalendarDays size={18} class="text-primary/80" />
					<span>Semester</span>
				</Label>

				<SemesterSelect
					id="edit-semester-trigger"
					semesters={semesters.data}
					bind:value={semesterEditName}
					size="default"
					class="ms-4 w-56"
				/>
			</div>
		{/if}

		{#if editingClass}
			<!-- Responsive form: description snaps to top on mobile -->
			<div class="flex flex-col gap-6">
				<!-- Description block (first on mobile, later in grid on md+) -->
				<div class="md:hidden">
					<Label class="m-0 p-0 text-base font-medium text-foreground/80" for="class-description">
						<AlignLeft size={18} class="text-primary/80" />
						<span>Description</span>
					</Label>
					<Textarea
						id="class-description"
						class="min-h-48"
						bind:value={classDescription}
						placeholder="Enter class description..."
					/>
				</div>

				<!-- Two-column label/field grid for md+; single column on mobile -->
				<div class="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-[auto_1fr]">
					<Label
						class="m-0 hidden p-0 text-base font-medium text-foreground/80 md:flex"
						for="class-name"
					>
						<BookOpenText size={18} class="text-primary/80" />
						<span>Class Name</span>
					</Label>
					<div class="md:contents">
						<Label
							for="class-name"
							class="m-0 p-0 text-base font-medium text-foreground/80 md:hidden"
						>
							<BookOpenText size={18} class="text-primary/80" />
							<span>Class Name</span>
						</Label>
						<div class="w-full">
							<Input
								id="class-name"
								type="text"
								placeholder="e.g., General Pharmacology"
								aria-invalid={validationErrors.className ? true : undefined}
								bind:value={className}
								oninput={() => validateOnInput('className', className)}
								maxlength={100}
							/>
							<div class="mt-2 flex items-center justify-between gap-2 px-3 text-xs">
								<span class="text-foreground/60"> 2-100 characters • Must be unique </span>
								<span class="text-foreground/40">
									{className.length}/100
								</span>
							</div>
							{#if validationErrors.className}
								<span class="mt-1 block px-3 text-xs text-error-ink">
									{validationErrors.className}
								</span>
							{/if}
						</div>
					</div>

					<Label
						class="m-0 hidden p-0 text-base font-medium text-foreground/80 md:flex"
						for="class-code"
					>
						<Hash size={18} class="text-primary/80" />
						<span>Code</span>
					</Label>
					<div class="md:contents">
						<Label
							for="class-code"
							class="m-0 p-0 text-base font-medium text-foreground/80 md:hidden"
						>
							<Hash size={18} class="text-primary/80" />
							<span>Code</span>
						</Label>
						<div class="w-full">
							<Input
								id="class-code"
								type="text"
								placeholder="e.g., OPT5103"
								aria-invalid={validationErrors.classCode ? true : undefined}
								bind:value={classCode}
								oninput={() => validateOnInput('classCode', classCode)}
								maxlength={20}
							/>
							<div class="mt-2 flex items-center justify-between gap-2 px-3 text-xs">
								<span class="text-foreground/60"> 2-20 characters • Must be unique </span>
								<span class="text-foreground/40">
									{classCode.length}/20
								</span>
							</div>
							{#if validationErrors.classCode}
								<span class="mt-1 block px-3 text-xs text-error-ink">
									{validationErrors.classCode}
								</span>
							{/if}
						</div>
					</div>

					<Label
						class="m-0 hidden self-start p-0 text-base font-medium text-foreground/80 md:flex"
						for="class-description"
					>
						<AlignLeft size={18} class="text-primary/80" />
						<span>Description</span>
					</Label>
					<div class="hidden w-full md:block">
						<Textarea
							id="class-description"
							class="min-h-48"
							bind:value={classDescription}
							placeholder="Describe what this class covers..."
							aria-invalid={validationErrors.classDescription ? true : undefined}
							oninput={() => validateOnInput('classDescription', classDescription)}
							maxlength={500}
						/>
						<div class="mt-2 flex items-center justify-between gap-2 px-3 text-xs">
							<span class="text-foreground/60"> 10-500 characters </span>
							<span class="text-foreground/40">
								{classDescription.length}/500
							</span>
						</div>
						{#if validationErrors.classDescription}
							<span class="mt-1 block px-3 text-xs text-error-ink">
								{validationErrors.classDescription}
							</span>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<Dialog.Footer>
			<Button variant="ghost" tone="neutral" onclick={dismiss} disabled={isSubmitting}
				>Cancel</Button
			>
			<Button
				class="gap-2"
				onclick={handleSubmit}
				loading={isSubmitting}
				disabled={isSubmitting || !isFormValid}
				title={!isFormValid ? 'Please fill all fields correctly before saving changes' : ''}
			>
				{#if isSubmitting}
					<span>Saving...</span>
				{:else}
					<span>Save Changes</span>
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
