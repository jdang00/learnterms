import type { Question, Option, ExtendedOption, Chapter } from '$lib/types';
import type { PageData } from './$types';
import supabase from '$lib/supabaseClient';

export class QuestionMap {
	questions: Question[];
	chapterData: Chapter;
	userId;
	userProgress;

	constructor(data: PageData) {
		this.questions = data.questions;
		this.chapterData = data.chapters;
		this.userId = data.userId;
		this.userProgress = data.progressData;
	}

	questionIds = $state<string[]>([]);
	currentlySelectedId: string = $state('');
	questionMap = $state<Record<string, Question>>({});
	selectedAnswers = $state<Record<string, { selected: Set<string>; eliminated: Set<string> }>>({});
	showSolution = $state(false);
	interactedQuestions = $state<Set<string>>(new Set());
	shuffledQuestionIds = $state<string[]>([]);
	isShuffled = $state(false);
	flags = new Set<string>();
	flagCount = $state(0);
	checkResult = $state<string | null>(null);
	refreshKey = $state(0);
	unblur = $state(false);
	isModalOpen = $state(false);
	showFlagged = $state(false);
	showIncomplete = $state(false);
	questionButtons: HTMLButtonElement[] = $state([]);

	correctAnswersCount = $derived(
		this.questionMap[this.currentlySelectedId]?.question_data?.correct_answers?.length ?? 0
	);

	questionOptions = $derived(
		(this.questionMap[this.currentlySelectedId]?.question_data?.options?.map((option) => ({
			text: option,
			letter: option.split('.')[0].trim(),
			isSelected:
				this.selectedAnswers[this.currentlySelectedId]?.selected?.has(
					option.split('.')[0].trim()
				) || false,
			isEliminated:
				this.selectedAnswers[this.currentlySelectedId]?.eliminated?.has(
					option.split('.')[0].trim()
				) || false
		})) || []) as Option[]
	);

	questionAnswerStates = $derived(
		this.showSolution
			? this.questionOptions.map((option) => ({
					...option,
					isCorrect: this.questionMap[
						this.currentlySelectedId
					].question_data.correct_answers.includes(option.letter)
				}))
			: this.questionOptions
	) as ExtendedOption[];

	questionSolution = $derived(
		this.questionMap[this.currentlySelectedId]?.question_data?.explanation || ''
	);

	progress = $derived.by(() => {
		const totalQuestions = this.questions.length;
		const answeredQuestions = this.interactedQuestions.size;
		return Math.round((answeredQuestions / totalQuestions) * 100);
	});

	toggleFlag = () => {
		if (this.flags.has(this.currentlySelectedId)) {
			this.flags.delete(this.currentlySelectedId);
		} else {
			this.flags.add(this.currentlySelectedId);
		}
		this.flagCount = this.flags.size;
	};

	restorefromDB = () => {
		const updatedAnswers: Record<string, { selected: Set<string>; eliminated: Set<string> }> = {};
		this.flags.clear();
		this.flagCount = 0;
		this.interactedQuestions.clear();

		this.userProgress.forEach((progress) => {
			const selectedLetters = progress.selected_options.map((option) => option.letter);
			const eliminatedLetters = progress.eliminated_options.map((option) => option.letter);

			updatedAnswers[progress.question_id] = {
				selected: new Set(selectedLetters),
				eliminated: new Set(eliminatedLetters)
			};

			if (selectedLetters.length > 0 || eliminatedLetters.length > 0) {
				this.interactedQuestions.add(progress.question_id);
			}

			if (progress.is_flagged) {
				this.flags.add(progress.question_id);
			}
		});

		this.selectedAnswers = updatedAnswers;
		this.flagCount = this.flags.size;
		this.interactedQuestions = new Set(this.interactedQuestions);
		this.refreshKey++;
	};

	changeSelected = async (id: string) => {
		this.saveselectedAnswers();
		this.currentlySelectedId = id;
		this.checkResult = null;
		this.unblur = false;
		this.showSolution = false;
		this.restoreselectedAnswers();
		this.refreshKey++;
	};

