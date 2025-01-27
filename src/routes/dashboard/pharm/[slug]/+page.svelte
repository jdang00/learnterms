<script lang="ts">
	import type { PageData } from './$types';
	import { onDestroy } from 'svelte';
	import { ArrowLeft, Eye, Flag, ArrowRight, Shuffle, BookmarkCheck } from 'lucide-svelte';
	import type { Question, Chapter, ExtendedOption, Option } from '$lib/types';
	import supabase from '$lib/supabaseClient';

	// Props and initial state
	let { data }: { data: PageData } = $props();
	let questions: Question[] = data.questions;
	let chapterData: Chapter = data.chapters;
	let userId = data.userId;
	let userProgress = data.progressData;

	// Reactive state declarationss
	let questionMap = $state<Record<string, Question>>({});
	let questionIds = $state<string[]>([]);
	let shuffledQuestionIds = $state<string[]>([]);

	let isShuffled = $state(false);
	let currentlySelectedId: string = $state('');
	let selectedAnswers = $state<Record<string, { selected: Set<string>; eliminated: Set<string> }>>(
		{}
	);

	let flags = new Set<string>();
	let flagCount = $state(0);
	let checkResult = $state<string | null>(null);
	let refreshKey = $state(0);
	let unblur = $state(false);
	let showSolution = $state(false);
	let isModalOpen = $state(false);
	let showFlagged = $state(false);
	let showIncomplete = $state(false);

	let interactedQuestions = $state<Set<string>>(new Set());

	let progress = $derived.by(() => {
		const totalQuestions = questions.length;
		const answeredQuestions = interactedQuestions.size;

		return Math.round((answeredQuestions / totalQuestions) * 100);
	});

	function shuffleQuestionMap() {
		const entries = Object.entries(questionMap); // Convert map to array
		for (let i = entries.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[entries[i], entries[j]] = [entries[j], entries[i]];
		}
		shuffledQuestionIds = entries.map(([id]) => id); // Update shuffled question IDs
	}

	function toggleShuffle() {
		isShuffled = !isShuffled;
		if (isShuffled) {
			shuffleQuestionMap();
		}
		currentlySelectedId = getCurrentQuestionIds()[0];
	}

	function restorefromDB() {
		const updatedAnswers: Record<string, { selected: Set<string>; eliminated: Set<string> }> = {};
		flags.clear();
		flagCount = 0;
		interactedQuestions.clear(); // Clear the set before populating it

		userProgress.forEach((progress) => {
			const selectedLetters = progress.selected_options.map((option) => option.letter);
			const eliminatedLetters = progress.eliminated_options.map((option) => option.letter);

			updatedAnswers[progress.question_id] = {
				selected: new Set(selectedLetters),
				eliminated: new Set(eliminatedLetters)
			};

			// Add the question to interactedQuestions if it has selected or eliminated options
			if (selectedLetters.length > 0 || eliminatedLetters.length > 0) {
				interactedQuestions.add(progress.question_id);
			}

			if (progress.is_flagged) {
				flags.add(progress.question_id);
			}
		});

		selectedAnswers = updatedAnswers;
		flagCount = flags.size;

		// Reassign to trigger reactivity
		interactedQuestions = new Set(interactedQuestions);

		refreshKey++;
	}

	restorefromDB();

	// Initialize question map and IDs
	function initializeState() {
		questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));
		questionIds = questions.map((q) => q.id);
		currentlySelectedId = questionIds[0];
	}
	initializeState();

	// Derived stores for options, answer states, and solutions
	let questionOptions = $derived(
		(questionMap[currentlySelectedId]?.question_data.options.map((option) => ({
			text: option,
			letter: option.split('.')[0].trim(),
			isSelected:
				selectedAnswers[currentlySelectedId]?.selected?.has(option.split('.')[0].trim()) || false,
			isEliminated:
				selectedAnswers[currentlySelectedId]?.eliminated?.has(option.split('.')[0].trim()) || false
		})) as Option[]) || []
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
	) as ExtendedOption[];

	let questionSolution = $derived(questionMap[currentlySelectedId].question_data.explanation);

	// Toggles the flagged state of a question
	function toggleFlag(id: string) {
		if (flags.has(id)) {
			flags.delete(id);
		} else {
			flags.add(id);
		}
		flagCount = flags.size;
	}

	// Changes the currently selected question by ID
	async function changeSelected(id: string) {
		saveSelectedAnswers();
		currentlySelectedId = id;
		checkResult = null;
		unblur = false;
		showSolution = false;
		restoreSelectedAnswers();

		refreshKey++;
	}

	// Toggles the selection state of an option
	function toggleOption(index: number) {
		if (questionOptions[index].isEliminated) return;
		const option = questionOptions[index].letter;

		if (!selectedAnswers[currentlySelectedId]) {
			selectedAnswers[currentlySelectedId] = {
				selected: new Set(),
				eliminated: new Set()
			};
		}

		if (selectedAnswers[currentlySelectedId].selected.has(option)) {
			selectedAnswers[currentlySelectedId].selected.delete(option);
		} else {
			selectedAnswers[currentlySelectedId].selected.add(option);
		}

		questionOptions[index].isSelected = !questionOptions[index].isSelected;

		// Update interactedQuestions
		if (
			selectedAnswers[currentlySelectedId].selected.size > 0 ||
			selectedAnswers[currentlySelectedId].eliminated.size > 0
		) {
			interactedQuestions.add(currentlySelectedId);
		} else {
			interactedQuestions.delete(currentlySelectedId);
		}

		// Reassign to trigger reactivity
		interactedQuestions = new Set(interactedQuestions);
	}

	// Compares selected answers with the correct ones and sets the result
	function checkAnswers() {
		const currentQuestion = questionMap[currentlySelectedId];
		if (!currentQuestion) {
			checkResult = 'Error. Question ID not found.';
			return;
		}

		const correctAnswers = new Set(currentQuestion.question_data.correct_answers);
		const selected = selectedAnswers[currentlySelectedId]?.selected || new Set();

		const isCorrect =
			Array.from(selected).every((a) => correctAnswers.has(a)) &&
			Array.from(correctAnswers).every((a) => selected.has(a));

		checkResult = isCorrect ? 'Correct!' : 'Incorrect. Try again.';
	}

	// Saves the selected and eliminated options for the current question
	function saveSelectedAnswers() {
		if (!selectedAnswers[currentlySelectedId]) {
			selectedAnswers[currentlySelectedId] = { selected: new Set(), eliminated: new Set() };
		}

		selectedAnswers[currentlySelectedId].selected = new Set(
			questionOptions.filter((o) => o.isSelected).map((o) => o.letter)
		);

		selectedAnswers[currentlySelectedId].eliminated = new Set(
			questionOptions.filter((o) => o.isEliminated).map((o) => o.letter)
		);
	}

	// Restores the saved options for the current question
	function restoreSelectedAnswers() {
		const saved = selectedAnswers[currentlySelectedId] || {
			selected: new Set(),
			eliminated: new Set()
		};

		questionOptions.forEach((o) => {
			o.isSelected = saved.selected?.has(o.letter) || false;
			o.isEliminated = saved.eliminated?.has(o.letter) || false;
		});
	}

	// Clears all selected and eliminated options for the current question
	async function clearSelectedAnswers() {
		selectedAnswers[currentlySelectedId] = {
			selected: new Set(),
			eliminated: new Set()
		};
		questionOptions.forEach((o) => {
			o.isSelected = false;
			o.isEliminated = false;
		});
		checkResult = null;

		// Update interactedQuestions
		interactedQuestions.delete(currentlySelectedId);

		// Reassign to trigger reactivity
		interactedQuestions = new Set(interactedQuestions);

		refreshKey++;

		const { error } = await supabase
			.from('user_question_interactions')
			.delete()
			.eq('question_id', currentlySelectedId);

		if (error) {
			console.error('Error deleting progress from database:', error);
		}
	}

	function getCurrentQuestionIds() {
		let ids = isShuffled ? shuffledQuestionIds : questionIds;

		// Filter flagged questions if showFlagged is true
		if (showFlagged) {
			ids = ids.filter((id) => flags.has(id));
		}

		// Sort incomplete questions to the front if showIncomplete is true
		if (showIncomplete) {
			ids = [...ids].sort((a, b) => {
				const aComplete = selectedAnswers[a]?.selected.size > 0;
				const bComplete = selectedAnswers[b]?.selected.size > 0;
				return aComplete === bComplete ? 0 : aComplete ? 1 : -1;
			});
		}

		return ids;
	}

	function toggleShowIncomplete() {
		showIncomplete = !showIncomplete;
		currentlySelectedId = getCurrentQuestionIds()[0] || '';
		refreshKey++; // Trigger a rerender
	}

	// Moves to the next question
	function goToNextQuestion() {
		const currentQuestionIds = getCurrentQuestionIds();
		const currentIndex = currentQuestionIds.indexOf(currentlySelectedId);
		if (currentIndex < currentQuestionIds.length - 1) {
			currentlySelectedId = currentQuestionIds[currentIndex + 1];
		}
	}

	// Moves to the previous question

	function goToPreviousQuestion() {
		const currentQuestionIds = getCurrentQuestionIds();
		const currentIndex = currentQuestionIds.indexOf(currentlySelectedId);
		if (currentIndex > 0) {
			currentlySelectedId = currentQuestionIds[currentIndex - 1];
		}
	}

	function toggleShowFlagged() {
		showFlagged = !showFlagged;
		currentlySelectedId = getCurrentQuestionIds()[0] || '';
	}

	// Toggles the elimination state of an option
	function toggleElimination(index: number) {
		const option = questionOptions[index];
		option.isEliminated = !option.isEliminated;

		if (!selectedAnswers[currentlySelectedId]) {
			selectedAnswers[currentlySelectedId] = {
				selected: new Set(),
				eliminated: new Set()
			};
		}

		if (option.isEliminated) {
			selectedAnswers[currentlySelectedId].eliminated.add(option.letter);
			if (option.isSelected) {
				selectedAnswers[currentlySelectedId].selected.delete(option.letter);
				option.isSelected = false;
			}
		} else {
			selectedAnswers[currentlySelectedId].eliminated.delete(option.letter);
		}

		// Update interactedQuestions
		if (
			selectedAnswers[currentlySelectedId].selected.size > 0 ||
			selectedAnswers[currentlySelectedId].eliminated.size > 0
		) {
			interactedQuestions.add(currentlySelectedId);
		} else {
			interactedQuestions.delete(currentlySelectedId);
		}

		// Reassign to trigger reactivity
		interactedQuestions = new Set(interactedQuestions);

		refreshKey++;
	}
	// Toggles the display of the solution
	function handleSolution() {
		showSolution = !showSolution;
		unblur = !unblur;
		refreshKey++;
	}

	// Handles keyboard navigation and shortcuts
	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'Tab':
				event.preventDefault();
				handleSolution();
				break;
			case 'Enter':
				checkAnswers();
				break;
			case 'Escape':
				clearSelectedAnswers();
				break;
			case 'ArrowRight':
				goToNextQuestion();
				break;
			case 'ArrowLeft':
				goToPreviousQuestion();
				break;
		}
	}

	// Effect for reactive updates and event listeners
	$effect(() => {
		questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));
		questionIds = questions.map((q) => q.id);
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		saveAllProgressToDB();
	});

	async function saveAllProgressToDB() {
		try {
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
		} catch (err) {
			console.error('Unexpected error while saving progress:', err);
		}
	}
