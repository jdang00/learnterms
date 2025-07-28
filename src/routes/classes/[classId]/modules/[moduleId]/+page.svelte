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
		qs.questions && qs.questions.length > 0 ? qs.getCurrentQuestion() : data.module[0]
	);

	async function handleSelect(question: Doc<'question'>) {
		const currentQuestions = qs.isShuffled ? qs.shuffledQuestions : qs.questions;
		const index = currentQuestions.findIndex((q) => q._id === question._id);
		if (index !== -1) {
			await saveProgress();
			qs.setCurrentQuestionIndex(index);
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
</script>

{#if questions.isLoading}
	<p>Loading...</p>
{:else if questions.error}
	<p>Error: {questions.error.message}</p>
{:else if currentlySelected}
	<div class="flex flex-col lg:flex-row min-h-screen mr-0 lg:mr-8">
		<QuizSideBar bind:qs {module} {currentlySelected} />

		<div class="w-full lg:w-3/4 flex flex-col max-w-full lg:max-w-none overflow-hidden flex-grow">
			<QuizNavigation
				questions={{ data: qs.isShuffled ? qs.shuffledQuestions : qs.questions }}
				{handleSelect}
				{currentlySelected}
				interactedQuestions={interactedQuestions.data || []}
				flags={flaggedQuestions.data || []}
			/>

			<div class="text-md sm:text-lg lg:text-xl p-4">
				<div class="flex flex-row flex-wrap mb-4">
					<h4 class="text-lg font-semibold mb-3">{currentlySelected.stem}</h4>
					<span class="text-base-content/70 font-medium text-xs ms-2 self-center mb-2">
						Pick {currentlySelected.correctAnswers.length}.
					</span>
				</div>
				<AnswerOptions bind:qs {currentlySelected} />
				<ActionButtons {qs} {currentlySelected} />
			</div>
		</div>
	</div>
{:else}
	<p>No questions available.</p>
{/if}
