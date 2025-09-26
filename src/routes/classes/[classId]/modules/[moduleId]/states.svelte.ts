import type { Doc, Id } from '../../../../../convex/_generated/dataModel';
import { api } from '../../../../../convex/_generated/api';
import type { ConvexClient } from 'convex/browser';

type QuestionOption = { id: string; text: string };

export class QuizState {
	checkResult: string = $state('');
	selectedAnswers: string[] = $state([]);
	eliminatedAnswers: string[] = $state([]);
	index: number = $state(0);
	currentQuestionIndex: number = $state(0);
	questions: Doc<'question'>[] = $state([]);
	shuffledQuestionIds: string[] = $state([]);
	isShuffled: boolean = $state(false);
	showSolution = $state(false);
	autoNextEnabled: boolean = $state(true);
	saveProgressFunction: (() => Promise<void>) | null = $state(null);
	loadProgressFunction: ((questionId: Id<'question'>) => Promise<void>) | null = $state(null);
	currentQuestionFlagged: boolean = $state(false);
	interactedQuestionsCount: number = $state(0);

	showFlagged: boolean = $state(false);
	showIncomplete: boolean = $state(false);
	liveFlaggedQuestions: Id<'question'>[] = $state([]);
	liveInteractedQuestions: Id<'question'>[] = $state([]);
	noFlags: boolean = $state(false);
	isResetModalOpen: boolean = $state(false);
	isModalOpen: boolean = $state(false);
	questionButtons: HTMLButtonElement[] = $state([]);
	private saveDebounceHandle: number | null = null;
	private autoNextHandle: number | null = null;
	private static readonly AUTO_NEXT_DELAY_MS = 1800;
	optionOrderByQuestionId: Record<string, string[]> = $state({});
	optionsShuffleEnabled: boolean = $state(false);
	fullscreenEnabled: boolean = $state(false);

	scheduleSave(delayMs: number = 400) {
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

	checkAnswer(
		correctAnswers: string[],
		userAnswers: string[],
		options?: { autoNextOnCorrect?: boolean }
	) {
		const sortedCorrect = [...correctAnswers].sort();
		const sortedUser = [...userAnswers].sort();

		const isCorrect =
			sortedCorrect.length === sortedUser.length &&
			sortedCorrect.every((answer, index) => answer === sortedUser[index]);

		const message = isCorrect ? 'Correct!' : 'Incorrect. Please try again.';

		this.checkResult = '';
		setTimeout(() => {
			this.checkResult = message;
			if (isCorrect) {
				const shouldAutoNext = options?.autoNextOnCorrect ?? true;
				if (shouldAutoNext) {
					this.scheduleAutoNextIfEnabled();
				} else {
					this.cancelAutoNext();
				}
			} else {
				this.cancelAutoNext();
			}
		}, 0);
	}

	checkFillInTheBlank(userText: string, question?: Doc<'question'> | null) {
		const q = question ?? this.getCurrentQuestion();
		if (!q) return;
		const options = (q.options || []) as QuestionOption[];
		const correctIds = (q.correctAnswers || []) as string[];
		const encodedAnswers = correctIds
			.map((id) => options.find((o) => o.id === id)?.text)
			.filter((t): t is string => Boolean(t));

		type FitbMode = 'exact' | 'exact_cs' | 'contains' | 'regex';
		function isFitbMode(s: string): s is FitbMode {
			return s === 'exact' || s === 'exact_cs' || s === 'contains' || s === 'regex';
		}

		function normalizeForFlags(text: string, ignorePunct: boolean, normalizeWs: boolean, toLower: boolean): string {
			let out = String(text || '')
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '');
			if (toLower) out = out.toLowerCase();
			if (ignorePunct) out = out.replace(/[^a-z0-9\s]/gi, '');
			if (normalizeWs) out = out.replace(/\s+/g, ' ');
			return out.trim();
		}

		function safeRegex(pattern: string): RegExp | null {
			try {
				return new RegExp(pattern);
			} catch {
				return null;
			}
		}

		let isAnyMatch = false;
		for (const encoded of encodedAnswers) {
			const [before, flagsPart] = String(encoded || '').split(' | flags=');
			const firstColon = before.indexOf(':');
			let mode: FitbMode = 'exact';
			let value = before;
			if (firstColon > -1) {
				const maybe = before.slice(0, firstColon);
				if (isFitbMode(maybe)) {
					mode = maybe;
					value = before.slice(firstColon + 1);
				}
			}
			const ignorePunct = (flagsPart || '').includes('ignore_punct');
			const normalizeWs = (flagsPart || '').includes('normalize_ws');
			if (mode === 'regex') {
				const re = safeRegex(value);
				if (re && re.test(userText)) { isAnyMatch = true; break; }
				continue;
			}
			const lowerInsensitive = mode !== 'exact_cs';
			const u = normalizeForFlags(userText, ignorePunct, normalizeWs, lowerInsensitive);
			const v = normalizeForFlags(value, ignorePunct, normalizeWs, lowerInsensitive);
			if (mode === 'contains') {
				if (u.includes(v)) { isAnyMatch = true; break; }
			} else {
				if (u === v) { isAnyMatch = true; break; }
			}
		}

		this.selectedAnswers = userText ? [userText] : [];
		this.checkAnswer(isAnyMatch ? ['1'] : ['0'], ['1'], { autoNextOnCorrect: false });
		this.scheduleSave();
	}

