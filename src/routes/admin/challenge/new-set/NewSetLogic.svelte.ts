// src/routes/admin/challenge/new-set/new-set-logic.ts
import type { AdminChallengeQuestions } from '$lib/types';
import supabase from '$lib/supabaseClient';

type NewQuestionInput = Omit<AdminChallengeQuestions, 'id' | 'created_at' | 'chapter' | 'pic_url'>;

type ImageState = {
	uploading: boolean;
	url: string | null;
};

type ChapterInfo = {
	id: number;
	name: string | null;
};

export class NewSetLogic {
	// === State ===
	questionsToAdd = $state<NewQuestionInput[]>([]);
	existingChapters = $state<ChapterInfo[]>([]);
	isCreatingNewChapter = $state(false);
	selectedChapterId = $state<number | null>(null);
	newChapterNumber = $state<number | null>(null);
	imageStates = $state<{ [index: number]: ImageState }>({});
	uploadingRowIndex = $state<number | null>(null);
	isSaving = $state(false);
	saveError = $state<string | null>(null);
	saveSuccessMessage = $state<string | null>(null);

	// === Derived State ===
	finalChapterId = $derived(() => {
		if (this.isCreatingNewChapter) {
			return this.newChapterNumber &&
				Number.isInteger(this.newChapterNumber) &&
				this.newChapterNumber > 0
				? this.newChapterNumber
				: null;
		} else {
			return this.selectedChapterId;
		}
	});

	// === Methods ===
	constructor() {
		this.addRow();
	}

	loadChapters(chapters: ChapterInfo[]) {
		this.existingChapters = chapters;
	}

	addRow() {
		const newRow: NewQuestionInput = {
			question_data: {
				question: '',
				options: ['A. ', 'B. '],
				correct_answers: ['A'],
				explanation: ''
			}
		};
		this.questionsToAdd = [...this.questionsToAdd, newRow];
	}

	removeRow(index: number) {
		if (index < 0 || index >= this.questionsToAdd.length) return;
		this.questionsToAdd = this.questionsToAdd.filter((_, i) => i !== index);
		const newImageStates = { ...this.imageStates };
		delete newImageStates[index];
		// Note: Indices in imageStates might become misaligned. Consider unique IDs per row if problematic.
		this.imageStates = newImageStates;
	}

	toggleNewChapterMode(create: boolean) {
		this.isCreatingNewChapter = create;
		if (create) {
			this.selectedChapterId = null;
		} else {
			this.newChapterNumber = null;
		}
	}

	addOption(questionIndex: number) {
		if (questionIndex < 0 || questionIndex >= this.questionsToAdd.length) return;
		const question = this.questionsToAdd[questionIndex];
		const nextLetter = String.fromCharCode(
			'A'.charCodeAt(0) + question.question_data.options.length
		);
		const newOption = `${nextLetter}. `;
		const updatedQuestion: NewQuestionInput = {
			...question,
			question_data: {
				...question.question_data,
				options: [...question.question_data.options, newOption]
			}
		};
		this.questionsToAdd = this.questionsToAdd.map((q, i) =>
			i === questionIndex ? updatedQuestion : q
		);
	}

	removeOption(questionIndex: number, optionIndex: number) {
		if (questionIndex < 0 || questionIndex >= this.questionsToAdd.length) return;
		const question = this.questionsToAdd[questionIndex];
		if (optionIndex < 0 || optionIndex >= question.question_data.options.length) return;

		const removedOptionLetter = String.fromCharCode('A'.charCodeAt(0) + optionIndex);
		const updatedOptions = question.question_data.options.filter((_, i) => i !== optionIndex);
		const renumberedOptions = updatedOptions.map((opt, i) => {
			const expectedLetter = String.fromCharCode('A'.charCodeAt(0) + i);
			return `${expectedLetter}. ${opt.substring(opt.indexOf('.') + 1).trim()}`;
		});
		const updatedCorrectAnswers = question.question_data.correct_answers.filter(
			(ans) => ans !== removedOptionLetter
		);
		const finalCorrectAnswers = updatedCorrectAnswers.map((ans) => {
			const ansIndex = ans.charCodeAt(0) - 'A'.charCodeAt(0);
			if (ansIndex > optionIndex) {
				return String.fromCharCode(ans.charCodeAt(0) - 1);
			}
			return ans;
		});

		if (finalCorrectAnswers.length === 0 && renumberedOptions.length > 0) {
			finalCorrectAnswers.push('A');
		}

		const updatedQuestion: NewQuestionInput = {
			...question,
			question_data: {
				...question.question_data,
				options: renumberedOptions,
				correct_answers: finalCorrectAnswers
			}
		};
		this.questionsToAdd = this.questionsToAdd.map((q, i) =>
			i === questionIndex ? updatedQuestion : q
		);
	}

	addCorrectAnswer(questionIndex: number) {
		if (questionIndex < 0 || questionIndex >= this.questionsToAdd.length) return;
		const question = this.questionsToAdd[questionIndex];
		const updatedCorrectAnswers = [...question.question_data.correct_answers, ''];
		const updatedQuestion: NewQuestionInput = {
			...question,
			question_data: {
				...question.question_data,
				correct_answers: updatedCorrectAnswers
			}
		};
		this.questionsToAdd = this.questionsToAdd.map((q, i) =>
			i === questionIndex ? updatedQuestion : q
		);
	}

