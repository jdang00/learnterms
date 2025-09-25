<script lang="ts">
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { PageData } from './$types';
	import { api } from '../../../../../convex/_generated/api.js';
	import type { Doc, Id } from '../../../../../convex/_generated/dataModel';
	import { QuizState } from './states.svelte';
	import MainQuiz from '$lib/components/MainQuiz.svelte';
	import QuizListView from '$lib/components/QuizListView.svelte';
	import ModuleInfo from '$lib/components/ModuleInfo.svelte';
	import QuizErrorHandler from '$lib/components/QuizErrorHandler.svelte';
	import { onMount, tick } from 'svelte';
	import { Maximize, Minimize } from 'lucide-svelte';
	import { slide, fade, scale } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';

	let { data }: { data: PageData } = $props();

	const userId: Id<'users'> | undefined = data.convexID?._id;

	const client = useConvexClient();

	let qs = $state(new QuizState());

	// Load persisted user preferences (auto next, shuffle options)
	$effect(() => {
		qs.loadUserPreferencesFromStorage?.();
	});

	async function saveProgress() {
		if (!userId) {
			return;
		}

		qs.sanitizeStateForCurrentQuestion();
		const currentQuestion = qs.getCurrentQuestion();
		if (!currentQuestion) {
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
				return;
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
			return;
		}
	}

	async function loadProgress(questionId: Id<'question'>) {
		if (!userId) {
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
				qs.sanitizeStateForCurrentQuestion();
			} else {
				qs.selectedAnswers = [];
				qs.eliminatedAnswers = [];
				qs.setCurrentQuestionFlagged(false);
			}
		} catch (error) {
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
			if (
				stableQuestionIds.length !== next.length ||
				stableQuestionIds.some((id, i) => id !== next[i])
			) {
				stableQuestionIds = next;
			}
		}
	});

	let moduleProgress: {
		data:
			| { interactedQuestionIds: Id<'question'>[]; flaggedQuestionIds: Id<'question'>[] }
			| undefined;
		isLoading: boolean;
		error: any;
	} = $state({
		data: {
			interactedQuestionIds: [],
			flaggedQuestionIds: []
		},
		isLoading: true,
		error: null
	});

	$effect(() => {
		if (userId && questions.data) {
			const query = useQuery(api.userProgress.getUserProgressForModule, {
				userId: userId,
				classId: data.classId as Id<'class'>,
				questionIds: stableQuestionIds
			});
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

	async function handleResetModalConfirm() {
		if (userId && data.moduleId && client) {
			await qs.reset(userId, data.moduleId as Id<'module'>, client);
			qs.isResetModalOpen = false;
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
			case '1':
			case '2':
			case '3':
			case '4':
			case '5':
			case '6':
			case '7':
			case '8':
			case '9':
			case '0': {
				if (!currentlySelected) break;
				if (qs.showSolution) break;
				if (String(currentlySelected.type) === 'fill_in_the_blank') break;
				const options = qs.getOrderedOptions(currentlySelected) || [];
				let idx = event.key === '0' ? 9 : parseInt(event.key, 10) - 1;
				if (idx >= 0 && idx < options.length) {
					event.preventDefault();
					const opt = options[idx];
					if (opt && opt.id) {
						qs.toggleOption(opt.id);
						qs.scheduleSave();
					}
				}
				break;
			}
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

	let showFullscreenHint = $state(false);
	$effect(() => {
		if (!qs.fullscreenEnabled) {
			showFullscreenHint = true;
			const t = setTimeout(() => (showFullscreenHint = false), 2500);
			return () => clearTimeout(t);
		} else {
			showFullscreenHint = false;
		}
	});
</script>

<div
	class="bg-base-300 {qs.fullscreenEnabled
		? ''
		: 'pt-3 sm:pt-4'} transition-all duration-500 ease-in-out"
	transition:fade={{ duration: 300, easing: cubicInOut }}
>
	<div
		class="{qs.fullscreenEnabled
			? 'w-full'
			: 'max-w-7xl mx-auto relative px-2 sm:px-4'} transition-all duration-500 ease-in-out"
	>


		<MainQuiz
			{qs}
			{questions}
			{currentlySelected}
			{userId}
			{data}
			{handleSelect}
			{handleFilterToggle}
			{client}
			{module}
			suppressAuthErrors={true}
		/>

		{#if !qs.fullscreenEnabled}
			<div class="mt-4">
				<QuizErrorHandler {questions} {module} {moduleProgress} className="max-w-2xl mx-auto" />
			</div>
		{/if}

		{#if !qs.fullscreenEnabled}
			<div
				transition:scale={{ duration: 300, easing: cubicInOut, start: 0.8 }}
				class="transition-all duration-300 ease-in-out"
			>
				<div
					class="tooltip tooltip-left absolute bottom-3 right-3 sm:bottom-4 sm:right-4"
					data-tip="Enter focus mode"
				>
					<div class="relative">
						<button
							class="btn btn-circle btn-sm sm:btn-md btn-ghost z-40 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 border border-primary"
							onclick={() => (qs.fullscreenEnabled = !qs.fullscreenEnabled)}
							aria-label="Enter fullscreen"
						>
							<Maximize size="18" class="sm:w-5 sm:h-5 transition-transform duration-200" />
						</button>
						{#if showFullscreenHint}
							<span
								class="pointer-events-none absolute inset-0 -m-1 rounded-full animate-ping bg-primary/30"
							></span>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>

	{#if qs.fullscreenEnabled}
		<div
			class="tooltip tooltip-left fixed bottom-3 right-3 sm:bottom-4 sm:right-4"
			data-tip="Exit focus mode"
		>
			<button
				class="btn btn-circle btn-sm sm:btn-md btn-ghost z-50 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 border border-primary"
				onclick={() => (qs.fullscreenEnabled = !qs.fullscreenEnabled)}
				aria-label="Exit fullscreen"
			>
				<Minimize size="18" class="sm:w-5 sm:h-5 transition-transform duration-200" />
			</button>
		</div>
	{/if}
</div>

{#if !qs.fullscreenEnabled}
	<div
		transition:slide={{ duration: 400, easing: cubicInOut, axis: 'y' }}
		class="transition-all duration-400 ease-in-out"
	>
		<ModuleInfo
			{module}
			classId={data.classId as Id<'class'>}
			progressPercentage={qs.getProgressPercentage()}
			suppressAuthErrors={true}
			qs={qs}
		/>
	</div>
{/if}

{#if !qs.fullscreenEnabled}
	{#if questions.isLoading}
		<p transition:fade={{ duration: 200 }} class="transition-all duration-200 ease-in-out">
			Loading...
		</p>
	{:else}
		<div
			transition:slide={{ duration: 400, easing: cubicInOut, axis: 'y', delay: 100 }}
			class="mx-auto max-w-5xl mt-8 sm:mt-12 px-2 sm:px-0 transition-all duration-400 ease-in-out"
		>
			<QuizListView questions={questions.data} />
		</div>
	{/if}
{/if}

<!-- Global Reset Modal at page root to ensure highest stacking context -->
<dialog class="modal max-w-full p-4 z-[1000]" class:modal-open={qs.isResetModalOpen}>
	<div class="modal-box">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={() => (qs.isResetModalOpen = false)}
			>
				✕
			</button>
		</form>
		<h3 class="text-lg font-bold">Reset Progress</h3>
		<p class="py-4">
			Do you want to start over? All current progress for this module will be lost.
		</p>
		<div class="flex justify-end space-x-2">
			<button class="btn btn-outline" onclick={() => (qs.isResetModalOpen = false)}>
				Cancel
			</button>
			<button class="btn btn-error" onclick={() => handleResetModalConfirm()}>Reset</button>
		</div>
	</div>
</dialog>
