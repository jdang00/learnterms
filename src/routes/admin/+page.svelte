<script lang="ts">
	import type { PageData } from './$types';
	import { useClerkContext } from 'svelte-clerk';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { Id } from '../../convex/_generated/dataModel';
	import { api } from '../../convex/_generated/api.js';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import { Eye, Pencil, Trash2, X } from 'lucide-svelte';

	const ctx = useClerkContext();

	let { data }: { data: PageData } = $props();
	const userData = data.userData;

	const classes = useQuery(api.class.getUserClasses, {
		id: (userData?.cohortId as Id<'cohort'>) || ''
	});

	const client = useConvexClient();

	type ClassItem = NonNullable<typeof classes.data>[0];
	let classList = $state<ClassItem[]>([]);

	let isEditModalOpen = $state(false);
	let editingClass = $state<ClassItem | null>(null);

	$effect(() => {
		if (classes.data) {
			classList = [...classes.data];
		}
	});

	// Interactive handlers
	function handleSelect(id: string) {
		console.log('Selected class:', id);
		// e.g., open a side panel or navigate
	}

	async function handleDelete(id: string) {
		console.log('Delete class:', id);
		// If you want to optimistically remove:
		// const prev = [...classList];
		// classList = classList.filter((c) => c._id === id ? false : true);
		// try { await client.mutation(api.class.deleteClass, { classId: id, cohortId: userData?.cohortId as Id<'cohort'> }); }
		// catch(e) { classList = prev; }
	}

	async function handleDrop(state: DragDropState<ClassItem>) {
		const { draggedItem, sourceContainer, targetContainer } = state;
		if (!targetContainer || sourceContainer === targetContainer) return;

		const sourceIndex = classList.findIndex((i) => i._id === draggedItem._id);
		const targetIndex = parseInt(targetContainer);

		if (sourceIndex === -1 || Number.isNaN(targetIndex)) return;

		const list = [...classList];
		const [moved] = list.splice(sourceIndex, 1);
		list.splice(targetIndex, 0, moved);
		classList = list;

		try {
			await client.mutation(api.class.updateClassOrder, {
				classId: moved._id,
				newOrder: targetIndex,
				cohortId: userData?.cohortId as Id<'cohort'>
			});
		} catch (error) {
			console.error('Failed to update class order:', error);
			classList = [...(classes.data || [])];
		}
	}

	const semesters = useQuery(api.semester.getAllSemesters, {});
	let currentSemester = $state('');

	$effect(() => {
		if (semesters.data && semesters.data.length > 0 && !currentSemester) {
			currentSemester = semesters.data[0].name;
		}
	});

	const filteredClassList = $derived(
		!classList || !currentSemester
			? classList
			: classList.filter((c) => c.semester?.name === currentSemester)
	);

	// View/Edit placeholders (no schema assumptions)
	function viewClass(id: string) {
		console.log('View class', id);
	}
	
	function editClass(classItem: ClassItem) {
		editingClass = classItem;
		isEditModalOpen = true;
	}

	function closeEditModal() {
		isEditModalOpen = false;
		editingClass = null;
	}
</script>

