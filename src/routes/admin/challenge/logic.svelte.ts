import type { PageData } from './$types';
import type { AdminChallengeQuestions } from '$lib/types';
import supabase from '$lib/supabaseClient';

export class LogicMap {
	questions: AdminChallengeQuestions[] = $state([]);

	constructor(data: PageData) {
		this.questions = data.questions;
	}

	searchQuery = $state('');
	selectedChapter = $state('');
	isDeleteModalOpen = $state(false);
	pendingDeleteId = $state<string>('');
	isDeleting = $state(false);
	deleteError = $state<string | null>(null);

	// Edit modal state
	isEditModalOpen = $state(false);
	editingQuestion = $state<AdminChallengeQuestions | null>(null);
	isSaving = $state(false);
	saveError = $state<string | null>(null);
	editImageUploading = $state(false);

	// Add question modal state
	isAddModalOpen = $state(false);
	newQuestion = $state<AdminChallengeQuestions | null>(null);
	isAddingSaving = $state(false);
	addError = $state<string | null>(null);
	addImageUploading = $state(false);
	filteredQuestions = $derived(
		(() => {
			// First filter the questions
			let filtered = this.questions.filter(
				(q) =>
					q.question_data.question.toLowerCase().includes(this.searchQuery.toLowerCase()) &&
					(this.selectedChapter === '' || q.chapter === this.selectedChapter)
			);

			// Then sort if a sort field is specified
			if (this.sortField) {
				filtered = [...filtered].sort((a, b) => {
					if (this.sortField === 'created_at') {
						const dateA = new Date(a.created_at).getTime();
						const dateB = new Date(b.created_at).getTime();
						return this.sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
					}
					return 0; // Default case, no sorting
				});
			}

			return filtered;
		})()
	);
	// Image states
	newImageUrl = $state<string | null>(null);
	editImageUrl = $state<string | null>(null);
	totalEntries = $derived(this.filteredQuestions.length);

	// Pagination states
	currentPage = $state(1);
	questionsPerPage = $state(10);

	sortField = $state<string>('');
	sortDirection = $state<'asc' | 'desc'>('desc');

	totalPages = $derived(Math.ceil(this.filteredQuestions.length / this.questionsPerPage));
	paginatedQuestions = $derived(
		this.filteredQuestions.slice(
			(this.currentPage - 1) * this.questionsPerPage,
			this.currentPage * this.questionsPerPage
		)
	);

	toggleSort(field: string) {
		// If clicking the same field, toggle direction
		if (this.sortField === field) {
			this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			// New field, set it and default to descending (newest first)
			this.sortField = field;
			this.sortDirection = 'desc';
		}

		// Reset to first page when sorting changes
		this.currentPage = 1;
	}

	clearSort() {
		this.sortField = '';
		this.sortDirection = 'desc';
		this.currentPage = 1;
	}

	// Go to a specific page
	goToPage(page: number) {
		if (page >= 1 && page <= this.totalPages) {
			this.currentPage = page;
		}
	}

	// Open edit modal for a question
	openEditModal(question: AdminChallengeQuestions) {
		// Create a deep copy to prevent direct modification of the original
		this.editingQuestion = JSON.parse(JSON.stringify(question));
		this.editImageUrl = question.pic_url || null;
		this.isEditModalOpen = true;
		this.saveError = null;
	}

	// Open add new question modal
	openAddModal() {
		// Create a new empty question template
		this.newQuestion = {
			id: '',
			chapter: '',
			pic_url: null,
			created_at: new Date().toISOString(),
			question_data: {
				question: '',
				// Initialize options with letter prefixes + space
				options: ['A. ', 'B. ', 'C. ', 'D. '],
				correct_answers: [],
				explanation: ''
			}
		};
		this.newImageUrl = null;
		this.isAddModalOpen = true;
		this.addError = null;
	}

	// Add a new option to the question being edited
	addOption() {
		if (this.editingQuestion) {
			this.editingQuestion.question_data.options = [
				...this.editingQuestion.question_data.options,
				''
			];
		}
	}

	// Add a new option to the new question
	addNewOption() {
		if (this.newQuestion) {
			const nextLetter = String.fromCharCode(
				'A'.charCodeAt(0) + this.newQuestion.question_data.options.length
			);
			// Add the space after the dot
			this.newQuestion.question_data.options = [
				...this.newQuestion.question_data.options,
				`${nextLetter}. `
			];
		}
	}

	// Remove an option at the specified index
	removeOption(index: number) {
		if (this.editingQuestion) {
			// Filter out the option at the specified index
			this.editingQuestion.question_data.options =
				this.editingQuestion.question_data.options.filter((_, i) => i !== index);

			// Also remove it from correct answers if it was there
			const optionToRemove = this.editingQuestion.question_data.options[index];
			this.editingQuestion.question_data.correct_answers =
				this.editingQuestion.question_data.correct_answers.filter((ans) => ans !== optionToRemove);
		}
	}

	// Remove an option from the new question
	removeNewOption(index: number) {
		if (this.newQuestion) {
			// Filter out the option at the specified index
			this.newQuestion.question_data.options = this.newQuestion.question_data.options.filter(
				(_, i) => i !== index
			);

			// Also remove it from correct answers if it was there
			const optionLetter = this.getLetterFromOption(this.newQuestion.question_data.options[index]);
			this.newQuestion.question_data.correct_answers =
				this.newQuestion.question_data.correct_answers.filter((ans) => ans !== optionLetter);
		}
	}

