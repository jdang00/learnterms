<script lang="ts">
	let { classId } = $props();

	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api.js';
	import type { Id, Doc } from '../../../convex/_generated/dataModel';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import Check from '@lucide/svelte/icons/check';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';
	import { LoadingState } from '$lib/components/ui/spinner';
	import { Tip } from '$lib/components/ui/tooltip';

	const client = useConvexClient();
	// useQuery with function args for reactivity
	const tagsQuery = useQuery(api.tags.getTagsForClass, () => ({ classId: classId as Id<'class'> }));

	let newTagName = $state('');
	let newTagColor = $state('#64748b');
	let createError = $state('');
	let isCreating = $state(false);
	let showAddForm = $state(false);

	let editingTagId = $state<string | null>(null);
	let editName = $state('');
	let editColor = $state('#64748b');
	let editError = $state('');
	let isUpdating = $state(false);

	function startEdit(tag: Doc<'tags'>) {
		editingTagId = tag._id;
		editName = tag.name;
		editColor = tag.color || '#64748b';
		editError = '';
	}

	function cancelEdit() {
		editingTagId = null;
		editName = '';
		editColor = '#64748b';
		editError = '';
	}

	async function handleCreate() {
		createError = '';
		const name = newTagName.trim();
		if (!name) {
			createError = 'Tag name is required';
			return;
		}

		isCreating = true;
		try {
			await client.mutation(api.tags.createTag, {
				classId: classId as Id<'class'>,
				name,
				color: newTagColor
			});
			newTagName = '';
			newTagColor = '#64748b';
			showAddForm = false;
		} catch (error) {
			createError = error instanceof Error ? error.message : 'Failed to create tag';
		} finally {
			isCreating = false;
		}
	}

	async function handleUpdate(tagId: string) {
		editError = '';
		const name = editName.trim();
		if (!name) {
			editError = 'Tag name is required';
			return;
		}

		isUpdating = true;
		try {
			await client.mutation(api.tags.updateTag, {
				tagId: tagId as Id<'tags'>,
				classId: classId as Id<'class'>,
				name,
				color: editColor
			});
			cancelEdit();
		} catch (error) {
			editError = error instanceof Error ? error.message : 'Failed to update tag';
		} finally {
			isUpdating = false;
		}
	}

	async function handleDelete(tagId: string, name: string) {
		if (!confirm(`Delete tag "${name}"?`)) return;
		try {
			await client.mutation(api.tags.archiveTag, {
				tagId: tagId as Id<'tags'>,
				classId: classId as Id<'class'>
			});
		} catch (error) {
			createError = error instanceof Error ? error.message : 'Failed to delete tag';
		}
	}
</script>