<div class="min-h-screen p-8">
	<div class="mb-8 flex flex-col gap-2">
		<div class="flex flex-row justify-between">
			<div>
				<h1 class="text-2xl font-bold text-base-content">Admin Dashboard</h1>
				<p class="text-base-content/70">
					Manage your learning classes. Drag and drop to reorder them.
				</p>
			</div>

			{#if semesters.isLoading}
				<div class="text-base-content/70">Loading...</div>
			{:else if semesters.error != null}
				<div class="text-error">
					Failed to load: {semesters.error.toString()}
				</div>
			{:else}
				<button class="btn" popovertarget="popover-1" style="anchor-name: --anchor-1">
					{currentSemester}
				</button>
				<ul
					class="dropdown menu w-32 rounded-lg bg-base-100 shadow-sm border border-base-300"
					popover
					id="popover-1"
					style="position-anchor: --anchor-1"
				>
					{#each semesters.data as semester (semester._id)}
						<li>
							<button
								onclick={() => (currentSemester = semester.name)}
								class="hover:bg-base-200 transition-colors duration-150"
							>
								{semester.name}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	{#if classes.isLoading}
		<div class="flex items-center justify-center p-8">
			<div class="text-base-content/70">Loading classes...</div>
		</div>
	{:else if classes.error != null}
		<div class="flex items-center justify-center p-8">
			<div class="text-error">Failed to load: {classes.error.toString()}</div>
		</div>
	{:else if !filteredClassList || filteredClassList.length === 0}
		<div class="flex items-center justify-center p-8">
			<div class="text-center">
				<div class="text-4xl mb-4">📚</div>
				<h3 class="text-lg font-semibold mb-2 text-base-content">No classes found</h3>
				<p class="text-base-content/70">No classes available for the selected semester.</p>
			</div>
		</div>
	{:else}
		<div class="mx-auto max-w-8xl justify-center">
			<div class="rounded-xl bg-base-100 p-4 shadow-sm border border-base-300">
				<div class="space-y-3">
					{#each filteredClassList as classItem, index (classItem._id)}
						<div
							use:droppable={{
								container: index.toString(),
								callbacks: { onDrop: handleDrop }
							}}
							use:draggable={{
								container: index.toString(),
								dragData: classItem,
								interactive: [
									'[data-delete-btn]',
									'[data-select-btn]',
									'[data-view-btn]',
									'[data-edit-btn]',
									'.interactive'
								]
							}}
							animate:flip={{ duration: 200 }}
							in:fade={{ duration: 150 }}
							out:fade={{ duration: 150 }}
							class="rounded-lg bg-base-100 p-4 shadow-sm border border-base-300
                     transition-all duration-200 hover:shadow-md hover:border-primary
                     svelte-dnd-touch-feedback"
							aria-label={`Class card: ${classItem.name}`}
						>
							<!-- Header -->
							<div
								class="mb-3 flex items-start justify-between gap-3 border-b border-base-200 pb-3"
							>
								<div class="flex-1 min-w-0">
									<button
										data-select-btn
										class="interactive flex items-center gap-2 text-left group"
										onclick={() => handleSelect(classItem._id)}
										title={classItem.name}
									>
										<h3
											class="font-semibold text-base-content text-lg truncate group-hover:text-primary"
										>
											{classItem.name}
										</h3>
										<span
											class="text-xs text-base-content/60 font-mono px-2 py-0.5 rounded bg-base-200"
											title={classItem.code}
										>
											{classItem.code}
										</span>
									</button>
								</div>

								<div class="flex items-center gap-2 shrink-0">
									<span class="text-xs badge rounded-full badge-soft font-mono" title="Semester">
										{classItem.semester?.name || 'No semester'}
									</span>
								</div>
							</div>

							<!-- Body: details + controls -->
							<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
								<!-- Details -->
								<div class="md:col-span-2 space-y-2">
									<p class="text-sm text-base-content/70">
										{classItem.description || 'No description available'}
									</p>
								</div>

								<!-- Controls -->
								<div
									class="md:border-l md:border-base-200 md:pl-4 flex flex-col items-end gap-2 justify-end md:justify-start"
								>
									<div class="flex gap-2 w-full md:w-auto">
										<button
											data-view-btn
											class="btn btn-sm rounded-full btn-ghost"
											type="button"
											aria-label="View class"
											onclick={() => viewClass(classItem._id)}
										>
											<Eye size={16} />
											<span class="hidden md:inline">View</span>
										</button>

										<button
											data-edit-btn
											class="btn btn-sm btn-outline rounded-full"
											type="button"
											aria-label="Edit class"
											onclick={() => editClass(classItem)}
										>
											<Pencil size={16} />
											<span class="hidden md:inline">Edit</span>
										</button>

										<button
											data-delete-btn
											class="btn btn-sm btn-error btn-outline rounded-full"
											type="button"
											aria-label="Delete class"
											onclick={() => handleDelete(classItem._id)}
										>
											<Trash2 size={16} />
											<span class="hidden md:inline">Delete</span>
										</button>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Edit Modal -->
<dialog class="modal max-w-full p-4" class:modal-open={isEditModalOpen}>
	<div class="modal-box w-11/12 max-w-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={closeEditModal}
			>
				<X size={16} />
			</button>
		</form>
		<h3 class="text-lg font-bold">Edit Class</h3>
		{#if editingClass}
			<div class="py-4">
				<p class="text-base-content/70">Edit functionality for: {editingClass.name}</p>
				<!-- Add your edit form here -->
			</div>
		{/if}
	</div>
</dialog>

<style>
	:global(.dragging) {
		@apply opacity-50 ring-2 ring-blue-400;
	}

	:global(.drag-over) {
		@apply bg-blue-50;
	}
</style>
