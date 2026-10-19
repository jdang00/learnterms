<script lang="ts">
	import SemesterSelect from '$lib/components/SemesterSelect.svelte';
	import type { PageData } from './$types';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { Id, Doc } from '../../convex/_generated/dataModel';
	import { api } from '../../convex/_generated/api.js';
	import { flip } from 'svelte/animate';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import ChartColumnIncreasing from '@lucide/svelte/icons/chart-column-increasing';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import Link2 from '@lucide/svelte/icons/link-2';
	import X from '@lucide/svelte/icons/x';
	import EditClassModal from '$lib/admin/catalog/EditClassModal.svelte';
	import AddClassModal from '$lib/admin/catalog/AddClassModal.svelte';
	import EditQuickLinksModal from '$lib/admin/catalog/EditQuickLinksModal.svelte';
	import DeleteConfirmationModal from '$lib/admin/DeleteConfirmationModal.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { LoadingState } from '$lib/components/ui/spinner';
	import { pickDefaultSemesterName, setLastSemesterName } from '$lib/utils/semester';
	import { useClerkContext } from 'svelte-clerk/client';
	import { resolve } from '$app/paths';

	let { data }: { data: PageData } = $props();
	const userData = $derived(data.userData);
	const clerk = useClerkContext();
	const clerkUser = $derived(clerk.user);

	const classes = useQuery(api.class.getUserClasses, () =>
		userData?.cohortId ? { id: userData.cohortId as Id<'cohort'> } : 'skip'
	);

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
	let isQuickLinksModalOpen = $state(false);
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

	const semesters = useQuery(api.semester.getAllSemesters, () => (clerkUser ? {} : 'skip'));
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
		Boolean(currentSemester);
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

	function openQuickLinksModal() {
		isQuickLinksModalOpen = true;
	}

	function closeQuickLinksModal() {
		isQuickLinksModalOpen = false;
	}
</script>

