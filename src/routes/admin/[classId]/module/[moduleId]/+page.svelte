<script lang="ts">
	import type { PageData } from './$types';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { Id } from '../../../../../convex/_generated/dataModel';
	import { api } from '../../../../../convex/_generated/api.js';
	import { flip } from 'svelte/animate';
	import { Plus, ArrowLeft, GripVertical, Trash2, ArrowRightLeft, X } from 'lucide-svelte';
	import AddQuestionModal from '$lib/admin/AddQuestionModal.svelte';

	import EditQuestionModal from '$lib/admin/EditQuestionModal.svelte';
	import DuplicateQuestionModal from '$lib/admin/DuplicateQuestionModal.svelte';
	import DeleteConfirmationModal from '$lib/admin/DeleteConfirmationModal.svelte';
	import MoveQuestionsModal from '$lib/admin/MoveQuestionsModal.svelte';
	import QuestionEditorInline from '$lib/admin/QuestionEditorInline.svelte';
	import QuestionListControls from '$lib/admin/QuestionListControls.svelte';
	import QuestionListItem from '$lib/admin/QuestionListItem.svelte';
	import QuestionDetailView from '$lib/admin/QuestionDetailView.svelte';
	import AttachmentViewerModal from '$lib/admin/AttachmentViewerModal.svelte';
	import ModuleLimitModal from '$lib/admin/ModuleLimitModal.svelte';
	import { useClerkContext } from 'svelte-clerk';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { curationState, type QuestionItem } from './states.svelte.js';

	let { data }: { data: PageData } = $props();
	const moduleId = data.moduleId;

	// Initialize state with dependencies
	const client = useConvexClient();
	curationState.init(client, moduleId);

	// URL param for edit mode
	let editParam = $derived(page.url.searchParams.get('edit'));

	// Queries
	const questions = useQuery(api.question.searchQuestionsByModuleAdmin, () => ({
		id: moduleId as Id<'module'>,
		query: curationState.search,
		sort: curationState.sortMode
	}));

	const moduleInfo = useQuery(api.module.getModuleById, () => ({ id: moduleId as Id<'module'> }));

	const mediaQuery = useQuery(
		(api as any).questionMedia.getByQuestionId,
		() => curationState.selectedQuestionId ? { questionId: curationState.selectedQuestionId as Id<'question'> } : 'skip'
	);

	const allMediaQuery = useQuery(
		api.questionMedia.getByQuestionIds,
		() => questions.data && questions.data.length > 0 ? { questionIds: questions.data.map(q => q._id) as Id<'question'>[] } : 'skip'
	);

	// Auth
	const clerk = useClerkContext();
	const userDataQuery = useQuery(
		api.users.getUserById,
		() => clerk.user ? { id: clerk.user.id } : 'skip'
	);
	const dev = $derived(userDataQuery.data?.role === 'dev');
	const admin = $derived(userDataQuery.data?.role === 'admin');
	const canEdit = $derived(userDataQuery.data?.role === 'dev' || userDataQuery.data?.role === 'admin' || userDataQuery.data?.role === 'curator');
	const MAX_QUESTIONS = 150;
	const isModuleFull = $derived((moduleInfo.data?.questionCount ?? 0) >= MAX_QUESTIONS);

	// Derived values
	const media = $derived({
		data: (mediaQuery.data ?? []) as Array<{ _id: string; url: string; altText: string; caption?: string }>,
		isLoading: mediaQuery.isLoading,
		error: mediaQuery.error
	});

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

	const selectedQuestion = $derived(curationState.getSelectedQuestion(questions.data));

	// Sync data from queries to state
	$effect(() => {
		curationState.handleEditParam(editParam, questions.data);
		// Track statusFilter to re-filter when it changes
		const _filter = curationState.statusFilter;
		curationState.syncQuestionList(questions.data);
	});

	// Cleanup on unmount
	$effect(() => {
		return () => curationState.cleanupSearchTimeout();
	});

	// Drag and drop handler wrapper
	function handleQuestionDrop(state: DragDropState<QuestionItem>) {
		curationState.handleQuestionDrop(
			state.draggedItem,
			state.sourceContainer,
			state.targetContainer,
			questions.data
		);
	}

	// Keyboard navigation (must stay in component for DOM access)
	function handleKeyDown(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			curationState.navigateQuestion('up');
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			curationState.navigateQuestion('down');
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});

