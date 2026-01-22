<script lang="ts">
	import type { PageData } from './$types';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { Id, Doc } from '../../../../../convex/_generated/dataModel';
	import { api } from '../../../../../convex/_generated/api.js';
	import { flip } from 'svelte/animate';
import { Pencil, Trash2, Plus, ArrowLeft, Copy, X, GripVertical, Paperclip, CheckSquare } from 'lucide-svelte';
	import { ArrowRightLeft } from 'lucide-svelte';
import AddQuestionModal from '$lib/admin/AddQuestionModal.svelte';
import DuplicateQuestionModal from '$lib/admin/DuplicateQuestionModal.svelte';
	import EditQuestionModal from '$lib/admin/EditQuestionModal.svelte';
	import DeleteConfirmationModal from '$lib/admin/DeleteConfirmationModal.svelte';
	import MoveQuestionsModal from '$lib/admin/MoveQuestionsModal.svelte';
	import QuestionEditorInline from '$lib/admin/QuestionEditorInline.svelte';
	import { convertToDisplayFormat } from '$lib/utils/questionType.js';
	import { goto } from '$app/navigation';
	import { useClerkContext } from 'svelte-clerk';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();
	const moduleId = data.moduleId;

	import { page } from '$app/state';
	let editParam = $derived(page.url.searchParams.get('edit'));

	let search = $state('');
	let searchInput = $state('');
	let sortMode: 'order' | 'created_desc' = $state('order');

	// Debounce search input to prevent excessive queries
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// Use a function to handle debounced search
	function updateSearch() {
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			search = searchInput;
		}, 300);
	}
	const questions = useQuery(api.question.searchQuestionsByModuleAdmin, () => ({
		id: moduleId as Id<'module'>,
		query: search,
		sort: sortMode
	}));

	// Cleanup timeout on component unmount
	$effect(() => {
		return () => {
			if (searchTimeout) clearTimeout(searchTimeout);
		};
	});

const moduleInfo = useQuery(api.module.getModuleById, () => ({ id: moduleId as Id<'module'> }));

	const client = useConvexClient();
	const clerk = useClerkContext();
	const admin = $derived(clerk.user?.publicMetadata.role === 'admin');
	const contributor = $derived(clerk.user?.publicMetadata.create === 'contributor');
	const canEdit = $derived(admin || contributor);

	let showTruncated = $state(true);

	// Question operations
	let isEditQuestionModalOpen = $state(false);
	let isAddQuestionModalOpen = $state(false);
	let isDeleteQuestionModalOpen = $state(false);
	let editingQuestion = $state<QuestionItem | null>(null);
	let questionToDelete = $state<QuestionItem | null>(null);