</script>

<div class="flex flex-row max-h-screen lg:h-screen lg:border-t border-b border-base-300">
	<!--Sidebar -->
	<div class="hidden lg:block w-1/4 lg:border-r border-base-300 overflow-y-auto">
		<a class="btn btn-ghost mt-4 ms-2" href="/dashboard"> <ArrowLeft />Back</a>

		<div class="mx-8 mt-4">
			<p class="font-bold text-sm tracking-wide text-secondary mb-2">
				CHAPTER {chapterData.chapter}
			</p>
			<h1 class="text-3xl font-bold">{chapterData.name}</h1>
			<p class="text-base-content mt-2">{chapterData.desc}</p>

			<p class="text-neutral/50 mt-4">{progress}% done.</p>
			<p>
				<progress
					class="progress progress-success w-full transition-colors"
					value={progress}
					max="100"
				></progress>
			</p>
			<div class="card bg-base-100 shadow-xl mt-12">
				<div class="card-body">
					<div class="flex flex-row justify-between border-b pb-2">
						<h2 class="card-title">Solution</h2>
						<button class="btn btn-ghost" onclick={() => handleSolution()}><Eye /></button>
					</div>

					<p class={`mt-2 transition-all duration-300 ${unblur ? 'blur-none' : 'blur-sm'}`}>
						{questionSolution}
					</p>
				</div>
			</div>
		</div>
	</div>

	<div class="container mx-auto lg:w-3/4 flex flex-col items-center lg:min-h-screen">
		<div
			class="lg:hidden flex flex-row mt-2 items-center w-full justify-between sticky top-0 bg-base-100 z-40 py-2"
		>
			<a class="btn btn-ghost flex-shrink-0 flex items-center ms-3" href="/dashboard">
				<ArrowLeft />
			</a>

			<div class="flex flex-row gap-2 justify-center grow">
				<p class="font-bold tracking-wide text-secondary hidden md:block">
					CHAPTER {chapterData.chapter}
				</p>
				<p class="hidden md:block">·</p>
				<h1 class="font-bold">{chapterData.name}</h1>
			</div>

			<div class="flex-shrink-0 w-24"></div>
		</div>

		<!--Question Selection Menu -->
		<div class="flex flex-row w-full mb-4 overflow-x-auto lg:mb-0 lg:mt-6 space-x-2">
			{#key flagCount}
				{#each getCurrentQuestionIds() as id, index}
					<div class="indicator">
						{#if flags.has(id)}
							<span
								class="indicator-item indicator-start badge badge-warning badge-xs !right-10 translate-x-1/4 translate-y-1/4
"
							></span>
						{/if}
						<button
							class="btn btn-circle btn-soft mx-2 {currentlySelectedId === id
								? 'btn-primary'
								: 'btn-outline'} {selectedAnswers[id]?.selected?.size > 0 ? 'btn-accent' : ''}"
							aria-label="question {index + 1}"
							onclick={() => changeSelected(id)}
						>
							{index + 1}
						</button>
					</div>
				{/each}
			{/key}
		</div>

		<div class="hidden sm:block border-t border-base-300 w-full my-6"></div>

		<!--Quizzing Sections -->
		{#if questionMap[currentlySelectedId]}
			<div class="w-full mb-8 mt-2 overflow-y-auto max-h-[70vh] pb-16 sm:pb-0">
				<div class="mx-4 sm:mx-6">
					<div class="flex flex-row justify-between">
						<div class="font-bold text-lg sm:text-xl mb-4 self-center">
							{questionMap[currentlySelectedId].question_data.question}
						</div>

						<div class="dropdown dropdown-end lg:block hidden">
							<div tabindex="0" role="button" class="btn btn-soft btn-accent m-1">Sort</div>
							<ul
								tabindex="-1"
								class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
							>
								<li>
									<button onclick={toggleShowFlagged}
										><Flag size="16" />{showFlagged ? 'Show All' : 'Show Flagged'}</button
									>
								</li>
								<li>
									<button onclick={toggleShowIncomplete}>
										<BookmarkCheck size="16" />
										{showIncomplete ? 'Show All' : 'Show Incomplete'}
									</button>
								</li>
							</ul>
						</div>
					</div>

					{#key refreshKey}
						<div class="flex flex-col justify-start mt-4 space-y-4">
							{#each questionAnswerStates as option, index}
								<label
									class="label cursor-pointer rounded-full flex items-center border-2 border-base-300 bg-base-200 transition-colors
        {showSolution ? (option.isCorrect ? 'border-success' : 'border-error') : ''}"
								>
									<input
										type="checkbox"
										class="checkbox checkbox-primary checkbox-sm ms-6"
										checked={option.isSelected ? true : false}
										onclick={() => toggleOption(index)}
										disabled={option.isEliminated || showSolution}
									/>
									<span
										class="flex-grow text-wrap break-words ml-8 my-4 {option.isEliminated
											? 'line-through opacity-50'
											: ''}"
									>
										{option.text}
									</span>
									<div class="flex items-center justify-center w-16 mr-4">
										<button
											class="btn btn-ghost btn-circle"
											onclick={() => toggleElimination(index)}
											disabled={showSolution}
											aria-label="eliminate option {option.letter}"
										>
											<Eye />
										</button>
									</div>
								</label>
							{/each}
						</div>
					{/key}
				</div>

				<!--Button Section -->
				<div class=" flex-row justify-center mt-8 gap-4 hidden lg:flex">
					<button class="btn btn-outline" onclick={clearSelectedAnswers}>Clear</button>
					<button class="btn btn-soft btn-success" onclick={checkAnswers}>Check</button>
					<button
						class="btn btn-warning btn-soft"
						aria-label="flag question {questionIds.indexOf(currentlySelectedId)}"
						onclick={() => toggleFlag(currentlySelectedId)}
					>
						<Flag />
					</button>
					<button class="btn btn-secondary" onclick={toggleShuffle}
						><Shuffle size="18" /> {isShuffled ? 'Unshuffle' : 'Shuffle'}
					</button>
					<button
						class="btn btn-outline"
						onclick={goToPreviousQuestion}
						disabled={questionIds.indexOf(currentlySelectedId) === 0}
					>
						<ArrowLeft />
					</button>
					<button
						class="btn btn-outline"
						onclick={goToNextQuestion}
						disabled={questionIds.indexOf(currentlySelectedId) === questions.length - 1}
					>
						<ArrowRight />
					</button>
				</div>

				{#if checkResult !== null}
					<div
						class="my-4 text-center font-bold {checkResult === 'Correct!'
							? 'text-green-500'
							: 'text-red-500'}"
					>
						{checkResult}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!--Mobile Menu-->
	<div
		class="fixed bottom-0 left-0 w-full bg-base-100 shadow-lg border-t border-base-300 z-50 flex gap-2 items-center px-4 py-4 lg:hidden flex-wrap justify-center"
	>
		<button class="btn btn-outline btn-sm" onclick={clearSelectedAnswers}>Clear</button>
		<button class="btn btn-outline btn-success btn-sm" onclick={checkAnswers}>Check</button>
		<button
			class="btn btn-warning btn-outline btn-sm"
			aria-label="flag question {questionIds.indexOf(currentlySelectedId)}"
			onclick={() => toggleFlag(currentlySelectedId)}
		>
			<Flag />
		</button>
		<div class="flex flex-row gap-2">
			<button
				class="btn btn-outline btn-sm"
				onclick={goToPreviousQuestion}
				disabled={questionIds.indexOf(currentlySelectedId) === 0}
			>
				<ArrowLeft />
			</button>
			<button
				class="btn btn-outline btn-sm"
				onclick={goToNextQuestion}
				disabled={questionIds.indexOf(currentlySelectedId) === questions.length - 1}
			>
				<ArrowRight />
			</button>
		</div>
		<button class="btn modal-button lg:hidden btn-sm" onclick={() => (isModalOpen = true)}
			><Eye /></button
		>
		<button class="btn btn-secondary btn-sm" onclick={toggleShuffle}
			><Shuffle size="18" /> {isShuffled ? 'Unshuffle' : 'Shuffle'}
		</button>
		<dialog class="modal max-w-full p-4" class:modal-open={isModalOpen}>
			<div class="modal-box">
				<form method="dialog">
					<button
						class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
						onclick={() => (isModalOpen = false)}>✕</button
					>
				</form>
				<h3 class="text-lg font-bold">Solution</h3>
				<p class="py-4">{questionSolution}</p>
			</div>
		</dialog>
	</div>
</div>
