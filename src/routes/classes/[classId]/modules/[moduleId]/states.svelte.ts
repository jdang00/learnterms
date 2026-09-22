import { responseText, type FreeResponseGrade } from '$lib/utils/freeResponse';
import { answerStatus, evaluateMatching, summarizeModule } from '$lib/utils/moduleCompletion';
import type { Doc, Id } from '../../../../../convex/_generated/dataModel';
import { api } from '../../../../../convex/_generated/api';
import type { ConvexClient } from 'convex/browser';

import type { StudyEvidence } from '$lib/utils/studyMastery';

type QuestionOption = { id: string; text: string };
type PendingSnapshot = {
	questionId: Id<'question'>;
	selectedAnswers: string[];
	eliminatedAnswers: string[];
	isFlagged: boolean;
};

export class QuizState {
	learningEvidence: Record<string, StudyEvidence> = $state({});
	private evidenceRevision: Record<string, number> = {};
	private pendingEvidence: Record<string, number> = {};
	private backgroundJobs: { questionId: string; run: () => Promise<void> }[] = [];
	private backgroundWork: Promise<void> | null = null;
	hydrateEvidence(records: StudyEvidence[]) {
		for (const evidence of records)
			if (!this.pendingEvidence[evidence.questionId])
				this.learningEvidence[evidence.questionId] = evidence;
	}
	private enqueueEvidence(questionId: string, run: () => Promise<void>) {
		this.pendingEvidence[questionId] = (this.pendingEvidence[questionId] ?? 0) + 1;
		this.backgroundJobs.push({ questionId, run });
		void this.retryBackground();
	}
	retryBackground(): Promise<void> {
		if (this.backgroundWork) return this.backgroundWork;
		this.backgroundWork = (async () => {
			while (this.backgroundJobs.length) {
				const job = this.backgroundJobs[0];
				try {
					await job.run();
					this.backgroundJobs.shift();
					this.pendingEvidence[job.questionId]--;
					this.checkError = '';
				} catch {
					this.checkError = 'Some checked answers have not synced. Retry to save your progress.';
					break;
				}
			}
		})().finally(() => {
			this.backgroundWork = null;
		});
		return this.backgroundWork;
	}
	async flushEvidence() {
		await this.retryBackground();
		if (this.backgroundJobs.length) throw new Error('Progress has not synced');
	}
	freeResponseGrades: Record<string, FreeResponseGrade> = $state({});
	gradingQuestionId = $state<string | null>(null);
	gradingErrors: Record<string, string> = $state({});
	submitFreeResponse:
		| ((
				questionId: Id<'question'>,
				response: string,
				submissionId: string
		  ) => Promise<{ isCorrect: boolean; evidence: StudyEvidence; grade: FreeResponseGrade }>)
		| null = null;
	async checkFreeResponse(): Promise<boolean> {
		const question = this.getCurrentFilteredQuestion();
		const response = this.selectedAnswers[0] ?? '';
		if (!question || this.gradingQuestionId || !responseText(response))
			throw new Error('No response to grade');
		this.cancelAutoNext();
		this.cancelCompletion();
		this.gradingQuestionId = question._id;
		this.gradingErrors[question._id] = '';
		try {
			if (!this.submitFreeResponse) throw new Error('Grading unavailable');
			const result = await this.submitFreeResponse(question._id, response, crypto.randomUUID());
			this.freeResponseGrades[question._id] = result.grade;
			this.learningEvidence[question._id] = result.evidence;
			if (
				this.getCurrentFilteredQuestion()?._id === question._id &&
				this.selectedAnswers[0] === response
			) {
				this.checkResult = result.isCorrect ? 'Correct!' : 'Not quite yet.';
				this.checkCount++;
				this.showSolution = true;
				this.solutionAutoRevealed = true;
				this.scheduleSave();
			}
			return result.isCorrect;
		} catch (error) {
			this.gradingErrors[question._id] =
				'Grading could not finish. Your response is saved here. Please submit again.';
			throw error;
		} finally {
			this.gradingQuestionId = null;
		}
	}
	checkError = $state('');
	submitAnswer:
		| ((
				questionId: Id<'question'>,
				answers: string[],
				submissionId: string
		  ) => Promise<{ isCorrect: boolean; evidence: StudyEvidence }>)
		| null = null;
	revealAnswer: ((questionId: Id<'question'>) => Promise<void>) | null = null;
	showCompletion = $state(false);
	onOpenCompletion: (() => void) | null = null;
	completionCelebration = $state(false);
	savedAnswers: Record<string, string[]> = $state({});
	localAnswers: Record<string, string[]> = $state({});
	completionMilestone = '';
	private completionTimer: ReturnType<typeof setTimeout> | undefined;
	private completionDismissed = false;
	cancelCompletion() {
		clearTimeout(this.completionTimer);
	}
	private scheduleCompletion() {
		this.cancelCompletion();
		if (this.completionDismissed) return;
		const summary = this.getCompletionSummary();
		if (!summary.isComplete) return;
		const milestone = summary.isMastered
			? 'mastered'
			: summary.isAllCorrect
				? 'correct'
				: summary.isComplete
					? 'complete'
					: '';
		if (
			!milestone ||
			milestone === this.completionMilestone ||
			['', 'complete', 'correct', 'mastered'].indexOf(milestone) <=
				['', 'complete', 'correct', 'mastered'].indexOf(this.completionMilestone)
		)
			return;
		this.cancelAutoNext();
		this.completionTimer = setTimeout(() => {
			const current = this.getCompletionSummary();
			if (!current.isComplete) return;
			this.completionMilestone = current.isMastered
				? 'mastered'
				: current.isAllCorrect
					? 'correct'
					: 'complete';
			this.completionCelebration = true;
			this.openCompletion();
		}, QuizState.AUTO_NEXT_DELAY_MS);
	}
	openCompletion() {
		this.cancelCompletion();
		this.cancelAutoNext();
		this.snapshotCurrentQuestion();
		this.scheduleSave();
		this.showCompletion = true;
		this.onOpenCompletion?.();
	}
	closeCompletion() {
		this.cancelCompletion();
		this.cancelAutoNext();
		this.completionDismissed = true;
		this.completionCelebration = false;
		this.showCompletion = false;
	}
	getCompletionSummary() {
		return summarizeModule(this.questions, this.learningEvidence, this.liveFlaggedQuestions);
	}
	checkResult: string = $state('');
	// Bumps on every graded check so feedback replays even when the result text repeats.
	checkCount = $state(0);
	selectedAnswers: string[] = $state([]);
	eliminatedAnswers: string[] = $state([]);
	index: number = $state(0);
	currentQuestionIndex: number = $state(0);
	questions: Doc<'question'>[] = $state([]);
	shuffledQuestionIds: string[] = $state([]);
	isShuffled: boolean = $state(false);
	showSolution = $state(false);
	solutionAutoRevealed = $state(false);
	autoNextEnabled: boolean = $state(true);
	saveProgressFunction: (() => Promise<void>) | null = $state(null);
	loadProgressFunction: ((questionId: Id<'question'>) => Promise<void>) | null = $state(null);
	currentQuestionFlagged: boolean = $state(false);
	interactedQuestionsCount: number = $state(0);