	// Add a new correct answer
	addCorrectAnswer() {
		if (this.editingQuestion) {
			this.editingQuestion.question_data.correct_answers = [
				...this.editingQuestion.question_data.correct_answers,
				''
			];
		}
	}

	// Add a new correct answer to the new question
	addNewCorrectAnswer() {
		if (this.newQuestion) {
			this.newQuestion.question_data.correct_answers = [
				...this.newQuestion.question_data.correct_answers,
				''
			];
		}
	}

	// Remove a correct answer at the specified index
	removeCorrectAnswer(index: number) {
		if (this.editingQuestion) {
			this.editingQuestion.question_data.correct_answers =
				this.editingQuestion.question_data.correct_answers.filter((_, i) => i !== index);
		}
	}

	// Remove a correct answer from the new question
	removeNewCorrectAnswer(index: number) {
		if (this.newQuestion) {
			this.newQuestion.question_data.correct_answers =
				this.newQuestion.question_data.correct_answers.filter((_, i) => i !== index);
		}
	}

	async updateQuestion() {
		if (!this.editingQuestion) return;

		// Basic validation
		if (!this.editingQuestion.question_data.question.trim()) {
			this.saveError = 'Question text is required';
			return;
		}

		if (this.editingQuestion.question_data.options.length < 2) {
			this.saveError = 'At least two options are required';
			return;
		}

		if (this.editingQuestion.question_data.correct_answers.length < 1) {
			this.saveError = 'At least one correct answer is required';
			return;
		}

		// Filter out any empty correct answers
		this.editingQuestion.question_data.correct_answers =
			this.editingQuestion.question_data.correct_answers.filter((answer) => answer.trim() !== '');

		this.isSaving = true;
		this.saveError = null;

		try {
			const { error } = await supabase
				.from('pharmchallenge')
				.update({
					question_data: this.editingQuestion.question_data,
					chapter: this.editingQuestion.chapter,
					pic_url: this.editImageUrl
				})
				.eq('id', this.editingQuestion.id);

			if (error) throw error;

			// Update the question in the local state
			this.questions = this.questions.map((q) =>
				q.id === this.editingQuestion?.id
					? {
							...q,
							question_data: JSON.parse(JSON.stringify(this.editingQuestion.question_data)),
							chapter: this.editingQuestion.chapter,
							pic_url: this.editImageUrl
						}
					: q
			);

			// Close the modal
			this.isEditModalOpen = false;
			this.editingQuestion = null;
			this.editImageUrl = null;
		} catch (error) {
			this.saveError = 'Failed to update question';
			console.error('Error updating question:', error);
		} finally {
			this.isSaving = false;
		}
	}

	// Add new question function
	async addQuestion() {
		if (!this.newQuestion) return;

		// Basic validation
		if (!this.newQuestion.question_data.question.trim()) {
			this.addError = 'Question text is required';
			return;
		}

		if (this.newQuestion.question_data.options.length < 2) {
			this.addError = 'At least two options are required';
			return;
		}

		if (this.newQuestion.question_data.correct_answers.length < 1) {
			this.addError = 'At least one correct answer is required';
			return;
		}

		// Filter out any empty correct answers
		this.newQuestion.question_data.correct_answers =
			this.newQuestion.question_data.correct_answers.filter((answer) => answer.trim() !== '');

		this.isAddingSaving = true;
		this.addError = null;

		try {
			const { data: insertedData, error } = await supabase
				.from('pharmchallenge')
				.insert({
					question_data: this.newQuestion.question_data,
					chapter: this.newQuestion.chapter,
					pic_url: this.newImageUrl
				})
				.select();

			if (error) throw error;

			// Add the new question to the local state
			if (insertedData && insertedData.length > 0) {
				this.questions = [...this.questions, insertedData[0]];
			}

			// Close the modal
			this.isAddModalOpen = false;
			this.newQuestion = null;
			this.newImageUrl = null;
		} catch (error) {
			this.addError = 'Failed to add question';
			console.error('Error adding question:', error);
		} finally {
			this.isAddingSaving = false;
		}
	}

	/**
	 * Delete the question from the database.
	 */
	async handleDelete() {
		if (!this.pendingDeleteId) return;

		this.isDeleting = true;
		this.deleteError = null;

		const { error } = await supabase.from('pharmchallenge').delete().eq('id', this.pendingDeleteId);

		this.isDeleting = false;

		if (error) {
			this.deleteError = error.message;
		} else {
			this.questions = this.questions.filter((q) => q.id !== this.pendingDeleteId);
			this.pendingDeleteId = '';
			this.isDeleteModalOpen = false;

			// If we deleted the last item on the current page, go to the previous page
			if (this.paginatedQuestions.length === 1 && this.currentPage > 1) {
				this.currentPage--;
			}
		}
	}

	// Add this function to extract the letter from an option
	getLetterFromOption(option: string): string {
		const match = option.match(/^([A-Z])\./);
		return match ? match[1] : '';
	}
}