<section class="surface p-4">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2">
			<h3 class="text-base font-semibold text-foreground">Tags</h3>
			<Tip
				label="Group modules together (e.g., Exam 1 covering modules 1-3). Future features will enable exam review by tags."
				side="right"
			>
				<span class="flex size-6 items-center justify-center rounded-full text-foreground/60">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg
					>
				</span>
			</Tip>
			{#if tagsQuery.data && tagsQuery.data.length > 0}
				<Badge>{tagsQuery.data.length}</Badge>
			{/if}
		</div>
		<Button size="sm" class="gap-2" onclick={() => (showAddForm = !showAddForm)}>
			<Plus size={14} />
			<span>New Tag</span>
		</Button>
	</div>

	{#if showAddForm}
		<div class="mb-4 p-3 surface-muted">
			<div class="flex flex-col gap-3">
				<div class="flex items-center gap-2">
					<Input
						type="text"
						class="h-8 flex-1 px-3 text-sm"
						placeholder="Tag name (e.g. Midterm, Chapter 1)"
						maxlength={40}
						bind:value={newTagName}
						onkeydown={(e) => e.key === 'Enter' && handleCreate()}
					/>
					<div class="flex items-center gap-2">
						<input
							type="color"
							class="h-8 w-8 cursor-pointer rounded-full border-2 border-border appearance-none overflow-hidden p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
							bind:value={newTagColor}
							title="Choose tag color"
						/>
						<Button size="sm" class="gap-1" loading={isCreating} onclick={handleCreate}>
							{#if !isCreating}
								<Check size={14} />
							{/if}
							<span>Add</span>
						</Button>
						<Button
							variant="ghost"
							tone="neutral"
							size="sm"
							shape="square"
							onclick={() => {
								showAddForm = false;
								createError = '';
								newTagName = '';
							}}
						>
							<X size={14} />
						</Button>
					</div>
				</div>
				{#if createError}
					<div class="text-xs text-error-ink">{createError}</div>
				{/if}
			</div>
		</div>
	{/if}

	<div>
		{#if tagsQuery.isLoading}
			<LoadingState inline label="Loading tags…" class="py-4" />
		{:else if tagsQuery.error}
			<Alert.Root tone="error" class="py-2 text-sm">
				<Alert.Title>Failed to load tags.</Alert.Title>
			</Alert.Root>
		{:else if !tagsQuery.data || tagsQuery.data.length === 0}
			<div class="text-center py-6">
				<div class="text-foreground/40 text-sm">No tags yet. Click "New Tag" to create one.</div>
			</div>
		{:else}
			<div>
				<div class="flex flex-wrap items-center gap-1.5">
					{#each tagsQuery.data as tag (tag._id)}
						{#if editingTagId === tag._id}
							<div
								class="inline-flex items-center gap-1.5 rounded-full border border-primary bg-background px-2.5 py-1.5 text-xs"
							>
								<Input
									type="text"
									class="h-7 w-24 px-2.5 text-xs"
									maxlength={40}
									bind:value={editName}
									onkeydown={(e) => e.key === 'Enter' && handleUpdate(tag._id)}
								/>
								<input
									type="color"
									class="h-5 w-5 cursor-pointer rounded-full border-2 border-border appearance-none overflow-hidden p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
									bind:value={editColor}
									title="Change color"
								/>
								<Button
									variant="ghost"
									tone="neutral"
									size="xs"
									shape="square"
									class="size-5"
									onclick={cancelEdit}
									aria-label="Cancel edit"
									tooltip="Cancel"
								>
									<X size={12} />
								</Button>
								<Button
									variant="ghost"
									tone="neutral"
									size="xs"
									shape="square"
									class="size-5"
									loading={isUpdating}
									onclick={() => handleUpdate(tag._id)}
									aria-label="Save tag"
									title="Save"
								>
									{#if !isUpdating}
										<Check size={12} />
									{/if}
								</Button>
							</div>
						{:else}
							<div
								class="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs transition-all hover:border-primary/30 hover:shadow-xs"
							>
								<span
									class="h-2 w-2 rounded-full ring-1 ring-foreground/10"
									style={`background-color: ${tag.color || '#94a3b8'}`}
								></span>
								<span class="font-medium">{tag.name}</span>
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button
												{...props}
												variant="ghost"
												tone="neutral"
												size="xs"
												shape="square"
												class="size-4"
												aria-label="Tag options"
												tooltip="Options"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="12"
													height="12"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
													><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle
														cx="12"
														cy="19"
														r="1"
													/></svg
												>
											</Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="start" class="w-32">
										<DropdownMenu.Item class="py-1.5 text-xs" onSelect={() => startEdit(tag)}>
											<Pencil size={11} />
											<span>Edit</span>
										</DropdownMenu.Item>
										<DropdownMenu.Item
											variant="destructive"
											class="py-1.5 text-xs"
											onSelect={() => handleDelete(tag._id, tag.name)}
										>
											<Trash2 size={11} />
											<span>Delete</span>
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</div>
						{/if}
					{/each}
				</div>
				{#if editError}
					<Alert.Root tone="error" class="mt-3 py-2 text-sm">
						<Alert.Title>{editError}</Alert.Title>
					</Alert.Root>
				{/if}
			</div>
		{/if}
	</div>
</section>