	showFlagged: boolean = $state(false);
	showIncomplete: boolean = $state(false);
	incompleteQuestionIds: string[] = $state([]);
	liveFlaggedQuestions: Id<'question'>[] = $state([]);
	liveInteractedQuestions: Id<'question'>[] = $state([]);
	noFlags: boolean = $state(false);
	isResetModalOpen: boolean = $state(false);
	highlightEnabled = $state(false);
	highlightResetVersion = $state(0);
	highlightModeSaving = $state(false);
	highlightPreferenceError = $state('');
	saveHighlightPreference: ((enabled: boolean) => Promise<unknown>) | null = null;
	private highlightToggleSequence = 0;

	async toggleHighlighting() {
		if (!this.saveHighlightPreference) return;
		const sequence = ++this.highlightToggleSequence;
		this.highlightEnabled = !this.highlightEnabled;
		this.highlightModeSaving = true;
		this.highlightPreferenceError = '';
		try {
			await this.saveHighlightPreference(this.highlightEnabled);
		} catch {
			if (sequence === this.highlightToggleSequence)
				this.highlightPreferenceError = 'Could not save highlight mode. Please try again.';
		} finally {
			if (sequence === this.highlightToggleSequence) this.highlightModeSaving = false;
		}
	}

	isModalOpen: boolean = $state(false);
	questionButtons: HTMLButtonElement[] = $state([]);
	private saveDebounceHandle: number | null = null;
	private autoNextHandle: number | null = null;
	pendingSnapshots: Record<string, PendingSnapshot> = {};
	private static readonly AUTO_NEXT_DELAY_MS = 1800;
	private optionOrderCache: Record<string, string[]> = {};
	optionsShuffleEnabled: boolean = $state(false);
	fullscreenEnabled: boolean = $state(true);

