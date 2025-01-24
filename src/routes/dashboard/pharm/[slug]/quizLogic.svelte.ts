import supabase from '$lib/supabaseClient';
import type { Question, Chapter } from '$lib/types';

export function useQuizLogic(initialQuestions: Question[], userId: string, userProgress: any) {
	// Reactive state
	let questions = $state(initialQuestions);
	let questionMap = $state<Record<string, Question>>({});
	let questionIds = $state<string[]>([]);
	let currentlySelectedId = $state('');

	let selectedAnswers = $state<Record<string, { selected: Set<string>; eliminated: Set<string> }>>(
		{}
	);
	let flags = $state(new Set<string>());
	let flagCount = $state(0);
	let checkResult = $state<string | null>(null);
	let refreshKey = $state(0);
	let unblur = $state(false);
	let showSolution = $state(false);

	// Derived state
	let questionOptions = $derived(
		questionMap[currentlySelectedId]?.question_data.options.map((option) => ({
			text: option,
			letter: option.split('.')[0].trim(),
			isSelected:
				selectedAnswers[currentlySelectedId]?.selected?.has(option.split('.')[0].trim()) || false,
			isEliminated:
				selectedAnswers[currentlySelectedId]?.eliminated?.has(option.split('.')[0].trim()) || false
		})) || []
	);

	let questionAnswerStates = $derived(
		showSolution
			? questionOptions.map((option) => ({
					...option,
					isCorrect: questionMap[currentlySelectedId].question_data.correct_answers.includes(
						option.letter
					)
				}))
			: questionOptions
	);

	let questionSolution = $derived(questionMap[currentlySelectedId]?.question_data.explanation);

	// Functions
	function restorefromDB() {
		const updatedAnswers: Record<string, { selected: Set<string>; eliminated: Set<string> }> = {};
		flags.clear();
		flagCount = 0;

		userProgress.forEach((progress) => {
			const selectedLetters = progress.selected_options.map((option) => option.letter);
			const eliminatedLetters = progress.eliminated_options.map((option) => option.letter);

			updatedAnswers[progress.question_id] = {
				selected: new Set(selectedLetters),
				eliminated: new Set(eliminatedLetters)
			};

			if (progress.is_flagged) {
				flags.add(progress.question_id);
			}
		});

		selectedAnswers = updatedAnswers;
		flagCount = flags.size;
		refreshKey++;
	}

	function initializeState() {
		questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));
		questionIds = questions.map((q) => q.id);
		currentlySelectedId = questionIds[0];
	}

	async function saveAllProgressToDB() {
		const rowsToUpsert = [];

		for (const questionId in selectedAnswers) {
			const progress = selectedAnswers[questionId];
			const hasSelectedOrEliminated =
				progress && (progress.selected.size > 0 || progress.eliminated.size > 0);
			const isFlagged = flags.has(questionId);

			if (hasSelectedOrEliminated || isFlagged) {
				rowsToUpsert.push({
					user_id: userId,
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
	}

	// Initialize
	restorefromDB();
	initializeState();

	// Return reactive state and functions
	return {
		questions,
		questionMap,
		questionIds,
		currentlySelectedId,
		selectedAnswers,
		flags,
		flagCount,
		checkResult,
		refreshKey,
		unblur,
		showSolution,
		questionOptions,
		questionAnswerStates,
		questionSolution,
		restorefromDB,
		initializeState,
		saveAllProgressToDB
	};
}
