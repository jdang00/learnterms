<script lang="ts">
	import ModuleEmojiSuggestion from './ModuleEmojiSuggestion.svelte';
	import {
		BookOpenText,
		AlignLeft,
		Hash,
		Laugh,
		CheckCircle,
		Archive,
		FileText
	} from 'lucide-svelte';
	import { isSingleEmoji, sanitizeEmoji } from '$lib/utils/emoji';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api.js';
	import type { Doc, Id } from '../../../convex/_generated/dataModel';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Spinner } from '$lib/components/ui/spinner';
	import { Textarea } from '$lib/components/ui/textarea';

	type Props = {
		isEditModalOpen: boolean;
		closeEditModal: () => void;
		editingModule: Doc<'module'> | null;
		classId: Id<'class'>;
	};

	let { isEditModalOpen, closeEditModal, editingModule, classId }: Props = $props();

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
	let selectedTagIds: Id<'tags'>[] = $state([]);

	// useQuery at top level with function args
	const tags = useQuery(api.tags.getTagsForClass, () => ({
		classId
	}));

	// useQuery at top level with skip pattern
	const moduleTagsQuery = useQuery(api.tags.getTagsForModule, () =>
		editingModule?._id ? { moduleId: editingModule._id } : 'skip'
	);

	let lastModuleId = $state<string | null>(null);

	$effect(() => {
		if (editingModule) {
			moduleTitle = editingModule.title;
			moduleDescription = editingModule.description || '';
			moduleStatus = editingModule.status;
			moduleEmoji = editingModule.emoji || '';
		}
	});
	$effect(() => {
		if (!editingModule) {
			selectedTagIds = [];
			lastModuleId = null;
			return;
		}
		if (moduleTagsQuery.data && lastModuleId !== editingModule._id) {
			selectedTagIds = moduleTagsQuery.data.filter((tag) => tag != null).map((tag) => tag!._id);
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

	function toggleTag(tagId: Id<'tags'>, checked: boolean) {
		selectedTagIds = checked
			? [...selectedTagIds, tagId]
			: selectedTagIds.filter((id) => id !== tagId);
	}

	// Count only live tags (tags that exist in the current tag list and aren't deleted)
	const liveSelectedTagCount = $derived.by(() => {
		if (!tags.data) return 0;
		const liveTagIds = new Set(tags.data.map((tag) => tag._id));
		return selectedTagIds.filter((id) => liveTagIds.has(id)).length;
	});

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
				classId,
				title: moduleTitle.trim(),
				emoji: sanitizeEmoji(moduleEmoji) || undefined,
				description: moduleDescription.trim(),
				status: moduleStatus
			});
			await client.mutation(api.tags.setModuleTags, {
				moduleId: editingModule._id,
				tagIds: selectedTagIds
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

<Dialog.Root
	open={isEditModalOpen}
	onOpenChange={(open) => {
		if (!open) closeEditModal();
	}}
>
	<Dialog.Content class="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title class="text-2xl font-extrabold tracking-tight">Edit Module</Dialog.Title>
		</Dialog.Header>

		{#if submitError}
			<Alert.Root tone="error">
				<Alert.Title>❌ {submitError}</Alert.Title>
			</Alert.Root>
		{/if}

		{#if !editingModule}
			<Alert.Root tone="error">
				<Alert.Title>No module selected for editing.</Alert.Title>
			</Alert.Root>
		{:else}
			<div class="flex flex-col gap-6">
				<div class="md:hidden">
					<Label class="m-0 p-0 text-base font-medium text-foreground/80" for="module-description">
						<AlignLeft size={18} class="text-primary/80" />
						<span>Description</span>
					</Label>
					<Textarea
						id="module-description"
						class="min-h-48"
						bind:value={moduleDescription}
						placeholder="Enter module description..."
					/>
				</div>

				<div class="grid grid-cols-1 items-center gap-x-5 gap-y-5 md:grid-cols-[auto_1fr]">
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
						<div
							class="flex w-fit flex-wrap justify-self-start gap-1 rounded-full border border-border bg-background p-1 shadow-xs"
							role="group"
							aria-label="Module status"
						>
							{#each statusOptions as option (option.value)}
								<Button
									variant={moduleStatus === option.value ? 'solid' : 'ghost'}
									tone={moduleStatus === option.value ? option.tone : 'neutral'}
									size="sm"
									class="px-3 font-semibold {moduleStatus === option.value
										? ''
										: 'text-foreground'}"
									aria-pressed={moduleStatus === option.value}
									onclick={() => (moduleStatus = option.value)}
									title={option.label}
								>
									<option.icon size={16} />
									<span>{option.label}</span>
								</Button>
							{/each}
						</div>
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
							{#if tags.isLoading || moduleTagsQuery.isLoading}
								<div class="flex items-center gap-2 text-xs text-foreground/60">
									<Spinner class="size-3" />
									<span>Loading tags...</span>
								</div>
							{:else if tags.error || moduleTagsQuery.error}
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
													disabled={liveSelectedTagCount >= 10 && !selectedTagIds.includes(tag._id)}
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
										{liveSelectedTagCount}
										{liveSelectedTagCount === 1 ? 'tag' : 'tags'} selected
										{#if liveSelectedTagCount >= 10}
											<span class="ml-1 text-warning-ink">(max 10)</span>
										{:else}
											<span class="text-foreground/40">(max 10)</span>
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
					<Textarea
						id="module-description"
						class="hidden min-h-48 md:block"
						bind:value={moduleDescription}
						placeholder="Enter module description..."
					/>

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
								class="w-28"
								bind:value={moduleEmoji}
								oninput={() => validateOnInput('moduleEmoji', moduleEmoji)}
								maxlength={8}
							/>
							<ModuleEmojiSuggestion
								title={moduleTitle}
								currentEmoji={moduleEmoji}
								classId={classId as Id<'class'>}
								active={isEditModalOpen}
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
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="ghost" tone="neutral" onclick={closeEditModal} disabled={isSubmitting}
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
						<span>Updating...</span>
					{:else}
						<span>Update Module</span>
					{/if}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
