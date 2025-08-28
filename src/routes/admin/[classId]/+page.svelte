<script lang="ts">
	import type { PageData } from './$types';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { Id, Doc } from '../../../convex/_generated/dataModel';
	import { api } from '../../../convex/_generated/api.js';
	import { flip } from 'svelte/animate';
	import { Pencil, Trash2, Plus, ArrowLeft } from 'lucide-svelte';
	import EditModuleModal from '$lib/admin/EditModuleModal.svelte';
	import AddModuleModal from '$lib/admin/AddModuleModal.svelte';
	import DeleteConfirmationModal from '$lib/admin/DeleteConfirmationModal.svelte';
	import { useClerkContext } from 'svelte-clerk';

	let { data }: { data: PageData } = $props();
	const classId = data.classId;

	const modules = useQuery(
		api.module.getAdminModulesWithQuestionCounts,
		{ classId: classId as Id<'class'> }
	);

	const classInfo = useQuery(api.class.getClassById, { id: classId as Id<'class'> });

	const client = useConvexClient();

	const clerk = useClerkContext();
	const clerkUser = $derived(clerk.user);
	const admin = $derived(clerk.user?.publicMetadata.role === 'admin');
	let userDataQuery = $state<{ isLoading: boolean; error: any; data?: Doc<'users'> | null }>({
		isLoading: true,
		error: null,
		data: undefined
	});
	let userData: Doc<'users'> | null = $state(null);
	$effect(() => {
		if (clerkUser) {
			userDataQuery = useQuery(api.users.getUserById, { id: clerkUser.id });
		} else {
			userDataQuery = { isLoading: true, error: null, data: undefined };
		}
	});
	$effect(() => {
		if (userDataQuery.data !== undefined) {
			userData = (userDataQuery.data as Doc<'users'> | null) ?? null;
		}
	});

	type ClassItem = Doc<'class'>;
	let classList = $state<ClassItem[]>([]);

	let isDeleteModalOpen = $state(false);
	let classToDelete = $state<ClassItem | null>(null);

	// Module state
	let isEditModuleModalOpen = $state(false);
	let editingModule = $state<ModuleItem | null>(null);
	let isAddModuleModalOpen = $state(false);
	let isDeleteModuleModalOpen = $state(false);
	let moduleToDelete = $state<ModuleItem | null>(null);
	let moduleQuestionCount = $state<number>(0);

	async function confirmDelete() {
		if (!classToDelete) return;
		if (!userData || !userData.cohortId) return;

		const prev = [...classList];
		classList = classList.filter((c) => c._id !== classToDelete!._id);

		try {
			await client.mutation(api.class.deleteClass, {
				classId: classToDelete!._id as Id<'class'>,
				cohortId: userData.cohortId as Id<'cohort'>
			});
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

	type ModuleItem = Doc<'module'> & { questionCount: number };
	let moduleList = $state<ModuleItem[]>([]);

	$effect(() => {
		if (modules.data) {
			moduleList = [...modules.data];
		}
	});

	async function handleDrop(state: DragDropState<ModuleItem>) {
		const { draggedItem, sourceContainer, targetContainer } = state;
		if (!targetContainer || sourceContainer === targetContainer) return;

		const sourceIndex = moduleList.findIndex((i) => i._id === draggedItem._id);
		const targetIndex = parseInt(targetContainer);

		if (sourceIndex === -1 || Number.isNaN(targetIndex)) return;

		const updatedList = [...moduleList];
		const [moved] = updatedList.splice(sourceIndex, 1);
		updatedList.splice(targetIndex, 0, moved);
		moduleList = updatedList;

		try {
			await client.mutation(api.module.updateModuleOrder, {
				moduleId: moved._id,
				newOrder: targetIndex,
				classId: classId as Id<'class'>
			});
		} catch (error) {
			console.error('Failed to update module order:', error);
			moduleList = [...(modules.data || [])];
		}
	}

	// Module operations
	async function handleModuleDelete(id: string) {
		const foundModule = moduleList.find((m) => m._id === id);
		if (!foundModule) return;

		moduleToDelete = foundModule;

		try {
			const count = await client.query(api.module.getModuleQuestionCount, {
				moduleId: id as Id<'module'>
			});
			moduleQuestionCount = count;
		} catch (error) {
			console.error('Failed to get question count:', error);
			moduleQuestionCount = 0;
		}

		isDeleteModuleModalOpen = true;
	}

	async function confirmModuleDelete() {
		if (!moduleToDelete) return;

		const prev = [...moduleList];
		moduleList = moduleList.filter((m) => m._id !== moduleToDelete!._id);

		try {
			await client.mutation(api.module.deleteModule, {
				moduleId: moduleToDelete!._id as Id<'module'>,
				classId: classId as Id<'class'>
			});
			console.log('Module deleted successfully');
		} catch (error) {
			console.error('Failed to delete module:', error);
			moduleList = prev;
		} finally {
			isDeleteModuleModalOpen = false;
			moduleToDelete = null;
			moduleQuestionCount = 0;
		}
	}

	function cancelModuleDelete() {
		isDeleteModuleModalOpen = false;
		moduleToDelete = null;
		moduleQuestionCount = 0;
	}

	function editModule(moduleItem: ModuleItem) {
		editingModule = moduleItem;
		isEditModuleModalOpen = true;
	}

	function closeEditModuleModal() {
		isEditModuleModalOpen = false;
		editingModule = null;
	}

	function openAddModuleModal() {
		isAddModuleModalOpen = true;
	}

	function closeAddModuleModal() {
		isAddModuleModalOpen = false;
	}
</script>

<div class="min-h-screen p-8 max-w-7xl mx-auto">
	<a class="btn mb-4 btn-ghost" href="/admin"><ArrowLeft size={16} />Back</a>
	<div class="mb-8 flex flex-col gap-2">
		<div class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
			{#if classInfo.isLoading}
				<div class="flex items-center justify-center p-8">
					<div class="text-base-content/70">Loading class...</div>
				</div>
			{:else if classInfo.error != null}
				<div class="flex items-center justify-center p-8">
					<div class="text-error">Failed to load: {classInfo.error.toString()}</div>
				</div>
			{:else if classInfo.data == null}
				<div class="flex items-center justify-center p-8">
					<div class="text-center">
						<div class="text-4xl mb-4">📚</div>
						<h3 class="text-lg font-semibold mb-2 text-base-content">
							Class information not found.
						</h3>
					</div>
				</div>
			{:else}
				<div>
					<h1 class="text-xl sm:text-2xl font-bold text-base-content">{classInfo.data.name}</h1>
					<p class="text-sm sm:text-base text-base-content/70">
						Manage your learning modules for {classInfo.data.code}. {#if admin}Drag and drop to reorder them.{/if}
					</p>
				</div>
			{/if}

			<div class="flex gap-2 self-start sm:self-auto">
				{#if admin}
					<button class="btn btn-primary gap-2" onclick={openAddModuleModal}>
						<Plus size={16} />
						<span>Add New Module</span>
					</button>
				{/if}
			</div>
		</div>
	</div>

	{#if modules.isLoading}
		<div class="flex items-center justify-center p-8">
			<div class="text-base-content/70">Loading modules...</div>
		</div>
	{:else if modules.error != null}
		<div class="flex items-center justify-center p-8">
			<div class="text-error">Failed to load: {modules.error.toString()}</div>
		</div>
	{:else if modules.data.length === 0}
		<div class="flex items-center justify-center p-8">
			<div class="text-center">
				<div class="text-4xl mb-4">📚</div>
				<h3 class="text-lg font-semibold mb-2 text-base-content">No modules found</h3>
				<p class="text-base-content/70">No modules available for the selected class.</p>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each moduleList as moduleItem, index (moduleItem._id)}
				<div
					use:droppable={{
						container: index.toString(),
						callbacks: { onDrop: handleDrop }
					}}
					class="relative rounded-lg bg-base-100 shadow-sm border border-base-300 p-4
                           transition-all duration-300 hover:shadow-md hover:border-primary/30
                           svelte-dnd-touch-feedback"
					animate:flip={{ duration: 300 }}
				>
					<div
						use:draggable={{
							container: index.toString(),
							dragData: moduleItem,
							interactive: [
								'[data-delete-btn]',
								'[data-view-btn]',
								'[data-edit-btn]',
								'.interactive',
								'a'
							]
						}}
						class="cursor-move"
					>
						<div class="flex flex-col h-full">
							<div class="flex flex-row justify-between mb-4">
								<div class="flex flex-col gap-1">
									<a
										href={`/admin/${classId}/module/${moduleItem._id}`}
										class="font-semibold text-base-content text-left truncate hover:text-primary transition-colors cursor-pointer"
										title={`Go to questions for ${moduleItem.title}`}
										>
										<span class="mr-2 text-xl">{moduleItem.emoji || '📘'}</span>{moduleItem.title}
										</a>
										<div class="text-xs text-base-content/60 flex items-center gap-1">
											<span>
												{moduleItem.questionCount} question{moduleItem.questionCount === 1 ? '' : 's'}
											</span>
										</div>
								</div>
								<div class="flex items-center gap-2">
									{#if admin}
									<div class="dropdown dropdown-end">
										<button class="btn btn-ghost btn-circle btn-sm">⋮</button>
										<ul
											tabindex="-1"
											class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
										>
											<li>
												<button
													data-edit-btn
													class="btn btn-sm btn-ghost w-full justify-start"
													type="button"
													aria-label="Edit module"
													onclick={() => editModule(moduleItem)}
												>
													<Pencil size={16} />
													<span>Edit</span>
												</button>
											</li>
											<li>
												<button
													data-delete-btn
													class="btn btn-sm btn-ghost text-error w-full justify-start"
													type="button"
													aria-label="Delete module"
													onclick={() => handleModuleDelete(moduleItem._id)}
												>
													<Trash2 size={16} />
													<span>Delete</span>
												</button>
											</li>
										</ul>
									</div>
									{/if}
								</div>
							</div>
							<p class="text-sm text-base-content/70 mb-4 text-left line-clamp-4">
								{moduleItem.description || 'No description available'}
							</p>
							<div class="mt-auto flex justify-end">
								<div class="text-xs text-base-content/60 font-mono badge rounded-full">
									{index + 1}
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<EditModuleModal
	isEditModalOpen={isEditModuleModalOpen}
	closeEditModal={closeEditModuleModal}
	{editingModule}
	{classId}
/>
<AddModuleModal
	isAddModalOpen={isAddModuleModalOpen}
	closeAddModal={closeAddModuleModal}
	{classId}
/>

<DeleteConfirmationModal
	{isDeleteModalOpen}
	onCancel={cancelDelete}
	onConfirm={confirmDelete}
	itemName={classToDelete?.name}
	itemType="class"
/>

<DeleteConfirmationModal
	isDeleteModalOpen={isDeleteModuleModalOpen}
	onCancel={cancelModuleDelete}
	onConfirm={confirmModuleDelete}
	itemName={moduleToDelete?.title}
	itemType="module"
	questionCount={moduleQuestionCount}
/>