	saveselectedAnswers = () => {
		if (!this.selectedAnswers[this.currentlySelectedId]) {
			this.selectedAnswers[this.currentlySelectedId] = {
				selected: new Set(),
				eliminated: new Set()
			};
		}

		this.selectedAnswers[this.currentlySelectedId].selected = new Set(
			this.questionOptions.filter((o) => o.isSelected).map((o) => o.letter)
		);

		this.selectedAnswers[this.currentlySelectedId].eliminated = new Set(
			this.questionOptions.filter((o) => o.isEliminated).map((o) => o.letter)
		);
	};

	// Compares selected answers with the correct ones and sets the result
	checkAnswers = () => {
		console.log(this.unblur);
		const currentQuestion = this.questionMap[this.currentlySelectedId];
		if (!currentQuestion) {
			this.checkResult = 'Error. Question ID not found.';
			return;
		}

		const correctAnswers = new Set(currentQuestion.question_data.correct_answers);

		const selected = this.selectedAnswers[this.currentlySelectedId]?.selected || new Set();

		const isCorrect =
			Array.from(selected).every((a) => correctAnswers.has(a)) &&
			Array.from(correctAnswers).every((a) => selected.has(a));

		this.checkResult = isCorrect ? 'Correct!' : 'Incorrect. Try again.';
	};

	restoreselectedAnswers = () => {
		const saved = this.selectedAnswers[this.currentlySelectedId] || {
			selected: new Set(),
			eliminated: new Set()
		};

		this.questionOptions.forEach((o) => {
			o.isSelected = saved.selected?.has(o.letter) || false;
			o.isEliminated = saved.eliminated?.has(o.letter) || false;
		});
	};

	getCurrentQuestionIds = () => {
		let ids = this.isShuffled ? this.shuffledQuestionIds : this.questionIds;

		if (this.showFlagged) {
			ids = ids.filter((id) => this.flags.has(id));
		}

		if (this.showIncomplete) {
			ids = [...ids].sort((a, b) => {
				const aComplete = this.selectedAnswers[a]?.selected.size > 0;
				const bComplete = this.selectedAnswers[b]?.selected.size > 0;
				return aComplete === bComplete ? 0 : aComplete ? 1 : -1;
			});
		}

		return ids;
	};

	toggleOption = (index: number) => {
		if (this.questionOptions[index].isEliminated) return;
		const optionLetter = this.questionOptions[index].letter;

		const current = this.selectedAnswers[this.currentlySelectedId] || {
			selected: new Set<string>(),
			eliminated: new Set<string>()
		};

		const newSelected = new Set(current.selected);
		if (newSelected.has(optionLetter)) {
			newSelected.delete(optionLetter);
		} else {
			newSelected.add(optionLetter);
		}

		this.selectedAnswers = {
			...this.selectedAnswers,
			[this.currentlySelectedId]: {
				selected: newSelected,
				eliminated: current.eliminated
			}
		};

		const hasInteractions = newSelected.size > 0 || current.eliminated.size > 0;
		if (hasInteractions) {
			this.interactedQuestions.add(this.currentlySelectedId);
		} else {
			this.interactedQuestions.delete(this.currentlySelectedId);
		}

		this.currentlySelectedId = this.currentlySelectedId;
		this.interactedQuestions = new Set(this.interactedQuestions);
	};

	initializeState = () => {
		this.questionMap = Object.fromEntries(this.questions.map((q) => [q.id, q]));
		this.questionIds = this.questions.map((q) => q.id);
		if (this.questionIds.length > 0) {
			this.currentlySelectedId = this.questionIds[0];
		} else {
			this.currentlySelectedId = '';
		}
	};

	toggleShuffle = () => {
		this.isShuffled = !this.isShuffled;
		if (this.isShuffled) {
			this.shuffleQuestionMap();
		}
		this.currentlySelectedId = this.getCurrentQuestionIds()[0];
	};

	shuffleQuestionMap = () => {
		const entries = Object.entries(this.questionMap);
		for (let i = entries.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[entries[i], entries[j]] = [entries[j], entries[i]];
		}
		this.shuffledQuestionIds = entries.map(([id]) => id);
	};

