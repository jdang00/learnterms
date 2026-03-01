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
	solutionAutoRevealed = $state(false);
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
	pendingSnapshots: Map<string, { questionId: Id<'question'>; selectedAnswers: string[]; eliminatedAnswers: string[]; isFlagged: boolean }> = new Map();
	private static readonly AUTO_NEXT_DELAY_MS = 1800;
	private optionOrderCache: Map<string, string[]> = new Map();
	optionsShuffleEnabled: boolean = $state(false);
	fullscreenEnabled: boolean = $state(true);

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

	snapshotCurrentQuestion() {
		const current = this.getCurrentFilteredQuestion() || this.getCurrentQuestion();
		if (!current) return;
		this.pendingSnapshots.set(current._id, {
			questionId: current._id,
			selectedAnswers: [...this.selectedAnswers],
			eliminatedAnswers: [...this.eliminatedAnswers],
			isFlagged: this.currentQuestionFlagged
		});
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
				this.showSolution = true;
				this.solutionAutoRevealed = true;
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
		if (this.selectedAnswers.length > 0) {
			this.markCurrentQuestionInteracted();
		}
		this.checkAnswer(isAnyMatch ? ['1'] : ['0'], ['1'], { autoNextOnCorrect: false });
		this.scheduleSave();
	}

	checkMatching(question?: Doc<'question'> | null) {
		const q = question ?? this.getCurrentQuestion();
		if (!q) return;

		const isCorrect = this.evaluateMatchingSelection(q);

		if ((this.selectedAnswers || []).length > 0) {
			this.markCurrentQuestionInteracted();
		}

		this.checkAnswer(isCorrect ? ['1'] : ['0'], ['1'], { autoNextOnCorrect: false });
	}

	evaluateMatchingSelection(question?: Doc<'question'> | null): boolean {
		const q = question ?? this.getCurrentQuestion();
		if (!q) return false;

		const options = (q.options || []) as QuestionOption[];
		const promptOptions = options.filter((o) => String(o.text).trimStart().toLowerCase().startsWith('prompt:'));
		const answerOptions = options.filter((o) => String(o.text).trimStart().toLowerCase().startsWith('answer:'));
		const promptIdSet = new Set(promptOptions.map((o) => o.id));
		const answerIdSet = new Set(answerOptions.map((o) => o.id));

		const normalizeAnswerText = (text: string): string =>
			String(text ?? '')
				.replace(/^\s*answer:\s*/i, '')
				.trim()
				.toLowerCase()
				.replace(/\s+/g, ' ');

		const answerKeyById = new Map<string, string>();
		for (const answer of answerOptions) {
			answerKeyById.set(answer.id, normalizeAnswerText(answer.text));
		}
		const answerIdsByKey = new Map<string, Set<string>>();
		for (const [id, key] of answerKeyById.entries()) {
			if (!answerIdsByKey.has(key)) answerIdsByKey.set(key, new Set());
			answerIdsByKey.get(key)!.add(id);
		}

		const parsePair = (value: string): { promptId: string; answerToken: string } | null => {
			const raw = String(value ?? '').trim();
			const sep = raw.indexOf('::');
			if (sep <= 0) return null;
			const promptId = raw.slice(0, sep).trim();
			const answerToken = raw.slice(sep + 2).trim();
			if (!promptId || !answerToken) return null;
			return { promptId, answerToken };
		};

		const splitAnswerToken = (answerToken: string): string[] =>
			String(answerToken ?? '')
				.split('|')
				.map((part) => part.trim())
				.filter((part) => part.length > 0);

		const resolveOptionTokenToId = (token: string): string | null => {
			const raw = String(token ?? '').trim();
			if (!raw) return null;
			if (options.some((opt) => opt.id === raw)) return raw;
			if (/^\d+$/.test(raw)) {
				const index = Number(raw);
				if (Number.isInteger(index) && index >= 0 && index < options.length) {
					return options[index]?.id ?? null;
				}
			}
			return null;
		};

		const normalizeCorrectByPrompt = new Map<string, Set<string>>();
		const rawCorrect = (q.correctAnswers || []) as string[];
		const hasPairFormat = rawCorrect.some((value) => String(value).includes('::'));

		if (hasPairFormat) {
			for (const raw of rawCorrect) {
				const parsed = parsePair(raw);
				if (!parsed) continue;
				const resolvedPromptId = resolveOptionTokenToId(parsed.promptId);
				if (!resolvedPromptId || !promptIdSet.has(resolvedPromptId)) continue;

				const directIds = splitAnswerToken(parsed.answerToken)
					.map((token) => resolveOptionTokenToId(token))
					.filter((id): id is string => Boolean(id))
					.filter((id) => answerIdSet.has(id));
				if (directIds.length === 0) continue;

				const accepted = normalizeCorrectByPrompt.get(resolvedPromptId) ?? new Set<string>();
				for (const directId of directIds) {
					accepted.add(directId);
					const key = answerKeyById.get(directId);
					if (!key) continue;
					const sameMeaning = answerIdsByKey.get(key);
					if (!sameMeaning) continue;
					for (const equivalentId of sameMeaning) {
						accepted.add(equivalentId);
					}
				}
				normalizeCorrectByPrompt.set(resolvedPromptId, accepted);
			}
		} else {
			const n = Math.min(promptOptions.length, rawCorrect.length);
			for (let i = 0; i < n; i++) {
				const promptId = promptOptions[i].id;
				const answerId = resolveOptionTokenToId(String(rawCorrect[i] ?? '').trim());
				if (!answerId || !answerIdSet.has(answerId)) continue;

				const accepted = new Set<string>([answerId]);
				const key = answerKeyById.get(answerId);
				if (key) {
					const sameMeaning = answerIdsByKey.get(key);
					if (sameMeaning) {
						for (const equivalentId of sameMeaning) accepted.add(equivalentId);
					}
				}
				normalizeCorrectByPrompt.set(promptId, accepted);
			}
		}

		const userByPrompt = new Map<string, string>();
		for (const raw of this.selectedAnswers || []) {
			const parsed = parsePair(raw);
			if (!parsed) continue;
			const answerId = splitAnswerToken(parsed.answerToken)[0];
			if (!answerId || !promptIdSet.has(parsed.promptId) || !answerIdSet.has(answerId)) continue;
			userByPrompt.set(parsed.promptId, answerId);
		}

		if (userByPrompt.size !== normalizeCorrectByPrompt.size) return false;
		for (const [promptId, acceptedAnswerIds] of normalizeCorrectByPrompt.entries()) {
			const selectedId = userByPrompt.get(promptId);
			if (!selectedId || !acceptedAnswerIds.has(selectedId)) return false;
		}

		return true;
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
		if (String(current.type) === 'fill_in_the_blank') return;
		if (String(current.type) === 'matching') {
			const options = (current.options || []) as QuestionOption[];
			const promptIdSet = new Set(
				options
					.filter((o) => String(o.text).trimStart().toLowerCase().startsWith('prompt:'))
					.map((o) => o.id)
			);
			const answerIdSet = new Set(
				options
					.filter((o) => String(o.text).trimStart().toLowerCase().startsWith('answer:'))
					.map((o) => o.id)
			);

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

			const seenPrompts = new Set<string>();
			const normalized: string[] = [];
			for (const raw of this.selectedAnswers || []) {
				const pair = parsePair(raw);
				if (!pair) continue;
				if (!promptIdSet.has(pair.promptId) || !answerIdSet.has(pair.answerId)) continue;
				if (seenPrompts.has(pair.promptId)) continue;
				seenPrompts.add(pair.promptId);
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
		this.showSolution = !this.showSolution;
		this.solutionAutoRevealed = false;
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
		this.solutionAutoRevealed = false;
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
		let order = this.optionOrderCache.get(question._id);
		if (!order || order.length === 0) {
			const ids = originalOptions.map((o: QuestionOption) => o.id);
			const shuffled = this.generateShuffledIds(ids);
			this.optionOrderCache.set(question._id, shuffled);
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
		const activeQuestionIds = new Set(this.questions.map((q) => String(q._id)));
		for (const questionId of this.optionOrderCache.keys()) {
			if (!activeQuestionIds.has(questionId)) {
				this.optionOrderCache.delete(questionId);
			}
		}

		for (const question of this.questions) {
			const ids = (question.options || []).map((o: QuestionOption) => o.id);
			const existing = this.optionOrderCache.get(question._id);

			if (!existing || existing.length === 0) {
				this.optionOrderCache.set(question._id, this.generateShuffledIds(ids));
				continue;
			}

			const preserved = existing.filter((id) => ids.includes(id));
			const missing = ids.filter((id) => !preserved.includes(id));
			const randomizedMissing = missing.length > 1 ? this.generateShuffledIds(missing) : missing;

			this.optionOrderCache.set(question._id, [...preserved, ...randomizedMissing]);
		}
	}

	private resetAllOptionOrdersToOriginal() {
		this.optionOrderCache.clear();
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