	async flushProgress() {
		if (this.saveDebounceHandle) {
			clearTimeout(this.saveDebounceHandle);
			this.saveDebounceHandle = null;
		}
		await this.saveProgressFunction?.();
	}

	scheduleSave(delayMs: number = 400) {
		const current = this.getCurrentFilteredQuestion() || this.getCurrentQuestion();
		if (current) this.localAnswers[current._id] = [...this.selectedAnswers];
		if (!this.saveProgressFunction) return;
		if (this.saveDebounceHandle) {
			clearTimeout(this.saveDebounceHandle);
		}
		this.saveDebounceHandle = window.setTimeout(async () => {
			if (this.saveProgressFunction) {
				await this.saveProgressFunction();
			}
			this.saveDebounceHandle = null;
		}, delayMs);
	}

	snapshotCurrentQuestion() {
		const current = this.getCurrentFilteredQuestion() || this.getCurrentQuestion();
		if (!current) return;
		this.pendingSnapshots[current._id] = {
			questionId: current._id,
			selectedAnswers: [...this.selectedAnswers],
			eliminatedAnswers: [...this.eliminatedAnswers],
			isFlagged: this.currentQuestionFlagged
		};
	}

	checkAnswer(
		_correctAnswers: string[],
		userAnswers: string[],
		options?: { autoNextOnCorrect?: boolean }
	): boolean {
		const question = this.getCurrentFilteredQuestion();
		if (!question || answerStatus(question, userAnswers) === 'unanswered') return false;
		this.completionDismissed = false;
		const isCorrect = answerStatus(question, userAnswers) === 'correct';
		const answers = [...userAnswers];
		const submissionId = crypto.randomUUID();
		const revision = (this.evidenceRevision[question._id] ?? 0) + 1;
		this.evidenceRevision[question._id] = revision;
		const previous = this.learningEvidence[question._id] ?? {
			questionId: question._id,
			cleanRecallCount: 0
		};
		this.learningEvidence[question._id] = {
			...previous,
			checkedAt: Date.now(),
			latestCorrect: isCorrect,
			activeAttemptChecks: (previous.activeAttemptChecks ?? 0) + 1,
			...(isCorrect ? {} : { cleanRecallCount: 0, firstCleanAt: undefined, masteredAt: undefined })
		};
		this.checkResult = isCorrect ? 'Correct!' : 'Incorrect. Please try again.';
		this.checkCount++;
		this.cancelAutoNext();
		if (isCorrect) {
			this.showSolution = true;
			this.solutionAutoRevealed = true;
			if (options?.autoNextOnCorrect ?? true) this.scheduleAutoNextIfEnabled();
		}
		this.scheduleSave();
		this.scheduleCompletion();
		this.enqueueEvidence(question._id, async () => {
			if (!this.submitAnswer) throw new Error('No save handler');
			const result = await this.submitAnswer(question._id, answers, submissionId);
			if (this.evidenceRevision[question._id] === revision) {
				this.learningEvidence[question._id] = result.evidence;
				if (result.evidence.masteredAt !== undefined && !this.showCompletion)
					this.scheduleCompletion();
			}
		});
		return isCorrect;
	}

