<script lang="ts">
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { PageData } from './$types';
	import { api } from '../../../../../convex/_generated/api.js';
	import type { Doc, Id } from '../../../../../convex/_generated/dataModel';
	import QuizSideBar from '$lib/components/QuizSideBar.svelte';
	import QuizNavigation from '$lib/components/QuizNavigation.svelte';
	import AnswerOptions from '$lib/components/AnswerOptions.svelte';
	import { QuizState } from './states.svelte';
	import ActionButtons from '$lib/components/ActionButtons.svelte';
	import { onMount } from 'svelte';
	import { Flag, BookmarkCheck, ArrowDownNarrowWide } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	const userId: Id<'users'> | undefined = data.convexID?._id;

	const client = useConvexClient();

	let qs = $state(new QuizState());

	async function saveProgress() {
		if (!userId) {
			console.warn('User not logged in, skipping progress save');
			return;
		}

		const currentQuestion = qs.getCurrentQuestion();
		if (!currentQuestion) {
			console.warn('No current question available');
			return;
		}

		// Use the current question's flag state
		const isFlagged = qs.currentQuestionFlagged;

		// Only save if user has actually interacted with the question or flagged it
		const hasSelectedAnswers = qs.selectedAnswers.length > 0;
		const hasEliminatedAnswers = qs.eliminatedAnswers.length > 0;

		if (!hasSelectedAnswers && !hasEliminatedAnswers && !isFlagged) {
			// No interactions and not flagged - check if we need to delete existing record
			try {
				const existingProgress = await client.query(api.userProgress.checkExistingRecord, {
					userId: userId,
					questionId: currentQuestion._id
				});

				if (existingProgress) {
					// Delete the record since there are no interactions and not flagged
					await client.mutation(api.userProgress.deleteUserProgress, {
						userId: userId,
						questionId: currentQuestion._id
					});
				}
			} catch (error) {
				console.error('Failed to delete progress:', error);
			}
			return;
		}

		try {
			// Check if there's existing progress to compare against
			const existingProgress = await client.query(api.userProgress.checkExistingRecord, {
				userId: userId,
				questionId: currentQuestion._id
			});

			// Compare current state with saved state
			const currentSelected = qs.selectedAnswers.sort();
			const currentEliminated = qs.eliminatedAnswers.sort();
			const savedSelected = (existingProgress?.selectedOptions || []).sort();
			const savedEliminated = (existingProgress?.eliminatedOptions || []).sort();
			const savedFlagged = existingProgress?.isFlagged || false;

			// Check if arrays are equal (same length and same elements)
			const selectedChanged =
				currentSelected.length !== savedSelected.length ||
				!currentSelected.every((val, index) => val === savedSelected[index]);
			const eliminatedChanged =
				currentEliminated.length !== savedEliminated.length ||
				!currentEliminated.every((val, index) => val === savedEliminated[index]);
			const flagChanged = isFlagged !== savedFlagged;

			// Only update if there are actual changes
			if (!selectedChanged && !eliminatedChanged && !flagChanged) {
				return; // No changes, skip update
			}

			await client.mutation(api.userProgress.saveUserProgress, {
				userId: userId,
				questionId: currentQuestion._id,
				selectedOptions: qs.selectedAnswers,
				eliminatedOptions: qs.eliminatedAnswers,
				isFlagged: isFlagged
			});
		} catch (error) {
			console.error('Failed to save progress:', error);
		}
	}

	async function loadProgress(questionId: Id<'question'>) {
		if (!userId) {
			console.warn('User not logged in, skipping progress load');
			return;
		}

		try {
			const savedProgress = await client.query(api.userProgress.checkExistingRecord, {
				userId: userId,
				questionId: questionId
			});

			if (savedProgress) {
				// Restore saved progress
				qs.selectedAnswers = savedProgress.selectedOptions || [];
				qs.eliminatedAnswers = savedProgress.eliminatedOptions || [];
				qs.setCurrentQuestionFlagged(savedProgress.isFlagged || false);
			} else {
				// Clear any existing state for new questions
				qs.selectedAnswers = [];
				qs.eliminatedAnswers = [];
				qs.setCurrentQuestionFlagged(false);
			}
		} catch (error) {
			console.error('Failed to load progress:', error);
			// Fallback to empty state
			qs.selectedAnswers = [];
			qs.eliminatedAnswers = [];
			qs.setCurrentQuestionFlagged(false);
		}
	}

	const questions = useQuery(
		api.question.getQuestionsByModule,
		{ id: data.moduleId },
		{ initialData: data.module }
	);

	const module = useQuery(
		api.module.getModuleById,
		{ id: data.moduleId },
		{ initialData: data.moduleInfo }
	);

	// Get interacted questions from database
	const interactedQuestions = useQuery(
		api.userProgress.getUserProgressForModule,
		{
			userId: userId!,
			questionIds: questions.data?.map((q) => q._id) || []
		},
		{
			initialData: []
		}
	);

	// Get flagged questions from database
	const flaggedQuestions = useQuery(
		api.userProgress.getFlaggedQuestionsForModule,
		{
			userId: userId!,
			questionIds: questions.data?.map((q) => q._id) || []
		},
		{
			initialData: []
		}
	);

	// Update live Convex data (source of truth)
	$effect(() => {
		if (interactedQuestions.data) {
			qs.setInteractedQuestionsCount(interactedQuestions.data.length);
			qs.updateLiveInteractedQuestions(interactedQuestions.data);
		}
	});

	$effect(() => {
		if (flaggedQuestions.data) {
			qs.updateLiveFlaggedQuestions(flaggedQuestions.data);
		}
	});

	// Set the save progress function in QuizState
	$effect(() => {
		qs.setSaveProgressFunction(saveProgress);
		qs.setLoadProgressFunction(loadProgress);
	});

	$effect(() => {
		if (questions.data && questions.data.length > 0) {
			qs.setQuestions(questions.data);
			// Load progress for the first question when questions are loaded
			const currentQuestion = qs.getCurrentQuestion();
			if (currentQuestion && userId) {
				loadProgress(currentQuestion._id);
			}
		}
	});

	let currentlySelected = $derived(
		qs.getCurrentFilteredQuestion() ||
			(questions.data && questions.data.length > 0 ? questions.data[0] : null)
	);

	async function handleSelect(question: Doc<'question'>) {
		const currentQuestions = qs.getFilteredQuestions();
		const index = currentQuestions.findIndex((q) => q._id === question._id);
		if (index !== -1) {
			await saveProgress();
			// Update the index and clear state for the new question
			qs.currentQuestionIndex = index;
			qs.checkResult = '';
			// Load progress for the selected question
			if (userId) {
				await loadProgress(question._id);
			}
		}
	}

	async function handleFilterToggle(filterType: 'flagged' | 'incomplete') {
		// Save current progress before changing filter
		await saveProgress();

		// Toggle the appropriate filter
		if (filterType === 'flagged') {
			qs.toggleSortByFlagged();
		} else {
			qs.toggleShowIncomplete();
		}

		// Load progress for the first question in the filtered set
		const firstFilteredQuestion = qs.getCurrentFilteredQuestion();
		if (firstFilteredQuestion && userId) {
			await loadProgress(firstFilteredQuestion._id);
		}
	}

	async function handleKeydown(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			return;
		}

		switch (event.key) {
			case 'ArrowRight':
				event.preventDefault();
				await qs.goToNextQuestion();
				break;
			case 'ArrowLeft':
				event.preventDefault();
				await qs.goToPreviousQuestion();
				break;
			case 'Tab':
				event.preventDefault();
				qs.handleSolution();
				break;
			case 'f':
			case 'F':
				event.preventDefault();
				qs.toggleFlag();
				break;
			case 's':
			case 'S':
				if (event.shiftKey) {
					event.preventDefault();
					qs.toggleShuffle();
				}
				break;
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});

	// Auto-dismiss no flags alert after 3 seconds
	$effect(() => {
		if (qs.noFlags) {
			const timer = setTimeout(() => {
				qs.noFlags = false;
			}, 3000);

			return () => clearTimeout(timer);
		}
	});
