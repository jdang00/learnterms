<script lang="ts">
	import supabase from '$lib/supabaseClient';
	import type { AdminQuestions } from '$lib/types';
	import type { PageData } from './$types';
	import { Trash2, Pencil, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-svelte';
	import { browser } from '$app/environment';

	// Retrieve the questions from props.
	let { data }: { data: PageData } = $props();
	let questions: AdminQuestions[] = $state(data.questions);

	// Reactive states for search query, chapter filter, and the currently editing question.
	let searchQuery = $state('');
	let selectedChapter = $state('');
	let isDeleteModalOpen = $state(false);
	let pendingDeleteId = $state<string>('');
	let isDeleting = $state(false);
	let deleteError = $state<string | null>(null);
	let deleteAllModal = $state(false);

	// Edit modal state
	let isEditModalOpen = $state(false);
	let editingQuestion = $state<AdminQuestions | null>(null);
	let isSaving = $state(false);
	let saveError = $state<string | null>(null);

	// Pagination states
	let currentPage = $state(1);
	let questionsPerPage = $state(10);

	$effect(() => {
		if (browser) {
			// Initialize from URL parameters
			const urlParams = new URLSearchParams(window.location.search);
			searchQuery = urlParams.get('search') || '';
			currentPage = parseInt(urlParams.get('page') || '1', 10);
			questionsPerPage = parseInt(urlParams.get('perPage') || '10', 10);

			// Create effect for URL updates
			$effect(() => {
				const params = new URLSearchParams();
				if (searchQuery) params.set('search', searchQuery);
				params.set('page', currentPage.toString());
				params.set('perPage', questionsPerPage.toString());

				const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
				window.history.replaceState({}, '', newUrl);
			});

			// Handle browser back/forward navigation
			window.addEventListener('popstate', () => {
				const params = new URLSearchParams(window.location.search);
				searchQuery = params.get('search') || '';
				currentPage = parseInt(params.get('page') || '1', 10);
				questionsPerPage = parseInt(params.get('perPage') || '10', 10);
			});
		}
	});

	// Derive filtered questions based on searchQuery and selectedChapter.
	let filteredQuestions = $derived(
		questions.filter(
			(q) =>
				q.question_data.question.toLowerCase().includes(searchQuery.toLowerCase()) &&
				(selectedChapter === '' || q.chapter === selectedChapter)
		)
	);

	// Reset to first page when filters change
	$effect(() => {
		// When search query or chapter changes, reset to page 1
		if (searchQuery || selectedChapter) {
			currentPage = 1;
		}
	});

	// Pagination calculations
	let totalPages = $derived(Math.ceil(filteredQuestions.length / questionsPerPage));
	let paginatedQuestions = $derived(
		filteredQuestions.slice((currentPage - 1) * questionsPerPage, currentPage * questionsPerPage)
	);

	// Go to a specific page
	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
		}
	}

	// Open edit modal for a question
	function openEditModal(question: AdminQuestions) {
		// Create a deep copy to prevent direct modification of the original
		editingQuestion = JSON.parse(JSON.stringify(question));
		isEditModalOpen = true;
		saveError = null;
	}

	// Add a new option to the question being edited
	function addOption() {
		if (editingQuestion) {
			editingQuestion.question_data.options = [...editingQuestion.question_data.options, ''];
		}
	}

	// Remove an option at the specified index
	function removeOption(index: number) {
		if (editingQuestion) {
			// Filter out the option at the specified index
			editingQuestion.question_data.options = editingQuestion.question_data.options.filter(
				(_, i) => i !== index
			);

			// Also remove it from correct answers if it was there
			const optionToRemove = editingQuestion.question_data.options[index];
			editingQuestion.question_data.correct_answers =
				editingQuestion.question_data.correct_answers.filter((ans) => ans !== optionToRemove);
		}
	}

	// Add a new correct answer
	function addCorrectAnswer() {
		if (editingQuestion) {
			editingQuestion.question_data.correct_answers = [
				...editingQuestion.question_data.correct_answers,
				''
			];
		}
	}

	// Remove a correct answer at the specified index
	function removeCorrectAnswer(index: number) {
		if (editingQuestion) {
			editingQuestion.question_data.correct_answers =
				editingQuestion.question_data.correct_answers.filter((_, i) => i !== index);
		}
	}

	async function updateQuestion() {
		if (!editingQuestion) return;

		// Basic validation
		if (!editingQuestion.question_data.question.trim()) {
			saveError = 'Question text is required';
			return;
		}

		if (editingQuestion.question_data.options.length < 2) {
			saveError = 'At least two options are required';
			return;
		}

		if (editingQuestion.question_data.correct_answers.length < 1) {
			saveError = 'At least one correct answer is required';
			return;
		}

		// Filter out any empty correct answers
		editingQuestion.question_data.correct_answers =
			editingQuestion.question_data.correct_answers.filter((answer) => answer.trim() !== '');

		isSaving = true;
		saveError = null;

		try {
			const { error } = await supabase
				.from('pharmquestions')
				.update({
					question_data: editingQuestion.question_data,
					chapter: editingQuestion.chapter
				})
				.eq('id', editingQuestion.id);

			if (error) throw error;

			// Update the question in the local state
			questions = questions.map((q) =>
				q.id === editingQuestion?.id
					? {
							...q,
							question_data: { ...editingQuestion.question_data },
							chapter: editingQuestion.chapter
						}
					: q
			);

			// Close the modal
			isEditModalOpen = false;
			editingQuestion = null;
		} catch (error) {
			saveError = 'Failed to update question';
			console.error('Error updating question:', error);
		} finally {
			isSaving = false;
		}
	}

	/**
	 * Delete the question from the database.
	 */
	async function handleDelete() {
		if (!pendingDeleteId) return;

		isDeleting = true;
		deleteError = null;

		const { error } = await supabase.from('pharmquestions').delete().eq('id', pendingDeleteId);

		isDeleting = false;

		if (error) {
			deleteError = error.message;
		} else {
			questions = questions.filter((q) => q.id !== pendingDeleteId);
			pendingDeleteId = '';
			isDeleteModalOpen = false;

			// If we deleted the last item on the current page, go to the previous page
			if (paginatedQuestions.length === 1 && currentPage > 1) {
				currentPage--;
			}
		}
	}

	// Add this function to extract the letter from an option
	function getLetterFromOption(option: string): string {
		const match = option.match(/^([A-Z])\./);
		return match ? match[1] : '';
	}

	// Function to get the full option text by letter
	function getOptionByLetter(options: string[], letter: string): string {
		return options.find((opt) => opt.startsWith(`${letter}.`)) || '';
	}