	checkFillInTheBlank(userText: string, _question?: Doc<'question'> | null): boolean {
		this.selectedAnswers = userText.trim() ? [userText] : [];
		return this.checkAnswer([], this.selectedAnswers, { autoNextOnCorrect: false });
	}

	checkMatching(_question?: Doc<'question'> | null): boolean {
		return this.checkAnswer([], this.selectedAnswers, { autoNextOnCorrect: false });
	}

	evaluateMatchingSelection(question?: Doc<'question'> | null): boolean {
		const q = question ?? this.getCurrentQuestion();
		if (!q) return false;

		return evaluateMatching(q, this.selectedAnswers);
	}

	getProgressPercentage(): number {
		if (!this.questions || this.questions.length === 0) {
			return 0;
		}
		return Math.round((this.interactedQuestionsCount / this.questions.length) * 100);
	}

	setInteractedQuestionsCount(count: number) {
		this.interactedQuestionsCount = count;
	}

	toggleFlag() {
		this.currentQuestionFlagged = !this.currentQuestionFlagged;
		const current = this.getCurrentFilteredQuestion() || this.getCurrentQuestion();
		if (current) {
			if (this.currentQuestionFlagged) {
				if (!this.liveFlaggedQuestions.includes(current._id)) {
					this.liveFlaggedQuestions = [...this.liveFlaggedQuestions, current._id];
				}
			} else {
				this.liveFlaggedQuestions = this.liveFlaggedQuestions.filter((id) => id !== current._id);
			}
		}
		this.scheduleSave();
	}

	setCurrentQuestionFlagged(isFlagged: boolean) {
		this.currentQuestionFlagged = isFlagged;
	}

	async goToNextQuestion() {
		this.cancelAutoNext();
		const filteredQuestions = this.getFilteredQuestions();
		if (filteredQuestions.length > 0 && this.currentQuestionIndex >= filteredQuestions.length - 1) {
			this.openCompletion();
			return;
		}
		if (filteredQuestions && this.currentQuestionIndex < filteredQuestions.length - 1) {
			this.snapshotCurrentQuestion();
			this.scheduleSave();

			this.currentQuestionIndex++;
			this.checkResult = '';
			this.showSolution = false;
			this.solutionAutoRevealed = false;

			this.selectedAnswers = [];
			this.eliminatedAnswers = [];

			const newQuestion = this.getCurrentFilteredQuestion();
			if (newQuestion && this.loadProgressFunction) {
				void this.loadProgressFunction(newQuestion._id);
			} else {
				this.selectedAnswers = [];
				this.eliminatedAnswers = [];
			}
		}
	}

	async goToPreviousQuestion() {
		this.cancelAutoNext();
		const filteredQuestions = this.getFilteredQuestions();
		if (filteredQuestions && this.currentQuestionIndex > 0) {
			this.snapshotCurrentQuestion();
			this.scheduleSave();

			this.currentQuestionIndex--;
			this.checkResult = '';
			this.showSolution = false;
			this.solutionAutoRevealed = false;

			this.selectedAnswers = [];
			this.eliminatedAnswers = [];

			const newQuestion = this.getCurrentFilteredQuestion();
			if (newQuestion && this.loadProgressFunction) {
				void this.loadProgressFunction(newQuestion._id);
			} else {
				this.selectedAnswers = [];
				this.eliminatedAnswers = [];
			}
		}
	}

	setQuestions(questions: Doc<'question'>[]) {
		this.questions = questions || [];
		this.rebuildOptionOrders();
	}