let isDuplicateModalOpen = $state(false);
let duplicateTarget = $state<QuestionItem | null>(null);
let recentlyAddedIds = $state<Set<string>>(new Set());
let selectedQuestionId = $state<string | null>(null);
	let reorderMode = $state(false);
	let editorMode: 'view' | 'add' | 'edit' = $state('view');
	let editingQuestionForInline = $state<QuestionItem | null>(null);
	let hasUnsavedChanges = $state(false);
	let pendingQuestionId = $state<string | null>(null);
	let showUnsavedChangesModal = $state(false);

	type QuestionItem = Doc<'question'>;

	const selectedQuestion = $derived.by(() => {
		if (!selectedQuestionId) return null;
		if (questionList.length > 0) {
			return questionList.find((q) => q._id === selectedQuestionId) ?? null;
		}
		if (questions.data && questions.data.length > 0) {
			return questions.data.find((q) => q._id === selectedQuestionId) ?? null;
		}
		return null;
	});

	// Media/Attachments state for viewing
	let isAttachmentModalOpen = $state(false);
	let selectedAttachment = $state<{
		_id: string;
		url: string;
		altText: string;
		caption?: string;
	} | null>(null);
	let attachmentZoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isDragging = $state(false);
	let lastMouseX = $state(0);
	let lastMouseY = $state(0);

	// Query for media attachments
	const mediaQuery = useQuery(
		(api as any).questionMedia.getByQuestionId,
		() => selectedQuestionId ? { questionId: selectedQuestionId as Id<'question'> } : 'skip'
	);

	const media = $derived({
		data: (mediaQuery.data ?? []) as Array<{
			_id: string;
			url: string;
			altText: string;
			caption?: string;
		}>,
		isLoading: mediaQuery.isLoading,
		error: mediaQuery.error
	});

	function handleAttachmentClick(attachment: {
		_id: string;
		url: string;
		altText: string;
		caption?: string;
	}) {
		selectedAttachment = attachment;
		attachmentZoom = 1;
		panX = 0;
		panY = 0;
		isAttachmentModalOpen = true;
	}

	function handleZoomIn() {
		attachmentZoom = Math.min(attachmentZoom + 0.25, 3);
	}

	function handleZoomOut() {
		attachmentZoom = Math.max(attachmentZoom - 0.25, 0.25);
	}

	function handleFitToScreen() {
		attachmentZoom = 1;
		panX = 0;
		panY = 0;
	}

	function handleZoomToggle() {
		if (attachmentZoom > 1) {
			attachmentZoom = 1;
			panX = 0;
			panY = 0;
		} else {
			attachmentZoom = Math.min(attachmentZoom + 0.5, 3);
		}
	}

	function handleMouseDown(event: MouseEvent) {
		if (attachmentZoom > 1) {
			isDragging = true;
			lastMouseX = event.clientX;
			lastMouseY = event.clientY;
			event.preventDefault();
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (isDragging && attachmentZoom > 1) {
			const deltaX = event.clientX - lastMouseX;
			const deltaY = event.clientY - lastMouseY;

			const maxPan = (attachmentZoom - 1) * 100;
			panX = Math.max(-maxPan, Math.min(maxPan, panX + deltaX));
			panY = Math.max(-maxPan, Math.min(maxPan, panY + deltaY));

			lastMouseX = event.clientX;
			lastMouseY = event.clientY;
			event.preventDefault();
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	const selectedQuestionIndex = $derived.by(() => {
		if (!selectedQuestionId) return -1;
		return questionList.findIndex((q) => q._id === selectedQuestionId);
	});

	function editQuestion(questionItem: QuestionItem) {
		const isDesktopOrTablet = window.innerWidth >= 768; // md breakpoint
		if (isDesktopOrTablet) {
			// Check for unsaved changes before switching to edit a different question
			if ((editorMode === 'edit' || editorMode === 'add') && hasUnsavedChanges && 
				editingQuestionForInline?._id !== questionItem._id) {
				pendingQuestionId = `edit:${questionItem._id}`;
				showUnsavedChangesModal = true;
				return;
			}
			editingQuestionForInline = questionItem;
			editorMode = 'edit';
			selectedQuestionId = questionItem._id;
			hasUnsavedChanges = false;
		} else {
			editingQuestion = questionItem;
			isEditQuestionModalOpen = true;
		}
	}

	async function closeEditQuestionModal() {
		try {
			const url = new URL(window.location.href);
			if (url.searchParams.has('edit')) {
				url.searchParams.delete('edit');
				const newPath = url.pathname + (url.search ? `?${url.searchParams.toString()}` : '');
				await goto(newPath, { replaceState: true, noScroll: true });
			}
		} catch {}
		isEditQuestionModalOpen = false;
		editingQuestion = null;
		editorMode = 'view';
		editingQuestionForInline = null;
	}

	function openAddQuestionModal() {
		const isDesktopOrTablet = window.innerWidth >= 768; // md breakpoint
		if (isDesktopOrTablet) {
			// Check for unsaved changes before switching to add mode
			if ((editorMode === 'edit' || editorMode === 'add') && hasUnsavedChanges) {
				pendingQuestionId = 'add';
				showUnsavedChangesModal = true;
				return;
			}
			editorMode = 'add';
			selectedQuestionId = null;
			editingQuestionForInline = null;
			hasUnsavedChanges = false;
		} else {
			isAddQuestionModalOpen = true;
		}
	}

	function closeAddQuestionModal() {
		isAddQuestionModalOpen = false;
		editorMode = 'view';
	}

	function handleQuestionDelete(id: string) {
		const foundQuestion = questions.data?.find((q) => q._id === id);
		if (!foundQuestion) return;

		questionToDelete = foundQuestion;
		isDeleteQuestionModalOpen = true;
	}

	async function confirmQuestionDelete() {
		if (!questionToDelete) return;

		try {
			await client.mutation(api.question.deleteQuestion, {
				questionId: questionToDelete._id as Id<'question'>,
				moduleId: moduleId as Id<'module'>
			});
		} catch (error) {
			console.error('Failed to delete question', error);
		} finally {
			isDeleteQuestionModalOpen = false;
			questionToDelete = null;
		}
	}

	function cancelQuestionDelete() {
		isDeleteQuestionModalOpen = false;
		questionToDelete = null;
	}

	let questionList = $state<QuestionItem[]>([]);

	// Query for all question media to show paperclip indicators
	const allMediaQuery = useQuery(
		api.questionMedia.getByQuestionIds,
		() => questions.data && questions.data.length > 0 ? { questionIds: questions.data.map(q => q._id) as Id<'question'>[] } : 'skip'
	);

	const questionHasAttachments = $derived.by(() => {
		const map = new Map<string, boolean>();
		if (allMediaQuery.data && Array.isArray(allMediaQuery.data)) {
			for (const item of allMediaQuery.data) {
				if (item?.questionId && item?.hasMedia) {
					map.set(item.questionId, true);
				}
			}
		}
		return map;
	});

	// Bulk delete functionality
	let selectedQuestions = $state<Set<string>>(new Set());
	let isBulkDeleteModalOpen = $state(false);
	let isMoveModalOpen = $state(false);
	let moveQuestionIds = $state<string[]>([]);

	function toggleQuestionSelection(questionId: string) {
		const newSelected = new Set(selectedQuestions);
		if (newSelected.has(questionId)) {
			newSelected.delete(questionId);
		} else {
			newSelected.add(questionId);
		}
		selectedQuestions = newSelected;
	}

	function selectAllQuestions() {
		selectedQuestions = new Set(questionList.map((q) => q._id));
	}

	function deselectAllQuestions() {
		selectedQuestions = new Set();
	}

	function openBulkDeleteModal() {
		isBulkDeleteModalOpen = true;
	}

	function closeBulkDeleteModal() {
		isBulkDeleteModalOpen = false;
	}

	async function confirmBulkDelete() {
		if (selectedQuestions.size === 0) return;

		try {
			const result = await client.mutation(api.question.bulkDeleteQuestions, {
				questionIds: Array.from(selectedQuestions) as Id<'question'>[],
				moduleId: moduleId as Id<'module'>
			});

			if (result.success) {
				console.log(`Successfully deleted ${result.deletedCount} questions`);
			} else {
				console.log('Some deletions failed:', result.errors);
			}

			selectedQuestions = new Set();
		} catch (error) {
			console.error('Failed to bulk delete questions', error);
		} finally {
			isBulkDeleteModalOpen = false;
		}
	}

	function openMoveModalForSelected() {
		if (selectedQuestions.size === 0) return;
		moveQuestionIds = Array.from(selectedQuestions);
		isMoveModalOpen = true;
	}

	function openMoveModalForOne(id: string) {
		moveQuestionIds = [id];
		isMoveModalOpen = true;
	}

	function handleCloseMoveModal(success?: boolean) {
		isMoveModalOpen = false;
		moveQuestionIds = [];
		if (success) {
			selectedQuestions = new Set();
		}
	}

	function handleInlineEditorSave() {
		hasUnsavedChanges = false;
		editorMode = 'view';
		editingQuestionForInline = null;
		closeEditQuestionModal();
	}

	function handleInlineEditorCancel() {
		hasUnsavedChanges = false;
		editorMode = 'view';
		editingQuestionForInline = null;
		closeEditQuestionModal();
	}

	function handleQuestionSelect(questionId: string) {
		// If already viewing this question and not in edit/add mode, do nothing
		if (editorMode === 'view' && selectedQuestionId === questionId) {
			return;
		}

		// If in edit or add mode with unsaved changes, prompt user
		if ((editorMode === 'edit' || editorMode === 'add') && hasUnsavedChanges) {
			pendingQuestionId = questionId;
			showUnsavedChangesModal = true;
			return;
		}

		// Otherwise, switch to view mode and select the question
		editorMode = 'view';
		editingQuestionForInline = null;
		selectedQuestionId = questionId;
		hasUnsavedChanges = false;
	}

	function confirmDiscardChanges() {
		hasUnsavedChanges = false;
		showUnsavedChangesModal = false;
		
		if (pendingQuestionId === 'add') {
			editorMode = 'add';
			selectedQuestionId = null;
			editingQuestionForInline = null;
		} else if (pendingQuestionId?.startsWith('edit:')) {
			const questionId = pendingQuestionId.replace('edit:', '');
			const questionItem = questionList.find((q) => q._id === questionId);
			if (questionItem) {
				editingQuestionForInline = questionItem;
				editorMode = 'edit';
				selectedQuestionId = questionId;
			}
		} else if (pendingQuestionId) {
			editorMode = 'view';
			editingQuestionForInline = null;
			selectedQuestionId = pendingQuestionId;
		}
		
		pendingQuestionId = null;
	}

	function cancelDiscardChanges() {
		showUnsavedChangesModal = false;
		pendingQuestionId = null;
	}

	function handleEditorChange() {
		hasUnsavedChanges = true;
	}

	$effect(() => {
		if (!isEditQuestionModalOpen && editorMode === 'view' && questions.data && editParam) {
			const found = questions.data.find((q) => q._id === editParam);
			if (found) {
				const isDesktopOrTablet = typeof window !== 'undefined' && window.innerWidth >= 768;
				if (isDesktopOrTablet) {
					editingQuestionForInline = found as QuestionItem;
					editorMode = 'edit';
					selectedQuestionId = found._id;
				} else {
					editingQuestion = found as QuestionItem;
					isEditQuestionModalOpen = true;
				}
			}
		}
		if (questions.data) {
			questionList = [...questions.data];
		}
	});

	// Keyboard navigation for question list
	function handleKeyDown(event: KeyboardEvent) {
		// Don't trigger if user is typing in an input/textarea
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			return;
		}

		// Only work in view mode, not when editing or adding
		if (editorMode !== 'view') {
			return;
		}

		// Don't interfere if no questions or no question selected
		if (questionList.length === 0) {
			return;
		}

		if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			event.preventDefault();
			
			const currentIndex = selectedQuestionId 
				? questionList.findIndex((q) => q._id === selectedQuestionId)
				: -1;

			let newIndex: number;
			
			if (event.key === 'ArrowDown') {
				// Move to next question
				if (currentIndex === -1) {
					newIndex = 0; // Select first if none selected
				} else {
					newIndex = Math.min(currentIndex + 1, questionList.length - 1);
				}
			} else {
				// Move to previous question
				if (currentIndex === -1) {
					newIndex = 0; // Select first if none selected
				} else {
					newIndex = Math.max(currentIndex - 1, 0);
				}
			}

			// Update selection
			if (newIndex !== currentIndex && questionList[newIndex]) {
				handleQuestionSelect(questionList[newIndex]._id);
			}
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeyDown);
		
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	async function handleQuestionDrop(state: DragDropState<QuestionItem>) {
		const { draggedItem, sourceContainer, targetContainer } = state;
		if (!targetContainer || sourceContainer === targetContainer) return;

		const sourceIndex = questionList.findIndex((i) => i._id === draggedItem._id);
		const targetIndex = parseInt(targetContainer);

		if (sourceIndex === -1 || Number.isNaN(targetIndex)) return;

		const updatedList = [...questionList];
		const [moved] = updatedList.splice(sourceIndex, 1);
		updatedList.splice(targetIndex, 0, moved);
		questionList = updatedList;

		try {
			await client.mutation(api.question.updateQuestionOrder, {
				questionId: moved._id,
				newOrder: targetIndex,
				moduleId: moduleId as Id<'module'>
			});
		} catch (error) {
			console.error('Failed to update question order:', error);
			questionList = [...(questions.data || [])];
		}
	}

function openDuplicateModalForOne(id: string) {
	const found = questions.data?.find((q) => q._id === id) as QuestionItem | undefined;
	if (!found) return;
	duplicateTarget = found;
	isDuplicateModalOpen = true;
}

function cancelDuplicateModal() {
	isDuplicateModalOpen = false;
	duplicateTarget = null;
}

async function confirmDuplicateModal(count: number) {
	if (!duplicateTarget) return;
	try {
		const result = await client.mutation(api.question.duplicateQuestionMany, {
			questionId: duplicateTarget._id as Id<'question'>,
			count
		});
		if (result?.insertedIds && Array.isArray(result.insertedIds)) {
			const next = new Set(recentlyAddedIds);
			for (const id of result.insertedIds) next.add(id);
			recentlyAddedIds = next;
			setTimeout(() => {
				recentlyAddedIds = new Set();
			}, 2000);
		}
		console.log('Duplicated ' + String(result.insertedCount) + ' copies');
	} catch (error) {
		console.error('Failed to duplicate questions');
	} finally {
		isDuplicateModalOpen = false;
		duplicateTarget = null;
	}
}
</script>

<div class="h-screen overflow-hidden bg-base-200/30 flex flex-col">
	<div class="max-w-[1800px] mx-auto p-4 sm:p-6 flex flex-col flex-1 min-h-0 w-full">
		<div class="flex items-center gap-4 mb-4">
			<a class="btn btn-ghost btn-sm gap-2" href={`/admin/${moduleInfo.data?.classId || ''}`}>
				<ArrowLeft size={16} />
				<span class="hidden sm:inline">Back</span>
			</a>
			<div class="h-6 w-px bg-base-300"></div>
			{#if moduleInfo.isLoading}
				<div class="skeleton h-6 w-48"></div>
			{:else if moduleInfo.error != null}
				<div class="text-error text-sm">Failed to load module</div>
			{:else if moduleInfo.data == null}
				<div class="text-base-content/70 text-sm">Module not found</div>
			{:else}
				<div class="flex items-center gap-2">
					<span class="text-xl">{moduleInfo.data?.emoji || '📘'}</span>
					<div>
						<h1 class="text-lg font-semibold leading-tight">{moduleInfo.data.title}</h1>
						<p class="text-xs text-base-content/60 hidden sm:block">
							{questionList.length} question{questionList.length !== 1 ? 's' : ''}{#if admin} · Drag to reorder{/if}
						</p>
					</div>
				</div>
			{/if}
			<div class="flex-1"></div>
			{#if canEdit && editorMode !== 'add'}
				<button class="btn btn-primary btn-sm gap-2" onclick={openAddQuestionModal}>
					<Plus size={16} />
					<span class="hidden sm:inline">Add Question</span>
				</button>
			{/if}
		</div>

		<!-- Controls for mobile/tablet (below xl) -->
		<div class="xl:hidden flex flex-wrap items-center gap-2 mb-4 p-3 bg-base-100 rounded-lg border border-base-300">
			<label class="input input-sm input-bordered flex items-center gap-2 w-full sm:w-64">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 16 16"
					fill="currentColor"
					class="w-4 h-4 opacity-70"
					><path
						fill-rule="evenodd"
						d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
						clip-rule="evenodd"
					/></svg
				>
				<input
					type="text"
					class="grow"
					placeholder="Search..."
					value={searchInput}
					oninput={(e) => {
						searchInput = (e.target as HTMLInputElement).value;
						updateSearch();
					}}
				/>
				{#if searchInput}
					<button
						class="btn btn-ghost btn-xs"
						onclick={() => {
							searchInput = '';
							search = '';
							if (searchTimeout) {
								clearTimeout(searchTimeout);
								searchTimeout = null;
							}
						}}>×</button
					>
				{/if}
			</label>

			<div class="dropdown">
				<div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-1">
					{sortMode === 'order' ? 'Order' : 'Recent'}
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
				</div>
				<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-lg z-10 w-40 p-1 shadow-lg border border-base-300">
					<li><button class="text-sm" class:active={sortMode === 'order'} onclick={() => (sortMode = 'order')}>By Order</button></li>
					<li><button class="text-sm" class:active={sortMode === 'created_desc'} onclick={() => (sortMode = 'created_desc')}>Recent First</button></li>
				</ul>
			</div>

			{#if admin}
				<button
					class="btn btn-sm gap-1 {reorderMode ? 'btn-primary' : 'btn-ghost'}"
					onclick={() => (reorderMode = !reorderMode)}
				>
					<GripVertical size={14} />
					<span>{reorderMode ? 'Done' : 'Reorder'}</span>
				</button>
			{/if}

			<div class="flex-1"></div>

			{#if canEdit && selectedQuestions.size > 0}
				<div class="badge badge-neutral badge-sm">{selectedQuestions.size} selected</div>
				<button class="btn btn-sm btn-ghost gap-1" onclick={openMoveModalForSelected}>
					<ArrowRightLeft size={14} />
					<span class="hidden sm:inline">Move</span>
				</button>
				<button class="btn btn-sm btn-ghost text-error gap-1" onclick={openBulkDeleteModal}>
					<Trash2 size={14} />
					<span class="hidden sm:inline">Delete</span>
				</button>
				<button class="btn btn-sm btn-ghost" onclick={deselectAllQuestions}>Clear</button>
			{:else if canEdit && questions.data && questions.data.length > 0}
				<button class="btn btn-sm btn-ghost" onclick={selectAllQuestions}>Select All</button>
			{/if}
		</div>

		<!-- Tablet View: Horizontal Scrolling Numbers (md to lg) - Hidden in reorder mode -->
		{#if !reorderMode}
		<div class="hidden md:block xl:hidden mb-4">
			<div class="flex flex-row w-full overflow-x-auto overflow-y-hidden whitespace-nowrap space-x-3 relative items-center border border-base-300 px-4 py-3 rounded-3xl bg-base-100">
				{#if questions.isLoading}
					<div class="flex gap-3">
						{#each Array(10), index (index)}
							<div class="skeleton h-10 w-10 rounded-full flex-shrink-0"></div>
						{/each}
					</div>
				{:else if questions.data && questions.data.length > 0}
					{#each questionList as questionItem, index (questionItem._id)}
						<div class="indicator flex-shrink-0">
							{#if editorMode === 'edit' && editingQuestionForInline?._id === questionItem._id}
								<span class="indicator-item indicator-start badge badge-warning badge-xs"></span>
							{/if}
							{#if recentlyAddedIds.has(questionItem._id)}
								<span class="indicator-item indicator-end badge badge-success badge-xs"></span>
							{/if}
							<button
								class="btn btn-circle btn-sm btn-soft {selectedQuestionId === questionItem._id ? 'btn-primary' : 'btn-outline'}"
								onclick={() => handleQuestionSelect(questionItem._id)}
								title={questionItem.stem?.replace(/<[^>]*>/g, '').substring(0, 50)}
							>
								{index + 1}
							</button>
						</div>
					{/each}
				{:else}
					<div class="text-sm text-base-content/60 py-2">No questions yet</div>
				{/if}
			</div>
		</div>
		{/if}

		<!-- Mobile Question List (below md) -->
		<div class="md:hidden mb-4">
			<div class="bg-base-100 rounded-lg border border-base-300 overflow-hidden">
				{#if questions.isLoading}
					<div class="divide-y divide-base-200">
						{#each Array(5), index (index)}
							<div class="px-3 py-2.5">
								<div class="flex items-start gap-2">
									<div class="skeleton h-4 w-4 rounded mt-0.5"></div>
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-1">
											<div class="skeleton h-3 w-6 rounded"></div>
											<div class="skeleton h-3 w-12 rounded"></div>
										</div>
										<div class="skeleton h-3 w-full rounded mb-1"></div>
										<div class="skeleton h-3 w-2/3 rounded"></div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else if questions.error != null}
					<div class="flex items-center justify-center p-6">
						<div class="text-error text-xs">Failed to load: {questions.error.toString()}</div>
					</div>
				{:else if !questions.data || questions.data.length === 0}
					<div class="flex items-center justify-center p-8">
						<div class="text-center">
							<div class="text-3xl mb-2">📚</div>
							<h3 class="text-sm font-semibold mb-1">
								{search ? 'No matches' : 'No questions'}
							</h3>
							<p class="text-xs text-base-content/60">
								{search ? 'Try different search terms' : 'Add your first question'}
							</p>
						</div>
					</div>
				{:else if reorderMode}
					<div class="p-2 space-y-2 overflow-y-auto">
						{#each questionList as questionItem, index (questionItem._id)}
							<div
								use:droppable={{
									container: index.toString(),
									callbacks: { onDrop: handleQuestionDrop }
								}}
								use:draggable={{
									container: index.toString(),
									dragData: questionItem
								}}
								class="px-3 py-2.5 rounded-lg transition-all cursor-grab active:cursor-grabbing hover:bg-base-200/50
									{recentlyAddedIds.has(questionItem._id) ? 'bg-success/5' : ''} border-2 border-transparent"
								animate:flip={{ duration: 300 }}
							>
								<div class="flex items-center gap-2">
									<GripVertical size={16} class="text-base-content/30 flex-shrink-0" />
									<span class="text-xs font-medium text-base-content/50">#{index + 1}</span>
									<p class="flex-1 text-xs text-base-content line-clamp-2 tiptap-content-inline">{@html questionItem.stem}</p>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="p-2 space-y-2 overflow-y-auto">
						{#each questionList as questionItem, index (questionItem._id)}
							<div
								role="button"
								tabindex="0"
								class="px-3 py-2.5 rounded-lg transition-all cursor-pointer active:bg-base-200
									{selectedQuestionId === questionItem._id 
										? 'bg-primary/10 border-2 border-primary shadow-sm hover:bg-primary/15 hover:shadow-md' 
										: 'border-2 border-transparent hover:bg-base-200/50'}"
								onclick={() => handleQuestionSelect(questionItem._id)}
								onkeydown={(e) => e.key === 'Enter' && handleQuestionSelect(questionItem._id)}
							>
								<div class="flex items-start gap-2">
									<input
										type="checkbox"
										class="checkbox checkbox-xs checkbox-primary mt-0.5 flex-shrink-0"
										aria-label="Select question"
										checked={selectedQuestions.has(questionItem._id)}
										onclick={(e) => {
											e.stopPropagation();
											toggleQuestionSelection(questionItem._id);
										}}
									/>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-1.5 mb-1">
											<span class="text-xs font-medium text-base-content/50">#{index + 1}</span>
											<span class="text-[9px] px-1 py-0.5 rounded bg-base-200 text-base-content/60 uppercase font-medium">{convertToDisplayFormat(questionItem.type)}</span>
											<span class="w-1.5 h-1.5 rounded-full flex-shrink-0
												{questionItem.status === 'published' ? 'bg-success' : questionItem.status === 'draft' ? 'bg-warning' : 'bg-base-300'}"
												title={questionItem.status}></span>
											{#if questionHasAttachments.has(questionItem._id)}
												<Paperclip size={10} class="text-base-content/40" />
											{/if}
										</div>
										<p class="text-xs text-base-content leading-snug line-clamp-2 tiptap-content-inline">{@html questionItem.stem}</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0">
			<!-- Desktop Sidebar (xl and above) -->
			<div class="xl:col-span-5 2xl:col-span-4 hidden xl:block min-h-0">
				<div class="bg-base-100 rounded-lg border border-base-300 h-full overflow-hidden flex flex-col">
					<!-- Controls in sidebar header -->
					<div class="p-4 border-b border-base-300 space-y-3 flex-shrink-0">
						<label class="input input-sm input-bordered flex items-center gap-2 w-full">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 16 16"
								fill="currentColor"
								class="w-4 h-4 opacity-70"
								><path
									fill-rule="evenodd"
									d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
									clip-rule="evenodd"
								/></svg
							>
							<input
								type="text"
								class="grow text-sm"
								placeholder="Search..."
								value={searchInput}
								oninput={(e) => {
									searchInput = (e.target as HTMLInputElement).value;
									updateSearch();
								}}
							/>
							{#if searchInput}
								<button
									class="btn btn-ghost btn-xs"
									onclick={() => {
										searchInput = '';
										search = '';
										if (searchTimeout) {
											clearTimeout(searchTimeout);
											searchTimeout = null;
										}
									}}>×</button
								>
							{/if}
						</label>

						<div class="flex items-center gap-2">
							<div class="dropdown">
								<div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-1">
									{sortMode === 'order' ? 'Order' : 'Recent'}
									<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
								</div>
								<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-lg z-10 w-40 p-1 shadow-lg border border-base-300">
									<li><button class="text-sm" class:active={sortMode === 'order'} onclick={() => (sortMode = 'order')}>By Order</button></li>
									<li><button class="text-sm" class:active={sortMode === 'created_desc'} onclick={() => (sortMode = 'created_desc')}>Recent First</button></li>
								</ul>
							</div>

							{#if admin}
								<button
									class="btn btn-sm gap-1 {reorderMode ? 'btn-primary' : 'btn-ghost'}"
									onclick={() => (reorderMode = !reorderMode)}
								>
									<GripVertical size={14} />
									{reorderMode ? 'Done' : 'Reorder'}
								</button>
							{/if}

							<div class="flex-1"></div>

							{#if canEdit && selectedQuestions.size > 0}
								<div class="badge badge-neutral badge-sm">{selectedQuestions.size}</div>
								<button 
									class="btn btn-sm btn-ghost btn-square" 
									onclick={openMoveModalForSelected}
									title="Move selected"
								>
									<ArrowRightLeft size={16} />
								</button>
								<button 
									class="btn btn-sm btn-ghost gap-1" 
									onclick={deselectAllQuestions}
									title="Clear selection"
								>
									<X size={16} />
									<span class="text-xs">Clear</span>
								</button>
								<button 
									class="btn btn-sm btn-ghost btn-square text-error" 
									onclick={openBulkDeleteModal}
									title="Delete selected"
								>
									<Trash2 size={16} />
								</button>
							{:else if canEdit && questions.data && questions.data.length > 0}
								<button 
									class="btn btn-sm btn-ghost gap-1" 
									onclick={selectAllQuestions}
									title="Select all questions"
								>
									<CheckSquare size={16} />
									<span class="text-xs">Select All</span>
								</button>
							{/if}
						</div>
					</div>

					<div class="flex-1 overflow-y-auto pb-8 min-h-0">
						{#if questions.isLoading}
							<div class="divide-y divide-base-200">
								{#each Array(8), index (index)}
									<div class="px-4 py-3">
										<div class="flex items-start gap-3">
											<div class="skeleton h-5 w-5 rounded mt-0.5"></div>
											<div class="flex-1">
												<div class="flex items-center gap-2 mb-2">
													<div class="skeleton h-3 w-6 rounded"></div>
													<div class="skeleton h-4 w-12 rounded"></div>
													<div class="skeleton h-2 w-2 rounded-full"></div>
												</div>
												<div class="skeleton h-4 w-full rounded mb-1"></div>
												<div class="skeleton h-4 w-3/4 rounded"></div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else if questions.error != null}
							<div class="flex items-center justify-center p-8">
								<div class="text-error text-sm">Failed to load: {questions.error.toString()}</div>
							</div>
						{:else if !questions.data || questions.data.length === 0}
							<div class="flex items-center justify-center p-8 h-full">
								<div class="text-center">
									<div class="text-3xl mb-3">📚</div>
									<h3 class="text-sm font-semibold mb-1 text-base-content">
										{search ? 'No matches' : 'No questions'}
									</h3>
									<p class="text-xs text-base-content/60">
										{search ? 'Try different search terms' : 'Add your first question'}
									</p>
									{#if search}
										<button
											class="btn btn-sm btn-ghost mt-3"
											onclick={() => {
												searchInput = '';
												search = '';
												if (searchTimeout) {
													clearTimeout(searchTimeout);
													searchTimeout = null;
												}
											}}
										>
											Clear Search
										</button>
									{/if}
								</div>
							</div>
						{:else if reorderMode}
							<div class="divide-y divide-base-200">
								{#each questionList as questionItem, index (questionItem._id)}
									<div
										use:droppable={{
											container: index.toString(),
											callbacks: { onDrop: handleQuestionDrop }
										}}
										use:draggable={{
											container: index.toString(),
											dragData: questionItem
										}}
										class="px-4 py-3 transition-all hover:bg-base-200/50 cursor-grab active:cursor-grabbing
											{recentlyAddedIds.has(questionItem._id) ? 'bg-success/5' : ''}"
										animate:flip={{ duration: 300 }}
									>
										<div class="flex items-center gap-3">
											<GripVertical size={16} class="text-base-content/30 flex-shrink-0" />
											<span class="text-xs font-medium text-base-content/50 w-6">#{index + 1}</span>
											<p class="flex-1 text-sm text-base-content truncate tiptap-content-inline">{@html questionItem.stem}</p>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="p-2 space-y-2">
								{#each questionList as questionItem, index (questionItem._id)}
									<div
										role="button"
										tabindex="0"
										class="px-3 py-2.5 rounded-lg transition-all cursor-pointer
											{selectedQuestionId === questionItem._id 
												? 'bg-primary/10 border-2 border-primary shadow-sm hover:bg-primary/15 hover:shadow-md' 
												: 'border-2 border-transparent hover:bg-base-200/50'}
											{recentlyAddedIds.has(questionItem._id) ? 'bg-success/5' : ''}"
										onclick={() => handleQuestionSelect(questionItem._id)}
										onkeydown={(e) => e.key === 'Enter' && handleQuestionSelect(questionItem._id)}
									>
										<div class="flex items-start gap-3">
											<input
												type="checkbox"
												class="checkbox checkbox-sm checkbox-primary mt-0.5 flex-shrink-0"
												aria-label="Select question"
												checked={selectedQuestions.has(questionItem._id)}
												onclick={(e) => {
													e.stopPropagation();
													toggleQuestionSelection(questionItem._id);
												}}
											/>
											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2 mb-1">
													<span class="text-xs font-medium text-base-content/50">#{index + 1}</span>
													<span class="text-[10px] px-1.5 py-0.5 rounded bg-base-200 text-base-content/60 uppercase font-medium">{convertToDisplayFormat(questionItem.type)}</span>
													<span class="w-2 h-2 rounded-full flex-shrink-0
														{questionItem.status === 'published' ? 'bg-success' : questionItem.status === 'draft' ? 'bg-warning' : 'bg-base-300'}"
														title={questionItem.status}></span>
													{#if questionHasAttachments.has(questionItem._id)}
														<Paperclip size={12} class="text-base-content/40" />
													{/if}
												</div>
												<p class="text-sm text-base-content leading-snug line-clamp-2 tiptap-content-inline">{@html questionItem.stem}</p>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Main Content Panel (md and above) -->
			<div class="xl:col-span-7 2xl:col-span-8 hidden md:block min-h-0">
				<div class="bg-base-100 rounded-lg border border-base-300 h-full overflow-hidden flex flex-col">
					<!-- Reorder mode only visible on tablet (md-xl), not desktop (xl+) -->
					<div class="h-full flex-col overflow-hidden {reorderMode ? 'flex xl:hidden' : 'hidden'}">
						<div class="p-4 border-b border-base-300">
							<h3 class="text-lg font-semibold">Reorder Questions</h3>
							<p class="text-sm text-base-content/60 mt-1">Drag questions to reorder them</p>
						</div>
						<div class="flex-1 overflow-y-auto pb-8 min-h-0">
							<div class="divide-y divide-base-200">
								{#each questionList as questionItem, index (questionItem._id)}
									<div
										use:droppable={{
											container: index.toString(),
											callbacks: { onDrop: handleQuestionDrop }
										}}
										use:draggable={{
											container: index.toString(),
											dragData: questionItem
										}}
										class="px-4 py-3 transition-all hover:bg-base-200/50 cursor-grab active:cursor-grabbing
											{recentlyAddedIds.has(questionItem._id) ? 'bg-success/5' : ''}"
										animate:flip={{ duration: 300 }}
									>
										<div class="flex items-center gap-3">
											<GripVertical size={16} class="text-base-content/30 flex-shrink-0" />
											<span class="text-xs font-medium text-base-content/50 w-6">#{index + 1}</span>
											<p class="flex-1 text-sm text-base-content truncate tiptap-content-inline">{@html questionItem.stem}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
					
					<!-- Normal views - hidden on tablet when reordering, always visible on desktop -->
					<div class="{reorderMode ? 'hidden xl:flex' : 'flex'} flex-col h-full overflow-hidden">
					{#if editorMode === 'add'}
						<QuestionEditorInline
							{moduleId}
							mode="add"
							onSave={handleInlineEditorSave}
							onCancel={handleInlineEditorCancel}
							onChange={handleEditorChange}
						/>
					{:else if editorMode === 'edit' && editingQuestionForInline}
						{#key editingQuestionForInline._id}
							<QuestionEditorInline
								{moduleId}
								editingQuestion={editingQuestionForInline}
								mode="edit"
								onSave={handleInlineEditorSave}
								onCancel={handleInlineEditorCancel}
								onChange={handleEditorChange}
							/>
						{/key}
					{:else if selectedQuestion}
						<div class="h-full flex flex-col overflow-hidden">
							<div class="flex items-center justify-between p-4 border-b border-base-300">
								<div class="flex items-center gap-3">
									{#if selectedQuestionIndex >= 0}
										<span class="text-sm font-medium">Question #{selectedQuestionIndex + 1}</span>
									{:else}
										<span class="text-sm font-medium">Question #—</span>
									{/if}
									<div class="flex items-center gap-1">
										{#if selectedQuestion.aiGenerated}
											<span class="badge badge-xs badge-info">AI</span>
										{:else}
											<span class="badge badge-xs badge-success">User</span>
										{/if}
										<span class="badge badge-xs badge-ghost">{convertToDisplayFormat(selectedQuestion.type)}</span>
										<span class="badge badge-xs {selectedQuestion.status === 'published' ? 'badge-success' : selectedQuestion.status === 'draft' ? 'badge-warning' : 'badge-neutral'}">{selectedQuestion.status}</span>
									</div>
								</div>
								{#if canEdit}
									<div class="flex items-center gap-1">
										<button class="btn btn-sm btn-ghost gap-1" onclick={() => editQuestion(selectedQuestion)}>
											<Pencil size={14} />
											Edit
										</button>
										<button class="btn btn-sm btn-ghost gap-1" onclick={() => openMoveModalForOne(selectedQuestion._id)}>
											<ArrowRightLeft size={14} />
											Move
										</button>
										<button class="btn btn-sm btn-ghost gap-1" onclick={() => openDuplicateModalForOne(selectedQuestion._id)}>
											<Copy size={14} />
											Duplicate
										</button>
										<button class="btn btn-sm btn-ghost text-error gap-1" onclick={() => handleQuestionDelete(selectedQuestion._id)}>
											<Trash2 size={14} />
										</button>
									</div>
								{/if}
							</div>

							<div class="flex-1 overflow-y-auto p-6 pb-12 min-h-0">
								<div class="mb-8">
									<div class="text-lg font-medium text-base-content leading-relaxed tiptap-content">{@html selectedQuestion.stem}</div>
								</div>

								{#if selectedQuestion.options?.length}
									<div class="mb-6">
										<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-3">Options</div>
										<div class="space-y-3">
											{#each selectedQuestion.options as option, optIndex (option.id)}
												<label class="label cursor-pointer rounded-full flex items-center border-2 transition-colors p-2.5 {selectedQuestion.correctAnswers.includes(option.id) ? 'border-success bg-success/5' : 'border-base-300 bg-base-200'}">
													<input
														type="checkbox"
														class="checkbox checkbox-primary checkbox-xs ms-3"
														checked={selectedQuestion.correctAnswers.includes(option.id)}
														disabled
													/>
													<span class="flex-grow text-wrap break-words ml-3 my-2 text-sm">
														<span class="font-semibold mr-2 select-none">{String.fromCharCode(65 + optIndex)}.</span>
														<span class="tiptap-content">{@html option.text}</span>
													</span>
													{#if selectedQuestion.correctAnswers.includes(option.id)}
														<span class="text-success text-xs font-medium mr-3 flex-shrink-0">✓ Correct</span>
													{/if}
												</label>
											{/each}
										</div>
									</div>
								{/if}

								{#if selectedQuestion.explanation}
									<div class="mb-6">
										<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-3">Explanation</div>
										<div class="p-4 rounded-lg border border-base-300 bg-base-200/30">
											<div class="text-sm text-base-content/80 tiptap-content">{@html selectedQuestion.explanation}</div>
										</div>
									</div>
								{/if}

								{#if media && media.data && media.data.length > 0}
									<div class="mb-6">
										<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-3 flex items-center gap-2">
											<Paperclip size={14} />
											Attachments ({media.data.length})
										</div>
										<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
											{#each media.data as attachment (attachment._id)}
												<button
													class="group border-2 border-base-300 rounded-lg overflow-hidden cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
													onclick={() => handleAttachmentClick(attachment)}
													aria-label={`View attachment: ${attachment.altText}`}
												>
													<div class="relative overflow-hidden">
														<img
															src={attachment.url}
															alt={attachment.altText}
															class="w-full h-28 object-cover group-hover:brightness-110 group-hover:scale-105 transition-all duration-200"
														/>
														<div class="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-200"></div>
														{#if attachment.caption}
															<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
																<p class="text-white text-xs truncate">{attachment.caption}</p>
															</div>
														{/if}
													</div>
												</button>
											{/each}
										</div>
									</div>
								{/if}

								{#if selectedQuestion.createdBy}
									<div class="mt-8 pt-4 border-t border-base-200">
										<div class="flex items-center gap-1.5 text-xs text-base-content/40">
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
											</svg>
											<span>Created by {selectedQuestion.createdBy.firstName} {selectedQuestion.createdBy.lastName}</span>
										</div>
									</div>
								{/if}
							</div>
						</div>
					{:else if selectedQuestions.size > 0}
						<div class="h-full flex flex-col items-center justify-center p-8 text-center">
							<div class="text-4xl mb-4">📋</div>
							<h3 class="text-lg font-semibold mb-2">{selectedQuestions.size} questions selected</h3>
							<p class="text-sm text-base-content/60 mb-4">Use the toolbar to move or delete selected questions</p>
							<div class="flex gap-2">
								<button class="btn btn-sm btn-ghost gap-1" onclick={openMoveModalForSelected}>
									<ArrowRightLeft size={14} />
									Move All
								</button>
								<button class="btn btn-sm btn-error gap-1" onclick={openBulkDeleteModal}>
									<Trash2 size={14} />
									Delete All
								</button>
							</div>
						</div>
					{:else}
						<div class="h-full flex flex-col items-center justify-center p-8 text-center">
							<div class="text-4xl mb-4">
								<span class="xl:hidden">☝️</span>
								<span class="hidden xl:inline">👈</span>
							</div>
							<h3 class="text-lg font-semibold mb-2">Select a question</h3>
							<p class="text-sm text-base-content/60">Click on a question from the list to view its details</p>
						</div>
					{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

{#if selectedQuestion}
	<!-- Mobile Modal (below md) -->
	<div class="modal md:hidden" class:modal-open={selectedQuestionId !== null}>
		<div class="modal-box max-w-2xl max-h-[90vh] p-0">
			<div class="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-base-300 bg-base-100">
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium">Question #{questionList.findIndex(q => q._id === selectedQuestionId) + 1}</span>
					<div class="flex items-center gap-1">
						{#if selectedQuestion.aiGenerated}
							<span class="badge badge-xs badge-info">AI</span>
						{:else}
							<span class="badge badge-xs badge-success">User</span>
						{/if}
						<span class="badge badge-xs badge-ghost">{convertToDisplayFormat(selectedQuestion.type)}</span>
						<span class="badge badge-xs {selectedQuestion.status === 'published' ? 'badge-success' : selectedQuestion.status === 'draft' ? 'badge-warning' : 'badge-neutral'}">{selectedQuestion.status}</span>
					</div>
				</div>
				<button class="btn btn-sm btn-ghost btn-circle" onclick={() => (selectedQuestionId = null)}>
					<X size={18} />
				</button>
			</div>

			<div class="p-4 overflow-y-auto">
				<div class="mb-6">
					<div class="text-base font-medium text-base-content leading-relaxed tiptap-content">{@html selectedQuestion.stem}</div>
				</div>

				{#if selectedQuestion.options?.length}
					<div class="mb-4">
						<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2">Options</div>
						<div class="space-y-2">
							{#each selectedQuestion.options as option, optIndex (option.id)}
								<label class="label cursor-pointer rounded-full flex items-center border transition-colors p-2 {selectedQuestion.correctAnswers.includes(option.id) ? 'border-success bg-success/5' : 'border-base-300 bg-base-200'}">
									<input
										type="checkbox"
										class="checkbox checkbox-primary checkbox-xs ms-2"
										checked={selectedQuestion.correctAnswers.includes(option.id)}
										disabled
									/>
									<span class="flex-grow text-wrap break-words ml-2 my-2 text-xs">
										<span class="font-semibold mr-2 select-none">{String.fromCharCode(65 + optIndex)}.</span>
										<span class="tiptap-content">{@html option.text}</span>
									</span>
									{#if selectedQuestion.correctAnswers.includes(option.id)}
										<span class="text-success text-xs font-medium mr-2 flex-shrink-0">✓</span>
									{/if}
								</label>
							{/each}
						</div>
					</div>
				{/if}

				{#if selectedQuestion.explanation}
					<div class="mb-4">
						<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2">Explanation</div>
						<div class="p-3 rounded-lg border border-base-300 bg-base-200/30">
							<div class="text-sm text-base-content/80 tiptap-content">{@html selectedQuestion.explanation}</div>
						</div>
					</div>
				{/if}
			</div>

			{#if canEdit}
				<div class="sticky bottom-0 flex items-center justify-end gap-2 p-3 border-t border-base-300 bg-base-100">
					<button class="btn btn-sm btn-ghost gap-1" onclick={() => editQuestion(selectedQuestion)}>
						<Pencil size={14} />
						Edit
					</button>
					<button class="btn btn-sm btn-ghost gap-1" onclick={() => openMoveModalForOne(selectedQuestion._id)}>
						<ArrowRightLeft size={14} />
						Move
					</button>
					<button class="btn btn-sm btn-ghost gap-1" onclick={() => openDuplicateModalForOne(selectedQuestion._id)}>
						<Copy size={14} />
						Duplicate
					</button>
					<button class="btn btn-sm btn-error gap-1" onclick={() => handleQuestionDelete(selectedQuestion._id)}>
						<Trash2 size={14} />
					</button>
				</div>
			{/if}
		</div>
		<div class="modal-backdrop bg-black/50" onclick={() => (selectedQuestionId = null)}></div>
	</div>
{/if}

<AddQuestionModal
	isAddModalOpen={isAddQuestionModalOpen}
	closeAddModal={closeAddQuestionModal}
	{moduleId}
/>

<EditQuestionModal
	isEditModalOpen={isEditQuestionModalOpen}
	closeEditModal={closeEditQuestionModal}
	{editingQuestion}
	{moduleId}
/>

<DeleteConfirmationModal
	isDeleteModalOpen={isDeleteQuestionModalOpen}
	onCancel={cancelQuestionDelete}
	onConfirm={confirmQuestionDelete}
	itemName={questionToDelete?.stem}
	itemType="question"
/>

<DeleteConfirmationModal
	isDeleteModalOpen={isBulkDeleteModalOpen}
	onCancel={closeBulkDeleteModal}
	onConfirm={confirmBulkDelete}
	itemName={`${selectedQuestions.size} selected questions`}
	itemType="question"
/>

<MoveQuestionsModal
	isOpen={isMoveModalOpen}
	onClose={handleCloseMoveModal}
	sourceModuleId={moduleId}
	selectedQuestionIds={moveQuestionIds}
/>

<DuplicateQuestionModal
	isOpen={isDuplicateModalOpen}
	onCancel={cancelDuplicateModal}
	onConfirm={confirmDuplicateModal}
	itemName={duplicateTarget?.stem}
/>

<dialog class="modal" class:modal-open={showUnsavedChangesModal}>
	<div class="modal-box">
		<h3 class="font-bold text-lg mb-4">Unsaved Changes</h3>
		<p class="py-4">You have unsaved changes. Do you want to discard them and continue?</p>
		<div class="modal-action">
			<button class="btn btn-ghost" onclick={cancelDiscardChanges}>Cancel</button>
			<button class="btn btn-error" onclick={confirmDiscardChanges}>Discard Changes</button>
		</div>
	</div>
	<div class="modal-backdrop bg-black/50" onclick={cancelDiscardChanges}></div>
</dialog>

<dialog class="modal max-w-full p-4" class:modal-open={isAttachmentModalOpen}>
	<div class="modal-box max-w-4xl w-full h-[90vh]">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10"
				onclick={() => {
					isAttachmentModalOpen = false;
					selectedAttachment = null;
				}}>✕</button
			>
		</form>

		{#if selectedAttachment}
			<div class="flex flex-col h-full">
				<h3 class="font-bold text-lg mb-4">{selectedAttachment.altText}</h3>

				<div
					class="flex-1 relative overflow-hidden bg-base-200 rounded-lg"
					onmousedown={handleMouseDown}
					onmousemove={handleMouseMove}
					onmouseup={handleMouseUp}
					onmouseleave={handleMouseUp}
					role="button"
					tabindex="0"
					aria-label="Image viewer - click to zoom, drag to pan when zoomed"
				>
					<div
						class="w-full h-full focus:outline-none focus:ring-2 focus:ring-primary {attachmentZoom >
						1
							? isDragging
								? 'cursor-grabbing'
								: 'cursor-grab'
							: 'cursor-zoom-in'}"
						onclick={attachmentZoom <= 1 ? handleZoomToggle : undefined}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								if (attachmentZoom <= 1) {
									handleZoomToggle();
								}
							}
						}}
						aria-label={attachmentZoom > 1 ? 'Pan image' : 'Zoom in'}
						tabindex="0"
						role="button"
					>
						<img
							src={selectedAttachment.url}
							alt={selectedAttachment.altText}
							class="max-w-full max-h-full object-contain absolute inset-0 m-auto select-none"
							style="transform: scale({attachmentZoom ||
								1}) translate({panX}px, {panY}px); transform-origin: center; transition: transform 0.1s ease-out;"
							draggable="false"
						/>
					</div>
				</div>

				{#if selectedAttachment.caption}
					<div class="mt-4 p-3 bg-base-200 rounded-lg">
						<p class="text-sm text-base-content/70">{selectedAttachment.caption}</p>
					</div>
				{/if}

				<div class="flex justify-center gap-2 mt-4">
					<button class="btn btn-sm btn-outline" onclick={handleZoomOut} aria-label="Zoom out">
						<svg
							class="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
							/>
						</svg>
					</button>
					<button class="btn btn-sm btn-outline" onclick={handleFitToScreen} aria-label="Fit to screen">
						<svg
							class="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
							/>
						</svg>
					</button>
					<button class="btn btn-sm btn-outline" onclick={handleZoomIn} aria-label="Zoom in">
						<svg
							class="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
							/>
						</svg>
					</button>
				</div>
			</div>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={() => {
			isAttachmentModalOpen = false;
			selectedAttachment = null;
		}}>close</button>
	</form>
</dialog>

<style>
	:global(.tiptap-content-inline) {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	:global(.tiptap-content-inline p) {
		margin: 0;
	}
	:global(.tiptap-content-inline p:not(:first-child)) {
		display: none;
	}
	:global(.line-clamp-2) {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