<div class="min-h-screen p-8 mb-24 max-w-7xl mx-auto">
	<div class=" flex flex-col gap-2">
		<div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
			<div>
				<h1 class="title-page">Admin Dashboard</h1>
				<p class="text-base text-foreground/70">
					{userData?.schoolName} - {userData?.cohortName}
				</p>
			</div>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8" role="list">
			<a
				href={resolve('/admin/library')}
				class="group surface p-5 shadow-xs transition hover:shadow-md hover:border-primary/70 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-primary/30 flex items-start gap-4"
				aria-label="Open Content Library"
			>
				<div class="rounded-xl border bg-primary-foreground border-border p-2">
					<NotebookPen size={20} class="text-primary" aria-hidden="true" />
				</div>
				<div class="flex-1 min-w-0">
					<h3 class="text-base font-semibold text-foreground group-hover:text-primary-ink">
						Content Library
					</h3>
					<p class="text-sm text-foreground/70 line-clamp-2">
						Store and access all your notes, slides, and files here
					</p>
				</div>
			</a>

			<a
				href={resolve('/admin/question-studio')}
				class="group surface p-5 shadow-xs transition hover:shadow-md hover:border-primary/70 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-primary/30 flex items-start gap-4"
				aria-label="Open Question Studio"
			>
				<div class="rounded-xl bg-primary-foreground border border-border p-2">
					<Sparkles size={20} class="text-primary" aria-hidden="true" />
				</div>
				<div class="flex-1 min-w-0">
					<h3 class="text-base font-semibold text-foreground group-hover:text-primary-ink">
						Question Studio
					</h3>
					<p class="text-sm text-foreground/70 line-clamp-2">
						Generate questions with AI and send them where they belong
					</p>
				</div>
			</a>

			<a
				href={resolve('/admin/progress')}
				class="group surface p-5 shadow-xs transition hover:shadow-md hover:border-primary/70 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-primary/30 flex items-start gap-4"
				aria-label="Open Class Progress"
			>
				<div class="rounded-xl bg-primary-foreground border border-border p-2">
					<ChartColumnIncreasing size={20} class="text-primary" aria-hidden="true" />
				</div>
				<div class="flex-1 min-w-0">
					<h3 class="text-base font-semibold text-foreground group-hover:text-primary-ink">
						Class Progress
					</h3>
					<p class="text-sm text-foreground/70 line-clamp-2">
						Track performance and monitor mastery over time
					</p>
				</div>
			</a>
		</div>

		<div class="flex flex-row justify-between items-start mt-12">
			<div>
				<h1 class="title-page flex items-center gap-2">
					My Classes
					{#if viewMode === 'reorder'}
						<Badge tone="info" size="sm">Reorder Mode</Badge>
					{/if}
				</h1>
				<p class="text-sm text-foreground/70">
					{#if viewMode === 'reorder'}
						Drag and drop classes to reorder them
					{:else}
						Click "Reorder" to enable drag-and-drop reordering
					{/if}
				</p>
			</div>
			<div class="flex flex-wrap items-center justify-end gap-2">
				{#if admin || dev}
					<Button
						variant="outline"
						tone="neutral"
						size="sm"
						class="gap-2"
						onclick={openQuickLinksModal}
					>
						<Link2 size={15} />
						<span>Quick Links</span>
					</Button>
					<Button class="gap-2" onclick={openAddModal}>
						<Plus size={16} />
						<span>Add New Class</span>
					</Button>
				{/if}
			</div>
		</div>

		{#if semesters.isLoading}
			<LoadingState inline label="Loading semesters…" class="mb-4" />
		{:else if semesters.error != null}
			<Alert.Root tone="error" class="mb-4">
				<Alert.Title>Failed to load: {semesters.error.toString()}</Alert.Title>
			</Alert.Root>
		{:else}
			<div class="flex items-center mt-4 mb-4 justify-between">
				<SemesterSelect semesters={semesters.data} bind:value={currentSemester} />

				{#if viewMode === 'reorder'}
					<Button
						variant="ghost"
						tone="neutral"
						shape="circle"
						onclick={() => (viewMode = 'normal')}
					>
						<X size={16} />
					</Button>
				{:else}
					<Button
						variant="outline"
						tone="neutral"
						size="sm"
						class="gap-2"
						onclick={() => (viewMode = 'reorder')}
					>
						<GripVertical size={16} />
						<span>Reorder</span>
					</Button>
				{/if}
			</div>
		{/if}
	</div>

	{#if classes.isLoading}
		<LoadingState label="Loading classes…" />
	{:else if classes.error != null}
		<div class="flex items-center justify-center p-8">
			<div class="text-error-ink">Failed to load: {classes.error.toString()}</div>
		</div>
	{:else if !filteredClassList || filteredClassList.length === 0}
		<div class="flex items-center justify-center p-8">
			<div class="text-center">
				<div class="text-4xl mb-4">📚</div>
				<h3 class="text-lg font-semibold mb-2 text-foreground">No classes found</h3>
				<p class="text-foreground/70">No classes available for the selected semester.</p>
			</div>
		</div>
	{:else}
		<!-- Normal View -->
		{#if viewMode === 'normal'}
			<div class="mx-auto max-w-8xl justify-center">
				<div class="rounded-xl bg-muted p-4 shadow-md border border-border">
					<div class="space-y-3">
						{#each filteredClassList as classItem (classItem._id)}
							<div
								class="rounded-2xl bg-background p-4 shadow-xs border border-border
								transition-all duration-200 hover:shadow-md hover:border-primary"
								aria-label={`Class card: ${classItem.name}`}
							>
								<div
									class="mb-3 flex flex-col gap-2 border-b border-muted pb-3 sm:flex-row sm:items-start sm:justify-between"
								>
									<div class="flex-1 min-w-0">
										<a
											data-select-btn
											class="interactive group flex w-full items-start gap-2 text-left focus:outline-hidden focus-visible:ring-3 focus-visible:ring-primary/40 sm:items-center"
											href={resolve('/admin/[classId]', { classId: classItem._id })}
											title={classItem.name}
											style="min-height:44px"
										>
											<div class="min-w-0 flex-1">
												<h3
													class="truncate text-lg font-semibold text-foreground group-hover:text-primary-ink"
												>
													{classItem.name}
												</h3>

												<div class="mt-1 flex flex-wrap items-center gap-2 sm:mt-0">
													<Badge
														tone="secondary"
														size="sm"
														class="font-mono"
														title={classItem.code}
													>
														{classItem.code}
													</Badge>
													<Badge size="sm" class="font-mono" title="Semester">
														{classItem.semester?.name || 'No semester'}
													</Badge>
												</div>
											</div>
										</a>
									</div>

									{#if admin || dev}
										<div class="flex items-center gap-2 sm:shrink-0">
											<DropdownMenu.Root>
												<DropdownMenu.Trigger>
													{#snippet child({ props })}
														<Button
															{...props}
															variant="ghost"
															tone="neutral"
															size="sm"
															shape="circle"
															class="interactive"
															aria-label="Open menu"
														>
															⋮
														</Button>
													{/snippet}
												</DropdownMenu.Trigger>
												<DropdownMenu.Content align="end" class="w-52">
													<DropdownMenu.Item
														data-edit-btn=""
														aria-label="Edit class"
														onSelect={() => editClass(classItem)}
													>
														<Pencil size={16} />
														<span>Edit</span>
													</DropdownMenu.Item>
													<DropdownMenu.Item
														variant="destructive"
														data-delete-btn=""
														aria-label="Delete class"
														onSelect={() => handleDelete(classItem._id)}
													>
														<Trash2 size={16} />
														<span>Delete</span>
													</DropdownMenu.Item>
												</DropdownMenu.Content>
											</DropdownMenu.Root>
										</div>
									{/if}
								</div>

								<!-- Body: details -->
								<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
									<!-- Details -->
									<div class="md:col-span-2 space-y-2">
										<p class="text-sm text-foreground/70">
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
			<div class="bg-muted rounded-xl p-3 sm:p-6 border border-border">
				<div class="space-y-3 sm:space-y-4">
					{#each filteredClassList as classItem, index (classItem._id)}
						<div
							use:droppable={{
								container: index.toString(),
								callbacks: { onDrop: handleDrop }
							}}
							use:draggable={{
								container: index.toString(),
								dragData: classItem,
								interactive: ['[data-delete-btn]', '[data-edit-btn]', '.interactive']
							}}
							class="flex items-center gap-3 p-3 sm:gap-4 sm:p-4 surface shadow-xs hover:shadow-md transition-all duration-200 svelte-dnd-touch-feedback touch-manipulation"
							animate:flip={{ duration: 300 }}
						>
							<!-- Drag Handle -->
							<div
								class="flex-none flex items-center justify-center w-10 h-10 rounded-xl bg-muted hover:bg-muted-strong transition-colors cursor-move active:cursor-grabbing"
							>
								<GripVertical size={20} class="text-foreground/70" />
							</div>

							<!-- Class Info -->
							<div class="flex-1 min-w-0">
								<div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
									<h3 class="font-semibold text-base sm:text-lg text-foreground truncate">
										{classItem.name}
									</h3>
									<div class="flex items-center gap-2">
										<Badge tone="secondary" size="sm" class="font-mono">
											{classItem.code}
										</Badge>
										<Badge size="sm" class="font-mono truncate max-w-[100px] sm:max-w-none">
											{classItem.semester?.name || 'No semester'}
										</Badge>
									</div>
								</div>
								<p class="text-xs sm:text-sm text-foreground/70 mt-1 line-clamp-1 sm:line-clamp-2">
									{classItem.description || 'No description available'}
								</p>
							</div>

							<!-- Order Indicator -->
							<div
								class="flex-none flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary-ink font-bold text-xs sm:text-sm"
							>
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
<EditQuickLinksModal
	isOpen={isQuickLinksModalOpen}
	close={closeQuickLinksModal}
	cohortId={userData?.cohortId}
/>

<DeleteConfirmationModal
	{isDeleteModalOpen}
	onCancel={cancelDelete}
	onConfirm={confirmDelete}
	itemName={classToDelete?.name}
	itemType="class"
	moduleCount={classContentCounts.moduleCount}
	questionCount={classContentCounts.questionCount}
/>