	getCurrentQuestions(): Doc<'question'>[] {
		if (this.isShuffled && this.shuffledQuestionIds.length > 0) {
			return this.shuffledQuestionIds
				.map((id) => this.questions.find((q) => q._id === id))
				.filter(Boolean) as Doc<'question'>[];
		}
		return this.questions;
	}

	async setCurrentQuestionIndex(index: number) {
		this.cancelAutoNext();
		const currentQuestions = this.getCurrentQuestions();
		if (currentQuestions && index >= 0 && index < currentQuestions.length) {
			this.snapshotCurrentQuestion();
			this.scheduleSave();

			this.currentQuestionIndex = index;
			this.checkResult = '';
			this.showSolution = false;
			this.solutionAutoRevealed = false;

			this.selectedAnswers = [];
			this.eliminatedAnswers = [];

			const newQuestion = this.getCurrentQuestion();
			if (newQuestion && this.loadProgressFunction) {
				void this.loadProgressFunction(newQuestion._id);
			} else {
				this.selectedAnswers = [];
				this.eliminatedAnswers = [];
			}
		}
	}

	setSaveProgressFunction(func: () => Promise<void>) {
		this.saveProgressFunction = func;
	}

	setLoadProgressFunction(func: (questionId: Id<'question'>) => Promise<void>) {
		this.loadProgressFunction = func;
	}

	updateLiveFlaggedQuestions(flagged: Id<'question'>[]) {
		this.liveFlaggedQuestions = flagged;
	}

	updateLiveInteractedQuestions(interacted: Id<'question'>[]) {
		this.liveInteractedQuestions = interacted;
	}

	getCurrentQuestion() {
		const currentQuestions = this.getCurrentQuestions();
		if (!currentQuestions || currentQuestions.length === 0) {
			return null;
		}
		return currentQuestions[this.currentQuestionIndex] || currentQuestions[0];
	}

	sanitizeStateForCurrentQuestion() {
		const current = this.getCurrentFilteredQuestion() || this.getCurrentQuestion();
		if (!current) return;
		if (['fill_in_the_blank', 'free_response'].includes(current.type)) return;
		if (String(current.type) === 'matching') {
			const options = (current.options || []) as QuestionOption[];
			const promptIds = options
				.filter((o) => String(o.text).trimStart().toLowerCase().startsWith('prompt:'))
				.map((o) => o.id);
			const answerIds = options
				.filter((o) => String(o.text).trimStart().toLowerCase().startsWith('answer:'))
				.map((o) => o.id);

			const parsePair = (value: string): { promptId: string; answerId: string } | null => {
				const raw = String(value ?? '').trim();
				const sep = raw.indexOf('::');
				if (sep <= 0) return null;
				const promptId = raw.slice(0, sep).trim();
				const answerToken = raw.slice(sep + 2).trim();
				const answerId = answerToken
					.split('|')
					.map((part) => part.trim())
					.find((id) => id.length > 0);
				if (!promptId || !answerId) return null;
				return { promptId, answerId };
			};

			const seenPrompts: string[] = [];
			const normalized: string[] = [];
			for (const raw of this.selectedAnswers || []) {
				const pair = parsePair(raw);
				if (!pair) continue;
				if (!promptIds.includes(pair.promptId) || !answerIds.includes(pair.answerId)) continue;
				if (seenPrompts.includes(pair.promptId)) continue;
				seenPrompts.push(pair.promptId);
				normalized.push(`${pair.promptId}::${pair.answerId}`);
			}

			this.selectedAnswers = normalized;
			this.eliminatedAnswers = [];
			return;
		}
		const options = (current.options || []) as QuestionOption[];
		if (!options || options.length === 0) return;
		const validIds = options.map((o) => o.id);
		this.selectedAnswers = this.selectedAnswers.filter((id) => validIds.includes(id));
		this.eliminatedAnswers = this.eliminatedAnswers.filter((id) => validIds.includes(id));
	}

