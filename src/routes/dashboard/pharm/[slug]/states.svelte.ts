import type { Question, Option, ExtendedOption, Chapter } from '$lib/types';
import type { PageData } from './$types';
import supabase from '$lib/supabaseClient';

export class QuestionMap {
	questions: Question[];
	chapterData: Chapter;
	userId: string;
	userProgress;

	constructor(data: PageData) {
		this.questions = data.questions;
		this.chapterData = data.chapters;
		this.userId = data.userId;
		this.userProgress = data.progressData;
	}

	questionIds = $state<string[]>([]);
	currentlySelectedId = $state('');
	questionMap = $state<Record<string, Question>>({});
	selectedAnswers = $state<Record<string, { selected: Set<string>; eliminated: Set<string> }>>({});
	showSolution = $state(false);
	interactedQuestions = $state<Set<string>>(new Set());
	shuffledQuestionIds = $state<string[]>([]);
	isShuffled = $state(false);
	flags = $state(new Set<string>());
	flagCount = $derived(this.flags.size);
	checkResult = $state<string | null>(null);
	refreshKey = $state(0);
	isModalOpen = $state(false);
	isResetModalOpen = $state(false);
	showFlagged = $state(false);
	showIncomplete = $state(false);
	questionButtons: HTMLButtonElement[] = $state([]);
	noFlags = $state(false);
	navigationIds = $state<string[]>([]);
	dirtyQuestions = new Set<string>();

