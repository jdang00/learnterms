<script lang="ts">
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { PageData } from './$types';
	import { api } from '../../../../../convex/_generated/api.js';
	import type { Doc, Id } from '../../../../../convex/_generated/dataModel';
	import QuizSideBar from '$lib/components/QuizSideBar.svelte';
	import QuizNavigation from '$lib/components/QuizNavigation.svelte';
	import AnswerOptions from '$lib/components/AnswerOptions.svelte';
	import FillInTheBlank from '$lib/components/FillInTheBlank.svelte';
	import { QuizState } from './states.svelte';
	import ActionButtons from '$lib/components/ActionButtons.svelte';
	import MobileMenu from '$lib/components/MobileMenu.svelte';
	import MobileInfo from '$lib/components/MobileInfo.svelte';
	import ResultBanner from '$lib/components/ResultBanner.svelte';
	import { onMount, tick } from 'svelte';
	import { Flag, BookmarkCheck, ArrowDownNarrowWide } from 'lucide-svelte';
	import { QUESTION_TYPES } from '$lib/utils/questionType';

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

		const isFlagged = qs.currentQuestionFlagged;

		const hasSelectedAnswers = qs.selectedAnswers.length > 0;
		const hasEliminatedAnswers = qs.eliminatedAnswers.length > 0;

		if (!hasSelectedAnswers && !hasEliminatedAnswers && !isFlagged) {
			try {
				const existingProgress = await client.query(api.userProgress.checkExistingRecord, {
					userId: userId,
					questionId: currentQuestion._id
				});

				if (existingProgress) {
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
			const existingProgress = await client.query(api.userProgress.checkExistingRecord, {
				userId: userId,
				questionId: currentQuestion._id
			});

			const currentSelected = qs.selectedAnswers.sort();
			const currentEliminated = qs.eliminatedAnswers.sort();
			const savedSelected = (existingProgress?.selectedOptions || []).sort();
			const savedEliminated = (existingProgress?.eliminatedOptions || []).sort();
			const savedFlagged = existingProgress?.isFlagged || false;

			const selectedChanged =
				currentSelected.length !== savedSelected.length ||
				!currentSelected.every((val, index) => val === savedSelected[index]);
			const eliminatedChanged =
				currentEliminated.length !== savedEliminated.length ||
				!currentEliminated.every((val, index) => val === savedEliminated[index]);
			const flagChanged = isFlagged !== savedFlagged;

			if (!selectedChanged && !eliminatedChanged && !flagChanged) {
				return;
			}

			await client.mutation(api.userProgress.saveUserProgress, {
				userId: userId,
				classId: data.classId as Id<'class'>,
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
				qs.selectedAnswers = savedProgress.selectedOptions || [];
				qs.eliminatedAnswers = savedProgress.eliminatedOptions || [];
				qs.setCurrentQuestionFlagged(savedProgress.isFlagged || false);
			} else {
				qs.selectedAnswers = [];
				qs.eliminatedAnswers = [];
				qs.setCurrentQuestionFlagged(false);
			}
		} catch (error) {
			console.error('Failed to load progress:', error);
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
		{ id: data.moduleId as Id<'module'> },
		{ initialData: data.moduleInfo }
	);

	let stableQuestionIds: Id<'question'>[] = $state([]);
	$effect(() => {
		if (questions.data) {
			const next = (questions.data as Doc<'question'>[]).map((q) => q._id as Id<'question'>);
			if (stableQuestionIds.length !== next.length || stableQuestionIds.some((id, i) => id !== next[i])) {
				stableQuestionIds = next;
			}
		}
	});

	let moduleProgress: { data: { interactedQuestionIds: Id<'question'>[]; flaggedQuestionIds: Id<'question'>[] } | undefined; isLoading: boolean; error: any } = $state({
		data: {
			interactedQuestionIds: [],
			flaggedQuestionIds: []
		},
		isLoading: true,
		error: null
	});

	$effect(() => {
		if (userId && questions.data) {
			const query = useQuery(
				api.userProgress.getUserProgressForModule,
				{
					userId: userId,
					classId: data.classId as Id<'class'>,
					questionIds: stableQuestionIds
				}
			);
			moduleProgress = query;
		} else {
			moduleProgress = {
				data: {
					interactedQuestionIds: [],
					flaggedQuestionIds: []
				},
				isLoading: false,
				error: null
			};
		}
	});

	$effect(() => {
		if (moduleProgress.data) {
			qs.setInteractedQuestionsCount(moduleProgress.data.interactedQuestionIds.length);
			qs.updateLiveInteractedQuestions(moduleProgress.data.interactedQuestionIds);
			qs.updateLiveFlaggedQuestions(moduleProgress.data.flaggedQuestionIds);
		}
	});

	$effect(() => {
		qs.setSaveProgressFunction(saveProgress);
		qs.setLoadProgressFunction(loadProgress);
	});

	$effect(() => {
		if (questions.data && questions.data.length > 0) {
			qs.setQuestions(questions.data);
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
			qs.scheduleSave();
			qs.currentQuestionIndex = index;
			qs.checkResult = '';
			qs.showSolution = false;
			if (userId) {
				void loadProgress(question._id);
			}
		}
	}

	async function handleFilterToggle(filterType: 'flagged' | 'incomplete') {
		await saveProgress();

		if (filterType === 'flagged') {
			const prev = qs.getCurrentFilteredQuestion() || qs.getCurrentQuestion();
			qs.toggleSortByFlagged();
			const nowFlagged = qs.showFlagged;
			if (nowFlagged && qs.liveFlaggedQuestions.length === 0) {
				qs.noFlags = true;
				qs.showFlagged = false;
				if (prev) {
					const idx = qs.getFilteredQuestions().findIndex((q) => q._id === prev._id);
					if (idx !== -1) qs.currentQuestionIndex = idx;
				}
			}
		} else {
			qs.toggleShowIncomplete();
		}

		const firstFilteredQuestion = qs.getCurrentFilteredQuestion();
		if (firstFilteredQuestion && userId) {
			await loadProgress(firstFilteredQuestion._id);
		}
	}

	async function handleKeydown(event: KeyboardEvent) {
		if (
			!['Tab', 'ArrowLeft', 'ArrowRight'].includes(event.key) &&
			(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
		) {
			return;
		}

		switch (event.key) {
			case 'ArrowRight':
				event.preventDefault();
				await qs.goToNextQuestion();
				qs.scheduleSave();
				break;
			case 'ArrowLeft':
				event.preventDefault();
				await qs.goToPreviousQuestion();
				qs.scheduleSave();
				break;
			case 'Tab':
				event.preventDefault();
				qs.handleSolution();
				break;
			case 'Enter':
				event.preventDefault();
				if (currentlySelected) {
					qs.checkAnswer(currentlySelected.correctAnswers, qs.selectedAnswers);
				}
				qs.scheduleSave();
				break;
			case 'Escape':
				event.preventDefault();
				qs.selectedAnswers = [];
				qs.eliminatedAnswers = [];
				qs.checkResult = '';
				qs.scheduleSave();
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

	$effect(() => {
		if (qs.showFlagged && qs.liveFlaggedQuestions.length === 0) {
			qs.noFlags = true;
			qs.showFlagged = false;
		}
	});

	$effect(() => {
		void qs.currentQuestionIndex;
		tick().then(() => {
			const filteredQuestions = qs.getFilteredQuestions();
			const currentQuestion = qs.getCurrentFilteredQuestion();
			if (currentQuestion && filteredQuestions.length > 0) {
				const index = filteredQuestions.findIndex((q) => q._id === currentQuestion._id);
				if (index > -1 && qs.questionButtons && qs.questionButtons[index]) {
					qs.questionButtons[index].scrollIntoView({
						behavior: 'smooth',
						block: 'nearest',
						inline: 'center'
					});
				}
			}
		});
	});

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
	<div
		class="flex flex-col md:flex-col lg:flex-row min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] p-2 md:p-3 lg:p-4 gap-4 lg:gap-8"
	>
		<QuizSideBar
			{qs}
			{module}
			{currentlySelected}
			{userId}
			moduleId={data.moduleId}
			{client}
			classId={data.classId}
		/>
		<MobileInfo {module} classId={data.classId} />

		<div
			class="w-full lg:flex-1 lg:min-w-0 flex flex-col max-w-full lg:max-w-none overflow-y-auto flex-grow min-h-0 pb-36 lg:pb-48"
		>
			<ResultBanner bind:qs />
			{#if qs.noFlags}
				<div
					role="alert"
					class="alert alert-warning fixed top-4 sm:top-6 md:top-8 left-1/2 transform -translate-x-1/2 z-50 w-11/12 sm:w-max max-w-xs sm:max-w-sm md:max-w-md p-4 text-center"
				>
					<Flag size="16" />
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
				interactedQuestions={qs.liveInteractedQuestions}
				flags={qs.liveFlaggedQuestions}
				{qs}
			/>

			<div class="text-md sm:text-lg lg:text-xl p-4">
				<div class="flex flex-row justify-between mb-4">
					{#if currentlySelected.type !== QUESTION_TYPES.FILL_IN_THE_BLANK}
						<div class="flex flex-row flex-wrap items-end">
							<h4 class="text-lg font-semibold">{currentlySelected.stem}</h4>
							<span class="text-base-content/70 font-medium text-xs ms-2 mb-1 sm:mt-0">
								Pick {currentlySelected.correctAnswers.length}.
							</span>
						</div>
					{/if}

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
				{#if currentlySelected.type === QUESTION_TYPES.FILL_IN_THE_BLANK}
					<FillInTheBlank bind:qs {currentlySelected} />
				{:else}
					<AnswerOptions bind:qs {currentlySelected} />
				{/if}
				<ActionButtons {qs} {currentlySelected} />
			</div>
		</div>
		<MobileMenu bind:qs {currentlySelected} />
	</div>
{:else}
	<p>No questions available.</p>
{/if}
