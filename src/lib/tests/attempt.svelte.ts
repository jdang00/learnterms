import type { FunctionReturnType } from 'convex/server';
import type { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { NavigatorItem } from '#lib/components/QuestionNavigatorSheet.svelte';
import { sanitizeHtml } from '#lib/utils/sanitizeHtml.js';
import { getErrorText } from '#lib/utils/errorHandling.js';

export type AttemptRunnerBundle = NonNullable<
	FunctionReturnType<typeof api.tests.attempts.getAttemptRunnerBundle>
>;
export type AttemptRunnerItem = AttemptRunnerBundle['items'][number];

export type LocalResponse = {
	selectedOptions: string[];
	eliminatedOptions: string[];
	textResponse?: string;
	isFlagged: boolean;
	timeSpentMs: number;
	visited: boolean;
};

type LocalCache = {
	version: 1;
	attemptId: string;
	classId: string;
	currentIndex: number;
	elapsedMs: number;
	responses: Record<string, LocalResponse>;
	pendingTimeDeltas: Record<string, number>;
	updatedAt: number;
};

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export type ResponseChange = {
	itemId: Id<'quizAttemptItems'>;
	selectedOptions: string[];
	textResponse: string;
	isFlagged: boolean;
	markVisited: boolean;
	timeSpentDeltaMs: number;
};

/** The backend calls the runner makes; injected so the state can run without Convex. */
export type AttemptIo = {
	patchResponses: (args: {
		attemptId: Id<'quizAttempts'>;
		elapsedMs: number;
		changes: ResponseChange[];
	}) => Promise<unknown>;
	submit: (args: { attemptId: Id<'quizAttempts'>; elapsedMs: number }) => Promise<unknown>;
	heartbeat: (args: { attemptId: Id<'quizAttempts'>; elapsedMs: number }) => Promise<unknown>;
};

export function isFitb(type: string) {
	return String(type || '').toLowerCase() === 'fill_in_the_blank';
}

export function isMatching(type: string) {
	return String(type || '').toLowerCase() === 'matching';
}

export function syncStatusIcon(status: string) {
	switch (status) {
		case 'synced':
			return 'text-success-ink';
		case 'syncing':
			return 'text-info-ink';
		case 'offline':
			return 'text-warning-ink';
		case 'error':
			return 'text-error-ink';
		default:
			return 'text-foreground/40';
	}
}

export function syncStatusLabel(status: string) {
	switch (status) {
		case 'synced':
			return 'Saved';
		case 'syncing':
			return 'Saving...';
		case 'offline':
			return 'Offline';
		case 'error':
			return 'Save failed';
		default:
			return 'Ready';
	}
}

function cacheKey(id: string) {
	return `lt:testAttempt:${id}`;
}

function getDefaultLocalResponse(item: AttemptRunnerItem): LocalResponse {
	return {
		selectedOptions: [...(item.response?.selectedOptions || [])],
		eliminatedOptions: [],
		textResponse: item.response?.textResponse ?? undefined,
		isFlagged: item.response?.isFlagged ?? false,
		timeSpentMs: item.response?.timeSpentMs ?? 0,
		visited: item.response?.visitedAt !== undefined
	};
}

/**
 * Local answers, timing and sync for one practice-test attempt. The route feeds it the live
 * bundle and drives the clock; everything else (cache, dirty tracking, flushing) lives here.
 */
export class AttemptRunnerState {
	initializedAttemptId = $state<string | null>(null);
	currentIndex = $state(0);
	responses = $state<Record<string, LocalResponse>>({});
	pendingTimeDeltas = $state<Record<string, number>>({});
	elapsedMsLocal = $state(0);
	syncStatus = $state<SyncStatus>('idle');
	syncError = $state<string | null>(null);
	submitError = $state<string | null>(null);
	isSubmitting = $state(false);
	autoSubmitTriggered = $state(false);
	/** Bumped when navigation should scroll the current question button into view. */
	scrollRequest = $state(0);

	private syncTimeout: number | null = null;
	private lastTickAt = 0;
	private readonly dirtyItemIds: Record<string, true> = {};
	private syncInFlight = false;
	private syncRequestedWhileInFlight = false;

	constructor(
		private readonly io: AttemptIo,
		private readonly source: {
			bundle: () => AttemptRunnerBundle | undefined;
			attemptId: () => Id<'quizAttempts'>;
		}
	) {}

	get bundle() {
		return this.source.bundle();
	}

	private get attemptId() {
		return this.source.attemptId();
	}

	private get inProgress() {
		const attempt = this.bundle?.attempt;
		return Boolean(attempt) && attempt?.status === 'in_progress';
	}

	// ── local cache ──────────────────────────────────────────────────────────
	private loadCache(id: string): LocalCache | null {
		if (typeof window === 'undefined') return null;
		try {
			const raw = window.localStorage.getItem(cacheKey(id));
			if (!raw) return null;
			const parsed = JSON.parse(raw) as LocalCache;
			if (parsed?.attemptId !== id || parsed?.version !== 1) return null;
			return parsed;
		} catch {
			return null;
		}
	}

	saveCache() {
		if (typeof window === 'undefined') return;
		const attempt = this.bundle?.attempt;
		if (!attempt?._id) return;
		const payload: LocalCache = {
			version: 1,
			attemptId: attempt._id,
			classId: attempt.classId,
			currentIndex: this.currentIndex,
			elapsedMs: this.elapsedMsLocal,
			responses: this.responses,
			pendingTimeDeltas: this.pendingTimeDeltas,
			updatedAt: Date.now()
		};
		try {
			window.localStorage.setItem(cacheKey(payload.attemptId), JSON.stringify(payload));
		} catch {
			// no-op
		}
	}

	private clearCache() {
		if (typeof window === 'undefined') return;
		window.localStorage.removeItem(cacheKey(String(this.attemptId)));
	}

	hydrateFromBundle() {
		const bundle = this.bundle;
		if (!bundle?.attempt || !bundle.items) return;
		if (this.initializedAttemptId === bundle.attempt._id) return;

		const serverResponses: Record<string, LocalResponse> = {};
		for (const item of bundle.items) {
			serverResponses[item._id] = getDefaultLocalResponse(item);
		}

		const cached = this.loadCache(bundle.attempt._id);
		const mergedResponses = serverResponses;
		let nextPendingDeltas: Record<string, number> = {};
		let nextCurrentIndex = 0;
		let nextElapsedMs = Math.max(bundle.attempt.elapsedMs ?? 0, 0);

		if (cached) {
			nextCurrentIndex = Math.min(
				Math.max(0, cached.currentIndex ?? 0),
				Math.max(bundle.items.length - 1, 0)
			);
			nextElapsedMs = Math.max(nextElapsedMs, cached.elapsedMs ?? 0);
			nextPendingDeltas = cached.pendingTimeDeltas ?? {};

			for (const [itemId, localResponse] of Object.entries(cached.responses ?? {})) {
				if (!serverResponses[itemId]) continue;
				const server = serverResponses[itemId];
				const hasLocalSelectedOptions = Object.prototype.hasOwnProperty.call(
					localResponse,
					'selectedOptions'
				);
				const hasLocalTextResponse = Object.prototype.hasOwnProperty.call(
					localResponse,
					'textResponse'
				);
				const serverSelected = server.selectedOptions ?? [];
				const selectedOptions = hasLocalSelectedOptions
					? (localResponse.selectedOptions ?? [])
					: serverSelected;
				mergedResponses[itemId] = {
					...server,
					selectedOptions: [...selectedOptions],
					eliminatedOptions: [...(localResponse.eliminatedOptions ?? [])],
					textResponse: hasLocalTextResponse ? localResponse.textResponse : server.textResponse,
					isFlagged: localResponse.isFlagged ?? server.isFlagged,
					visited: localResponse.visited || server.visited,
					timeSpentMs: Math.max(server.timeSpentMs ?? 0, localResponse.timeSpentMs ?? 0)
				};
				this.dirtyItemIds[itemId] = true;
			}
		}

		this.responses = mergedResponses;
		this.pendingTimeDeltas = nextPendingDeltas;
		this.currentIndex = nextCurrentIndex;
		this.elapsedMsLocal = nextElapsedMs;
		this.initializedAttemptId = bundle.attempt._id;
		this.saveCache();
	}

	// ── responses ────────────────────────────────────────────────────────────
	private markDirty(itemId: string) {
		this.dirtyItemIds[itemId] = true;
		this.saveCache();
		this.scheduleSync();
	}

	markVisited(itemId: string) {
		const existing = this.responses[itemId];
		if (!existing) return;
		if (existing.visited) return;
		this.responses = { ...this.responses, [itemId]: { ...existing, visited: true } };
		this.markDirty(itemId);
	}

	private setResponse(itemId: string, updater: (prev: LocalResponse) => LocalResponse) {
		const prev = this.responses[itemId];
		if (!prev) return;
		this.responses = { ...this.responses, [itemId]: updater(prev) };
		this.markDirty(itemId);
	}

	toggleOption(item: AttemptRunnerItem, optionId: string) {
		if (isFitb(item.question.type) || isMatching(item.question.type)) return;
		this.setResponse(item._id, (prev) => {
			const already = prev.selectedOptions.includes(optionId);
			return {
				...prev,
				selectedOptions: already
					? prev.selectedOptions.filter((id) => id !== optionId)
					: [...prev.selectedOptions, optionId]
			};
		});
	}

	clearAnswer(item: AttemptRunnerItem) {
		this.setResponse(item._id, (prev) => ({
			...prev,
			selectedOptions: [],
			eliminatedOptions: [],
			textResponse: undefined
		}));
	}

	toggleFlag(item: AttemptRunnerItem) {
		this.setResponse(item._id, (prev) => ({ ...prev, isFlagged: !prev.isFlagged }));
	}

	clearCurrent() {
		const item = this.getCurrentItem();
		if (item) this.clearAnswer(item);
	}

	toggleCurrentFlag() {
		const item = this.getCurrentItem();
		if (item) this.toggleFlag(item);
	}

	/** Keyboard digits 1-9 and 0 pick the matching option on the current question. */
	selectOptionByDigit(key: string) {
		const item = this.getCurrentItem();
		if (!item) return false;
		if (isFitb(item.question.type) || isMatching(item.question.type)) return false;
		const options = item.question.options || [];
		const idx = key === '0' ? 9 : parseInt(key, 10) - 1;
		if (idx < 0 || idx >= options.length) return false;
		const option = options[idx];
		if (option?.id) this.toggleOption(item, option.id);
		return true;
	}

	isAnswered(item: AttemptRunnerItem) {
		const r = this.responses[item._id];
		if (!r) return false;
		return isFitb(item.question.type)
			? String(r.textResponse ?? r.selectedOptions[0] ?? '').trim().length > 0
			: r.selectedOptions.length > 0;
	}

	// ── navigation ───────────────────────────────────────────────────────────
	getCurrentItem() {
		return this.bundle?.items?.[this.currentIndex] ?? null;
	}

	private moved() {
		this.saveCache();
		this.scrollRequest += 1;
	}

	nextQuestion() {
		const items = this.bundle?.items;
		if (!items) return;
		this.currentIndex = Math.min(this.currentIndex + 1, items.length - 1);
		this.moved();
	}

	previousQuestion() {
		this.currentIndex = Math.max(this.currentIndex - 1, 0);
		this.moved();
	}

	jumpToQuestion(index: number) {
		const len = this.bundle?.items?.length ?? 0;
		if (index < 0 || index >= len) return;
		this.currentIndex = index;
		this.moved();
	}

	// ── derived views ────────────────────────────────────────────────────────
	itemCount = $derived(this.bundle?.items?.length ?? 0);
	currentItem = $derived(this.getCurrentItem());
	currentResponse = $derived(this.currentItem ? this.responses[this.currentItem._id] : null);
	isLastQuestion = $derived(this.currentIndex >= (this.bundle?.items?.length ?? 1) - 1);

	remainingMs = $derived.by(() => {
		const attempt = this.bundle?.attempt;
		if (!attempt?.timeLimitSec) return null;
		return Math.max(0, attempt.timeLimitSec * 1000 - this.elapsedMsLocal);
	});

	answeredCount = $derived.by(() => {
		const items = this.bundle?.items ?? [];
		return items.filter((item) => {
			const r = this.responses[item._id];
			if (!r) return false;
			if (isFitb(item.question.type)) {
				return String(r.textResponse ?? r.selectedOptions[0] ?? '').trim().length > 0;
			}
			return r.selectedOptions.length > 0;
		}).length;
	});

	flaggedCount = $derived(Object.values(this.responses).filter((r) => r.isFlagged).length);
	unansweredCount = $derived(this.itemCount - this.answeredCount);

	navigatorItems: NavigatorItem[] = $derived(
		(this.bundle?.items ?? []).map((item) => ({
			id: item._id,
			status: this.isAnswered(item) ? 'answered' : 'unanswered',
			flagged: this.responses[item._id]?.isFlagged ?? false
		}))
	);

	currentSharedQuestion = $derived.by(() => {
		const item = this.currentItem;
		if (!item) return null;
		return {
			_id: item.questionId,
			type: item.question.type,
			stem: sanitizeHtml(item.question.stem),
			options: (item.question.options || []).map((option) => ({
				...option,
				text: sanitizeHtml(option.text)
			})),
			// Intentionally hidden in test mode to prevent in-session checking/reveal.
			correctAnswers: [] as string[]
		};
	});

	selectedCountForCurrentItem() {
		const item = this.currentItem;
		const resp = this.currentResponse;
		if (!item || !resp) return 0;
		if (isFitb(item.question.type)) {
			return String(resp.textResponse ?? resp.selectedOptions[0] ?? '').trim().length > 0 ? 1 : 0;
		}
		return resp.selectedOptions.length;
	}

	/** The shared quiz components expect the study-flow state shape; this maps it onto test mode. */
	uiAdapter = $derived.by(() => {
		// Touch response state so the adapter prop updates and shared components re-render.
		const item = this.currentItem;
		const response = item ? this.responses[item._id] : null;
		void response;
		// eslint-disable-next-line @typescript-eslint/no-this-alias -- the adapter's getters run outside the class
		const runner = this;

		return {
			get selectedAnswers() {
				const current = runner.getCurrentItem();
				return current ? [...(runner.responses[current._id]?.selectedOptions ?? [])] : [];
			},
			set selectedAnswers(next: string[]) {
				const current = runner.getCurrentItem();
				if (!current) return;
				const textValue = isFitb(current.question.type) ? String((next ?? [])[0] ?? '') : undefined;
				runner.setResponse(current._id, (prev) => ({
					...prev,
					selectedOptions: [...(next ?? [])],
					textResponse: isFitb(current.question.type) ? textValue || undefined : prev.textResponse
				}));
			},
			get eliminatedAnswers() {
				const current = runner.getCurrentItem();
				return current ? [...(runner.responses[current._id]?.eliminatedOptions ?? [])] : [];
			},
			set eliminatedAnswers(next: string[]) {
				const current = runner.getCurrentItem();
				if (!current) return;
				const nextEliminated = (next ?? []).filter((id, i, all) => all.indexOf(id) === i);
				runner.setResponse(current._id, (prev) => ({
					...prev,
					eliminatedOptions: nextEliminated,
					selectedOptions: (prev.selectedOptions ?? []).filter((id) => !nextEliminated.includes(id))
				}));
			},
			get showSolution() {
				return false;
			},
			set showSolution(_value: boolean) {
				// Results are only available after submit.
			},
			get solutionAutoRevealed() {
				return false;
			},
			scheduleSave() {
				runner.scheduleSync(250);
			},
			markCurrentQuestionInteracted() {
				const current = runner.getCurrentItem();
				if (current) runner.markVisited(current._id);
			},
			handleSolution() {
				// No in-test answer reveal.
			},
			checkFillInTheBlank() {
				// Submit-only mode in tests.
			},
			getOrderedOptions(
				question: Pick<AttemptRunnerItem['question'], 'options'> | null | undefined
			) {
				return question?.options || [];
			},
			toggleOption(optionId: string) {
				const current = runner.getCurrentItem();
				if (current && (runner.responses[current._id]?.eliminatedOptions ?? []).includes(optionId))
					return;
				if (current) runner.toggleOption(current, optionId);
			},
			toggleElimination(optionId: string) {
				const current = runner.getCurrentItem();
				if (!current) return;
				runner.setResponse(current._id, (prev) => {
					const eliminated = prev.eliminatedOptions ?? [];
					const has = eliminated.includes(optionId);
					const nextEliminated = has
						? eliminated.filter((id) => id !== optionId)
						: [...eliminated, optionId];
					return {
						...prev,
						eliminatedOptions: nextEliminated,
						selectedOptions: has
							? prev.selectedOptions
							: (prev.selectedOptions ?? []).filter((id) => id !== optionId)
					};
				});
			},
			isOptionSelected(optionId: string) {
				const current = runner.getCurrentItem();
				return current
					? (runner.responses[current._id]?.selectedOptions ?? []).includes(optionId)
					: false;
			},
			isOptionEliminated(_optionId: string) {
				const current = runner.getCurrentItem();
				return current
					? (runner.responses[current._id]?.eliminatedOptions ?? []).includes(_optionId)
					: false;
			},
			isCorrect() {
				return false;
			}
		};
	});

	// ── sync ─────────────────────────────────────────────────────────────────
	scheduleSync(delayMs = 800) {
		if (typeof window === 'undefined') return;
		if (this.syncTimeout !== null) clearTimeout(this.syncTimeout);
		this.syncTimeout = window.setTimeout(() => {
			void this.flushSync();
		}, delayMs);
	}

	async flushSync(force = false) {
		if (!this.inProgress) return;
		if (this.syncInFlight) {
			this.syncRequestedWhileInFlight = true;
			return;
		}
		if (!force && Object.keys(this.dirtyItemIds).length === 0) return;
		if (typeof navigator !== 'undefined' && !navigator.onLine) {
			this.syncStatus = 'offline';
			return;
		}

		const ids = Object.keys(this.dirtyItemIds);
		this.syncStatus = 'syncing';
		this.syncError = null;
		this.syncInFlight = true;

		try {
			const changes = ids
				.map((id): ResponseChange | null => {
					const r = this.responses[id];
					if (!r) return null;
					return {
						itemId: id as Id<'quizAttemptItems'>,
						selectedOptions: r.selectedOptions,
						textResponse: r.textResponse ?? '',
						isFlagged: r.isFlagged,
						markVisited: r.visited,
						timeSpentDeltaMs: this.pendingTimeDeltas[id] ?? 0
					};
				})
				.filter((change): change is ResponseChange => change !== null);

			if (changes.length > 0 || force) {
				await this.io.patchResponses({
					attemptId: this.attemptId,
					elapsedMs: this.elapsedMsLocal,
					changes
				});
			}

			for (const id of ids) delete this.dirtyItemIds[id];
			if (ids.length > 0) {
				const nextDeltas = { ...this.pendingTimeDeltas };
				for (const id of ids) delete nextDeltas[id];
				this.pendingTimeDeltas = nextDeltas;
			}
			this.saveCache();
			this.syncStatus = 'synced';
		} catch (error: unknown) {
			this.syncStatus = 'error';
			this.syncError = getErrorText(error) || 'Sync failed';
		} finally {
			this.syncInFlight = false;
			if (this.syncRequestedWhileInFlight) {
				this.syncRequestedWhileInFlight = false;
				this.scheduleSync(150);
			}
		}
	}

	private currentQuestionTick(deltaMs: number) {
		const item = this.currentItem;
		if (!item) return;
		const current = this.responses[item._id];
		if (!current) return;
		const boundedDeltaMs = Math.min(Math.max(0, deltaMs), 10_000);
		this.responses = {
			...this.responses,
			[item._id]: { ...current, timeSpentMs: current.timeSpentMs + boundedDeltaMs }
		};
		const nextAccumulatedDelta = (this.pendingTimeDeltas[item._id] ?? 0) + boundedDeltaMs;
		this.pendingTimeDeltas = { ...this.pendingTimeDeltas, [item._id]: nextAccumulatedDelta };
		this.dirtyItemIds[item._id] = true;
		if (nextAccumulatedDelta >= 5_000) this.scheduleSync(300);
	}

	startClock() {
		this.lastTickAt = Date.now();
	}

	/** One second of the test clock. Returns true when the time limit just ran out. */
	tick() {
		if (!this.inProgress) return false;
		const now = Date.now();
		const delta = Math.max(0, now - this.lastTickAt);
		this.lastTickAt = now;
		this.elapsedMsLocal += delta;
		this.currentQuestionTick(delta);
		this.saveCache();

		const remaining = this.remainingMs;
		if (remaining !== null && remaining <= 0 && !this.autoSubmitTriggered) {
			this.autoSubmitTriggered = true;
			return true;
		}
		return false;
	}

	heartbeat() {
		if (!this.inProgress) return;
		if (
			Object.keys(this.dirtyItemIds).length > 0 ||
			Object.keys(this.pendingTimeDeltas).length > 0
		) {
			void this.flushSync();
		}
		void this.io
			.heartbeat({ attemptId: this.attemptId, elapsedMs: this.elapsedMsLocal })
			.catch(() => {
				// no-op
			});
	}

	/** Flushes and submits; resolves true when the caller should navigate to the results. */
	async submitAttempt() {
		if (this.isSubmitting) return false;
		this.submitError = null;
		this.isSubmitting = true;
		try {
			await this.flushSync(true);
			await this.io.submit({ attemptId: this.attemptId, elapsedMs: this.elapsedMsLocal });
			this.clearCache();
			return true;
		} catch (error: unknown) {
			this.submitError =
				getErrorText(error) || 'Something went wrong while submitting. Please try again.';
			return false;
		} finally {
			this.isSubmitting = false;
		}
	}

	dispose() {
		if (this.syncTimeout !== null) clearTimeout(this.syncTimeout);
	}
}
