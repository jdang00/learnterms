<script lang="ts">
	import type { PageData } from './$types';
	import { useClerkContext } from 'svelte-clerk';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { Id, Doc } from '../../convex/_generated/dataModel';
	import { api } from '../../convex/_generated/api.js';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import { Eye, Pencil, Trash2, Plus, CalendarDays } from 'lucide-svelte';
	import EditClassModal from '$lib/admin//EditClassModal.svelte';
	import AddClassModal from '$lib/admin/AddClassModal.svelte';

	const ctx = useClerkContext();

	let { data }: { data: PageData } = $props();
	const userData = data.userData;

	const classes = useQuery(api.class.getUserClasses, {
		id: (userData?.cohortId as Id<'cohort'>) || ''
	});

	const client = useConvexClient();

	type ClassItem = NonNullable<Doc<'class'>[]>[0];
	let classList = $state<ClassItem[]>([]);

	let isEditModalOpen = $state(false);
	let editingClass = $state<ClassItem | null>(null);
	let isAddModalOpen = $state(false);
	let isDeleteModalOpen = $state(false);
	let classToDelete = $state<ClassItem | null>(null);

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

	function handleDelete(id: string) {
		const foundClass = classList.find((c) => c._id === id);
		if (!foundClass) return;

		classToDelete = foundClass;
		isDeleteModalOpen = true;
	}

	async function confirmDelete() {
		if (!classToDelete) return;

		const prev = [...classList];
		classList = classList.filter((c) => c._id !== classToDelete!._id);

		try {
			await client.mutation(api.class.deleteClass, {
				classId: classToDelete!._id as Id<'class'>,
				cohortId: userData?.cohortId as Id<'cohort'>
			});
			console.log('Class deleted successfully');
		} catch (error) {
			console.error('Failed to delete class:', error);
			classList = prev;
		} finally {
			isDeleteModalOpen = false;
			classToDelete = null;
		}
	}

	function cancelDelete() {
		isDeleteModalOpen = false;
		classToDelete = null;
	}

	async function handleDrop(state: DragDropState<ClassItem>) {
		const { draggedItem, sourceContainer, targetContainer } = state;
		if (!targetContainer || sourceContainer === targetContainer) return;

		const sourceIndex = filteredClassList.findIndex((i) => i._id === draggedItem._id);
		const targetIndex = parseInt(targetContainer);

		if (sourceIndex === -1 || Number.isNaN(targetIndex)) return;

		// Work with the filtered list (semester-specific)
		const filteredList = [...filteredClassList];
		const [moved] = filteredList.splice(sourceIndex, 1);
		filteredList.splice(targetIndex, 0, moved);

		// Update the main classList to reflect the change
		const updatedClassList = classList.map((c) => {
			const updatedItem = filteredList.find((f) => f._id === c._id);
			return updatedItem || c;
		});
		classList = updatedClassList;

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

	function editClass(classItem: ClassItem) {
		editingClass = classItem;
		isEditModalOpen = true;
	}

	function closeEditModal() {
		isEditModalOpen = false;
		editingClass = null;
	}

	function openAddModal() {
		isAddModalOpen = true;
	}

	function closeAddModal() {
		isAddModalOpen = false;
	}
</script>

<div class="min-h-screen p-8">
	<div class="mb-8 flex flex-col gap-2">
		<div class="flex flex-row justify-between items-center">
			<div>
				<h1 class="text-2xl font-bold text-base-content">Admin Dashboard</h1>
				<p class="text-base-content/70">
					Manage your learning classes. Drag and drop to reorder them.
				</p>
			</div>

			<button class="btn btn-primary gap-2" onclick={openAddModal}>
				<Plus size={16} />
				<span>Add New Class</span>
			</button>
		</div>

		{#if semesters.isLoading}
			<div class="mb-4 flex items-center gap-3 text-base-content/70">
				<span class="loading loading-spinner loading-md"></span>
				<span>Loading semesters…</span>
			</div>
		{:else if semesters.error != null}
			<div class="mb-4 alert alert-error">
				<span>Failed to load: {semesters.error.toString()}</span>
			</div>
		{:else}
			<div class="flex items-center gap-2 mt-8">
				<button class="btn" popovertarget="popover-1" style="anchor-name: --anchor-1">
					{currentSemester}
				</button>
				<ul
					class="dropdown menu w-48 rounded-lg bg-base-100 shadow-sm border border-base-300"
					popover
					id="popover-1"
					style="position-anchor: --anchor-1"
				>
					{#each semesters.data as semester (semester._id)}
						<li>
							<button
								onclick={() => (currentSemester = semester.name)}
								class="flex items-center gap-2 hover:bg-base-200 transition-colors duration-150"
							>
								<CalendarDays size={16} class="text-primary/70" />
								<span>{semester.name}</span>
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
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
							<div
								class="mb-3 flex flex-col gap-2 border-b border-base-200 pb-3 sm:flex-row sm:items-start sm:justify-between"
							>
								<div class="flex-1 min-w-0">
									<button
										data-select-btn
										class="interactive group flex w-full items-start gap-2 text-left focus:outline-none focus-visible:ring focus-visible:ring-primary/40 sm:items-center"
										onclick={() => handleSelect(classItem._id)}
										title={classItem.name}
										style="min-height:44px"
									>
										<div class="min-w-0 flex-1">
											<h3
												class="truncate text-lg font-semibold text-base-content group-hover:text-primary"
											>
												{classItem.name}
											</h3>

											<div class="mt-1 flex flex-wrap items-center gap-2 sm:mt-0">
												<span
													class="text-xs text-base-content/60 font-mono px-2 py-0.5 rounded bg-base-200"
													title={classItem.code}
												>
													{classItem.code}
												</span>
											</div>
										</div>
									</button>
								</div>

								<div class="flex items-center gap-2 sm:shrink-0">
									<span
										class="badge badge-xs rounded-full badge-soft font-mono text-xs"
										title="Semester"
									>
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
										<a
											data-view-btn
											class="btn btn-sm rounded-full btn-ghost"
											type="button"
											aria-label="View class"
											href="admin/{classItem._id}"
											target="_blank"
										>
											<Eye size={16} />
											<span class="hidden md:inline">View</span>
										</a>

										<button
											data-edit-btn
											class="btn btn-sm btn-info btn-soft rounded-full"
											type="button"
											aria-label="Edit class"
											onclick={() => editClass(classItem)}
										>
											<Pencil size={16} />
											<span class="hidden md:inline">Edit</span>
										</button>

										<button
											data-delete-btn
											class="btn btn-sm btn-error btn-soft rounded-full"
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

<EditClassModal {isEditModalOpen} {closeEditModal} {editingClass} {semesters} {userData} />
<AddClassModal {isAddModalOpen} {closeAddModal} {semesters} {userData} {currentSemester} />

<dialog class="modal max-w-full p-4" class:modal-open={isDeleteModalOpen}>
	<div class="modal-box">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onclick={cancelDelete}>
				✕
			</button>
		</form>
		<h3 class="text-lg font-bold">Delete Class</h3>
		<p class="py-4">
			Are you sure you want to delete <strong>{classToDelete?.name}</strong>? This action cannot be
			undone.
		</p>
		<div class="flex justify-end space-x-2">
			<button class="btn btn-outline" onclick={cancelDelete}> Cancel </button>
			<button class="btn btn-error" onclick={confirmDelete}>Delete</button>
		</div>
	</div>
</dialog>