	checkMatching(question?: Doc<'question'> | null) {
		const q = question ?? this.getCurrentQuestion();
		if (!q) return;
		const correct = new Set((q.correctAnswers || []) as string[]);
		const user = new Set(this.selectedAnswers || []);
		const isCorrect = correct.size === user.size && [...correct].every((v) => user.has(v));
		this.checkAnswer(isCorrect ? ['1'] : ['0'], ['1'], { autoNextOnCorrect: false });
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
		if (filteredQuestions && this.currentQuestionIndex < filteredQuestions.length - 1) {
			this.scheduleSave();

			this.currentQuestionIndex++;
			this.checkResult = '';
			this.showSolution = false;

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
			this.scheduleSave();

			this.currentQuestionIndex--;
			this.checkResult = '';
			this.showSolution = false;

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
			this.scheduleSave();

			this.currentQuestionIndex = index;
			this.checkResult = '';
			this.showSolution = false;

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
		if (String(current.type) === 'fill_in_the_blank' || String(current.type) === 'matching') return;
		const options = (current.options || []) as QuestionOption[];
		if (!options || options.length === 0) return;
		const validIds = options.map((o) => o.id);
		this.selectedAnswers = this.selectedAnswers.filter((id) => validIds.includes(id));
		this.eliminatedAnswers = this.eliminatedAnswers.filter((id) => validIds.includes(id));
	}

	canGoNext() {
		const currentQuestions = this.getFilteredQuestions();
		return currentQuestions && this.currentQuestionIndex < currentQuestions.length - 1;
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
		this.showSolution = !this.showSolution;
	}

	toggleElimination(optionId: string) {
		if (this.eliminatedAnswers.includes(optionId)) {
			this.eliminatedAnswers = this.eliminatedAnswers.filter((id) => id !== optionId);
		} else {
			this.eliminatedAnswers = [...this.eliminatedAnswers, optionId];
			this.selectedAnswers = this.selectedAnswers.filter((id) => id !== optionId);
		}
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
		const current = this.getCurrentFilteredQuestion() || this.getCurrentQuestion();
		if (current && !this.liveInteractedQuestions.includes(current._id)) {
			this.liveInteractedQuestions = [...this.liveInteractedQuestions, current._id];
		}
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
		this.currentQuestionIndex = 0;
		this.checkResult = '';
		this.showSolution = false;
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
			filteredQuestions = filteredQuestions.filter(
				(q) => !this.liveInteractedQuestions.includes(q._id)
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

	async reset(userId: Id<'users'>, moduleId: Id<'module'>, client: ConvexClient) {
		this.cancelAutoNext();
		this.selectedAnswers = [];
		this.eliminatedAnswers = [];
		this.currentQuestionFlagged = false;
		this.checkResult = '';
		this.showSolution = false;
		this.currentQuestionIndex = 0;
		this.isShuffled = false;
		this.shuffledQuestionIds = [];
		this.showFlagged = false;
		this.showIncomplete = false;
		this.noFlags = false;

		try {
			await client.mutation(api.userProgress.clearUserProgressForModule, {
				userId: userId,
				moduleId: moduleId
			});
		} catch (error) {
			console.error('Error resetting progress:', error);
		}
	}

	getOrderedOptions(question: Doc<'question'>) {
		const originalOptions = (question.options || []) as QuestionOption[];
		if (!this.optionsShuffleEnabled) {
			return originalOptions;
		}
		let order = this.optionOrderByQuestionId[question._id];
		if (!order || order.length === 0) {
			const ids = originalOptions.map((o: QuestionOption) => o.id);
			const shuffled = this.generateShuffledIds(ids);
			this.optionOrderByQuestionId[question._id] = shuffled;
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
		for (const question of this.questions) {
			const ids = (question.options || []).map((o: QuestionOption) => o.id);
			const shuffled = this.generateShuffledIds(ids);
			this.optionOrderByQuestionId[question._id] = shuffled;
		}
	}

	private resetAllOptionOrdersToOriginal() {
		for (const question of this.questions) {
			const original = (question.options || []).map((o: QuestionOption) => o.id);
			this.optionOrderByQuestionId[question._id] = original;
		}
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
}
