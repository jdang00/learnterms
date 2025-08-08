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
	shuffledQuestionIds: string[] = $state([]);
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
  private saveDebounceHandle: number | null = null;

  scheduleSave(delayMs: number = 400) {
    if (!this.saveProgressFunction) return;
    if (this.saveDebounceHandle) {
      clearTimeout(this.saveDebounceHandle);
    }
    this.saveDebounceHandle = window.setTimeout(async () => {
      if (this.saveProgressFunction) {
        await this.saveProgressFunction();
      }
      this.saveDebounceHandle = null;
    }, delayMs);
  }

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
    const current = this.getCurrentFilteredQuestion() || this.getCurrentQuestion();
    if (current) {
      if (this.currentQuestionFlagged) {
        if (!this.liveFlaggedQuestions.includes(current._id)) {
          this.liveFlaggedQuestions = [...this.liveFlaggedQuestions, current._id];
        }
      } else {
        this.liveFlaggedQuestions = this.liveFlaggedQuestions.filter((id) => id !== current._id);
      }
    }
    this.scheduleSave();
	}

	// Set flag status for current question (used when loading from database)
	setCurrentQuestionFlagged(isFlagged: boolean) {
		this.currentQuestionFlagged = isFlagged;
	}

	async goToNextQuestion() {
		const filteredQuestions = this.getFilteredQuestions();
		if (filteredQuestions && this.currentQuestionIndex < filteredQuestions.length - 1) {
      // Optimistic: schedule save without blocking UI
      this.scheduleSave();

			this.currentQuestionIndex++;
			this.checkResult = '';
			this.showSolution = false;

      // Optimistic: clear selections immediately
      this.selectedAnswers = [];
      this.eliminatedAnswers = [];

      // Load progress for the new question (non-blocking)
			const newQuestion = this.getCurrentFilteredQuestion();
			if (newQuestion && this.loadProgressFunction) {
        void this.loadProgressFunction(newQuestion._id);
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
      // Optimistic: schedule save without blocking UI
      this.scheduleSave();

			this.currentQuestionIndex--;
			this.checkResult = '';
			this.showSolution = false;

      // Optimistic: clear selections immediately
      this.selectedAnswers = [];
      this.eliminatedAnswers = [];

      // Load progress for the new question (non-blocking)
			const newQuestion = this.getCurrentFilteredQuestion();
			if (newQuestion && this.loadProgressFunction) {
        void this.loadProgressFunction(newQuestion._id);
			} else {
				// Clear state if no load function or no question
				this.selectedAnswers = [];
				this.eliminatedAnswers = [];
			}
		}
	}

	setQuestions(questions: Doc<'question'>[]) {
		this.questions = questions || [];
	}

	getCurrentQuestions(): Doc<'question'>[] {
		if (this.isShuffled && this.shuffledQuestionIds.length > 0) {
			return this.shuffledQuestionIds.map(id => 
				this.questions.find(q => q._id === id)
			).filter(Boolean) as Doc<'question'>[];
		}
		return this.questions;
	}

	async setCurrentQuestionIndex(index: number) {
		const currentQuestions = this.getCurrentQuestions();
		if (currentQuestions && index >= 0 && index < currentQuestions.length) {
      // Optimistic: schedule save without blocking UI
      this.scheduleSave();

			this.currentQuestionIndex = index;
			this.checkResult = '';
			this.showSolution = false;

      // Optimistic: clear selections immediately
      this.selectedAnswers = [];
      this.eliminatedAnswers = [];

      // Load progress for the new question (non-blocking)
			const newQuestion = this.getCurrentQuestion();
			if (newQuestion && this.loadProgressFunction) {
        void this.loadProgressFunction(newQuestion._id);
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
		const currentQuestions = this.getCurrentQuestions();
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
		this.showSolution = false;
		this.selectedAnswers = [];
		this.eliminatedAnswers = [];
    this.scheduleSave();
	}

	shuffleQuestions() {
		if (this.questions && this.questions.length > 0) {
			const questionIds = this.questions.map(q => q._id);
			const shuffled = [...questionIds];
			for (let i = shuffled.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
			}
			this.shuffledQuestionIds = shuffled;
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
    this.scheduleSave();
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
    // Optimistically mark as interacted
    const current = this.getCurrentFilteredQuestion() || this.getCurrentQuestion();
    if (current && !this.liveInteractedQuestions.includes(current._id)) {
      this.liveInteractedQuestions = [...this.liveInteractedQuestions, current._id];
    }
    this.scheduleSave();
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
		this.showSolution = false;
		this.selectedAnswers = [];
		this.eliminatedAnswers = [];
	}

	toggleShowIncomplete() {
		this.showIncomplete = !this.showIncomplete;
		this.currentQuestionIndex = 0;
		this.checkResult = '';
		this.showSolution = false;
		this.selectedAnswers = [];
		this.eliminatedAnswers = [];
	}

	getFilteredQuestions(): Doc<'question'>[] {
		let filteredQuestions = this.getCurrentQuestions();

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
		this.shuffledQuestionIds = [];
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
