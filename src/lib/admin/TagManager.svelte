<script lang="ts">
	let { classId } = $props();

	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id, Doc } from '../../convex/_generated/dataModel';
	import { Pencil, Trash2, Plus, X, Check } from 'lucide-svelte';

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

<section class="rounded-2xl border border-base-300 bg-base-100 p-4">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2">
			<h3 class="text-base font-semibold text-base-content">Tags</h3>
			<div
				class="tooltip tooltip-right"
				data-tip="Group modules together (e.g., Exam 1 covering modules 1-3). Future features will enable exam review by tags."
			>
				<div class="btn btn-ghost btn-xs btn-circle text-base-content/60">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
				</div>
			</div>
			{#if tagsQuery.data && tagsQuery.data.length > 0}
				<span class="badge badge-sm">{tagsQuery.data.length}</span>
			{/if}
		</div>
		<button class="btn btn-primary btn-sm gap-2" onclick={() => showAddForm = !showAddForm}>
			<Plus size={14} />
			<span>New Tag</span>
		</button>
	</div>

	{#if showAddForm}
		<div class="mb-4 p-3 rounded-lg bg-base-200/50 border border-base-300">
			<div class="flex flex-col gap-3">
				<div class="flex items-center gap-2">
					<input
						type="text"
						class="input input-bordered input-sm flex-1"
						placeholder="Tag name (e.g. Midterm, Chapter 1)"
						maxlength="40"
						bind:value={newTagName}
						onkeydown={(e) => e.key === 'Enter' && handleCreate()}
					/>
					<div class="flex items-center gap-2">
						<input 
							type="color" 
							class="h-8 w-8 rounded-full border-2 border-base-300 cursor-pointer" 
							bind:value={newTagColor} 
							title="Choose tag color"
						/>
						<button class="btn btn-primary btn-sm gap-1" onclick={handleCreate} disabled={isCreating}>
							{#if isCreating}
								<span class="loading loading-spinner loading-xs"></span>
							{:else}
								<Check size={14} />
							{/if}
							<span>Add</span>
						</button>
						<button class="btn btn-ghost btn-sm btn-square" onclick={() => { showAddForm = false; createError = ''; newTagName = ''; }}>
							<X size={14} />
						</button>
					</div>
				</div>
				{#if createError}
					<div class="text-xs text-error">{createError}</div>
				{/if}
			</div>
		</div>
	{/if}

	<div>

		{#if tagsQuery.isLoading}
			<div class="flex items-center gap-2 text-sm text-base-content/60 py-4">
				<span class="loading loading-spinner loading-sm"></span>
				<span>Loading tags...</span>
			</div>
		{:else if tagsQuery.error}
			<div class="alert alert-error py-2 text-sm">
				<span>Failed to load tags.</span>
			</div>
		{:else if !tagsQuery.data || tagsQuery.data.length === 0}
			<div class="text-center py-6">
				<div class="text-base-content/40 text-sm">
					No tags yet. Click "New Tag" to create one.
				</div>
			</div>
		{:else}
			<div>
				<div class="flex flex-wrap items-center gap-1.5">
					{#each tagsQuery.data as tag (tag._id)}
						{#if editingTagId === tag._id}
							<div class="inline-flex items-center gap-1.5 rounded-full border border-primary bg-base-50 px-2.5 py-1.5 text-xs">
								<input
									type="text"
									class="input input-bordered input-xs w-24"
									maxlength="40"
									bind:value={editName}
									onkeydown={(e) => e.key === 'Enter' && handleUpdate(tag._id)}
								/>
								<input
									type="color"
									class="h-5 w-5 rounded-full border-2 border-base-300 cursor-pointer"
									bind:value={editColor}
									title="Change color"
								/>
								<button 
									class="btn btn-ghost btn-xs btn-square p-0 h-5 w-5 min-h-0" 
									onclick={cancelEdit} 
									aria-label="Cancel edit"
									title="Cancel"
								>
									<X size={12} />
								</button>
								<button
									class="btn btn-ghost btn-xs btn-square p-0 h-5 w-5 min-h-0"
									onclick={() => handleUpdate(tag._id)}
									disabled={isUpdating}
									aria-label="Save tag"
									title="Save"
								>
									{#if isUpdating}
										<span class="loading loading-spinner loading-xs"></span>
									{:else}
										<Check size={12} />
									{/if}
								</button>
							</div>
						{:else}
							<div class="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-50 px-2.5 py-1 text-xs transition-all hover:border-primary/30 hover:shadow-sm">
								<span
									class="h-2 w-2 rounded-full ring-1 ring-base-content/10"
									style={`background-color: ${tag.color || '#94a3b8'}`}
								></span>
								<span class="font-medium">{tag.name}</span>
								<div class="dropdown dropdown-end">
									<button
										class="btn btn-ghost btn-xs btn-square p-0 h-4 w-4 min-h-0"
										tabindex="0"
										aria-label="Tag options"
										title="Options"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
									</button>
									<ul
										class="dropdown-content menu bg-base-100 rounded-box z-10 w-32 p-1.5 shadow-lg border border-base-300"
									>
										<li>
											<button
												onclick={() => startEdit(tag)}
												class="flex items-center gap-2 text-xs py-1.5"
											>
												<Pencil size={11} />
												<span>Edit</span>
											</button>
										</li>
										<li>
											<button
												onclick={() => handleDelete(tag._id, tag.name)}
												class="flex items-center gap-2 text-xs py-1.5 text-error hover:bg-error/10"
											>
												<Trash2 size={11} />
												<span>Delete</span>
											</button>
										</li>
									</ul>
								</div>
							</div>
						{/if}
					{/each}
				</div>
				{#if editError}
					<div class="alert alert-error py-2 text-sm mt-3">
						<span>{editError}</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</section>
