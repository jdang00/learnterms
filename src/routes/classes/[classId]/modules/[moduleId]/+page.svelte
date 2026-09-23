<script lang="ts">
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { PageData } from './$types';
	import { api } from '../../../../../convex/_generated/api.js';
	import type { Doc, Id } from '../../../../../convex/_generated/dataModel';
	import { QuizState } from './states.svelte';
	import MainQuiz from '$lib/components/MainQuiz.svelte';
	import ModuleCompletion from '$lib/components/ModuleCompletion.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import { onMount, tick, untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { resolve } from '$app/paths';
	import { pushState, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { BookOpen } from 'lucide-svelte';
	import {
		QUIZ_PREFERENCE_CHANGED_EVENT,
		QUIZ_PREFERENCE_KEYS,
		type QuizPreferenceChangedDetail
	} from '$lib/components/power-bar/preferences';

	let { data }: { data: PageData } = $props();

	const userId = $derived(data.convexID?._id as Id<'users'> | undefined);
	const moduleId = $derived(data.moduleId as Id<'module'>);

	const client = useConvexClient();

	let qs = $state(new QuizState());
	function showProgress() {
		qs.showCompletion = true;
		if (page.state.quizView?.moduleId === moduleId && page.state.quizView.screen === 'progress')
			return;
		// Keep a quiz entry underneath the overview, including when completion opens it automatically.
		replaceState('', { ...page.state, quizView: { moduleId, screen: 'questions' } });
		pushState('', { ...page.state, quizView: { moduleId, screen: 'progress' } });
	}
	qs.onOpenCompletion = showProgress;
	function returnToQuiz() {
		qs.closeCompletion();
		if (page.state.quizView?.moduleId === moduleId && page.state.quizView.screen === 'progress')
			window.history.back();
	}
	$effect(() => {
		const view = page.state.quizView;
		const isProgress = view?.moduleId === moduleId && view.screen === 'progress';
		untrack(() => {
			if (isProgress) qs.showCompletion = true;
			else qs.closeCompletion();
		});
	});
	let loadGeneration = 0;
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- request cache, not rendered
	const attempts = new Map<string, Id<'studyAttempts'>>();
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- request cache, not rendered
	const attemptRequests = new Map<string, Promise<{ attemptId: Id<'studyAttempts'> }>>();

	let saving = $state(false);
	let saveError = $state('');
	let saveQueue = Promise.resolve();
	const summary = $derived(qs.getCompletionSummary());
	let completionHydrated = false;
	$effect(() => {
		const state = qs;
		return () => state.cancelCompletion();
	});
	async function reviewQuestion(questionId?: string) {
		qs.cancelCompletion();
		await qs.flushProgress();
		qs.completionCelebration = false;
		qs.showFlagged = false;
		qs.showIncomplete = false;
		const list = qs.getFilteredQuestions();
		qs.currentQuestionIndex = Math.max(
			0,
			list.findIndex((q) => q._id === questionId)
		);
		qs.checkResult = '';
		qs.showSolution = false;
		qs.selectedAnswers = [];
		qs.eliminatedAnswers = [];
		const current = qs.getCurrentFilteredQuestion();
		if (current) await loadProgress(current._id);
		returnToQuiz();
	}

	$effect(() => {
		qs.loadUserPreferencesFromStorage?.();
	});

	async function saveOneQuestion(
		questionId: Id<'question'>,
		selectedOptions: string[],
		eliminatedOptions: string[],
		isFlagged: boolean
	) {
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
	}

	async function saveProgressBatch() {
		if (!userId) return;

		const snapshots = { ...qs.pendingSnapshots };
		qs.pendingSnapshots = {};

		qs.sanitizeStateForCurrentQuestion();
		const currentQuestion = qs.getCurrentFilteredQuestion() || qs.getCurrentQuestion();
		if (currentQuestion) {
			snapshots[currentQuestion._id] = {
				questionId: currentQuestion._id,
				selectedAnswers: [...qs.selectedAnswers],
				eliminatedAnswers: [...qs.eliminatedAnswers],
				isFlagged: qs.currentQuestionFlagged
			};

			if (
				qs.selectedAnswers.length > 0 ||
				qs.eliminatedAnswers.length > 0 ||
				qs.currentQuestionFlagged
			) {
				qs.markCurrentQuestionInteracted?.();
			}
		}

		saving = true;
		saveError = '';
		try {
			for (const snap of Object.values(snapshots)) {
				await saveOneQuestion(
					snap.questionId,
					snap.selectedAnswers,
					snap.eliminatedAnswers,
					snap.isFlagged
				);
			}
		} catch {
			qs.pendingSnapshots = { ...snapshots, ...qs.pendingSnapshots };
			saveError = 'Your latest answers could not be saved.';
		} finally {
			saving = false;
		}
	}
	function saveProgress() {
		saveQueue = saveQueue.then(saveProgressBatch);
		return saveQueue;
	}

	async function loadProgress(questionId: Id<'question'>) {
		if (!userId) return;
		const gen = ++loadGeneration;
		qs.showSolution = false;
		qs.solutionAutoRevealed = false;
		qs.checkResult = '';
		const draftBeforeLoad = qs.localAnswers[questionId];
		const request = client.mutation(api.studyProgress.open, {
			questionId
		});
		attemptRequests.set(questionId, request);
		try {
			const [savedProgress, attempt] = await Promise.all([
				client.query(api.userProgress.checkExistingRecord, { userId, questionId }),
				request
			]);
			if (gen !== loadGeneration) return;
			const sameAttempt = attempts.get(questionId) === attempt.attemptId;
			attempts.set(questionId, attempt.attemptId);
			qs.hydrateEvidence([attempt.evidence]);
			if (attempt.freeResponseGrade) qs.freeResponseGrades[questionId] = attempt.freeResponseGrade;
			else delete qs.freeResponseGrades[questionId];
			const isFreeResponse =
				qs.questions.find((q) => q._id === questionId)?.type === 'free_response';
			const restoredAnswers = isFreeResponse
				? (savedProgress?.selectedOptions ?? attempt.selectedOptions)
				: attempt.selectedOptions;
			qs.selectedAnswers =
				qs.localAnswers[questionId] !== draftBeforeLoad
					? (qs.localAnswers[questionId] ?? [])
					: sameAttempt
						? (qs.localAnswers[questionId] ?? restoredAnswers)
						: restoredAnswers;
			qs.localAnswers[questionId] = [...qs.selectedAnswers];
			qs.eliminatedAnswers = sameAttempt ? (savedProgress?.eliminatedOptions ?? []) : [];
			qs.setCurrentQuestionFlagged(savedProgress?.isFlagged ?? false);
			qs.sanitizeStateForCurrentQuestion();
		} catch {
			if (gen !== loadGeneration) return;
			attempts.delete(questionId);
			qs.selectedAnswers = [];
			qs.checkError = 'Your progress could not sync. Please try again.';
		}
	}

	async function getAttempt(questionId: Id<'question'>) {
		try {
			const request = attemptRequests.get(questionId);
			if (request) return (await request).attemptId;
		} catch {
			/* Retry opening after a transient connection failure. */
		}
		const request = client.mutation(api.studyProgress.open, { questionId });
		attemptRequests.set(questionId, request);
		return (await request).attemptId;
	}
	qs.submitAnswer = async (questionId, selectedOptions, submissionId) => {
		const attemptId = await getAttempt(questionId);
		return await client.mutation(api.studyProgress.check, {
			attemptId,
			selectedOptions,
			submissionId
		});
	};
	qs.submitFreeResponse = async (questionId, response, submissionId) => {
		const request = client.mutation(api.studyProgress.open, { questionId });
		attemptRequests.set(questionId, request);
		const attempt = await request;
		attempts.set(questionId, attempt.attemptId);
		return client.action(api.freeResponse.grade, {
			attemptId: attempt.attemptId,
			response,
			submissionId
		});
	};
	qs.revealAnswer = async (questionId) => {
		await client.mutation(api.studyProgress.reveal, { attemptId: await getAttempt(questionId) });
	};

	// Official convex-svelte pattern for SSR hydration with live updates
	const questions = useQuery(
		api.question.getQuestionsByModule,
		() => ({ id: moduleId }),
		() => ({ initialData: data.module })
	);

	const module = useQuery(
		api.module.getModuleById,
		() => ({ id: moduleId }),
		() => ({ initialData: data.moduleInfo })
	);

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

	const learningQuery = useQuery(api.studyProgress.getForModule, () =>
		userId ? { moduleId } : 'skip'
	);
	$effect(() => {
		const evidence = learningQuery.data;
		const questionsReady = qs.questions.length > 0;
		if (!evidence || !questionsReady) return;
		untrack(() => {
			qs.hydrateEvidence(evidence);
			if (!completionHydrated) {
				completionHydrated = true;
				const current = qs.getCompletionSummary();
				qs.completionMilestone = !current.isComplete
					? ''
					: current.isMastered
						? 'mastered'
						: current.isAllCorrect
							? 'correct'
							: current.isComplete
								? 'complete'
								: '';
				if (current.isComplete && page.state.quizView?.moduleId !== moduleId) showProgress();
			}
		});
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
		const questionList = questions.data;
		if (!questionList || questionList.length === 0) return;

		const previous = untrack(() => qs.getCurrentFilteredQuestion());
		const initialQuestion = questionList.find((q) => q._id === previous?._id) ?? questionList[0];
		const contentKey = (q: Doc<'question'>) =>
			JSON.stringify([q.stem, q.type, q.options, q.correctAnswers]);
		const changed = previous && contentKey(previous) !== contentKey(initialQuestion);
		untrack(() => qs.setQuestions(questionList));
		if (initialQuestion && userId && (!attempts.has(initialQuestion._id) || changed)) {
			untrack(() => {
				void loadProgress(initialQuestion._id);
			});
		}
	});

	let currentlySelected = $derived(
		qs.getCurrentFilteredQuestion() ||
			(questions.data && questions.data.length > 0 ? questions.data[0] : null)
	);

	async function handleSelect(question: Doc<'question'>) {
		qs.cancelCompletion();
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

	let removeHighlights = $state(false);
	let resetting = $state(false);
	let resetError = $state('');
	$effect(() => {
		if (!qs.isResetModalOpen) {
			removeHighlights = false;
			resetError = '';
		}
	});
	async function handleResetModalConfirm() {
		if (!userId || !data.moduleId || !client || resetting) return;
		resetting = true;
		resetError = '';
		try {
			++loadGeneration;
			await qs.reset(userId, data.moduleId as Id<'module'>, client, removeHighlights);
			returnToQuiz();
			attempts.clear();
			attemptRequests.clear();
			const first = qs.getCurrentFilteredQuestion();
			if (first) await loadProgress(first._id);
			hasHydratedFlags = false;
			qs.completionMilestone = '';
			qs.cancelCompletion();
			qs.isResetModalOpen = false;
		} catch {
			resetError = 'Could not reset your questions. Please try again.';
		} finally {
			resetting = false;
		}
	}

	onMount(() => {
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
			<a href={resolve('/sign-in')} class="btn btn-primary">Sign in to study</a>
		</div>
	</div>
{:else}
	<!-- Quiz View -->
	<div class="flex flex-col h-dvh lg:h-[calc(100dvh-4rem)]" transition:fade={{ duration: 200 }}>
		<div class="flex-1 min-h-0 relative">
			{#if qs.showCompletion}
				<ModuleCompletion
					title={module.data?.title ?? 'Study module'}
					emoji={module.data?.emoji || '📘'}
					{summary}
					celebrate={qs.completionCelebration}
					{saving}
					saveError={saveError || qs.checkError}
					onretry={() => {
						void saveProgress();
						void qs.retryBackground();
					}}
					onreview={(id) => void reviewQuestion(id)}
					onresume={() => void reviewQuestion()}
					onreset={() => (qs.isResetModalOpen = true)}
					onback={returnToQuiz}
				/>
			{:else}
				<MainQuiz
					{qs}
					{questions}
					{currentlySelected}
					{data}
					{handleSelect}
					{handleFilterToggle}
					{client}
					{module}
					suppressAuthErrors={true}
				/>
			{/if}
		</div>
	</div>

	<Sheet bind:open={qs.isResetModalOpen} title="Reset module?">
		<p class="text-base-content/80">
			Start another run with blank answers. This clears your current results, flags, and saved
			answers. Your mastery and past study activity are kept.
		</p>
		<label class="my-5 flex items-center justify-between gap-4">
			<span
				><span class="block font-medium">Remove highlights</span><span
					class="text-sm text-base-content/60">Also erase your stem highlights in this module.</span
				></span
			>
			<input
				type="checkbox"
				role="switch"
				aria-label="Remove highlights"
				class="toggle toggle-warning"
				bind:checked={removeHighlights}
				disabled={resetting}
			/>
		</label>
		{#if resetError}<p class="text-error mb-3" role="alert">{resetError}</p>{/if}
		{#snippet footer()}
			<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					class="btn btn-outline min-h-11 rounded-full"
					onclick={() => (qs.isResetModalOpen = false)}
				>
					Cancel
				</button>
				<button
					class="btn btn-error min-h-11 rounded-full"
					disabled={resetting}
					onclick={() => handleResetModalConfirm()}
					>{resetting ? 'Resetting…' : 'Reset module'}</button
				>
			</div>
		{/snippet}
	</Sheet>
{/if}