</script>

<div class="h-screen overflow-hidden bg-base-200/30 flex flex-col">
	<div class="max-w-[1800px] mx-auto p-4 sm:p-6 flex flex-col flex-1 min-h-0 w-full">
		<!-- Header -->
		<div class="flex items-center gap-4 mb-4">
			<a class="btn btn-ghost btn-sm rounded-full gap-2" href={`/admin/${moduleInfo.data?.classId || ''}`}>
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
							{curationState.questionList.length} question{curationState.questionList.length !== 1 ? 's' : ''}
						</p>
					</div>
				</div>
			{/if}
			<div class="flex-1"></div>
			{#if canEdit && curationState.editorMode !== 'add'}
				<div class="flex items-center gap-1 sm:gap-2">
					<button
						class="btn btn-primary btn-sm rounded-full gap-2"
						onclick={() => isModuleFull ? curationState.isLimitModalOpen = true : curationState.openAddQuestionModal()}
					>
						<Plus size={16} />
						<span class="hidden sm:inline">Add Question</span>
						<span class="sm:hidden">Add</span>
					</button>
				</div>
			{/if}
		</div>

		<!-- Controls for mobile/tablet (below xl) -->
		<div class="xl:hidden p-3 bg-base-100 rounded-2xl border border-base-300 mb-4">
			<QuestionListControls
				searchInput={curationState.searchInput}
				sortMode={curationState.sortMode}
				statusFilter={curationState.statusFilter}
				defaultStatus={curationState.defaultQuestionStatus}
				reorderMode={curationState.reorderMode}
				selectedCount={curationState.selectedQuestions.size}
				totalCount={questions.data?.length ?? 0}
				{canEdit}
				isAdmin={admin || dev}
				variant="mobile"
				onSearchChange={(v) => { curationState.searchInput = v; curationState.updateSearch(); }}
				onSearchClear={() => curationState.clearSearch()}
				onSortChange={(m) => curationState.setSortMode(m)}
				onStatusFilterChange={(f) => curationState.setStatusFilter(f)}
				onDefaultStatusChange={(s) => curationState.setDefaultQuestionStatus(s)}
				onReorderToggle={() => curationState.toggleReorderMode()}
				onSelectAll={() => curationState.selectAllQuestions()}
				onDeselectAll={() => curationState.deselectAllQuestions()}
				onMoveSelected={() => curationState.openMoveModalForSelected()}
				onDeleteSelected={() => curationState.openBulkDeleteModal()}
			/>
		</div>

		<!-- Tablet View: Horizontal Scrolling Numbers (md to lg) -->
		{#if !curationState.reorderMode}
		<div class="hidden md:block xl:hidden mb-4">
			<div class="flex flex-row w-full overflow-x-auto overflow-y-hidden whitespace-nowrap space-x-3 relative items-center border border-base-300 px-4 py-3 rounded-3xl bg-base-100">
				{#if questions.isLoading}
					<div class="flex gap-3">
						{#each Array(10), index (index)}
							<div class="skeleton h-10 w-10 rounded-full flex-shrink-0"></div>
						{/each}
					</div>
				{:else if questions.data && questions.data.length > 0}
					{#each curationState.questionList as questionItem, index (questionItem._id)}
						<div class="indicator flex-shrink-0">
							{#if curationState.editorMode === 'edit' && curationState.editingQuestionForInline?._id === questionItem._id}
								<span class="indicator-item indicator-start badge badge-warning badge-xs"></span>
							{/if}
							{#if curationState.recentlyAddedIds.has(questionItem._id)}
								<span class="indicator-item indicator-end badge badge-success badge-xs"></span>
							{/if}
							<button
								class="btn btn-circle btn-sm btn-soft {curationState.selectedQuestionId === questionItem._id ? 'btn-primary' : 'btn-outline'}"
								onclick={() => curationState.handleQuestionSelect(questionItem._id)}
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
		<div class="md:hidden flex-1 min-h-0 flex flex-col">
			<div class="bg-base-100 rounded-2xl border border-base-300 overflow-hidden flex-1 min-h-0 flex flex-col">
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
							<h3 class="text-sm font-semibold mb-1">{curationState.search ? 'No matches' : 'No questions'}</h3>
							<p class="text-xs text-base-content/60">{curationState.search ? 'Try different search terms' : 'Add your first question'}</p>
						</div>
					</div>
				{:else if curationState.reorderMode}
					<div class="p-2 space-y-2 overflow-y-auto flex-1 min-h-0">
						{#each curationState.questionList as questionItem, index (questionItem._id)}
							<div
								use:droppable={{ container: index.toString(), callbacks: { onDrop: handleQuestionDrop } }}
								use:draggable={{ container: index.toString(), dragData: questionItem }}
								animate:flip={{ duration: 300 }}
							>
								<QuestionListItem
									question={questionItem}
									{index}
									isSelected={curationState.selectedQuestions.has(questionItem._id)}
									isHighlighted={curationState.selectedQuestionId === questionItem._id}
									hasAttachment={questionHasAttachments.has(questionItem._id)}
									isRecentlyAdded={curationState.recentlyAddedIds.has(questionItem._id)}
									variant="mobile"
									reorderMode={true}
									onSelect={() => curationState.handleQuestionSelect(questionItem._id)}
									onToggleSelection={() => curationState.toggleQuestionSelection(questionItem._id)}
								/>
							</div>
						{/each}
					</div>
				{:else}
					<div class="p-2 space-y-2 overflow-y-auto flex-1 min-h-0">
						{#each curationState.questionList as questionItem, index (questionItem._id)}
							<QuestionListItem
								question={questionItem}
								{index}
								isSelected={curationState.selectedQuestions.has(questionItem._id)}
								isHighlighted={curationState.selectedQuestionId === questionItem._id}
								hasAttachment={questionHasAttachments.has(questionItem._id)}
								isRecentlyAdded={curationState.recentlyAddedIds.has(questionItem._id)}
								variant="mobile"
								onSelect={() => curationState.handleQuestionSelect(questionItem._id)}
								onToggleSelection={() => curationState.toggleQuestionSelection(questionItem._id)}
							/>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="hidden md:grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0">
			<!-- Desktop Sidebar (xl and above) -->
			<div class="xl:col-span-5 2xl:col-span-4 hidden xl:block min-h-0">
				<div class="bg-base-200/30 rounded-2xl border border-base-300 h-full overflow-hidden flex flex-col">
					<div class="p-4 border-b border-base-300 bg-base-100 flex-shrink-0">
						<QuestionListControls
							searchInput={curationState.searchInput}
							sortMode={curationState.sortMode}
							statusFilter={curationState.statusFilter}
							defaultStatus={curationState.defaultQuestionStatus}
							reorderMode={curationState.reorderMode}
							selectedCount={curationState.selectedQuestions.size}
							totalCount={questions.data?.length ?? 0}
							{canEdit}
							isAdmin={admin || dev}
							variant="desktop"
							onSearchChange={(v) => { curationState.searchInput = v; curationState.updateSearch(); }}
							onSearchClear={() => curationState.clearSearch()}
							onSortChange={(m) => curationState.setSortMode(m)}
							onStatusFilterChange={(f) => curationState.setStatusFilter(f)}
							onDefaultStatusChange={(s) => curationState.setDefaultQuestionStatus(s)}
							onReorderToggle={() => curationState.toggleReorderMode()}
							onSelectAll={() => curationState.selectAllQuestions()}
							onDeselectAll={() => curationState.deselectAllQuestions()}
							onMoveSelected={() => curationState.openMoveModalForSelected()}
							onDeleteSelected={() => curationState.openBulkDeleteModal()}
						/>
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
									<h3 class="text-sm font-semibold mb-1 text-base-content">{curationState.search ? 'No matches' : 'No questions'}</h3>
									<p class="text-xs text-base-content/60">{curationState.search ? 'Try different search terms' : 'Add your first question'}</p>
									{#if curationState.search}
										<button class="btn btn-sm btn-ghost rounded-full mt-3" onclick={() => curationState.clearSearch()}>Clear Search</button>
									{/if}
								</div>
							</div>
						{:else if curationState.reorderMode}
							<div class="divide-y divide-base-200">
								{#each curationState.questionList as questionItem, index (questionItem._id)}
									<div
										use:droppable={{ container: index.toString(), callbacks: { onDrop: handleQuestionDrop } }}
										use:draggable={{ container: index.toString(), dragData: questionItem }}
										class="px-4 py-3 transition-all hover:bg-base-200/50 cursor-grab active:cursor-grabbing {curationState.recentlyAddedIds.has(questionItem._id) ? 'bg-success/5' : ''}"
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
								{#each curationState.questionList as questionItem, index (questionItem._id)}
									<QuestionListItem
										question={questionItem}
										{index}
										isSelected={curationState.selectedQuestions.has(questionItem._id)}
										isHighlighted={curationState.selectedQuestionId === questionItem._id}
										hasAttachment={questionHasAttachments.has(questionItem._id)}
										isRecentlyAdded={curationState.recentlyAddedIds.has(questionItem._id)}
										variant="desktop"
										onSelect={() => curationState.handleQuestionSelect(questionItem._id)}
										onToggleSelection={() => curationState.toggleQuestionSelection(questionItem._id)}
									/>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Main Content Panel (md and above) -->
			<div class="xl:col-span-7 2xl:col-span-8 hidden md:block min-h-0">
				<div class="bg-base-100 rounded-2xl border border-base-300 h-full overflow-hidden flex flex-col">
					<!-- Reorder mode only visible on tablet (md-xl) -->
					<div class="h-full flex-col overflow-hidden {curationState.reorderMode ? 'flex xl:hidden' : 'hidden'}">
						<div class="p-4 border-b border-base-300">
							<h3 class="text-lg font-semibold">Reorder Questions</h3>
							<p class="text-sm text-base-content/60 mt-1">Drag questions to reorder them</p>
						</div>
						<div class="flex-1 overflow-y-auto pb-8 min-h-0">
							<div class="divide-y divide-base-200">
								{#each curationState.questionList as questionItem, index (questionItem._id)}
									<div
										use:droppable={{ container: index.toString(), callbacks: { onDrop: handleQuestionDrop } }}
										use:draggable={{ container: index.toString(), dragData: questionItem }}
										class="px-4 py-3 transition-all hover:bg-base-200/50 cursor-grab active:cursor-grabbing {curationState.recentlyAddedIds.has(questionItem._id) ? 'bg-success/5' : ''}"
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

					<!-- Normal views -->
					<div class="{curationState.reorderMode ? 'hidden xl:flex' : 'flex'} flex-col h-full overflow-hidden">
					{#if curationState.editorMode === 'add'}
						<QuestionEditorInline
							{moduleId}
							mode="add"
							defaultStatus={curationState.defaultQuestionStatus}
							onSave={(id) => curationState.handleInlineEditorSave(id)}
							onCancel={() => curationState.handleInlineEditorCancel()}
							onChange={() => curationState.handleEditorChange()}
						/>
					{:else if curationState.editorMode === 'edit' && curationState.editingQuestionForInline}
						{#key curationState.editingQuestionForInline._id}
							<QuestionEditorInline
								{moduleId}
								editingQuestion={curationState.editingQuestionForInline}
								mode="edit"
								defaultStatus={curationState.defaultQuestionStatus}
								onSave={(id) => curationState.handleInlineEditorSave(id)}
								onCancel={() => curationState.handleInlineEditorCancel()}
								onChange={() => curationState.handleEditorChange()}
							/>
						{/key}
					{:else if selectedQuestion}
						<QuestionDetailView
							question={selectedQuestion}
							questionIndex={curationState.selectedQuestionIndex}
							media={media.data}
							{canEdit}
							variant="desktop"
							{isModuleFull}
							onEdit={() => curationState.editQuestion(selectedQuestion)}
							onMove={() => curationState.openMoveModalForOne(selectedQuestion._id)}
							onDuplicate={() => isModuleFull ? curationState.isLimitModalOpen = true : curationState.quickDuplicate(selectedQuestion._id)}
							onDuplicateMany={() => curationState.openDuplicateModal(questions.data, selectedQuestion._id)}

							onDelete={() => curationState.openDeleteModal(questions.data, selectedQuestion._id)}
							onAttachmentClick={(a) => curationState.openAttachmentViewer(a)}
						/>
					{:else if curationState.selectedQuestions.size > 0}
						<div class="h-full flex flex-col items-center justify-center p-8 text-center">
							<div class="text-4xl mb-4">📋</div>
							<h3 class="text-lg font-semibold mb-2">{curationState.selectedQuestions.size} questions selected</h3>
							<p class="text-sm text-base-content/60 mb-4">Use the toolbar to move or delete selected questions</p>
							<div class="flex gap-2">
								<button class="btn btn-sm btn-ghost rounded-full gap-1" onclick={() => curationState.openMoveModalForSelected()}>
									<ArrowRightLeft size={14} />
									Move All
								</button>
								<button class="btn btn-sm btn-error rounded-full gap-1" onclick={() => curationState.openBulkDeleteModal()}>
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
	<div class="modal md:hidden" class:modal-open={curationState.selectedQuestionId !== null}>
		<div class="modal-box max-w-2xl max-h-[90vh] p-0">
			<div class="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-base-300 bg-base-100">
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium">Question #{curationState.questionList.findIndex(q => q._id === curationState.selectedQuestionId) + 1}</span>
				</div>
				<button class="btn btn-sm btn-ghost btn-circle" onclick={() => curationState.clearMobileSelection()}>
					<X size={18} />
				</button>
			</div>
			<QuestionDetailView
				question={selectedQuestion}
				questionIndex={curationState.questionList.findIndex(q => q._id === curationState.selectedQuestionId)}
				{canEdit}
				variant="mobile"
				{isModuleFull}
				onEdit={() => curationState.editQuestion(selectedQuestion)}
				onMove={() => curationState.openMoveModalForOne(selectedQuestion._id)}
				onDuplicate={() => isModuleFull ? curationState.isLimitModalOpen = true : curationState.quickDuplicate(selectedQuestion._id)}
				onDuplicateMany={() => curationState.openDuplicateModal(questions.data, selectedQuestion._id)}
				onDelete={() => curationState.openDeleteModal(questions.data, selectedQuestion._id)}
			/>
		</div>
		<div class="modal-backdrop bg-black/50" onclick={() => curationState.clearMobileSelection()}></div>
	</div>
{/if}

<AddQuestionModal isAddModalOpen={curationState.isAddQuestionModalOpen} closeAddModal={() => curationState.closeAddQuestionModal()} {moduleId} defaultStatus={curationState.defaultQuestionStatus} />
<EditQuestionModal isEditModalOpen={curationState.isEditQuestionModalOpen} closeEditModal={() => curationState.closeEditQuestionModal()} editingQuestion={curationState.editingQuestion} {moduleId} />
<DuplicateQuestionModal 
    isOpen={curationState.isDuplicateModalOpen} 
    onCancel={() => curationState.cancelDuplicateModal()} 
    onConfirm={(count) => curationState.confirmDuplicateModal(count)} 
    itemName={curationState.duplicateTarget?.stem?.replace(/<[^>]*>/g, '').substring(0, 30)} 
/>
<DeleteConfirmationModal isDeleteModalOpen={curationState.isDeleteQuestionModalOpen} onCancel={() => curationState.cancelQuestionDelete()} onConfirm={() => curationState.confirmQuestionDelete()} itemName={curationState.questionToDelete?.stem} itemType="question" />
<DeleteConfirmationModal isDeleteModalOpen={curationState.isBulkDeleteModalOpen} onCancel={() => curationState.closeBulkDeleteModal()} onConfirm={() => curationState.confirmBulkDelete()} itemName={`${curationState.selectedQuestions.size} selected questions`} itemType="question" />
<MoveQuestionsModal isOpen={curationState.isMoveModalOpen} onClose={(s?: boolean) => curationState.handleCloseMoveModal(s)} sourceModuleId={moduleId} selectedQuestionIds={curationState.moveQuestionIds} />

<dialog class="modal" class:modal-open={curationState.showUnsavedChangesModal}>
	<div class="modal-box">
		<h3 class="font-bold text-lg mb-4">Unsaved Changes</h3>
		<p class="py-4">You have unsaved changes. Do you want to discard them and continue?</p>
		<div class="modal-action">
			<button class="btn btn-ghost rounded-full" onclick={() => curationState.cancelDiscardChanges()}>Cancel</button>
			<button class="btn btn-error rounded-full" onclick={() => curationState.confirmDiscardChanges()}>Discard Changes</button>
		</div>
	</div>
	<div class="modal-backdrop bg-black/50" onclick={() => curationState.cancelDiscardChanges()}></div>
</dialog>

<AttachmentViewerModal isOpen={curationState.isAttachmentModalOpen} attachment={curationState.selectedAttachment} onClose={() => curationState.closeAttachmentViewer()} />
<ModuleLimitModal isOpen={curationState.isLimitModalOpen} onClose={() => curationState.isLimitModalOpen = false} />

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
