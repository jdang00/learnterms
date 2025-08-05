<script lang="ts">
	import type { PageData } from './$types';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { Id, Doc } from '../../../../../convex/_generated/dataModel';
	import { api } from '../../../../../convex/_generated/api.js';
	import { flip } from 'svelte/animate';
	import { Pencil, Trash2, Plus, ArrowLeft } from 'lucide-svelte';
	import AddQuestionModal from '$lib/admin/AddQuestionModal.svelte';
	import EditQuestionModal from '$lib/admin/EditQuestionModal.svelte';

	let { data }: { data: PageData } = $props();
	const moduleId = data.moduleId;

	const questions = useQuery(
		api.question.getQuestionsByModuleAdmin,
		{ id: moduleId as Id<'module'> },
		{ initialData: data.questions }
	);

	const moduleInfo = useQuery(api.module.getModuleById, { id: moduleId as Id<'module'> });

	const client = useConvexClient();

	let showTruncated = $state(true);

	// Question operations
	let isEditQuestionModalOpen = $state(false);
	let isAddQuestionModalOpen = $state(false);
	let isDeleteQuestionModalOpen = $state(false);
	let editingQuestion = $state<QuestionItem | null>(null);
	let questionToDelete = $state<QuestionItem | null>(null);

	type QuestionItem = NonNullable<Doc<'question'>[]>[0];

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
			console.log('Question deleted successfully');
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

	type ModuleItem = NonNullable<Doc<'module'>[]>[0];
	let moduleList = $state<ModuleItem[]>([]);

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
				classId: moduleInfo.data?.classId as Id<'class'>
			});
		} catch (error) {
			console.error('Failed to update module order:', error);
		}
	}
</script>

<div class="min-h-screen p-8 max-w-7xl mx-auto">
	<a class="btn mb-4 btn-ghost" href="/admin/{moduleInfo.data?.classId}"
		><ArrowLeft size={16} />Back</a
	>

	<div class="mb-8 flex flex-col gap-2">
		<div class="flex flex-row justify-between items-center">
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
					<h1 class="text-2xl font-bold text-base-content">{moduleInfo.data.title}</h1>
					<p class="text-base-content/70">
						Manage questions for {moduleInfo.data.title}. Drag and drop to reorder them.
					</p>
				</div>
			{/if}

			<button class="btn btn-primary gap-2" onclick={openAddQuestionModal}>
				<Plus size={16} />
				<span>Add New Question</span>
			</button>
		</div>
	</div>

	{#if questions.isLoading}
		<div class="flex items-center justify-center p-8">
			<div class="text-base-content/70">Loading questions...</div>
		</div>
	{:else if questions.error != null}
		<div class="flex items-center justify-center p-8">
			<div class="text-error">Failed to load: {questions.error.toString()}</div>
		</div>
	{:else if questions.data.length === 0}
		<div class="flex items-center justify-center p-8">
			<div class="text-center">
				<div class="text-4xl mb-4">📚</div>
				<h3 class="text-lg font-semibold mb-2 text-base-content">No questions found</h3>
				<p class="text-base-content/70">No questions available for the selected module.</p>
			</div>
		</div>
	{:else}
		<button class="btn mb-4" onclick={() => (showTruncated = !showTruncated)}>
			{showTruncated ? 'Hide ' : 'Show '} Options</button
		>
		<div class="space-y-4">
			{#each questions.data as questionItem, index (questionItem._id)}
				<div
					use:droppable={{
						container: index.toString(),
						callbacks: { onDrop: handleDrop }
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

								<div class="dropdown dropdown-end">
									<button class="btn btn-ghost btn-circle m-1">⋮</button>
									<ul
										tabindex="-1"
										class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
									>
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
							</div>

							<div class="flex flex-row gap-3">
								{#if showTruncated}
									<!-- Options -->
									{#if questionItem.options?.length}
										<div class="rounded-lg border border-base-300 bg-base-200/40 p-3 w-3/4">
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
											class="prose prose-sm max-w-none text-base-content/80 rounded-lg border border-base-300 bg-base-200/40 p-3 w-1/4"
										>
											<div
												class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2"
											>
												EXPLANATION
											</div>
											<p class="m-0">{questionItem.explanation}</p>
										</div>
									{/if}
								{/if}
							</div>
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

<!-- Question Delete Modal -->
{#if isDeleteQuestionModalOpen}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg">Delete Question</h3>
			<p class="py-4">
				Are you sure you want to delete this question? This action cannot be undone.
			</p>
			<div class="modal-action">
				<button class="btn" onclick={cancelQuestionDelete}>Cancel</button>
				<button class="btn btn-error" onclick={confirmQuestionDelete}>Delete</button>
			</div>
		</div>
	</div>
{/if}
