<script lang="ts">
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { PageData } from './$types';
	import { api } from '../../../../../convex/_generated/api.js';
	import type { Doc, Id } from '../../../../../convex/_generated/dataModel';
	import { QuizState } from './states.svelte';
	import MainQuiz from '$lib/components/MainQuiz.svelte';
	import QuizErrorHandler from '$lib/components/QuizErrorHandler.svelte';
	import { onMount, tick } from 'svelte';
	import { RotateCcw } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { base } from '$app/paths';
	import { BookOpen } from 'lucide-svelte';
	import { QUESTION_TYPES } from '$lib/utils/questionType';
	import { captureQuestionAnswered } from '$lib/analytics/questionAnswered';
	import {
		QUIZ_PREFERENCE_CHANGED_EVENT,
		QUIZ_PREFERENCE_KEYS,
		type QuizPreferenceChangedDetail
	} from '$lib/components/power-bar/preferences';

	let { data }: { data: PageData } = $props();

	const userId: Id<'users'> | undefined = data.convexID?._id;

	const client = useConvexClient();

	let qs = $state(new QuizState());
	let loadGeneration = 0;

	$effect(() => {
		qs.loadUserPreferencesFromStorage?.();
	});

	async function saveOneQuestion(
		questionId: Id<'question'>,
		selectedOptions: string[],
		eliminatedOptions: string[],
		isFlagged: boolean
	) {
		const hasSelected = selectedOptions.length > 0;
		const hasEliminated = eliminatedOptions.length > 0;

		if (!hasSelected && !hasEliminated && !isFlagged) {
			try {
				const existing = await client.query(api.userProgress.checkExistingRecord, {
					userId: userId!,
					questionId
				});
				if (existing) {
					await client.mutation(api.userProgress.deleteUserProgress, {
						userId: userId!,
						questionId
					});
				}
			} catch {
				// no-op
			}
			return;
		}

		try {
			const existing = await client.query(api.userProgress.checkExistingRecord, {
				userId: userId!,
				questionId
			});

			const savedSelected = (existing?.selectedOptions || []).sort();
			const savedEliminated = (existing?.eliminatedOptions || []).sort();
			const savedFlagged = existing?.isFlagged || false;
			const sortedSelected = [...selectedOptions].sort();
			const sortedEliminated = [...eliminatedOptions].sort();

			const changed =
				isFlagged !== savedFlagged ||
				sortedSelected.length !== savedSelected.length ||
				!sortedSelected.every((val, i) => val === savedSelected[i]) ||
				sortedEliminated.length !== savedEliminated.length ||
				!sortedEliminated.every((val, i) => val === savedEliminated[i]);

			if (!changed) return;

			await client.mutation(api.userProgress.saveUserProgress, {
				userId: userId!,
				classId: data.classId as Id<'class'>,
				questionId,
				selectedOptions,
				eliminatedOptions,
				isFlagged,
				clientUtcOffsetMinutes: new Date().getTimezoneOffset()
			});
		} catch {
			// no-op
		}
	}

	async function saveProgress() {
		if (!userId) return;

		const snapshots = new Map(qs.pendingSnapshots);
		qs.pendingSnapshots.clear();

		qs.sanitizeStateForCurrentQuestion();
		const currentQuestion = qs.getCurrentFilteredQuestion() || qs.getCurrentQuestion();
		if (currentQuestion) {
			snapshots.set(currentQuestion._id, {
				questionId: currentQuestion._id,
				selectedAnswers: [...qs.selectedAnswers],
				eliminatedAnswers: [...qs.eliminatedAnswers],
				isFlagged: qs.currentQuestionFlagged
			});

			if (qs.selectedAnswers.length > 0 || qs.eliminatedAnswers.length > 0 || qs.currentQuestionFlagged) {
				qs.markCurrentQuestionInteracted?.();
			}
		}

		for (const snap of snapshots.values()) {
			await saveOneQuestion(
				snap.questionId,
				snap.selectedAnswers,
				snap.eliminatedAnswers,
				snap.isFlagged
			);
		}
	}

	async function loadProgress(questionId: Id<'question'>) {
		if (!userId) {
			return;
		}

		const gen = ++loadGeneration;

		try {
			const savedProgress = await client.query(api.userProgress.checkExistingRecord, {
				userId: userId,
				questionId: questionId
			});

			if (gen !== loadGeneration) return;

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
			if (gen !== loadGeneration) return;
			qs.selectedAnswers = [];
			qs.eliminatedAnswers = [];
			qs.setCurrentQuestionFlagged(false);
		}
	}

	// useQuery with function args for reactivity
	const questions = useQuery(api.question.getQuestionsByModule, () => ({ id: data.moduleId }), {
		initialData: data.module
	});

	const module = useQuery(api.module.getModuleById, () => ({ id: data.moduleId as Id<'module'> }), {
		initialData: data.moduleInfo
	});

	// Derive stable question IDs from questions data
	const stableQuestionIds = $derived.by(() => {
		if (!questions.data) return [] as Id<'question'>[];
		return (questions.data as Doc<'question'>[]).map((q) => q._id as Id<'question'>);
	});

	// useQuery at top level with skip pattern
	const moduleProgressQuery = useQuery(api.userProgress.getUserProgressForModule, () =>
		userId && questions.data && stableQuestionIds.length > 0
			? {
					userId: userId,
					classId: data.classId as Id<'class'>,
					questionIds: stableQuestionIds
				}
			: 'skip'
	);

	const moduleProgress = $derived({
		data: moduleProgressQuery.data ?? {
			interactedQuestionIds: [] as Id<'question'>[],
			flaggedQuestionIds: [] as Id<'question'>[]
		},
		isLoading: moduleProgressQuery.isLoading,
		error: moduleProgressQuery.error
	});

	let hasHydratedFlags = false;
	$effect(() => {
		if (moduleProgress.data) {
			qs.setInteractedQuestionsCount(moduleProgress.data.interactedQuestionIds.length);
			qs.updateLiveInteractedQuestions(moduleProgress.data.interactedQuestionIds);
			if (!hasHydratedFlags) {
				qs.updateLiveFlaggedQuestions(moduleProgress.data.flaggedQuestionIds);
				hasHydratedFlags = true;
			}
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
			qs.snapshotCurrentQuestion();
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
			qs.updateLiveFlaggedQuestions([]);
			qs.updateLiveInteractedQuestions([]);
			hasHydratedFlags = false;
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
				break;
			case 'ArrowLeft':
				event.preventDefault();
				await qs.goToPreviousQuestion();
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
					let isCorrect = false;

					if (currentlySelected.type === QUESTION_TYPES.FILL_IN_THE_BLANK) {
						const text = selectedAnswers[0] || '';
						qs.checkFillInTheBlank(text, currentlySelected);
						setTimeout(() => {
							captureQuestionAnswered({
								questionId: currentlySelected._id,
								moduleId: currentlySelected.moduleId,
								classId: data.classId,
								questionType: currentlySelected.type,
								selectedOptions: selectedAnswers,
								eliminatedOptions: eliminatedOptions,
								isCorrect: qs.checkResult === 'Correct!',
								submissionSource: 'keyboard'
							});
						}, 1);
					} else if (currentlySelected.type === QUESTION_TYPES.MATCHING) {
						qs.checkMatching(currentlySelected);
						isCorrect =
							typeof qs.evaluateMatchingSelection === 'function'
								? qs.evaluateMatchingSelection(currentlySelected)
								: correctAnswers.length === selectedAnswers.length &&
									correctAnswers.every((answer: string) => selectedAnswers.includes(answer));
						captureQuestionAnswered({
							questionId: currentlySelected._id,
							moduleId: currentlySelected.moduleId,
							classId: data.classId,
							questionType: currentlySelected.type,
							selectedOptions: selectedAnswers,
							eliminatedOptions: eliminatedOptions,
							isCorrect,
							submissionSource: 'keyboard'
						});
					} else {
						const sortedCorrect = [...correctAnswers].sort();
						const sortedSelected = [...selectedAnswers].sort();
						isCorrect =
							sortedCorrect.length === sortedSelected.length &&
							sortedCorrect.every(
								(answer: string, index: number) => answer === sortedSelected[index]
							);
						qs.checkAnswer(correctAnswers, selectedAnswers);
						captureQuestionAnswered({
							questionId: currentlySelected._id,
							moduleId: currentlySelected.moduleId,
							classId: data.classId,
							questionType: currentlySelected.type,
							selectedOptions: selectedAnswers,
							eliminatedOptions: eliminatedOptions,
							isCorrect,
							submissionSource: 'keyboard'
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

		const handlePreferenceUpdate = (event: Event) => {
			const custom = event as CustomEvent<QuizPreferenceChangedDetail>;
			if (custom.detail.key === QUIZ_PREFERENCE_KEYS.autoNextEnabled) {
				qs.setAutoNextEnabled(custom.detail.value);
			}
			if (custom.detail.key === QUIZ_PREFERENCE_KEYS.optionsShuffleEnabled) {
				qs.setOptionsShuffleEnabled(custom.detail.value);
			}
		};

		window.addEventListener(QUIZ_PREFERENCE_CHANGED_EVENT, handlePreferenceUpdate);

		return () => {
			document.removeEventListener('keydown', handleKeydown);
			window.removeEventListener(QUIZ_PREFERENCE_CHANGED_EVENT, handlePreferenceUpdate);
		};
	});

	$effect(() => {
		if (qs.showFlagged && qs.liveFlaggedQuestions.length === 0 && hasHydratedFlags) {
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

{#if data.isPublicView}
	<!-- Public view for crawlers and unauthenticated users -->
	<div class="flex items-center justify-center min-h-[60vh]">
		<div class="text-center max-w-md mx-auto p-8">
			<BookOpen class="mx-auto mb-4 text-primary" size={48} />
			<h1 class="text-2xl font-bold mb-2">
				{data.seo?.title?.replace(' — LearnTerms', '') ?? 'Study Module'}
			</h1>
			<p class="text-base-content/70 mb-6">Sign in to start studying this module on LearnTerms.</p>
			<a href="{base}/sign-in" class="btn btn-primary">Sign in to study</a>
		</div>
	</div>
{:else}
	<!-- Quiz View -->
	<div class="flex flex-col h-[calc(100vh-4rem)]" transition:fade={{ duration: 200 }}>
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
			/>
		</div>
	</div>

	<!-- Global Reset Modal at page root to ensure highest stacking context -->
	<dialog class="modal max-w-full p-4 z-[1000]" class:modal-open={qs.isResetModalOpen}>
		<div class="modal-box rounded-2xl">
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
				<button class="btn btn-outline rounded-full" onclick={() => (qs.isResetModalOpen = false)}>
					Cancel
				</button>
				<button class="btn btn-error rounded-full" onclick={() => handleResetModalConfirm()}
					>Reset</button
				>
			</div>
		</div>
		<div class="modal-backdrop bg-black/50" onclick={() => (qs.isResetModalOpen = false)}></div>
	</dialog>
{/if}