</script>

<div class="flex flex-col gap-4 mt-12 mx-6">
	<div class="flex flex-col sm:flex-row justify-between items-start">
		<div class="flex flex-row gap-2">
			<a href="/admin" class="btn btn-ghost"><ArrowLeft /></a>

			<button class="btn btn-error btn-soft mb-4 sm:mb-0" onclick={() => (deleteAllModal = true)}
				>Delete All</button
			>
		</div>

		<h2 class="text-xl font-bold px-1 pt-2">Questions</h2>

		<!-- Controls: Search Bar and Chapter Filter -->
		<div class="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
			<div>
				<label class="input">
					<svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
						<g
							stroke-linejoin="round"
							stroke-linecap="round"
							stroke-width="2.5"
							fill="none"
							stroke="currentColor"
						>
							<circle cx="11" cy="11" r="8"></circle>
							<path d="m21 21-4.3-4.3"></path>
						</g>
					</svg>
					<input
						id="search-input"
						type="search"
						placeholder="Search"
						bind:value={searchQuery}
						class="grow"
					/>
				</label>
			</div>

			<div>
				<select id="chapter-select" class="select" bind:value={selectedChapter}>
					<option value="">All Chapters</option>
					{#each Array.from(new Set(questions.map((q) => q.chapter))).sort() as chapter}
						{#if chapter}
							<option value={chapter} selected={selectedChapter === chapter}>{chapter}</option>
						{/if}
					{/each}
				</select>
				<label for="chapter-select" class="sr-only">Select Chapter</label>
			</div>
		</div>
	</div>

	<!-- Top Pagination Controls -->
	<div class="flex flex-col sm:flex-row justify-between items-center mb-4">
		<div class="flex items-center mb-4 sm:mb-0">
			<span class="text-sm">
				Showing {filteredQuestions.length ? (currentPage - 1) * questionsPerPage + 1 : 0} to
				{Math.min(currentPage * questionsPerPage, filteredQuestions.length)} of {filteredQuestions.length}
				entries
			</span>
			<div class="ml-4">
				<label for="top-per-page" class="sr-only">Items per page</label>
				<select id="top-per-page" class="select select-sm" bind:value={questionsPerPage}>
					<option value={5}>5 per page</option>
					<option value={10}>10 per page</option>
					<option value={25}>25 per page</option>
					<option value={50}>50 per page</option>
					<option value={100}>100 per page</option>
				</select>
			</div>
		</div>

		<div class="join">
			<button class="join-item btn btn-sm" disabled={currentPage === 1} onclick={() => goToPage(1)}>
				First
			</button>
			<button
				class="join-item btn btn-sm"
				disabled={currentPage === 1}
				onclick={() => goToPage(currentPage - 1)}
			>
				<ChevronLeft size={16} />
			</button>

			{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
				// Calculate which page numbers to show (center around current page)
				let pageNum;
				if (totalPages <= 5) {
					pageNum = i + 1;
				} else if (currentPage <= 3) {
					pageNum = i + 1;
				} else if (currentPage >= totalPages - 2) {
					pageNum = totalPages - 4 + i;
				} else {
					pageNum = currentPage - 2 + i;
				}
				return pageNum;
			}) as pageNum}
				<button
					class="join-item btn btn-sm"
					class:btn-active={pageNum === currentPage}
					onclick={() => goToPage(pageNum)}
				>
					{pageNum}
				</button>
			{/each}

			<button
				class="join-item btn btn-sm"
				disabled={currentPage === totalPages}
				onclick={() => goToPage(currentPage + 1)}
			>
				<ChevronRight size={16} />
			</button>
			<button
				class="join-item btn btn-sm"
				disabled={currentPage === totalPages}
				onclick={() => goToPage(totalPages)}
			>
				Last
			</button>
		</div>
	</div>