	canGoNext() {
		const currentQuestions = this.getFilteredQuestions();
		return currentQuestions.length > 0;
	}

	canGoPrevious() {
		const currentQuestions = this.getFilteredQuestions();
		return currentQuestions && this.currentQuestionIndex > 0;
	}

	toggleShuffle() {
		this.cancelAutoNext();
		this.isShuffled = !this.isShuffled;
		if (this.isShuffled) {
			this.shuffleQuestions();
		}
		this.currentQuestionIndex = 0;
		this.checkResult = '';
		this.showSolution = false;
		this.solutionAutoRevealed = false;
		this.selectedAnswers = [];
		this.eliminatedAnswers = [];
		this.scheduleSave();
	}

	shuffleQuestions() {
		if (this.questions && this.questions.length > 0) {
			const questionIds = this.questions.map((q) => q._id);
			const shuffled = [...questionIds];
			for (let i = shuffled.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
			}
			this.shuffledQuestionIds = shuffled;
		}
	}

	handleSolution() {
		if (this.showSolution) {
			this.showSolution = false;
			return;
		}
		const question = this.getCurrentFilteredQuestion();
		if (!question) return;
		this.showSolution = true;
		this.solutionAutoRevealed = false;
		const evidence = this.learningEvidence[question._id];
		if (evidence && !evidence.activeAttemptChecks) evidence.activeAttemptRevealed = true;
		this.enqueueEvidence(question._id, async () => {
			if (!this.revealAnswer) throw new Error('No save handler');
			await this.revealAnswer(question._id);
		});
	}

	toggleElimination(optionId: string) {
		if (this.eliminatedAnswers.includes(optionId)) {
			this.eliminatedAnswers = this.eliminatedAnswers.filter((id) => id !== optionId);
		} else {
			this.eliminatedAnswers = [...this.eliminatedAnswers, optionId];
			this.selectedAnswers = this.selectedAnswers.filter((id) => id !== optionId);
		}
		this.markCurrentQuestionInteracted();
		this.scheduleSave();
	}

	toggleOption(optionId: string) {
		if (this.eliminatedAnswers.includes(optionId)) {
			return;
		}

		if (this.selectedAnswers.includes(optionId)) {
			this.selectedAnswers = this.selectedAnswers.filter((id) => id !== optionId);
		} else {
			this.selectedAnswers = [...this.selectedAnswers, optionId];
		}
		this.markCurrentQuestionInteracted();
		this.scheduleSave();
	}

	isOptionSelected(optionId: string): boolean {
		return this.selectedAnswers.includes(optionId);
	}

	isOptionEliminated(optionId: string): boolean {
		return this.eliminatedAnswers.includes(optionId);
	}

	isCorrect(optionId: string): boolean {
		const currentQuestion = this.getCurrentFilteredQuestion() || this.getCurrentQuestion();
		return currentQuestion ? currentQuestion.correctAnswers.includes(optionId) : false;
	}

	toggleSortByFlagged() {
		const currentQuestion = this.getCurrentFilteredQuestion() || this.getCurrentQuestion();
		this.showFlagged = !this.showFlagged;
		this.checkResult = '';
		this.showSolution = false;
		this.solutionAutoRevealed = false;
		this.selectedAnswers = [];
		this.eliminatedAnswers = [];

		const filtered = this.getFilteredQuestions();
		if (currentQuestion) {
			const newIndex = filtered.findIndex((q) => q._id === currentQuestion._id);
			if (newIndex !== -1) {
				this.currentQuestionIndex = newIndex;
				return;
			}
		}

		if (filtered.length > 0) {
			this.currentQuestionIndex = 0;
		} else {
			this.currentQuestionIndex = 0;
		}
	}

