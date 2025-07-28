import type { Doc, Id } from '../../../../../convex/_generated/dataModel';

export class QuizState {
	checkResult: string = $state('');
	selectedAnswers: string[] = $state([]);
	eliminatedAnswers: string[] = $state([]);
	index: number = $state(0);
	currentQuestionIndex: number = $state(0);
	questions: Doc<'question'>[] = $state([]);
	shuffledQuestions: Doc<'question'>[] = $state([]);
	isShuffled: boolean = $state(false);
	showSolution = $state(false);
	saveProgressFunction: (() => Promise<void>) | null = $state(null);
	loadProgressFunction: ((questionId: Id<'question'>) => Promise<void>) | null = $state(null);
	currentQuestionFlagged: boolean = $state(false);

	checkAnswer(correctAnswers: string[], userAnswers: string[]) {
		const sortedCorrect = [...correctAnswers].sort();
		const sortedUser = [...userAnswers].sort();

		if (
			sortedCorrect.length === sortedUser.length &&
			sortedCorrect.every((answer, index) => answer === sortedUser[index])
		) {
			this.checkResult = 'Correct!';
		} else {
			this.checkResult = 'Incorrect. Please try again.';
		}
	}

	// Toggle flag for current question
	toggleFlag() {
		this.currentQuestionFlagged = !this.currentQuestionFlagged;
		
		// Trigger save to update flag in database
		if (this.saveProgressFunction) {
			this.saveProgressFunction();
		}
	}

	// Set flag status for current question (used when loading from database)
	setCurrentQuestionFlagged(isFlagged: boolean) {
		this.currentQuestionFlagged = isFlagged;
	}

	async goToNextQuestion() {
		const currentQuestions = this.isShuffled ? this.shuffledQuestions : this.questions;
		if (currentQuestions && this.currentQuestionIndex < currentQuestions.length - 1) {
			// Save progress before changing question
			if (this.saveProgressFunction) {
				await this.saveProgressFunction();
			}
			
			this.currentQuestionIndex++;
			this.checkResult = '';
			
			// Load progress for the new question
			const newQuestion = this.getCurrentQuestion();
			if (newQuestion && this.loadProgressFunction) {
				await this.loadProgressFunction(newQuestion._id);
			} else {
				// Clear state if no load function or no question
				this.selectedAnswers = [];
				this.eliminatedAnswers = [];
			}
		}
	}

	async goToPreviousQuestion() {
		const currentQuestions = this.isShuffled ? this.shuffledQuestions : this.questions;
		if (currentQuestions && this.currentQuestionIndex > 0) {
			// Save progress before changing question
			if (this.saveProgressFunction) {
				await this.saveProgressFunction();
			}
			
			this.currentQuestionIndex--;
			this.checkResult = '';
			
			// Load progress for the new question
			const newQuestion = this.getCurrentQuestion();
			if (newQuestion && this.loadProgressFunction) {
				await this.loadProgressFunction(newQuestion._id);
			} else {
				// Clear state if no load function or no question
				this.selectedAnswers = [];
				this.eliminatedAnswers = [];
			}
		}
	}

	setQuestions(questions: Doc<'question'>[]) {
		this.questions = questions || [];
		this.shuffledQuestions = questions ? [...questions] : [];
	}

	async setCurrentQuestionIndex(index: number) {
		const currentQuestions = this.isShuffled ? this.shuffledQuestions : this.questions;
		if (currentQuestions && index >= 0 && index < currentQuestions.length) {
			// Save progress before changing question
			if (this.saveProgressFunction) {
				await this.saveProgressFunction();
			}
			
			this.currentQuestionIndex = index;
			this.checkResult = '';
			
			// Load progress for the new question
			const newQuestion = this.getCurrentQuestion();
			if (newQuestion && this.loadProgressFunction) {
				await this.loadProgressFunction(newQuestion._id);
			} else {
				// Clear state if no load function or no question
				this.selectedAnswers = [];
				this.eliminatedAnswers = [];
			}
		}
	}

	setSaveProgressFunction(func: () => Promise<void>) {
		this.saveProgressFunction = func;
	}

	setLoadProgressFunction(func: (questionId: Id<'question'>) => Promise<void>) {
		this.loadProgressFunction = func;
	}

	getCurrentQuestion() {
		const currentQuestions = this.isShuffled ? this.shuffledQuestions : this.questions;
		if (!currentQuestions || currentQuestions.length === 0) {
			return null;
		}
		return currentQuestions[this.currentQuestionIndex] || currentQuestions[0];
	}

	canGoNext() {
		const currentQuestions = this.isShuffled ? this.shuffledQuestions : this.questions;
		return currentQuestions && this.currentQuestionIndex < currentQuestions.length - 1;
	}

	canGoPrevious() {
		const currentQuestions = this.isShuffled ? this.shuffledQuestions : this.questions;
		return currentQuestions && this.currentQuestionIndex > 0;
	}

	toggleShuffle() {
		this.isShuffled = !this.isShuffled;
		if (this.isShuffled) {
			this.shuffleQuestions();
		}
		this.currentQuestionIndex = 0;
		this.checkResult = '';
		this.selectedAnswers = [];
		this.eliminatedAnswers = [];
	}

	shuffleQuestions() {
		if (this.questions && this.questions.length > 0) {
			this.shuffledQuestions = [...this.questions].sort(() => Math.random() - 0.5);
		}
	}

	handleSolution() {
		this.showSolution = !this.showSolution;
	}

	toggleElimination(optionId: string) {
		if (this.eliminatedAnswers.includes(optionId)) {
			this.eliminatedAnswers = this.eliminatedAnswers.filter((id) => id !== optionId);
		} else {
			this.eliminatedAnswers = [...this.eliminatedAnswers, optionId];
			this.selectedAnswers = this.selectedAnswers.filter((id) => id !== optionId);
		}
	}

	toggleOption(optionId: string) {
		// Don't allow selection if eliminated
		if (this.eliminatedAnswers.includes(optionId)) {
			return;
		}

		if (this.selectedAnswers.includes(optionId)) {
			this.selectedAnswers = this.selectedAnswers.filter((id) => id !== optionId);
		} else {
			this.selectedAnswers = [...this.selectedAnswers, optionId];
		}
	}

	isOptionSelected(optionId: string): boolean {
		return this.selectedAnswers.includes(optionId);
	}

	isOptionEliminated(optionId: string): boolean {
		return this.eliminatedAnswers.includes(optionId);
	}

	isCorrect(optionId: string): boolean {
		const currentQuestion = this.getCurrentQuestion();
		return currentQuestion ? currentQuestion.correctAnswers.includes(optionId) : false;
	}
}