</div>

<!-- Delete All Modal -->
<div>
	<dialog class="modal max-w-full p-4" class:modal-open={deleteAllModal}>
		<div class="modal-box">
			<form method="dialog">
				<button
					class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
					onclick={() => {
						deleteAllModal = false;
					}}>✕</button
				>
			</form>
			<h3 class="text-lg font-bold">⁉️</h3>
			<p>Yo what?</p>
		</div>
	</dialog>
</div>

<!-- Delete Confirmation Modal -->
<div>
	<dialog class="modal max-w-full p-4" class:modal-open={isDeleteModalOpen}>
		<div class="modal-box">
			<form method="dialog">
				<button
					class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
					onclick={() => {
						isDeleteModalOpen = false;
						pendingDeleteId = '';
					}}>✕</button
				>
			</form>
			<h3 class="text-lg font-bold">Delete Question</h3>
			{#if pendingDeleteId}
				<p class="py-4">Are you sure you want to delete this question?</p>
				<div class="my-4 p-4 bg-base-200 rounded-box">
					{questions.find((q) => q.id === pendingDeleteId)?.question_data.question}
				</div>
			{/if}

			{#if deleteError}
				<div class="alert alert-error mb-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="stroke-current shrink-0 h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>Error: {deleteError}</span>
				</div>
			{/if}

			<div class="modal-action">
				<button
					class="btn btn-outline"
					onclick={() => {
						isDeleteModalOpen = false;
						pendingDeleteId = '';
					}}
					disabled={isDeleting}
				>
					Cancel
				</button>
				<button class="btn btn-error" onclick={handleDelete} disabled={isDeleting}>
					{#if isDeleting}
						<span class="loading loading-spinner"></span>
						Deleting...
					{:else}
						Delete
					{/if}
				</button>
			</div>
		</div>
	</dialog>
</div>

<!-- Edit Question Modal -->
<div>
	<dialog class="modal max-w-full p-4" class:modal-open={isEditModalOpen}>
		<div class="modal-box w-11/12 max-w-4xl">
			<form method="dialog">
				<button
					class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
					onclick={() => {
						isEditModalOpen = false;
						editingQuestion = null;
					}}>✕</button
				>
			</form>
			<h3 class="text-lg font-bold mb-4">Edit Question</h3>

			{#if editingQuestion}
				<div class="grid grid-cols-1 gap-6">
					<!-- Chapter -->
					<div class="form-control">
						<label for="edit-chapter" class="label">
							<span class="label-text">Chapter</span>
						</label>
						<select
							id="edit-chapter"
							class="select select-bordered"
							bind:value={editingQuestion.chapter}
						>
							{#each Array.from(new Set(questions.map((q) => q.chapter))).sort() as chapter}
								{#if chapter}
									<option value={chapter}>{chapter}</option>
								{/if}
							{/each}
						</select>
					</div>

					<!-- Question Text -->
					<div class="form-control">
						<label for="edit-question-text" class="label">
							<span class="label-text">Question</span>
						</label>
						<textarea
							id="edit-question-text"
							class="textarea textarea-bordered h-24"
							bind:value={editingQuestion.question_data.question}
							placeholder="Enter question text"
						></textarea>
					</div>
					<!-- Options -->
					<fieldset class="form-control">
						<legend class="text-base font-medium mb-2">Options</legend>

						{#each editingQuestion.question_data.options, i}
							<div class="flex items-center mb-2">
								<label for={`edit-option-${i}`} class="sr-only">Option {i + 1}</label>
								<input
									id={`edit-option-${i}`}
									type="text"
									class="input input-bordered w-full mr-2"
									bind:value={editingQuestion.question_data.options[i]}
									placeholder={`Option ${i + 1}`}
								/>
								<button
									class="btn btn-sm btn-error btn-soft"
									onclick={() => removeOption(i)}
									type="button"
									aria-label={`Remove option ${i + 1}`}
								>
									<Trash2 size="16" />
								</button>
							</div>
						{/each}

						<button class="btn btn-sm btn-outline mt-2 w-full" onclick={addOption} type="button">
							Add Option
						</button>
					</fieldset>

					<!-- Correct Answers -->
					<fieldset class="form-control">
						<legend class="text-base font-medium mb-2">Correct Answers</legend>

						{#each editingQuestion.question_data.correct_answers as answer, i}
							<div class="flex items-center mb-2">
								<label for={`edit-correct-answer-${i}`} class="sr-only"
									>Correct answer {i + 1}</label
								>
								<select
									id={`edit-correct-answer-${i}`}
									class="select select-bordered w-full mr-2"
									bind:value={editingQuestion.question_data.correct_answers[i]}
								>
									<option value="" disabled>Select correct answer</option>
									{#each ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as letter}
										<!-- Only include options that exist -->
										{#if editingQuestion.question_data.options.some( (opt) => opt.startsWith(`${letter}.`) )}
											<option value={letter}>{letter}</option>
										{/if}
									{/each}
								</select>
								<button
									class="btn btn-sm btn-error btn-soft"
									onclick={() => removeCorrectAnswer(i)}
									type="button"
									aria-label={`Remove correct answer ${i + 1}`}
								>
									<Trash2 size="16" />
								</button>
							</div>
						{/each}

						<button
							class="btn btn-sm btn-outline mt-2 w-full"
							onclick={addCorrectAnswer}
							type="button"
						>
							Add Correct Answer
						</button>
					</fieldset>

					<!-- Explanation -->
					<div class="form-control">
						<label for="edit-explanation" class="label">
							<span class="label-text">Explanation</span>
						</label>
						<textarea
							id="edit-explanation"
							class="textarea textarea-bordered h-24"
							bind:value={editingQuestion.question_data.explanation}
							placeholder="Enter explanation text"
						></textarea>
					</div>
				</div>

				{#if saveError}
					<div class="alert alert-error my-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="stroke-current shrink-0 h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>Error: {saveError}</span>
					</div>
				{/if}

				<div class="modal-action">
					<button
						class="btn btn-outline"
						onclick={() => {
							isEditModalOpen = false;
							editingQuestion = null;
						}}
						disabled={isSaving}
						type="button"
					>
						Cancel
					</button>
					<button
						class="btn btn-primary"
						onclick={updateQuestion}
						disabled={isSaving}
						type="button"
					>
						{#if isSaving}
							<span class="loading loading-spinner"></span>
							Saving...
						{:else}
							Save Changes
						{/if}
					</button>
				</div>
			{/if}
		</div>
	</dialog>
</div>

<!-- Questions Table -->
<div class="overflow-x-auto rounded-box border border-base-content/12 bg-base-100 mx-6">
	<table class="table">
		<thead>
			<tr>
				<th>Question</th>
				<th>Options</th>
				<th>Explanation</th>
				<th>Correct Answer(s)</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each paginatedQuestions as question}
				<tr>
					<td class="max-w-xs truncate">{question.question_data.question}</td>
					<td class="max-w-xs">
						{#each question.question_data.options as option}
							<div class="truncate">{option}</div>
						{/each}
					</td>
					<td class="max-w-xs truncate">{question.question_data.explanation}</td>

					<td>
						{#each question.question_data.correct_answers as answer}
							<div class="font-mono">{answer}</div>
						{/each}
					</td>

					<td class="flex flex-row space-x-2">
						<button
							class="btn btn-sm btn-soft btn-error rounded-full"
							onclick={() => {
								pendingDeleteId = question.id;
								isDeleteModalOpen = true;
							}}
							aria-label="Delete question"
						>
							<Trash2 size="16" />
						</button>

						<button
							class="btn btn-sm btn-soft btn-accent rounded-full"
							onclick={() => openEditModal(question)}
							aria-label="Edit question"
						>
							<Pencil size="16" />
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<!-- Bottom Pagination Controls -->
<div class="flex flex-col sm:flex-row justify-between items-center px-6 py-4">
	<div class="flex items-center mb-4 sm:mb-0">
		<span class="text-sm">
			Showing {filteredQuestions.length ? (currentPage - 1) * questionsPerPage + 1 : 0} to
			{Math.min(currentPage * questionsPerPage, filteredQuestions.length)} of {filteredQuestions.length}
			entries
		</span>
		<div class="ml-4">
			<label for="bottom-per-page" class="sr-only">Items per page</label>
			<select id="bottom-per-page" class="select select-sm" bind:value={questionsPerPage}>
				<option value={5}>5 per page</option>
				<option value={10}>10 per page</option>
				<option value={25}>25 per page</option>
				<option value={50}>50 per page</option>
				<option value={100}>100 per page</option>
			</select>
		</div>
	</div>

	<div class="join">
		<button class="join-item btn btn-sm" disabled={currentPage === 1} onclick={() => goToPage(1)}>
			First
		</button>
		<button
			class="join-item btn btn-sm"
			disabled={currentPage === 1}
			onclick={() => goToPage(currentPage - 1)}
		>
			<ChevronLeft size={16} />
		</button>

		{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
			// Calculate which page numbers to show (center around current page)
			let pageNum;
			if (totalPages <= 5) {
				pageNum = i + 1;
			} else if (currentPage <= 3) {
				pageNum = i + 1;
			} else if (currentPage >= totalPages - 2) {
				pageNum = totalPages - 4 + i;
			} else {
				pageNum = currentPage - 2 + i;
			}
			return pageNum;
		}) as pageNum}
			<button
				class="join-item btn btn-sm"
				class:btn-active={pageNum === currentPage}
				onclick={() => goToPage(pageNum)}
			>
				{pageNum}
			</button>
		{/each}

		<button
			class="join-item btn btn-sm"
			disabled={currentPage === totalPages}
			onclick={() => goToPage(currentPage + 1)}
		>
			<ChevronRight size={16} />
		</button>
		<button
			class="join-item btn btn-sm"
			disabled={currentPage === totalPages}
			onclick={() => goToPage(totalPages)}
		>
			Last
		</button>
	</div>
</div>
