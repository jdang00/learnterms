<script lang="ts">
	import { SegmentedControl } from '#lib/components/ui/segmented-control/index.js';
	import ModuleEmojiSuggestion from './ModuleEmojiSuggestion.svelte';
	let { isAddModalOpen, closeAddModal, classId } = $props();

	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import AlignLeft from '@lucide/svelte/icons/align-left';
	import Hash from '@lucide/svelte/icons/hash';
	import Laugh from '@lucide/svelte/icons/laugh';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import Archive from '@lucide/svelte/icons/archive';
	import FileText from '@lucide/svelte/icons/file-text';
	import { isSingleEmoji, sanitizeEmoji } from '#lib/utils/emoji.js';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api.js';
	import type { Id } from '../../../convex/_generated/dataModel';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { LoadingState } from '#lib/components/ui/spinner/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';

	const client = useConvexClient();

	let moduleTitle: string = $state('');
	let moduleDescription: string = $state('');
	let moduleEmoji: string = $state('');
	let moduleStatus: string = $state('draft');
	let isSubmitting: boolean = $state(false);
	let validationErrors: Record<string, string> = $state({});
	let submitError: string = $state('');
	const statusOptions = [
		{ value: 'published', label: 'Published', icon: CheckCircle, tone: 'success' },
		{ value: 'draft', label: 'Draft', icon: FileText, tone: 'info' },
		{ value: 'archived', label: 'Archived', icon: Archive, tone: 'error' }
	] as const;

	// Get current modules to calculate next order number - use function args
	const modules = useQuery(api.module.getAdminModule, () => ({
		id: classId as Id<'class'>
	}));
	const tags = useQuery(api.tags.getTagsForClass, () => ({
		classId: classId as Id<'class'>
	}));

	function validateField(field: string, value: string): string {
		const trimmed = value.trim();

		switch (field) {
			case 'moduleTitle': {
				if (!trimmed) return 'Module title is required';
				if (trimmed.length < 2) return 'Module title must be at least 2 characters';
				if (trimmed.length > 100) return 'Module title cannot exceed 100 characters';

				// Check for duplicate titles (case-insensitive)
				const existingTitles = modules.data?.map((m) => m.title.toLowerCase()) || [];
				if (existingTitles.includes(trimmed.toLowerCase())) {
					return 'A module with this title already exists';
				}
				break;
			}

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
	let selectedTagIds: string[] = $state([]);

	function toggleTag(tagId: Id<'tags'>, checked: boolean) {
		selectedTagIds = checked
			? [...selectedTagIds, tagId]
			: selectedTagIds.filter((id) => id !== tagId);
	}

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

			const moduleId = await client.mutation(api.module.insertModule, {
				title: moduleTitle.trim(),
				emoji: sanitizeEmoji(moduleEmoji) || undefined,
				description: moduleDescription.trim(),
				status: moduleStatus.toLowerCase(),
				classId: classId as Id<'class'>,
				order: nextOrder,
				metadata: {},
				updatedAt: Date.now()
			});
			if (selectedTagIds.length > 0) {
				await client.mutation(api.tags.setModuleTags, {
					moduleId: moduleId as Id<'module'>,
					tagIds: selectedTagIds as Id<'tags'>[]
				});
			}

			// Reset form
			moduleTitle = '';
			moduleDescription = '';
			moduleStatus = 'draft';
			moduleEmoji = '';
			selectedTagIds = [];
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

<Dialog.Root
	open={isAddModalOpen}
	onOpenChange={(open) => {
		if (!open) closeAddModal();
	}}
>
	<Dialog.Content class="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title class="text-2xl font-extrabold tracking-tight">Add New Module</Dialog.Title>
		</Dialog.Header>

		{#if submitError}
			<Alert.Root tone="error">
				<Alert.Title>❌ {submitError}</Alert.Title>
			</Alert.Root>
		{/if}

		<!-- Responsive form: description snaps to top on mobile -->
		<div class="flex flex-col gap-6">
			<!-- Description block (first on mobile, later in grid on md+) -->
			<div class="md:hidden">
				<Label class="m-0 p-0 text-base font-medium text-foreground/80" for="module-description">
					<AlignLeft size={18} class="text-primary/80" />
					<span>Description</span>
				</Label>
				<div class="w-full">
					<Textarea
						id="module-description"
						class="min-h-48"
						bind:value={moduleDescription}
						placeholder="Describe what this module covers..."
						aria-invalid={validationErrors.moduleDescription ? true : undefined}
						oninput={() => validateOnInput('moduleDescription', moduleDescription)}
						maxlength={500}
					/>
					<div class="mt-2 flex items-center justify-between gap-2 px-3 text-xs">
						<span class="text-foreground/60"> 10-500 characters </span>
						<span class="text-foreground/40">
							{moduleDescription.length}/500
						</span>
					</div>
					{#if validationErrors.moduleDescription}
						<span class="mt-1 block px-3 text-xs text-error-ink">
							{validationErrors.moduleDescription}
						</span>
					{/if}
				</div>
			</div>

			<!-- Two-column grid; include Emoji row first so columns align across rows -->
			<div class="grid grid-cols-1 items-center gap-x-5 gap-y-5 md:grid-cols-[auto_1fr]">
				<Label
					class="m-0 hidden p-0 text-base font-medium text-foreground/80 md:flex"
					for="module-emoji"
				>
					<Laugh size={18} class="text-primary/80" />
					<span>Emoji</span>
				</Label>
				<div class="md:contents">
					<Label
						for="module-emoji"
						class="m-0 p-0 text-base font-medium text-foreground/80 md:hidden"
					>
						<Laugh size={18} class="text-primary/80" />
						<span>Emoji</span>
					</Label>
					<div class="w-full">
						<Input
							id="module-emoji"
							type="text"
							placeholder="e.g., 📘"
							class="w-full max-w-28"
							bind:value={moduleEmoji}
							oninput={() => validateOnInput('moduleEmoji', moduleEmoji)}
							maxlength={8}
						/>
						<ModuleEmojiSuggestion
							title={moduleTitle}
							currentEmoji={moduleEmoji}
							classId={classId as Id<'class'>}
							active={isAddModalOpen}
							disabled={isSubmitting}
							onselect={(emoji) => {
								moduleEmoji = emoji;
								validateOnInput('moduleEmoji', emoji);
							}}
						/>
						{#if validationErrors.moduleEmoji}
							<span class="mt-1 block px-3 text-xs text-error-ink"
								>{validationErrors.moduleEmoji}</span
							>
						{/if}
					</div>
				</div>

				<Label
					class="m-0 hidden p-0 text-base font-medium text-foreground/80 md:flex"
					for="module-title"
				>
					<BookOpenText size={18} class="text-primary/80" />
					<span>Module Title</span>
				</Label>
				<div class="md:contents">
					<Label
						for="module-title"
						class="m-0 p-0 text-base font-medium text-foreground/80 md:hidden"
					>
						<BookOpenText size={18} class="text-primary/80" />
						<span>Module Title</span>
					</Label>
					<div class="w-full">
						<Input
							id="module-title"
							type="text"
							placeholder="e.g., Introduction to Optics"
							aria-invalid={validationErrors.moduleTitle ? true : undefined}
							bind:value={moduleTitle}
							oninput={() => validateOnInput('moduleTitle', moduleTitle)}
							maxlength={100}
						/>
						<div class="mt-2 flex items-center justify-between gap-2 px-3 text-xs">
							<span class="text-foreground/60"> 2-100 characters • Must be unique </span>
							<span class="text-foreground/40">
								{moduleTitle.length}/100
							</span>
						</div>
						{#if validationErrors.moduleTitle}
							<span class="mt-1 block px-3 text-xs text-error-ink">
								{validationErrors.moduleTitle}
							</span>
						{/if}
					</div>
				</div>

				<span
					class="m-0 hidden items-center gap-2 p-0 text-base font-medium text-foreground/80 md:flex"
				>
					<Hash size={18} class="text-primary/80" />
					<span>Status</span>
				</span>
				<div class="md:contents">
					<span
						class="m-0 flex items-center gap-2 p-0 text-base font-medium text-foreground/80 md:hidden"
					>
						<Hash size={18} class="text-primary/80" />
						<span>Status</span>
					</span>
					<SegmentedControl
						value={moduleStatus}
						onValueChange={(value) => (moduleStatus = value as typeof moduleStatus)}
						options={statusOptions}
						aria-label="Module status"
						class="justify-self-start"
					/>
				</div>

				<Label
					class="m-0 hidden self-start p-0 text-base font-medium text-foreground/80 md:flex"
					for="module-tags"
				>
					<Hash size={18} class="text-primary/80" />
					<span>Tags</span>
				</Label>
				<div class="md:contents">
					<Label
						for="module-tags"
						class="m-0 p-0 text-base font-medium text-foreground/80 md:hidden"
					>
						<Hash size={18} class="text-primary/80" />
						<span>Tags</span>
					</Label>
					<div class="w-full" id="module-tags">
						{#if tags.isLoading}
							<LoadingState inline label="Loading tags…" class="text-xs" />
						{:else if tags.error}
							<div class="text-xs text-error-ink">Failed to load tags.</div>
						{:else if !tags.data || tags.data.length === 0}
							<div class="text-xs text-foreground/60">
								No tags yet. Add tags from the class page.
							</div>
						{:else}
							<div class="space-y-2">
								<div class="flex flex-wrap gap-2">
									{#each tags.data as tag (tag._id)}
										<label
											class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm cursor-pointer transition-all hover:border-primary/50 hover:bg-muted/50 {selectedTagIds.includes(
												tag._id
											)
												? 'border-primary'
												: 'border-border'}"
										>
											<Checkbox
												class="size-3.5"
												checked={selectedTagIds.includes(tag._id)}
												onCheckedChange={(checked) => toggleTag(tag._id, checked)}
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
								<div class="text-xs text-foreground/60">
									{selectedTagIds.length} of 10 tags selected
									{#if selectedTagIds.length >= 10}
										<span class="ml-1 text-warning-ink">(max reached)</span>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>

				<Label
					class="m-0 hidden self-start p-0 text-base font-medium text-foreground/80 md:flex"
					for="module-description"
				>
					<AlignLeft size={18} class="text-primary/80" />
					<span>Description</span>
				</Label>
				<div class="hidden w-full md:block">
					<Textarea
						id="module-description"
						class="min-h-48"
						bind:value={moduleDescription}
						placeholder="Describe what this module covers..."
						aria-invalid={validationErrors.moduleDescription ? true : undefined}
						oninput={() => validateOnInput('moduleDescription', moduleDescription)}
						maxlength={500}
					/>
					<div class="mt-2 flex items-center justify-between gap-2 px-3 text-xs">
						<span class="text-foreground/60"> 10-500 characters </span>
						<span class="text-foreground/40">
							{moduleDescription.length}/500
						</span>
					</div>
					{#if validationErrors.moduleDescription}
						<span class="mt-1 block px-3 text-xs text-error-ink">
							{validationErrors.moduleDescription}
						</span>
					{/if}
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="ghost" tone="neutral" onclick={closeAddModal} disabled={isSubmitting}
				>Cancel</Button
			>
			<Button
				class="gap-2"
				onclick={handleSubmit}
				loading={isSubmitting}
				disabled={isSubmitting || !isFormValid}
				title={!isFormValid ? 'Please fill all fields correctly before creating the module' : ''}
			>
				{#if isSubmitting}
					<span>Creating...</span>
				{:else}
					<span>Create Module</span>
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
