<script lang="ts">
	import type { PageData } from './$types';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { Id, Doc } from '../../../convex/_generated/dataModel';
	import { api } from '../../../convex/_generated/api.js';
	import { flip } from 'svelte/animate';
	import { Pencil, Trash2, Plus, ArrowLeft, GripVertical, Download, FileText, FileJson, FileSpreadsheet } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import { exportModuleQuestions, type ExportableQuestion } from '$lib/utils/questionExport';
	import EditModuleModal from '$lib/admin/EditModuleModal.svelte';
	import AddModuleModal from '$lib/admin/AddModuleModal.svelte';
	import DeleteConfirmationModal from '$lib/admin/DeleteConfirmationModal.svelte';
	import ExportModuleModal from '$lib/admin/ExportModuleModal.svelte';
	import TagManager from '$lib/admin/TagManager.svelte';
	import { useClerkContext } from 'svelte-clerk';

	let { data }: { data: PageData } = $props();
	const classId = data.classId;

	const modules = useQuery(api.module.getAdminModulesWithQuestionCounts, () => ({
		classId: classId as Id<'class'>
	}));

	const classInfo = useQuery(api.class.getClassById, () => ({ id: classId as Id<'class'> }));

	const client = useConvexClient();

	const clerk = useClerkContext();
	const clerkUser = $derived(clerk.user);

	const userDataQuery = useQuery(
		api.users.getUserById,
		() => clerkUser ? { id: clerkUser.id } : 'skip'
	);
	const dev = $derived(userDataQuery.data?.role === 'dev');
	const admin = $derived(userDataQuery.data?.role === 'admin' || userDataQuery.data?.role === 'dev');
	const userData = $derived(userDataQuery.data ?? null);

	// Check Pro status for export gating
	const subscriptionQuery = useQuery(api.polar.getCurrentUserWithSubscription, {});
	const isPro = $derived(
		subscriptionQuery.data?.isPro ||
		subscriptionQuery.data?.subscription?.status === 'active' ||
		subscriptionQuery.data?.subscription?.status === 'trialing'
	);

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
	
	// Export state
	let isExportModalOpen = $state(false);
	let exportModuleItem = $state<ModuleItem | null>(null);
	
	// UI State
	let reorderMode = $state(false);

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

	type ModuleItem = Doc<'module'> & {
		questionCount: number;
		tags?: { _id: Id<'tags'>; name: string; color?: string }[];
	};
	let moduleList = $state<ModuleItem[]>([]);
	const reorderEnabled = $derived(admin && reorderMode);
	const moduleSource = $derived.by(() =>
		moduleList.length > 0 ? moduleList : modules.data ? [...modules.data] : []
	);
	const sortedModules = $derived.by(() => {
		const list = [...moduleSource];
		list.sort((a, b) => a.order - b.order);
		return list;
	});

	$effect(() => {
		if (modules.data) {
			moduleList = [...modules.data];
		}
	});

	async function handleDrop(state: DragDropState<ModuleItem>) {
		if (!reorderEnabled) return;
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

	function openExportModal(moduleItem: ModuleItem) {
		exportModuleItem = moduleItem;
		isExportModalOpen = true;
	}

	function closeExportModal() {
		isExportModalOpen = false;
		exportModuleItem = null;
	}

	// Export functions
	let isExporting = $state(false);

	async function handleExport(format: 'txt' | 'json' | 'csv') {
		if (isExporting || !exportModuleItem) return;

		// Check Pro status before allowing export
		if (!isPro) {
			alert('Question export is a Pro feature. Upgrade to Pro to export questions.');
			closeExportModal();
			return;
		}

		isExporting = true;

		try {
			// Fetch questions for this module
			const questions = await client.query(api.question.getQuestionsByModuleAdmin, {
				id: exportModuleItem._id as Id<'module'>
			});

			if (!questions || questions.length === 0) {
				alert('No questions to export in this module.');
				return;
			}

			exportModuleQuestions(questions as ExportableQuestion[], exportModuleItem.title, format, {
				includeExplanations: true,
				includeMetadata: format === 'json'
			});
			closeExportModal();
		} catch (error) {
			console.error('Export failed:', error);
			alert('Failed to export questions. Please try again.');
		} finally {
			isExporting = false;
		}
	}
</script>

<div class="min-h-screen p-8 max-w-7xl mx-auto">
	<a class="btn mb-4 btn-ghost rounded-full" href={resolve('/admin')}><ArrowLeft size={16} />Back</a>
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
						Manage your learning modules for {classInfo.data.code}. {#if reorderMode}Drag to reorder.{/if}
					</p>
				</div>
			{/if}

			<div class="flex items-center gap-2 self-start sm:self-auto">
				{#if admin}
					<button 
						class="btn rounded-full gap-2 {reorderMode ? 'btn-primary' : 'btn-ghost'}" 
						onclick={() => reorderMode = !reorderMode}
					>
						<GripVertical size={16} />
						<span class="hidden sm:inline">{reorderMode ? 'Done' : 'Reorder'}</span>
					</button>
					<button class="btn btn-primary rounded-full gap-2" onclick={openAddModuleModal}>
						<Plus size={16} />
						<span class="hidden sm:inline">Add New Module</span>
						<span class="sm:hidden">Add</span>
					</button>
				{/if}
			</div>
		</div>
	</div>

	{#if admin}
		<div class="mb-8">
			<TagManager {classId} />
		</div>
	{/if}

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
			{#each sortedModules as moduleItem, index (moduleItem._id)}
				<div
					use:droppable={{
						container: index.toString(),
						callbacks: { onDrop: handleDrop },
						disabled: !reorderEnabled
					}}
					class="relative rounded-2xl bg-base-100 shadow-sm border border-base-300 p-4
                           transition-all duration-300 hover:shadow-md hover:border-primary/30
                           svelte-dnd-touch-feedback overflow-visible"
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
							],
							disabled: !reorderEnabled
						}}
						class={reorderEnabled ? 'cursor-move' : ''}
					>
						<div class="flex flex-col h-full">
							<div class="flex flex-row justify-between mb-4">
								<div class="flex flex-col gap-1 flex-1 min-w-0">
									<div class="flex items-start gap-2">
										{#if reorderMode}
											<div class="mt-1 cursor-grab active:cursor-grabbing text-base-content/40">
												<GripVertical size={20} />
											</div>
										{/if}
										<div class="flex-1 min-w-0">
											<a
												href={`/admin/${classId}/module/${moduleItem._id}`}
												class="font-semibold text-base-content text-left hover:text-primary transition-colors cursor-pointer block"
												title={`Go to questions for ${moduleItem.title}`}
											>
												<span class="mr-2 text-xl inline-block align-middle">{moduleItem.emoji || '📘'}</span>
												<span class="align-middle break-words">{moduleItem.title}</span>
											</a>
										</div>
									</div>
									<div class="text-xs text-base-content/60 flex items-center gap-1 {reorderMode ? 'pl-7' : ''}">
										<span>
											{moduleItem.questionCount} question{moduleItem.questionCount === 1 ? '' : 's'}
										</span>
									</div>
									{#if moduleItem.tags && moduleItem.tags.length > 0}
										<div class="flex flex-wrap items-center gap-2 mt-2">
											{#each moduleItem.tags.slice(0, 3) as tag (tag._id)}
												<span class="inline-flex items-center gap-1 rounded-full border border-base-300 px-2 py-0.5 text-xs">
													<span
														class="h-2 w-2 rounded-full"
														style={`background-color: ${tag.color || '#94a3b8'}`}
													></span>
													<span class="truncate">{tag.name}</span>
												</span>
											{/each}
											{#if moduleItem.tags.length > 3}
												<div class="dropdown dropdown-hover z-50">
													<div
														tabindex="0"
														role="button"
														class="btn btn-ghost btn-xs rounded-full border border-base-300 px-2"
													>
														+{moduleItem.tags.length - 3}
													</div>
													<div
														class="dropdown-content z-50 mt-2 left-0 w-44 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-lg"
													>
														<div class="flex flex-col gap-1">
															{#each moduleItem.tags.slice(3) as tag (tag._id)}
																<div class="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-base-200/70">
																	<span
																		class="h-2 w-2 rounded-full"
																		style={`background-color: ${tag.color || '#94a3b8'}`}
																	></span>
																	<span class="truncate">{tag.name}</span>
																</div>
															{/each}
														</div>
													</div>
												</div>
											{/if}
										</div>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									{#if admin}
										<div class="dropdown dropdown-end">
											<button
												class="btn btn-ghost btn-circle btn-sm interactive"
												tabindex="0"
												aria-haspopup="menu"
												aria-label="Open menu">⋮</button
											>
											<ul
												tabindex="0"
												role="menu"
												class="dropdown-content menu bg-base-100 rounded-2xl z-1 w-52 p-2 shadow-sm border border-base-300"
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
												{#if moduleItem.questionCount > 0}
													<li>
														<button
															class="btn btn-sm btn-ghost w-full justify-start interactive"
															type="button"
															onclick={() => openExportModal(moduleItem)}
														>
															<Download size={16} />
															<span>Export Questions</span>
															{#if !isPro}
																<span class="badge badge-xs badge-primary ml-auto">Pro</span>
															{/if}
														</button>
													</li>
												{/if}
												<li class="pt-2">
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
									{moduleItem.order + 1}
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

<ExportModuleModal 
	isOpen={isExportModalOpen}
	onClose={closeExportModal}
	onExport={handleExport}
	moduleItem={exportModuleItem}
	{isExporting}
/>
