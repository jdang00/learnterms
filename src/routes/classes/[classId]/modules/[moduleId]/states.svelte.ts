import type { Doc, Id } from '../../../../../convex/_generated/dataModel';
import { api } from '../../../../../convex/_generated/api';
import type { ConvexClient } from 'convex/browser';

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
	interactedQuestionsCount: number = $state(0);

	// Sort functionality
	showFlagged: boolean = $state(false);
	showIncomplete: boolean = $state(false);
	// Live Convex data (source of truth)
	liveFlaggedQuestions: Id<'question'>[] = $state([]);
	liveInteractedQuestions: Id<'question'>[] = $state([]);
	// No flags alert state
	noFlags: boolean = $state(false);
	// Reset modal state
	isResetModalOpen: boolean = $state(false);
	// Modal state for mobile
	isModalOpen: boolean = $state(false);
	// Question button references for scrolling
	questionButtons: HTMLButtonElement[] = $state([]);

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

	// Calculate progress percentage
	getProgressPercentage(): number {
		if (!this.questions || this.questions.length === 0) {
			return 0;
		}
		return Math.round((this.interactedQuestionsCount / this.questions.length) * 100);
	}

	// Update interacted questions count
	setInteractedQuestionsCount(count: number) {
		this.interactedQuestionsCount = count;
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
		const filteredQuestions = this.getFilteredQuestions();
		if (filteredQuestions && this.currentQuestionIndex < filteredQuestions.length - 1) {
			// Save progress before changing question
			if (this.saveProgressFunction) {
				await this.saveProgressFunction();
			}

			this.currentQuestionIndex++;
			this.checkResult = '';

			// Load progress for the new question
			const newQuestion = this.getCurrentFilteredQuestion();
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
		const filteredQuestions = this.getFilteredQuestions();
		if (filteredQuestions && this.currentQuestionIndex > 0) {
			// Save progress before changing question
			if (this.saveProgressFunction) {
				await this.saveProgressFunction();
			}

			this.currentQuestionIndex--;
			this.checkResult = '';

			// Load progress for the new question
			const newQuestion = this.getCurrentFilteredQuestion();
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

	// Update live Convex data (source of truth)
	updateLiveFlaggedQuestions(flagged: Id<'question'>[]) {
		this.liveFlaggedQuestions = flagged;
	}

	updateLiveInteractedQuestions(interacted: Id<'question'>[]) {
		this.liveInteractedQuestions = interacted;
	}

	getCurrentQuestion() {
		const currentQuestions = this.isShuffled ? this.shuffledQuestions : this.questions;
		if (!currentQuestions || currentQuestions.length === 0) {
			return null;
		}
		return currentQuestions[this.currentQuestionIndex] || currentQuestions[0];
	}

	canGoNext() {
		const currentQuestions = this.getFilteredQuestions();
		return currentQuestions && this.currentQuestionIndex < currentQuestions.length - 1;
	}

	canGoPrevious() {
		const currentQuestions = this.getFilteredQuestions();
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

	toggleSortByFlagged() {
		this.showFlagged = !this.showFlagged;
		this.currentQuestionIndex = 0;
		this.checkResult = '';
		this.selectedAnswers = [];
		this.eliminatedAnswers = [];
	}

	toggleShowIncomplete() {
		this.showIncomplete = !this.showIncomplete;
		this.currentQuestionIndex = 0;
		this.checkResult = '';
		this.selectedAnswers = [];
		this.eliminatedAnswers = [];
	}

	getFilteredQuestions(): Doc<'question'>[] {
		let filteredQuestions = this.isShuffled ? this.shuffledQuestions : this.questions;

		if (this.showFlagged) {
			// Check if there are any flagged questions
			if (this.liveFlaggedQuestions.length === 0) {
				return filteredQuestions;
			}
			filteredQuestions = filteredQuestions.filter((q) =>
				this.liveFlaggedQuestions.includes(q._id)
			);
		}

		if (this.showIncomplete) {
			filteredQuestions = filteredQuestions.filter(
				(q) => !this.liveInteractedQuestions.includes(q._id)
			);
		}

		return filteredQuestions;
	}

	getCurrentFilteredQuestion(): Doc<'question'> | null {
		const filteredQuestions = this.getFilteredQuestions();
		if (!filteredQuestions || filteredQuestions.length === 0) {
			return null;
		}
		// Ensure currentQuestionIndex is within bounds of filtered questions
		const safeIndex = Math.min(this.currentQuestionIndex, filteredQuestions.length - 1);
		return filteredQuestions[safeIndex] || filteredQuestions[0];
	}

	async reset(userId: Id<'users'>, moduleId: Id<'module'>, client: ConvexClient) {
		// Clear local state
		this.selectedAnswers = [];
		this.eliminatedAnswers = [];
		this.currentQuestionFlagged = false;
		this.checkResult = '';
		this.showSolution = false;
		this.currentQuestionIndex = 0;
		this.isShuffled = false;
		this.showFlagged = false;
		this.showIncomplete = false;
		this.noFlags = false;

		// Clear progress from database
		try {
			await client.mutation(api.userProgress.clearUserProgressForModule, {
				userId: userId,
				moduleId: moduleId
			});
		} catch (error) {
			console.error('Error resetting progress:', error);
		}
	}
}
