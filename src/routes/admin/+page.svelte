<script lang="ts">
	import type { PageData } from './$types';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { Id, Doc } from '../../convex/_generated/dataModel';
	import { api } from '../../convex/_generated/api.js';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import {
		Pencil,
		Trash2,
		Plus,
		CalendarDays,
		NotebookPen,
		Sparkles,
		ChartColumnIncreasing,
		ChevronDownIcon,
		GripVertical,
		X
	} from 'lucide-svelte';
	import EditClassModal from '$lib/admin/EditClassModal.svelte';
	import AddClassModal from '$lib/admin/AddClassModal.svelte';
	import DeleteConfirmationModal from '$lib/admin/DeleteConfirmationModal.svelte';
	import { pickDefaultSemesterName, setLastSemesterName } from '$lib/utils/semester';

	let { data }: { data: PageData } = $props();
	const userData = data.userData;

	const classes = userData?.cohortId
		? useQuery(api.class.getUserClasses, {
				id: userData.cohortId as Id<'cohort'>
			})
		: { data: undefined, isLoading: false, error: null };

	const client = useConvexClient();

	const dev = $derived(userData?.role === 'dev');
	const admin = $derived(userData?.role === 'admin');

	type ClassItem = Doc<'class'> & {
		semester?: {
			_id: string;
			name: string;
		} | null;
	};
	let classList = $state<ClassItem[]>([]);

	let isEditModalOpen = $state(false);
	let editingClass = $state<ClassItem | null>(null);
	let isAddModalOpen = $state(false);
	let isDeleteModalOpen = $state(false);
	let classToDelete = $state<ClassItem | null>(null);
	let classContentCounts = $state<{ moduleCount: number; questionCount: number }>({
		moduleCount: 0,
		questionCount: 0
	});

	$effect(() => {
		if (classes.data) {
			classList = [...classes.data];
		}
	});

	async function handleDelete(id: string) {
		const foundClass = classList.find((c) => c._id === id);
		if (!foundClass) return;

		classToDelete = foundClass;

		try {
			const counts = await client.query(api.class.getClassContentCounts, {
				classId: id as Id<'class'>
			});
			classContentCounts = counts;
		} catch (error) {
			console.error('Failed to get class content counts:', error);
			classContentCounts = { moduleCount: 0, questionCount: 0 };
		}

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
		} catch (error) {
			console.error('Failed to delete class:', error);
			classList = prev;
		} finally {
			isDeleteModalOpen = false;
			classToDelete = null;
			classContentCounts = { moduleCount: 0, questionCount: 0 };
		}
	}

	function cancelDelete() {
		isDeleteModalOpen = false;
		classToDelete = null;
		classContentCounts = { moduleCount: 0, questionCount: 0 };
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
	let viewMode = $state<'normal' | 'reorder'>('normal');

	$effect(() => {
		if (semesters.data && !currentSemester) {
			currentSemester = pickDefaultSemesterName(semesters.data);
		}
	});

	$effect(() => {
		if (currentSemester) setLastSemesterName(currentSemester);
	});

	const filteredClassList = $derived(
		!classList || !currentSemester
			? classList
			: classList.filter((c) => c.semester?.name === currentSemester)
	);

	// Exit reorder view when semester changes
	$effect(() => {
		currentSemester; // Track semester changes
		viewMode = 'normal';
	});

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

<div class="min-h-screen p-8 mb-24 max-w-7xl mx-auto">
	<div class=" flex flex-col gap-2">
		<div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
			<div>
				<h1 class="text-3xl sm:text-4xl font-bold text-base-content">Admin Dashboard</h1>
				<p class="text-base text-base-content/70">{userData?.schoolName} - {userData?.cohortName}</p>
			</div>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8" role="list">
			<a
				href="/admin/library"
				class="group rounded-lg bg-base-100 p-5 shadow-sm border border-base-300 transition hover:shadow-md hover:border-primary/70 focus:outline-none focus-visible:ring focus-visible:ring-primary/30 flex items-start gap-4"
				aria-label="Open Content Library"
			>
				<div class="rounded-md border bg-primary-content border-base-300 p-2">
					<NotebookPen size={20} class="text-primary" aria-hidden="true" />
				</div>
				<div class="flex-1 min-w-0">
					<h3 class="text-base font-semibold text-base-content group-hover:text-primary">
						Content Library
					</h3>
					<p class="text-sm text-base-content/70 line-clamp-2">
						Store and access all your notes, slides, and files here
					</p>
				</div>
			</a>

			<a
				href="/admin/question-studio"
				class="group rounded-lg bg-base-100 p-5 shadow-sm border border-base-300 transition hover:shadow-md hover:border-primary/70 focus:outline-none focus-visible:ring focus-visible:ring-primary/30 flex items-start gap-4"
				aria-label="Open Question Studio"
			>
				<div class="rounded-md bg-primary-content border border-base-300 p-2">
					<Sparkles size={20} class="text-primary" aria-hidden="true" />
				</div>
				<div class="flex-1 min-w-0">
					<h3 class="text-base font-semibold text-base-content group-hover:text-primary">
						Question Studio
					</h3>
					<p class="text-sm text-base-content/70 line-clamp-2">
						Generate questions with AI and send them where they belong
					</p>
				</div>
			</a>

			<a
				href="/admin/progress"
				class="group rounded-lg bg-base-100 p-5 shadow-sm border border-base-300 transition hover:shadow-md hover:border-primary/70 focus:outline-none focus-visible:ring focus-visible:ring-primary/30 flex items-start gap-4"
				aria-label="Open Class Progress"
			>
				<div class="rounded-md bg-primary-content border border-base-300 p-2">
					<ChartColumnIncreasing size={20} class="text-primary" aria-hidden="true" />
				</div>
				<div class="flex-1 min-w-0">
					<h3 class="text-base font-semibold text-base-content group-hover:text-primary">
						Class Progress
					</h3>
					<p class="text-sm text-base-content/70 line-clamp-2">
						Track performance and monitor mastery over time
					</p>
				</div>
			</a>
		</div>

		<div class="flex flex-row justify-between items-start mt-12">
			<div>
				<h1 class="font-semibold text-2xl flex items-center gap-2">
					My Classes
					{#if viewMode === 'reorder'}
						<span class="badge badge-info badge-sm">Reorder Mode</span>
					{/if}
				</h1>
				<p class="text-sm text-base-content/70">
					{#if viewMode === 'reorder'}
						Drag and drop classes to reorder them
					{:else}
						Click "Reorder" to enable drag-and-drop reordering
					{/if}
				</p>
			</div>
			{#if admin || dev}
				<button class="btn btn-primary gap-2" onclick={openAddModal}>
					<Plus size={16} />
					<span>Add New Class</span>
				</button>
			{/if}
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
			<div class="flex items-center mt-4 mb-4 justify-between">
				<div>
					<details class="dropdown">
						<summary class="btn btn-outline btn-sm">
							{currentSemester}
							<ChevronDownIcon size={16} />
						</summary>
						<ul class="menu dropdown-content w-48 rounded-lg bg-base-100 shadow-sm border border-base-300">
							{#each semesters.data as semester (semester._id)}
								<li>
									<button
										onclick={() => (currentSemester = semester.name)}
										class="flex items-center gap-2 hover:bg-base-200 transition-colors duration-150"
									>
										<CalendarDays size={16} />
										<span>{semester.name}</span>
									</button>
								</li>
							{/each}
						</ul>
					</details>
				</div>

				{#if viewMode === 'reorder'}
					<button class="btn btn-ghost gap-2 btn-circle" onclick={() => viewMode = 'normal'}>
						<span><X size={16} /></span>
					</button>
				{:else}
					<button class="btn btn-outline gap-2 btn-sm" onclick={() => viewMode = 'reorder'}>
						<GripVertical size={16} />
						<span>Reorder</span>
					</button>
				{/if}
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
		<!-- Normal View -->
		{#if viewMode === 'normal'}
			<div class="mx-auto max-w-8xl justify-center">
				<div class="rounded-xl bg-base-200 p-4 shadow-md border border-base-300">
					<div class="space-y-3">
						{#each filteredClassList as classItem (classItem._id)}
							<div
								class="rounded-lg bg-base-100 p-4 shadow-sm border border-base-300
								transition-all duration-200 hover:shadow-md hover:border-primary"
								aria-label={`Class card: ${classItem.name}`}
							>
								<div
									class="mb-3 flex flex-col gap-2 border-b border-base-200 pb-3 sm:flex-row sm:items-start sm:justify-between"
								>
									<div class="flex-1 min-w-0">
										<a
											data-select-btn
											class="interactive group flex w-full items-start gap-2 text-left focus:outline-none focus-visible:ring focus-visible:ring-primary/40 sm:items-center"
											href="admin/{classItem._id}"
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
														class=" badge-secondary rounded-full font-mono badge badge-soft badge-sm"
														title={classItem.code}
													>
														{classItem.code}
													</span>
													<span
														class="badge rounded-full badge-soft font-mono badge-sm"
														title="Semester"
													>
														{classItem.semester?.name || 'No semester'}
													</span>
												</div>
											</div>
										</a>
									</div>

									{#if admin || dev}
									<div class="flex items-center gap-2 sm:shrink-0">
								<div class="dropdown dropdown-end">
									<button class="btn btn-ghost btn-circle btn-sm interactive" tabindex="0" aria-haspopup="menu" aria-label="Open menu">⋮</button>
									<ul
										tabindex="0"
										role="menu"
										class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
									>
												<li>
													<button
														data-edit-btn
														class="btn btn-sm btn-ghost w-full justify-start font-medium"
														type="button"
														aria-label="Edit class"
														onclick={() => editClass(classItem)}
													>
														<Pencil size={16} />
														<span>Edit</span>
													</button>
												</li>
												<li>
													<button
														data-delete-btn
														class="btn btn-sm btn-ghost text-error w-full justify-start font-medium"
														type="button"
														aria-label="Delete class"
														onclick={() => handleDelete(classItem._id)}
													>
														<Trash2 size={16} />
														<span>Delete</span>
													</button>
												</li>
											</ul>
										</div>
									</div>
									{/if}
								</div>

								<!-- Body: details -->
								<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
									<!-- Details -->
									<div class="md:col-span-2 space-y-2">
										<p class="text-sm text-base-content/70">
											{classItem.description || 'No description available'}
										</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Reorder View -->
		{#if viewMode === 'reorder'}
			<div class="bg-base-200 rounded-xl p-6 border border-base-300">
				<div class="space-y-4">
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
									'[data-edit-btn]',
									'.interactive'
								]
							}}
							class="flex items-center gap-4 p-4 bg-base-100 rounded-lg border border-base-300 shadow-sm hover:shadow-md transition-all duration-200 svelte-dnd-touch-feedback"
							animate:flip={{ duration: 300 }}
						>
							<!-- Drag Handle -->
							<div class="flex items-center justify-center w-10 h-10 rounded-md bg-base-200 hover:bg-base-300 transition-colors cursor-move">
								<GripVertical size={18} class="text-base-content/70" />
							</div>

							<!-- Class Info -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-3">
									<h3 class="font-semibold text-lg text-base-content truncate">
										{classItem.name}
									</h3>
									<span class="badge badge-secondary badge-sm font-mono">
										{classItem.code}
									</span>
									<span class="badge badge-soft badge-sm font-mono">
										{classItem.semester?.name || 'No semester'}
									</span>
								</div>
								<p class="text-sm text-base-content/70 mt-1 line-clamp-2">
									{classItem.description || 'No description available'}
								</p>
							</div>

							<!-- Order Indicator -->
							<div class="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
								{index + 1}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<EditClassModal {isEditModalOpen} {closeEditModal} {editingClass} {semesters} {userData} />
<AddClassModal {isAddModalOpen} {closeAddModal} {semesters} {userData} {currentSemester} />

<DeleteConfirmationModal
	{isDeleteModalOpen}
	onCancel={cancelDelete}
	onConfirm={confirmDelete}
	itemName={classToDelete?.name}
	itemType="class"
	moduleCount={classContentCounts.moduleCount}
	questionCount={classContentCounts.questionCount}
/>