	clearselectedAnswers = async () => {
		this.selectedAnswers[this.currentlySelectedId] = {
			selected: new Set(),
			eliminated: new Set()
		};
		this.questionOptions.forEach((o) => {
			o.isSelected = false;
			o.isEliminated = false;
		});
		this.checkResult = null;

		this.interactedQuestions.delete(this.currentlySelectedId);
		this.interactedQuestions = new Set(this.interactedQuestions);
		this.refreshKey++;

		const { error } = await supabase
			.from('user_question_interactions')
			.delete()
			.eq('question_id', this.currentlySelectedId);

		if (error) {
			console.error('Error deleting progress from database:', error);
		}
	};

	toggleShowIncomplete = () => {
		this.showIncomplete = !this.showIncomplete;
		this.currentlySelectedId = this.getCurrentQuestionIds()[0] || '';
		this.refreshKey++;
	};

	goToNextQuestion = () => {
		const currentQuestionIds = this.getCurrentQuestionIds();
		const currentIndex = currentQuestionIds.indexOf(this.currentlySelectedId);
		if (currentIndex < currentQuestionIds.length - 1) {
			this.currentlySelectedId = currentQuestionIds[currentIndex + 1];
		}
	};

	goToPreviousQuestion = () => {
		const currentQuestionIds = this.getCurrentQuestionIds();
		const currentIndex = currentQuestionIds.indexOf(this.currentlySelectedId);
		if (currentIndex > 0) {
			this.currentlySelectedId = currentQuestionIds[currentIndex - 1];
		}
	};

	toggleShowFlagged = () => {
		this.showFlagged = !this.showFlagged;
		this.currentlySelectedId = this.getCurrentQuestionIds()[0] || '';
	};

	toggleElimination = (index: number) => {
		const optionLetter = this.questionOptions[index].letter;

		const current = this.selectedAnswers[this.currentlySelectedId] || {
			selected: new Set<string>(),
			eliminated: new Set<string>()
		};

		const newEliminated = new Set(current.eliminated);
		if (newEliminated.has(optionLetter)) {
			newEliminated.delete(optionLetter);
		} else {
			newEliminated.add(optionLetter);
		}

		const newSelected = new Set(current.selected);
		if (newEliminated.has(optionLetter)) {
			newSelected.delete(optionLetter);
		}

		this.selectedAnswers = {
			...this.selectedAnswers,
			[this.currentlySelectedId]: {
				selected: newSelected,
				eliminated: newEliminated
			}
		};

		const hasInteractions = newSelected.size > 0 || newEliminated.size > 0;
		if (hasInteractions) {
			this.interactedQuestions.add(this.currentlySelectedId);
		} else {
			this.interactedQuestions.delete(this.currentlySelectedId);
		}

		this.currentlySelectedId = this.currentlySelectedId;
		this.interactedQuestions = new Set(this.interactedQuestions);
	};

	handleSolution = () => {
		this.showSolution = !this.showSolution;
		this.unblur = !this.unblur;
		this.refreshKey++;
	};

	saveAllProgressToDB = async () => {
		try {
			const rowsToUpsert = [];

			for (const questionId in this.selectedAnswers) {
				const progress = this.selectedAnswers[questionId];
				const hasSelectedOrEliminated =
					progress && (progress.selected.size > 0 || progress.eliminated.size > 0);
				const isFlagged = this.flags.has(questionId);

				if (hasSelectedOrEliminated || isFlagged) {
					rowsToUpsert.push({
						user_id: this.userId,
						question_id: questionId,
						selected_options: hasSelectedOrEliminated
							? Array.from(progress.selected).map((letter) => ({ letter }))
							: [],
						eliminated_options: hasSelectedOrEliminated
							? Array.from(progress.eliminated).map((letter) => ({ letter }))
							: [],
						is_flagged: isFlagged,
						updated_at: new Date()
					});
				}
			}

			if (rowsToUpsert.length > 0) {
				const { error } = await supabase.from('user_question_interactions').upsert(rowsToUpsert, {
					onConflict: ['user_id', 'question_id']
				});

				if (error) {
					console.error('Error saving progress to the database:', error);
				}
			}
		} catch (err) {
			console.error('Unexpected error while saving progress:', err);
		}
	};
}