	toggleShowIncomplete() {
		this.showIncomplete = !this.showIncomplete;
		this.incompleteQuestionIds = this.showIncomplete
			? this.questions
					.filter((q) => this.learningEvidence[q._id]?.checkedAt === undefined)
					.map((q) => q._id)
			: [];
		this.currentQuestionIndex = 0;
		this.checkResult = '';
		this.showSolution = false;
		this.solutionAutoRevealed = false;
		this.selectedAnswers = [];
		this.eliminatedAnswers = [];
	}

	getFilteredQuestions(): Doc<'question'>[] {
		let filteredQuestions = this.getCurrentQuestions();

		if (this.showFlagged) {
			if (this.liveFlaggedQuestions.length === 0) {
				return filteredQuestions;
			}
			filteredQuestions = filteredQuestions.filter((q) =>
				this.liveFlaggedQuestions.includes(q._id)
			);
		}

		if (this.showIncomplete) {
			filteredQuestions = filteredQuestions.filter((q) =>
				this.incompleteQuestionIds.includes(q._id)
			);
		}

		return filteredQuestions;
	}

	getCurrentFilteredQuestion(): Doc<'question'> | null {
		const filteredQuestions = this.getFilteredQuestions();
		if (!filteredQuestions || filteredQuestions.length === 0) {
			return null;
		}
		const safeIndex = Math.min(this.currentQuestionIndex, filteredQuestions.length - 1);
		return filteredQuestions[safeIndex] || filteredQuestions[0];
	}

	async reset(
		userId: Id<'users'>,
		moduleId: Id<'module'>,
		client: ConvexClient,
		removeHighlights = false
	) {
		this.cancelAutoNext();
		if (this.saveDebounceHandle) {
			clearTimeout(this.saveDebounceHandle);
			this.saveDebounceHandle = null;
		}
		await this.flushEvidence();
		await this.saveProgressFunction?.();
		await client.mutation(api.userProgress.clearUserProgressForModule, {
			userId,
			moduleId,
			removeHighlights
		});
		if (removeHighlights) this.highlightResetVersion++;
		this.freeResponseGrades = {};
		this.gradingErrors = {};
		this.pendingSnapshots = {};
		this.learningEvidence = Object.fromEntries(
			Object.entries(this.learningEvidence).map(([id, evidence]) => [
				id,
				{
					...evidence,
					checkedAt: undefined,
					latestCorrect: undefined,
					activeAttemptChecks: 0,
					activeAttemptRevealed: false
				}
			])
		);
		this.checkError = '';
		this.savedAnswers = {};
		this.localAnswers = {};
		this.showCompletion = false;
		this.completionCelebration = false;
		this.completionMilestone = '';
		this.cancelCompletion();
		this.liveFlaggedQuestions = [];
		this.liveInteractedQuestions = [];
		this.cancelAutoNext();
		this.selectedAnswers = [];
		this.eliminatedAnswers = [];
		this.currentQuestionFlagged = false;
		this.checkResult = '';
		this.showSolution = false;
		this.solutionAutoRevealed = false;
		this.currentQuestionIndex = 0;
		this.isShuffled = false;
		this.shuffledQuestionIds = [];
		this.showFlagged = false;
		this.showIncomplete = false;
		this.noFlags = false;
	}

	getOrderedOptions(question: Doc<'question'>) {
		const originalOptions = (question.options || []) as QuestionOption[];
		if (!this.optionsShuffleEnabled) {
			return originalOptions;
		}
		let order = this.optionOrderCache[question._id];
		if (!order || order.length === 0) {
			const ids = originalOptions.map((o: QuestionOption) => o.id);
			const shuffled = this.generateShuffledIds(ids);
			this.optionOrderCache[question._id] = shuffled;
			order = shuffled;
		}
		const idToOption: Record<string, QuestionOption> = {};
		for (const option of originalOptions) {
			idToOption[option.id] = option;
		}
		const ordered = order
			.map((id) => idToOption[id])
			.filter((opt): opt is QuestionOption => Boolean(opt));
		if (ordered.length !== originalOptions.length) {
			const missing = originalOptions.filter((o: QuestionOption) => !order!.includes(o.id));
			return [...ordered, ...missing];
		}
		return ordered;
	}