</script>

{#if questions.isLoading}
	<p>Loading...</p>
{:else if questions.error}
	<p>Error: {questions.error.message}</p>
{:else if currentlySelected}
	<div class="flex flex-col lg:flex-row h-full p-2 lg:p-4 lg:gap-8">
		<QuizSideBar bind:qs {module} {currentlySelected} {userId} moduleId={data.moduleId} {client} />

		<div class="w-full lg:w-3/4 flex flex-col max-w-full lg:max-w-none overflow-hidden flex-grow">
			{#if qs.noFlags}
				<div
					role="alert"
					class="alert alert-warning fixed top-4 sm:top-6 md:top-8 left-1/2 transform -translate-x-1/2 z-50 w-11/12 sm:w-max max-w-xs sm:max-w-sm md:max-w-md p-4 text-center"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current inline-block align-middle mr-2"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
					<span class="align-middle">No Questions Flagged.</span>
					<button
						class="btn btn-sm btn-ghost btn-warning"
						onclick={() => {
							qs.noFlags = false;
						}}>X</button
					>
				</div>
			{/if}

			<QuizNavigation
				questions={{ data: qs.getFilteredQuestions() }}
				{handleSelect}
				{currentlySelected}
				interactedQuestions={interactedQuestions.data || []}
				flags={flaggedQuestions.data || []}
			/>

			<div class="text-md sm:text-lg lg:text-xl p-4">
				<div class="flex flex-row justify-between mb-4">
					<div class="flex flex-row flex-wrap items-end">
						<h4 class="text-lg font-semibold">{currentlySelected.stem}</h4>
						<span class="text-base-content/70 font-medium text-xs ms-2 mb-1 sm:mt-0">
							Pick {currentlySelected.correctAnswers.length}.
						</span>
					</div>

					<div class="dropdown dropdown-end lg:block hidden">
						<div tabindex="0" role="button" class="btn btn-soft btn-accent m-1 btn-circle">
							<ArrowDownNarrowWide />
						</div>
						<ul
							tabindex="-1"
							class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-sm"
						>
							<li>
								<button onclick={() => handleFilterToggle('flagged')}>
									<Flag size="16" />
									{qs.showFlagged ? 'Show All' : 'Show Flagged'}
								</button>
							</li>
							<li>
								<button onclick={() => handleFilterToggle('incomplete')}>
									<BookmarkCheck size="16" />
									{qs.showIncomplete ? 'Show All' : 'Show Incomplete'}
								</button>
							</li>
						</ul>
					</div>
				</div>
				<AnswerOptions bind:qs {currentlySelected} />
				<ActionButtons {qs} {currentlySelected} />
			</div>
		</div>
	</div>
{:else}
	<p>No questions available.</p>
{/if}
