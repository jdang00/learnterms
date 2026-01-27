<script lang="ts">
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { PageData } from './$types';
	import { api } from '../../../../../convex/_generated/api.js';
	import type { Doc, Id } from '../../../../../convex/_generated/dataModel';
	import { QuizState } from './states.svelte';
	import MainQuiz from '$lib/components/MainQuiz.svelte';
	import QuizListView from '$lib/components/QuizListView.svelte';
	import QuizErrorHandler from '$lib/components/QuizErrorHandler.svelte';
	import { onMount, tick } from 'svelte';
	import { Maximize, Minimize, Play, ChevronLeft, RotateCcw, Settings } from 'lucide-svelte';
	import { slide, fade, scale } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import posthog from 'posthog-js';
	import { browser } from '$app/environment';

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

		// Mark locally so navigation accent updates immediately
		if (hasSelectedAnswers || hasEliminatedAnswers || isFlagged) {
			qs.markCurrentQuestionInteracted?.();
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

	// useQuery with function args for reactivity
	const questions = useQuery(
		api.question.getQuestionsByModule,
		() => ({ id: data.moduleId }),
		{ initialData: data.module }
	);

	const module = useQuery(
		api.module.getModuleById,
		() => ({ id: data.moduleId as Id<'module'> }),
		{ initialData: data.moduleInfo }
	);

	// Derive stable question IDs from questions data
	const stableQuestionIds = $derived.by(() => {
		if (!questions.data) return [] as Id<'question'>[];
		return (questions.data as Doc<'question'>[]).map((q) => q._id as Id<'question'>);
	});

	// useQuery at top level with skip pattern
	const moduleProgressQuery = useQuery(
		api.userProgress.getUserProgressForModule,
		() => (userId && questions.data && stableQuestionIds.length > 0) ? {
			userId: userId,
			classId: data.classId as Id<'class'>,
			questionIds: stableQuestionIds
		} : 'skip'
	);

	const moduleProgress = $derived({
		data: moduleProgressQuery.data ?? {
			interactedQuestionIds: [] as Id<'question'>[],
			flaggedQuestionIds: [] as Id<'question'>[]
		},
		isLoading: moduleProgressQuery.isLoading,
		error: moduleProgressQuery.error
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
					const selectedAnswers = [...qs.selectedAnswers];
					const eliminatedOptions = [...qs.eliminatedAnswers];
					const correctAnswers = currentlySelected.correctAnswers || [];

					// Compute isCorrect for multiple choice
					const sortedCorrect = [...correctAnswers].sort();
					const sortedSelected = [...selectedAnswers].sort();
					const isCorrect = sortedCorrect.length === sortedSelected.length &&
						sortedCorrect.every((answer: string, index: number) => answer === sortedSelected[index]);

					qs.checkAnswer(correctAnswers, selectedAnswers);

					// Track the answer submission
					if (browser) {
						posthog.capture('question_answered', {
							questionId: currentlySelected._id,
							moduleId: currentlySelected.moduleId,
							classId: data.classId,
							questionType: currentlySelected.type,
							selectedOptions: selectedAnswers,
							eliminatedOptions: eliminatedOptions,
							isCorrect: isCorrect
						});
					}
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
</script>

{#if qs.fullscreenEnabled}
	<!-- Focus Mode / Quiz View -->
	<div
		class="flex flex-col h-[calc(100vh-4rem)]"
		transition:fade={{ duration: 200 }}
	>
		<div class="flex-1 min-h-0 relative">
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
				onExit={() => (qs.fullscreenEnabled = false)}
			/>
		</div>
	</div>
{:else}
	<!-- Preview / Landing View -->
	<div
		class="min-h-[calc(100vh-4rem)] bg-base-200/30 p-4 pb-20 sm:p-8"
		transition:fade={{ duration: 300 }}
	>
		<div class="max-w-4xl mx-auto space-y-8">
			<!-- Back Button -->
			<div class="flex items-center">
				<a
					class="btn btn-ghost btn-sm -ml-2 gap-2 text-base-content/70 hover:text-base-content"
					href={`/classes?classId=${data.classId}`}
				>
					<ChevronLeft size={16} />
					Back to Module {(module.data?.order ?? 0) + 1}
				</a>
			</div>

			<!-- Hero Card -->
			<div class="card bg-base-100 shadow-sm border border-base-300 overflow-hidden">
				<div class="card-body p-6 sm:p-8 space-y-6">
					<!-- Title & Desc -->
					<div>
						<div class="flex items-start gap-4">
							<span class="text-4xl sm:text-5xl">{module.data?.emoji || '📘'}</span>
							<div class="flex-1">
								<h1 class="text-2xl sm:text-3xl font-bold leading-tight text-base-content">
									{module.data?.title || 'Loading...'}
								</h1>
								{#if module.data?.description}
									<p class="text-base text-base-content/70 mt-2 leading-relaxed">
										{module.data.description}
									</p>
								{/if}
							</div>
						</div>
					</div>

					<div class="divider my-0"></div>

					<!-- Progress & Actions -->
					<div class="flex flex-col gap-6">
						<div class="space-y-2">
							<div class="flex justify-between items-end">
								<span class="text-sm font-semibold text-base-content/70">Your Progress</span>
								<span class="text-sm font-mono font-medium">{qs.getProgressPercentage()}%</span>
							</div>
							<progress 
								class="progress progress-success w-full h-3" 
								value={qs.getProgressPercentage()} 
								max="100"
							></progress>
						</div>

						<div class="flex flex-col sm:flex-row gap-4 sm:items-center">
							<button 
								class="btn btn-primary btn-xl gap-3 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex-1 sm:flex-none"
								onclick={() => qs.fullscreenEnabled = true}
							>
								<Play size={20} fill="currentColor" />
								Start Quiz
							</button>

							<div class="hidden sm:block w-px h-10 bg-base-300 mx-2"></div>

							<div class="flex flex-wrap items-center gap-4 flex-1">
								<label class="label cursor-pointer gap-2 p-0 hover:opacity-80 transition-opacity">
									<input
										type="checkbox"
										class="toggle toggle-primary toggle-sm"
										checked={qs.autoNextEnabled}
										onchange={(e) => qs.setAutoNextEnabled((e.currentTarget as HTMLInputElement).checked)}
									/>
									<span class="label-text font-medium">Auto-next</span>
								</label>
								<label class="label cursor-pointer gap-2 p-0 hover:opacity-80 transition-opacity">
									<input
										type="checkbox"
										class="toggle toggle-primary toggle-sm"
										checked={qs.optionsShuffleEnabled}
										onchange={(e) => qs.setOptionsShuffleEnabled((e.currentTarget as HTMLInputElement).checked)}
									/>
									<span class="label-text font-medium">Shuffle</span>
								</label>
							</div>

							<button 
								class="btn btn-ghost btn-sm text-error/80 hover:text-error hover:bg-error/10 gap-2 self-start sm:self-center"
								onclick={() => (qs.isResetModalOpen = true)}
							>
								<RotateCcw size={14} />
								Reset
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Question List -->
			<div class="space-y-4">
				<div class="flex items-center justify-between px-1">
					<h3 class="text-lg font-bold flex items-center gap-2">
						Questions in this module
						<span class="badge badge-neutral badge-sm">{questions.data?.length || 0}</span>
					</h3>
				</div>
				
				<div class="bg-base-100 rounded-xl border border-base-300 shadow-sm overflow-hidden">
					{#if questions.isLoading}
						<div class="p-8 text-center text-base-content/50">Loading questions...</div>
					{:else}
						<div class="p-4">
							<QuizListView questions={questions.data} />
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
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
	<div class="modal-backdrop bg-black/50" onclick={() => (qs.isResetModalOpen = false)}></div>
</dialog>