	setOptionsShuffleEnabled(enabled: boolean) {
		this.optionsShuffleEnabled = enabled;
		if (enabled) {
			this.shuffleAllOptions();
		} else {
			this.resetAllOptionOrdersToOriginal();
		}
		if (typeof window !== 'undefined') {
			try {
				window.localStorage.setItem('lt:optionsShuffleEnabled', String(enabled));
			} catch {
				/* no-op */
			}
		}
	}

	private rebuildOptionOrders() {
		if (this.optionsShuffleEnabled) {
			this.shuffleAllOptions();
		} else {
			this.resetAllOptionOrdersToOriginal();
		}
	}

	private shuffleAllOptions() {
		const activeQuestionIds = this.questions.map((q) => String(q._id));
		for (const questionId of Object.keys(this.optionOrderCache)) {
			if (!activeQuestionIds.includes(questionId)) {
				delete this.optionOrderCache[questionId];
			}
		}

		for (const question of this.questions) {
			const ids = (question.options || []).map((o: QuestionOption) => o.id);
			const existing = this.optionOrderCache[question._id];

			if (!existing || existing.length === 0) {
				this.optionOrderCache[question._id] = this.generateShuffledIds(ids);
				continue;
			}

			const preserved = existing.filter((id) => ids.includes(id));
			const missing = ids.filter((id) => !preserved.includes(id));
			const randomizedMissing = missing.length > 1 ? this.generateShuffledIds(missing) : missing;

			this.optionOrderCache[question._id] = [...preserved, ...randomizedMissing];
		}
	}

	private resetAllOptionOrdersToOriginal() {
		this.optionOrderCache = {};
	}

	private generateShuffledIds(ids: string[]): string[] {
		const out = [...ids];
		for (let i = out.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[out[i], out[j]] = [out[j], out[i]];
		}
		return out;
	}

	setAutoNextEnabled(enabled: boolean) {
		this.autoNextEnabled = enabled;
		if (!enabled) this.cancelAutoNext();
		if (typeof window !== 'undefined') {
			try {
				window.localStorage.setItem('lt:autoNextEnabled', String(enabled));
			} catch {
				/* no-op */
			}
		}
	}

	private scheduleAutoNextIfEnabled() {
		if (!this.autoNextEnabled) return;
		if (!this.canGoNext()) return;
		if (this.autoNextHandle) {
			clearTimeout(this.autoNextHandle);
			this.autoNextHandle = null;
		}
		this.autoNextHandle = window.setTimeout(async () => {
			await this.goToNextQuestion();
			this.scheduleSave();
			this.autoNextHandle = null;
		}, QuizState.AUTO_NEXT_DELAY_MS);
	}

	private cancelAutoNext() {
		if (this.autoNextHandle) {
			clearTimeout(this.autoNextHandle);
			this.autoNextHandle = null;
		}
	}

	loadUserPreferencesFromStorage() {
		if (typeof window === 'undefined') return;
		try {
			const auto = window.localStorage.getItem('lt:autoNextEnabled');
			if (auto !== null) {
				this.autoNextEnabled = auto === 'true';
			}
			const shuffle = window.localStorage.getItem('lt:optionsShuffleEnabled');
			if (shuffle !== null) {
				this.setOptionsShuffleEnabled(shuffle === 'true');
			}
		} catch {
			/* no-op */
		}
	}

	markCurrentQuestionInteracted() {
		const current = this.getCurrentFilteredQuestion() || this.getCurrentQuestion();
		if (!current) return;
		if (!this.liveInteractedQuestions.includes(current._id)) {
			this.liveInteractedQuestions = [...this.liveInteractedQuestions, current._id];
			this.interactedQuestionsCount = this.liveInteractedQuestions.length;
		}
	}
}
