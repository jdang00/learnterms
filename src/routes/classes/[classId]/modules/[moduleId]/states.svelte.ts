import type { Doc } from '../../../../../convex/_generated/dataModel';

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

	goToNextQuestion() {
		const currentQuestions = this.isShuffled ? this.shuffledQuestions : this.questions;
		if (currentQuestions && this.currentQuestionIndex < currentQuestions.length - 1) {
			this.currentQuestionIndex++;
			this.checkResult = '';
			this.selectedAnswers = [];
			this.eliminatedAnswers = [];
		}
	}

	goToPreviousQuestion() {
		const currentQuestions = this.isShuffled ? this.shuffledQuestions : this.questions;
		if (currentQuestions && this.currentQuestionIndex > 0) {
			this.currentQuestionIndex--;
			this.checkResult = '';
			this.selectedAnswers = [];
			this.eliminatedAnswers = [];
		}
	}

	setQuestions(questions: Doc<'question'>[]) {
		this.questions = questions || [];
		this.shuffledQuestions = questions ? [...questions] : [];
	}

	setCurrentQuestionIndex(index: number) {
		const currentQuestions = this.isShuffled ? this.shuffledQuestions : this.questions;
		if (currentQuestions && index >= 0 && index < currentQuestions.length) {
			this.currentQuestionIndex = index;
			this.checkResult = '';
			this.selectedAnswers = [];
			this.eliminatedAnswers = [];
		}
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