	// Debounce function
	private debounce = <T extends (...args: unknown[]) => void>(func: T, delay: number) => {
		let timeoutId: ReturnType<typeof setTimeout>;
		return (...args: Parameters<T>) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => func(...args), delay);
		};
	};

	// Debounced save method
	private debouncedSaveAllProgressToDB = this.debounce(() => {
		this.saveAllProgressToDB();
	}, 5000);

	correctAnswersCount = $derived(
		this.questionMap[this.currentlySelectedId]?.question_data.correct_answers.length ?? 0
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

	getBaseSequence = () => {
		return this.isShuffled ? this.shuffledQuestionIds : this.questionIds;
	};

	isQuestionVisible = (id: string) => {
		if (this.showIncomplete && this.selectedAnswers[id]?.selected.size > 0) {
			return false;
		}
		return true;
	};

	progress = $derived.by(() => {
		const totalQuestions = this.questions.length;
		const answeredQuestions = this.interactedQuestions.size;
		return Math.round((answeredQuestions / totalQuestions) * 100);
	});

	toggleFlag = () => {
		const questionId = this.currentlySelectedId;
		if (this.flags.has(questionId)) {
			this.flags.delete(questionId);
		} else {
			this.flags.add(questionId);
		}
		this.flags = new Set(this.flags);
		this.dirtyQuestions.add(questionId);
		this.debouncedSaveAllProgressToDB();
	};

	restorefromDB = () => {
		const updatedAnswers: Record<string, { selected: Set<string>; eliminated: Set<string> }> = {};
		const newFlags = new Set<string>();
		const newInteracted = new Set<string>();

		this.userProgress.forEach((progress) => {
			const selectedLetters = progress.selected_options.map((option) => option.letter);
			const eliminatedLetters = progress.eliminated_options.map((option) => option.letter);

			updatedAnswers[progress.question_id] = {
				selected: new Set(selectedLetters),
				eliminated: new Set(eliminatedLetters)
			};

			if (selectedLetters.length > 0 || eliminatedLetters.length > 0) {
				newInteracted.add(progress.question_id);
			}

			if (progress.is_flagged) {
				newFlags.add(progress.question_id);
			}
		});

		this.selectedAnswers = updatedAnswers;
		this.flags = newFlags;
		this.interactedQuestions = newInteracted;
		this.refreshKey++;
	};

	changeSelected = async (id: string) => {
		this.saveselectedAnswers();
		this.currentlySelectedId = id;
		this.checkResult = null;
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

	checkAnswers = () => {
		const currentQuestion = this.questionMap[this.currentlySelectedId];
		if (!currentQuestion) {
			this.checkResult = 'Error. Question ID not found.';
			return;
		}

		const correctAnswers = new Set(currentQuestion.question_data.correct_answers);
		const selected = this.selectedAnswers[this.currentlySelectedId]?.selected || new Set();

		if (selected.size !== correctAnswers.size) {
			this.checkResult = 'Incorrect. Try again.';
			return;
		}

		const sortedSelected = Array.from(selected).sort();
		const sortedCorrect = Array.from(correctAnswers).sort();

		this.checkResult =
			JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect)
				? 'Correct!'
				: 'Incorrect. Try again.';
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
			if (this.flags.size === 0) {
				this.noFlags = true;
				this.showFlagged = false;
				return ids;
			}
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

	initializeState = () => {
		this.questionMap = Object.fromEntries(this.questions.map((q) => [q.id, q]));
		this.questionIds = this.questions.map((q) => q.id);
		if (this.questionIds.length > 0) {
			this.currentlySelectedId = this.questionIds[0];
		} else {
			this.currentlySelectedId = '';
		}
		this.selectedAnswers = Object.fromEntries(
			this.questionIds.map((id) => [id, { selected: new Set(), eliminated: new Set() }])
		);
		this.updateNavigationIds();
	};

	toggleShuffle = () => {
		this.isShuffled = !this.isShuffled;
		if (this.isShuffled) {
			this.shuffleQuestionMap();
		}
		this.currentlySelectedId = this.getCurrentQuestionIds()[0];
	};

	toggleSortByFlagged = () => {
		this.showFlagged = !this.showFlagged;
		this.currentlySelectedId = this.getCurrentQuestionIds()[0] || '';
		this.refreshKey++;
	};

	shuffleQuestionMap = () => {
		const entries = Object.entries(this.questionMap);
		for (let i = entries.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[entries[i], entries[j]] = [entries[j], entries[i]];
		}
		this.shuffledQuestionIds = entries.map(([id]) => id);
	};

	clearSelectedAnswers = () => {
		const questionId = this.currentlySelectedId;
		this.selectedAnswers[questionId] = {
			selected: new Set<string>(),
			eliminated: new Set<string>()
		};
		this.selectedAnswers = { ...this.selectedAnswers };
		this.dirtyQuestions.add(questionId);
		this.interactedQuestions.delete(questionId);
		this.interactedQuestions = new Set(this.interactedQuestions);
		this.debouncedSaveAllProgressToDB();
	};

	toggleShowIncomplete = () => {
		this.showIncomplete = !this.showIncomplete;
		this.updateNavigationIds();
		this.refreshKey++;
	};

	updateNavigationIds = () => {
		if (this.showIncomplete) {
			const incompleteIds = this.questionIds.filter(
				(id) => !this.selectedAnswers[id]?.selected.size
			);
			this.navigationIds = incompleteIds;
		} else {
			this.navigationIds = this.isShuffled ? this.shuffledQuestionIds : this.questionIds;
		}
		this.currentlySelectedId = this.navigationIds[0] || '';
	};

	goToNextQuestion = () => {
		const baseSequence = this.getBaseSequence();
		const currentIndex = baseSequence.indexOf(this.currentlySelectedId);
		if (currentIndex === -1) return;

		for (let i = currentIndex + 1; i < baseSequence.length; i++) {
			const nextId = baseSequence[i];
			if (this.isQuestionVisible(nextId)) {
				this.changeSelected(nextId);
				return;
			}
		}
	};

	goToPreviousQuestion = () => {
		const baseSequence = this.getBaseSequence();
		const currentIndex = baseSequence.indexOf(this.currentlySelectedId);
		if (currentIndex === -1) return;

		for (let i = currentIndex - 1; i >= 0; i--) {
			const prevId = baseSequence[i];
			if (this.isQuestionVisible(prevId)) {
				this.changeSelected(prevId);
				return;
			}
		}
	};

	refreshIncompleteSort = () => {
		if (this.showIncomplete) {
			this.updateNavigationIds();
			this.refreshKey++;
		}
	};

	updateAnswerState = (type: 'selected' | 'eliminated', optionLetter: string) => {
		const current = this.selectedAnswers[this.currentlySelectedId] || {
			selected: new Set<string>(),
			eliminated: new Set<string>()
		};
		const newSelected = new Set(current.selected);
		const newEliminated = new Set(current.eliminated);

		if (type === 'selected') {
			if (newSelected.has(optionLetter)) {
				newSelected.delete(optionLetter);
			} else {
				newSelected.add(optionLetter);
			}
		} else if (type === 'eliminated') {
			if (newEliminated.has(optionLetter)) {
				newEliminated.delete(optionLetter);
			} else {
				newEliminated.add(optionLetter);
			}
			if (newSelected.has(optionLetter)) {
				newSelected.delete(optionLetter);
			}
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
		this.interactedQuestions = new Set(this.interactedQuestions);

		this.dirtyQuestions.add(this.currentlySelectedId);
		this.debouncedSaveAllProgressToDB();
	};

	toggleOption = (index: number) => {
		const option = this.questionOptions[index];
		if (!option) {
			console.warn(`Option at index ${index} not found for question ${this.currentlySelectedId}`);
			return;
		}
		if (option.isEliminated) return;
		const optionLetter = option.letter;
		this.updateAnswerState('selected', optionLetter);
	};

	toggleElimination = (index: number) => {
		const optionLetter = this.questionOptions[index].letter;
		this.updateAnswerState('eliminated', optionLetter);
	};

	handleSolution = () => {
		this.showSolution = !this.showSolution;
		this.refreshKey++;
	};

	saveAllProgressToDB = async () => {
		try {
			const rowsToUpsert = [];

			for (const questionId of this.dirtyQuestions) {
				const progress = this.selectedAnswers[questionId] || {
					selected: new Set<string>(),
					eliminated: new Set<string>()
				};
				const isFlagged = this.flags.has(questionId);

				rowsToUpsert.push({
					user_id: this.userId,
					question_id: questionId,
					selected_options: Array.from(progress.selected).map((letter) => ({ letter })),
					eliminated_options: Array.from(progress.eliminated).map((letter) => ({ letter })),
					is_flagged: isFlagged,
					updated_at: new Date()
				});
			}

			if (rowsToUpsert.length > 0) {
				const { error } = await supabase.from('user_question_interactions').upsert(rowsToUpsert, {
					onConflict: ['user_id', 'question_id']
				});
				if (error) {
					console.error('Save error:', error);
				} else {
					this.dirtyQuestions.clear();
				}
			}
		} catch (err) {
			console.error('Unexpected error:', err);
		}
	};

	reset = async () => {
		this.selectedAnswers = {};
		this.flags = new Set();
		this.interactedQuestions.clear();
		this.checkResult = null;
		this.showSolution = false;
		this.refreshKey++;
		this.isResetModalOpen = false;

		this.currentlySelectedId = this.questionIds.length > 0 ? this.questionIds[0] : '';

		const questionIdsToDelete = Array.from(
			new Set([...this.questionIds, ...Array.from(this.flags)])
		);

		const { error } = await supabase
			.from('user_question_interactions')
			.delete()
			.eq('user_id', this.userId)
			.in('question_id', questionIdsToDelete);

		if (error) {
			console.error('Error resetting progress in database:', error);
		}

		this.dirtyQuestions.clear();
	};
}