	removeCorrectAnswer(questionIndex: number, answerIndex: number) {
		if (questionIndex < 0 || questionIndex >= this.questionsToAdd.length) return;
		const question = this.questionsToAdd[questionIndex];
		if (answerIndex < 0 || answerIndex >= question.question_data.correct_answers.length) return;
		if (question.question_data.correct_answers.length <= 1) return;

		const updatedCorrectAnswers = question.question_data.correct_answers.filter(
			(_, i) => i !== answerIndex
		);
		const updatedQuestion: NewQuestionInput = {
			...question,
			question_data: {
				...question.question_data,
				correct_answers: updatedCorrectAnswers
			}
		};
		this.questionsToAdd = this.questionsToAdd.map((q, i) =>
			i === questionIndex ? updatedQuestion : q
		);
	}

	async handleImageUpload(fileList: FileList | null, index: number, startUpload: Function) {
		if (!fileList || fileList.length === 0) return;
		this.imageStates = {
			...this.imageStates,
			[index]: { uploading: true, url: null }
		};
		try {
			await startUpload(Array.from(fileList));
		} catch (error) {
			console.error('Upload initiation failed:', error);
			this.imageStates = {
				...this.imageStates,
				[index]: { uploading: false, url: null }
			};
		}
	}

	removeImage(questionIndex: number) {
		if (questionIndex < 0 || questionIndex >= this.questionsToAdd.length) return;
		const newImageStates = { ...this.imageStates };
		if (newImageStates[questionIndex]) {
			newImageStates[questionIndex] = { uploading: false, url: null };
		}
		this.imageStates = newImageStates;
	}

	async saveAll() {
		this.isSaving = true;
		this.saveError = null;
		this.saveSuccessMessage = null;
		const allValidationErrors: string[] = [];

		let chapterIdNumber: number | null = null;

		if (this.isCreatingNewChapter) {
			// Validate the new chapter number directly
			if (
				this.newChapterNumber &&
				Number.isInteger(this.newChapterNumber) &&
				this.newChapterNumber > 0
			) {
				chapterIdNumber = this.newChapterNumber;
			} else {
				this.saveError = 'New chapter number must be a positive integer.';
				this.isSaving = false;
				return;
			}
		} else {
			if (this.selectedChapterId !== null && this.selectedChapterId > 0) {
				chapterIdNumber = this.selectedChapterId;
			} else {
				this.saveError = 'Please select a valid existing chapter.';
				this.isSaving = false;
				return; // Stop execution
			}
		}

		// --- Validate Questions ---
		if (this.questionsToAdd.length === 0) {
			this.saveError = 'Please add at least one question.';
			this.isSaving = false;
			return;
		}

		const questionsToInsert: Omit<AdminChallengeQuestions, 'id' | 'created_at'>[] = [];
		let hasRowErrors = false;

		this.questionsToAdd.forEach((q, index) => {
			const rowNum = index + 1;
			const rowErrors: string[] = [];

			// --- Perform all validations for this row ---
			if (!q.question_data.question.trim()) {
				rowErrors.push(`Question text is required.`);
			}
			if (q.question_data.options.length < 2) {
				rowErrors.push(`At least two options are required.`);
			} else {
				q.question_data.options.forEach((opt, optIndex) => {
					if (opt.substring(opt.indexOf('.') + 1).trim() === '') {
						const letter = String.fromCharCode('A'.charCodeAt(0) + optIndex);
						rowErrors.push(`Option ${letter} cannot be empty.`);
					}
				});
			}
			if (q.question_data.correct_answers.length < 1) {
				rowErrors.push(`At least one correct answer is required.`);
			} else {
				const uniqueAnswers = new Set<string>();
				let invalidAnswerFormat = false;
				q.question_data.correct_answers.forEach((ans, ansIndex) => {
					if (!ans || !/^[A-Z]$/.test(ans)) {
						if (!ans) rowErrors.push(`Correct answer #${ansIndex + 1} is not selected.`);
						else rowErrors.push(`Correct answer #${ansIndex + 1} ('${ans}') is invalid.`);
						invalidAnswerFormat = true;
					} else {
						const ansLetterIndex = ans.charCodeAt(0) - 'A'.charCodeAt(0);
						if (ansLetterIndex >= q.question_data.options.length) {
							rowErrors.push(`Correct answer ${ans} does not correspond to an existing option.`);
							invalidAnswerFormat = true;
						}
						if (!invalidAnswerFormat) {
							if (uniqueAnswers.has(ans))
								rowErrors.push(`Duplicate correct answer ${ans} selected.`);
							else uniqueAnswers.add(ans);
						}
					}
				});
			}

			if (rowErrors.length > 0) {
				allValidationErrors.push(...rowErrors.map((e) => `Row ${rowNum}: ${e}`));
				hasRowErrors = true;
			} else {
				// --- Row is valid, prepare it for insertion ---
				// Use the validated chapterIdNumber (which is definitely a number here)
				questionsToInsert.push({
					chapter: String(chapterIdNumber), // Convert the number to string
					pic_url: this.imageStates[index]?.url || null,
					question_data: {
						...q.question_data,
						correct_answers: q.question_data.correct_answers
					}
				});
			}
		}); // End of forEach loop

		if (hasRowErrors) {
			this.saveError = allValidationErrors.join(' \n');
			this.isSaving = false;
			return;
		}

		// --- Perform Supabase Insert ---
		try {
			console.log(
				`Inserting ${questionsToInsert.length} questions for chapter ${chapterIdNumber}...`
			);
			const { error: insertError } = await supabase
				.from('pharmchallenge')
				.insert(questionsToInsert);

			if (insertError) throw insertError;

			this.saveSuccessMessage = `${questionsToInsert.length} question(s) added successfully to chapter ${chapterIdNumber}!`;
			this.questionsToAdd = [];
			this.imageStates = {};
			this.addRow();
		} catch (error: any) {
			console.error('Error saving questions:', error);
			this.saveError = `Failed to save questions: ${error.message}`;
		} finally {
			this.isSaving = false;
		}
	}
}
