<script lang="ts">
	import type { PageData } from './$types';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { Id, Doc } from '../../../../../convex/_generated/dataModel';
	import { api } from '../../../../../convex/_generated/api.js';
	import { flip } from 'svelte/animate';
	import { Pencil, Trash2, Plus, ArrowLeft } from 'lucide-svelte';
	import { ArrowRightLeft } from 'lucide-svelte';
	import AddQuestionModal from '$lib/admin/AddQuestionModal.svelte';
	import EditQuestionModal from '$lib/admin/EditQuestionModal.svelte';
	import DeleteConfirmationModal from '$lib/admin/DeleteConfirmationModal.svelte';
	import MoveQuestionsModal from '$lib/admin/MoveQuestionsModal.svelte';
	import { convertToDisplayFormat } from '$lib/utils/questionType.js';
	import { useClerkContext } from 'svelte-clerk';

	let { data }: { data: PageData } = $props();
	const moduleId = data.moduleId;

	let search = $state('');
	let searchInput = $state('');
	let sortMode: 'order' | 'created_desc' = $state('order');

	// Debounce search input to prevent excessive queries
	let searchTimeout: number | null = null;

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

	const moduleInfo = useQuery(api.module.getModuleById, { id: moduleId as Id<'module'> });

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

	type QuestionItem = Doc<'question'>;

	function editQuestion(questionItem: QuestionItem) {
		editingQuestion = questionItem;
		isEditQuestionModalOpen = true;
	}

	function closeEditQuestionModal() {
		isEditQuestionModalOpen = false;
		editingQuestion = null;
	}

	function openAddQuestionModal() {
		isAddQuestionModalOpen = true;
	}

	function closeAddQuestionModal() {
		isAddQuestionModalOpen = false;
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

	$effect(() => {
		if (questions.data) {
			questionList = [...questions.data];
		}
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
</script>

<div class="min-h-screen p-8 max-w-7xl mx-auto">
	<a class="btn mb-4 btn-ghost" href={`/admin/${moduleInfo.data?.classId || ''}`}>
		<ArrowLeft size={16} />Back
	</a>

	<div class="mb-8 flex flex-col gap-2">
		<div class="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start">
			{#if moduleInfo.isLoading}
				<div class="flex items-center justify-center p-8">
					<div class="text-base-content/70">Loading module...</div>
				</div>
			{:else if moduleInfo.error != null}
				<div class="flex items-center justify-center p-8">
					<div class="text-error">Failed to load: {moduleInfo.error.toString()}</div>
				</div>
			{:else if moduleInfo.data == null}
				<div class="flex items-center justify-center p-8">
					<div class="text-center">
						<div class="text-4xl mb-4">📚</div>
						<h3 class="text-lg font-semibold mb-2 text-base-content">
							Module information not found.
						</h3>
					</div>
				</div>
			{:else}
				<div>
					<h1
						class="text-xl sm:text-2xl font-bold text-base-content flex items-center gap-2 sm:gap-3"
					>
						<span class="text-2xl sm:text-3xl">{moduleInfo.data?.emoji || '📘'}</span>
						<span>{moduleInfo.data.title}</span>
					</h1>
					<p class="text-sm sm:text-base text-base-content/70">
						Manage questions for {moduleInfo.data.title}. {#if admin}Drag and drop to reorder them.{/if}
					</p>
				</div>
			{/if}

			{#if canEdit}
				<button class="btn btn-primary gap-2" onclick={openAddQuestionModal}>
					<Plus size={16} />
					<span class="hidden sm:inline">Add New Question</span>
					<span class="sm:hidden">Add Question</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Question Management Controls - Always visible -->
	<div class="mb-6 p-4 bg-base-200/30 border border-base-300 rounded-lg">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<!-- Search on the left -->
			<label class="input input-bordered flex items-center gap-2 w-full lg:w-80">
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
					placeholder="Search questions..."
					value={searchInput}
					oninput={(e) => {
						searchInput = (e.target as HTMLInputElement).value;
						updateSearch();
					}}
				/>
				{#if searchInput}
					<button class="btn btn-ghost btn-xs" onclick={() => {
						searchInput = '';
						search = '';
						if (searchTimeout) {
							clearTimeout(searchTimeout);
							searchTimeout = null;
						}
					}}>Clear</button>
				{/if}
			</label>

			<!-- Controls on the right -->
			<div class="flex flex-wrap items-center gap-2 lg:justify-end">
				<button class="btn btn-outline gap-2" onclick={() => (showTruncated = !showTruncated)}>
					<span class="hidden sm:inline">{showTruncated ? 'Hide' : 'Show'} Options</span>
					<span class="sm:hidden">{showTruncated ? 'Hide' : 'Show'}</span>
				</button>

				<div class="join">
					<button class={`btn btn-ghost join-item ${sortMode === 'order' ? 'btn-active' : ''}`} onclick={() => (sortMode = sortMode === 'order' ? 'created_desc' : 'order')}>
						{sortMode === 'order' ? 'Normal order' : 'Last created'}
					</button>
				</div>

				{#if canEdit && selectedQuestions.size > 0}
					<button class="btn btn-secondary gap-2" onclick={openMoveModalForSelected}>
						<ArrowRightLeft size={16} />
						<span class="hidden sm:inline">{selectedQuestions.size}</span>
						<span class="sm:hidden">Move ({selectedQuestions.size})</span>
					</button>
					<button class="btn btn-error gap-2" onclick={openBulkDeleteModal}>
						<Trash2 size={16} />
						<span class="hidden sm:inline">{selectedQuestions.size}</span>
						<span class="sm:hidden">Delete ({selectedQuestions.size})</span>
					</button>
					<button class="btn btn-ghost" onclick={deselectAllQuestions}>Deselect All</button>
				{:else if canEdit && questions.data && questions.data.length > 0}
					<button class="btn btn-ghost" onclick={selectAllQuestions}>Select All</button>
				{/if}
			</div>
		</div>
	</div>

	{#if questions.isLoading}
		<div class="space-y-4">
			{#each Array(5), index (index)}
				<div class="rounded-xl bg-base-100 shadow-sm border border-base-300 p-4">
					<div class="flex flex-col gap-4">
						<div class="flex items-start justify-between gap-3">
							<div class="flex items-start gap-3">
								<div class="flex items-center gap-2">
									<div class="skeleton h-5 w-5 rounded"></div>
									<div class="skeleton h-6 w-8 rounded-full"></div>
								</div>
								<div class="flex flex-col gap-2">
									<div class="skeleton h-6 w-3/4"></div>
									<div class="flex gap-2">
										<div class="skeleton h-5 w-16"></div>
										<div class="skeleton h-5 w-20"></div>
										<div class="skeleton h-5 w-14"></div>
									</div>
								</div>
							</div>
							<div class="skeleton h-8 w-8 rounded-full"></div>
						</div>

						<div class="flex flex-col gap-3 sm:flex-row">
							<div class="rounded-lg border border-base-300 bg-base-200/40 p-3 flex-1">
								<div class="skeleton h-4 w-16 mb-2"></div>
								<div class="space-y-2">
									<div class="skeleton h-8 w-full"></div>
									<div class="skeleton h-8 w-5/6"></div>
									<div class="skeleton h-8 w-4/6"></div>
									<div class="skeleton h-8 w-3/6"></div>
								</div>
							</div>

							<div class="rounded-lg border border-base-300 bg-base-200/40 p-3 flex-1">
								<div class="skeleton h-4 w-24 mb-2"></div>
								<div class="space-y-2">
									<div class="skeleton h-4 w-full"></div>
									<div class="skeleton h-4 w-5/6"></div>
									<div class="skeleton h-4 w-4/6"></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else if questions.error != null}
		<div class="flex items-center justify-center p-8">
			<div class="text-error">Failed to load: {questions.error.toString()}</div>
		</div>
	{:else if !questions.data || questions.data.length === 0}
		<div class="flex items-center justify-center p-8">
			<div class="text-center">
				<div class="text-4xl mb-4">📚</div>
				<h3 class="text-lg font-semibold mb-2 text-base-content">
					{search ? 'No questions match your search' : 'No questions found'}
				</h3>
				<p class="text-base-content/70">
					{search ? 'Try adjusting your search terms or clear the search to see all questions.' : 'No questions available for the selected module.'}
				</p>
				{#if search}
					<button class="btn btn-primary mt-4" onclick={() => {
						searchInput = '';
						search = '';
						if (searchTimeout) {
							clearTimeout(searchTimeout);
							searchTimeout = null;
						}
					}}>
						Clear Search
					</button>
				{/if}
			</div>
		</div>
	{:else}

		<div class="space-y-4">
			{#each questionList as questionItem, index (questionItem._id)}
				<div
					use:droppable={{
						container: index.toString(),
						callbacks: { onDrop: handleQuestionDrop }
					}}
					class="relative rounded-xl bg-base-100 shadow-sm border border-base-300 p-4
              transition-shadow duration-300 hover:shadow-md hover:border-primary/30
              svelte-dnd-touch-feedback"
					animate:flip={{ duration: 300 }}
				>
					<div
						use:draggable={{
							container: index.toString(),
							dragData: questionItem,
							interactive: [
								'[data-delete-btn]',
								'[data-move-btn]',
								'[data-view-btn]',
								'[data-edit-btn]',
								'.interactive',
								'input[type="checkbox"]',
								'label'
							]
						}}
						class="cursor-move"
					>
						<div class="flex flex-col gap-4">
							<!-- Header row: Checkbox + Title + Index badge -->
							<div class="flex items-start justify-between gap-3">
								<div class="flex items-start gap-3">
									<div class="flex items-center gap-2">
										<label class="label cursor-pointer p-0">
											<input
												type="checkbox"
												class="checkbox checkbox-primary"
												aria-label="Select question"
												checked={selectedQuestions.has(questionItem._id)}
												onclick={() => toggleQuestionSelection(questionItem._id)}
											/>
										</label>
										<div
											class="text-xs text-base-content/60 font-mono badge rounded-full"
											title="Position"
										>
											{index + 1}
										</div>
									</div>

									<div class="flex flex-col">
										<h3
											class="card-title text-base-content text-left leading-snug line-clamp-2"
											title={questionItem.stem}
										>
											{questionItem.stem}
										</h3>

										<div class="mt-1 flex flex-wrap items-center gap-2">
											{#if questionItem.aiGenerated}
												<div class="badge badge-soft badge-info" title="AI Generated">
													🤖 AI Generated
												</div>
											{:else}
												<div class="badge badge-soft badge-success" title="User Created">
													✍️ User Created
												</div>
											{/if}

											{#if questionItem.type}
												<div
													class="badge badge-ghost"
													title={`Type: ${convertToDisplayFormat(questionItem.type)}`}
												>
													{convertToDisplayFormat(questionItem.type)}
												</div>
											{/if}
											{#if questionItem.status}
												<div
													class="badge badge-soft
                             {questionItem.status === 'draft'
														? 'badge-warning'
														: questionItem.status === 'published'
															? 'badge-success'
															: 'badge-neutral'}"
													title={`Status: ${questionItem.status}`}
												>
													{questionItem.status}
												</div>
											{/if}
										</div>
									</div>
								</div>

								{#if canEdit}
									<div class="dropdown dropdown-end">
										<button class="btn btn-ghost btn-circle m-1">⋮</button>
										<ul
											tabindex="-1"
											class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
										>
											<li>
												<button
													data-move-btn
													class="btn btn-sm btn-ghost w-full justify-start"
													type="button"
													aria-label="Move question"
													onclick={() => openMoveModalForOne(questionItem._id)}
												>
													<ArrowRightLeft size={16} />
													<span>Move</span>
												</button>
											</li>
											<li>
												<button
													data-edit-btn
													class="btn btn-sm btn-ghost w-full justify-start"
													type="button"
													aria-label="Edit question"
													onclick={() => editQuestion(questionItem)}
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
													aria-label="Delete question"
													onclick={() => handleQuestionDelete(questionItem._id)}
												>
													<Trash2 size={16} />
													<span>Delete</span>
												</button>
											</li>
										</ul>
									</div>
								{/if}
							</div>

							{#if showTruncated}
								<div class="flex flex-col gap-3 sm:flex-row">
									<!-- Options -->
									{#if questionItem.options?.length}
										<div class="rounded-lg border border-base-300 bg-base-200/40 p-3 flex-1">
											<div
												class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2"
											>
												Options
											</div>

											<ul class="bg-transparent p-0 gap-1">
												{#each questionItem.options as option (option.id)}
													<li class="rounded-lg">
														<div
															class="flex items-center justify-between rounded-lg px-2 py-1.5
                             hover:bg-base-200"
														>
															<span
																class="text-sm {questionItem.correctAnswers.includes(option.id)
																	? 'text-base-content/80'
																	: 'text-base-content/50'}">{option.text}</span
															>
														</div>
													</li>
												{/each}
											</ul>
										</div>
									{/if}

									<!-- Explanation -->
									{#if questionItem.explanation}
										<div
											class="prose prose-sm max-w-none text-base-content/80 rounded-lg border border-base-300 bg-base-200/40 p-3 flex-1"
										>
											<div
												class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2"
											>
												EXPLANATION
											</div>
											<p class="m-0">{questionItem.explanation}</p>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Question Modals -->
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
