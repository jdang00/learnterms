<script lang="ts">
	import supabase from '$lib/supabaseClient';
	import type { AdminChallengeQuestions } from '$lib/types';
	import type { PageData } from './$types';
	import { Trash2, Pencil, Image } from 'lucide-svelte';
	import { browser } from '$app/environment';
	import { createUploadThing } from '$lib/utils/uploadthing';
	import PaginationControls from './components/PaginationControls.svelte';
	import Search from './components/Search.svelte';
	import AddNewQuestionModal from './components/AddNewQuestionModal.svelte';
	import EditQuestionModal from './components/EditQuestionModal.svelte';

	// Retrieve the questions from props.
	let { data }: { data: PageData } = $props();
	let questions: AdminChallengeQuestions[] = $state(data.questions);

	// Reactive states for search query, chapter filter, and the currently editing question.
	let searchQuery = $state('');
	let selectedChapter = $state('');
	let isDeleteModalOpen = $state(false);
	let pendingDeleteId = $state<string>('');
	let isDeleting = $state(false);
	let deleteError = $state<string | null>(null);

	// Edit modal state
	let isEditModalOpen = $state(false);
	let editingQuestion = $state<AdminChallengeQuestions | null>(null);
	let isSaving = $state(false);
	let saveError = $state<string | null>(null);
	let editImageUploading = $state(false);

	// Add question modal state
	let isAddModalOpen = $state(false);
	let newQuestion = $state<AdminChallengeQuestions | null>(null);
	let isAddingSaving = $state(false);
	let addError = $state<string | null>(null);
	let addImageUploading = $state(false);

	// Image states
	let newImageUrl = $state<string | null>(null);
	let editImageUrl = $state<string | null>(null);

	// Pagination states
	let currentPage = $state(1);
	let questionsPerPage = $state(10);

	const { startUpload } = createUploadThing('imageUploader', {
		onClientUploadComplete: (res) => {
			if (res && res.length > 0) {
				const uploadedUrl = res[0].url;

				if (isAddModalOpen && newQuestion) {
					newImageUrl = uploadedUrl;
					alert('Image uploaded successfully');
				} else if (isEditModalOpen && editingQuestion) {
					editImageUrl = uploadedUrl;
					alert('Image uploaded successfully');
				}
			}
			addImageUploading = false;
			editImageUploading = false;
		},
		onUploadError: (error) => {
			console.error('Upload error:', error);
			alert(`Upload failed: ${error.message}`);
			addImageUploading = false;
			editImageUploading = false;
		}
	});

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

				const newUrl = `${window.location.pathname}${
					params.toString() ? '?' + params.toString() : ''
				}`;
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
	function openEditModal(question: AdminChallengeQuestions) {
		// Create a deep copy to prevent direct modification of the original
		editingQuestion = JSON.parse(JSON.stringify(question));
		editImageUrl = question.pic_url || null;
		isEditModalOpen = true;
		saveError = null;
	}

	// Open add new question modal
	function openAddModal() {
		// Create a new empty question template
		newQuestion = {
			id: '',
			chapter: selectedChapter || (questions.length > 0 ? questions[0].chapter : ''),
			pic_url: null,
			question_data: {
				question: '',
				options: ['A.', 'B.', 'C.', 'D.'],
				correct_answers: [],
				explanation: ''
			}
		};
		newImageUrl = null;
		isAddModalOpen = true;
		addError = null;
	}

	// Add a new option to the question being edited
	function addOption() {
		if (editingQuestion) {
			editingQuestion.question_data.options = [...editingQuestion.question_data.options, ''];
		}
	}

	// Add a new option to the new question
	function addNewOption() {
		if (newQuestion) {
			const nextLetter = String.fromCharCode(
				'A'.charCodeAt(0) + newQuestion.question_data.options.length
			);
			newQuestion.question_data.options = [...newQuestion.question_data.options, `${nextLetter}.`];
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

	// Remove an option from the new question
	function removeNewOption(index: number) {
		if (newQuestion) {
			// Filter out the option at the specified index
			newQuestion.question_data.options = newQuestion.question_data.options.filter(
				(_, i) => i !== index
			);

			// Also remove it from correct answers if it was there
			const optionLetter = getLetterFromOption(newQuestion.question_data.options[index]);
			newQuestion.question_data.correct_answers = newQuestion.question_data.correct_answers.filter(
				(ans) => ans !== optionLetter
			);
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

	// Add a new correct answer to the new question
	function addNewCorrectAnswer() {
		if (newQuestion) {
			newQuestion.question_data.correct_answers = [
				...newQuestion.question_data.correct_answers,
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

	// Remove a correct answer from the new question
	function removeNewCorrectAnswer(index: number) {
		if (newQuestion) {
			newQuestion.question_data.correct_answers = newQuestion.question_data.correct_answers.filter(
				(_, i) => i !== index
			);
		}
	}

	// Handle file upload for edit question
	async function handleEditImageUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;

		if (!files || files.length === 0) return;

		editImageUploading = true;
		await startUpload(Array.from(files));
	}

	// Handle file upload for new question
	async function handleNewImageUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;

		if (!files || files.length === 0) return;

		addImageUploading = true;
		await startUpload(Array.from(files));
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
				.from('pharmchallenge')
				.update({
					question_data: editingQuestion.question_data,
					chapter: editingQuestion.chapter,
					pic_url: editImageUrl
				})
				.eq('id', editingQuestion.id);

			if (error) throw error;

			// Update the question in the local state
			questions = questions.map((q) =>
				q.id === editingQuestion?.id
					? {
							...q,
							question_data: { ...editingQuestion.question_data },
							chapter: editingQuestion.chapter,
							pic_url: editImageUrl
						}
					: q
			);

			// Close the modal
			isEditModalOpen = false;
			editingQuestion = null;
			editImageUrl = null;
		} catch (error) {
			saveError = 'Failed to update question';
			console.error('Error updating question:', error);
		} finally {
			isSaving = false;
		}
	}

	// Add new question function
	async function addQuestion() {
		if (!newQuestion) return;

		// Basic validation
		if (!newQuestion.question_data.question.trim()) {
			addError = 'Question text is required';
			return;
		}

		if (newQuestion.question_data.options.length < 2) {
			addError = 'At least two options are required';
			return;
		}

		if (newQuestion.question_data.correct_answers.length < 1) {
			addError = 'At least one correct answer is required';
			return;
		}

		// Filter out any empty correct answers
		newQuestion.question_data.correct_answers = newQuestion.question_data.correct_answers.filter(
			(answer) => answer.trim() !== ''
		);

		isAddingSaving = true;
		addError = null;

		try {
			const { data: insertedData, error } = await supabase
				.from('pharmchallenge')
				.insert({
					question_data: newQuestion.question_data,
					chapter: newQuestion.chapter,
					pic_url: newImageUrl
				})
				.select();

			if (error) throw error;

			// Add the new question to the local state
			if (insertedData && insertedData.length > 0) {
				questions = [...questions, insertedData[0]];
			}

			// Close the modal
			isAddModalOpen = false;
			newQuestion = null;
			newImageUrl = null;
		} catch (error) {
			addError = 'Failed to add question';
			console.error('Error adding question:', error);
		} finally {
			isAddingSaving = false;
		}
	}

	/**
	 * Delete the question from the database.
	 */
	async function handleDelete() {
		if (!pendingDeleteId) return;

		isDeleting = true;
		deleteError = null;

		const { error } = await supabase.from('pharmchallenge').delete().eq('id', pendingDeleteId);

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
</script>

<!-- Search and filter panel -->
<div class="rounded-box border border-base-content/12 bg-base-100 mx-6 mt-12 mb-4">
	<div class="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
		<div class="flex flex-col sm:flex-row items-center gap-4 w-full">
			<Search bind:searchQuery bind:selectedChapter {questions} {openAddModal} />
		</div>

		<!-- Quick stats about results -->
		<div class="text-sm text-base-content/70 whitespace-nowrap">
			<span>{filteredQuestions.length} questions found</span>
		</div>
	</div>
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

<AddNewQuestionModal
	bind:isAddModalOpen
	bind:newQuestion
	bind:newImageUrl
	{questions}
	{removeNewOption}
	{addNewOption}
	{removeNewCorrectAnswer}
	{addNewCorrectAnswer}
	{handleNewImageUpload}
	{addImageUploading}
	{addError}
	{isAddingSaving}
	{addQuestion}
/>
<EditQuestionModal
	bind:isEditModalOpen
	bind:editingQuestion
	bind:editImageUrl
	{questions}
	{removeOption}
	{removeCorrectAnswer}
	{addCorrectAnswer}
	{handleEditImageUpload}
	{editImageUploading}
	{saveError}
	{isSaving}
	{updateQuestion}
	{addOption}
/>

<div class="rounded-box border border-base-content/12 bg-base-100 mx-6 mb-4">
	<!-- Table content -->
	<div class="overflow-x-auto">
		<table class="table">
			<thead>
				<tr>
					<th>Question</th>
					<th>Options</th>
					<th>Image</th>
					<th>Explanation</th>
					<th>Correct Answer(s)</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each paginatedQuestions as question (question.id)}
					<tr>
						<td class="max-w-xs">{question.question_data.question}</td>
						<td class="max-w-xs">
							{#each question.question_data.options as option (option)}
								<div class="truncate">{option}</div>
							{/each}
						</td>
						<td class="w-24">
							{#if question.pic_url}
								<div class="avatar">
									<div class="w-16 rounded">
										<img src={question.pic_url} alt="Question" />
									</div>
								</div>
							{:else}
								<div class="text-gray-400">
									<Image size={24} />
								</div>
							{/if}
						</td>
						<td class="max-w-xs">{question.question_data.explanation}</td>
						<td>
							{#each question.question_data.correct_answers as answer (answer)}
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

	<!-- Pagination as table footer -->
	<div class="px-4 py-3 border-t border-base-content/10">
		<PaginationControls
			{currentPage}
			{totalPages}
			{questionsPerPage}
			totalEntries={filteredQuestions.length}
			{goToPage}
		/>
	</div>
</div>
