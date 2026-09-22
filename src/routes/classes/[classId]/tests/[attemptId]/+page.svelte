<script lang="ts">
	import { provideStudyToolContext } from '$lib/analytics/studyToolContext';
	import QuestionNotesTool from '$lib/components/question-notes/QuestionNotesTool.svelte';
	import CalculatorTool from '$lib/components/calculator/CalculatorTool.svelte';
	import { sidePanel } from '$lib/components/side-panel/state.svelte';
	import { useClerkContext } from 'svelte-clerk/client';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '../../../../../convex/_generated/api';
	import type { Id } from '../../../../../convex/_generated/dataModel';
	import Matching from '$lib/components/Matching.svelte';
	import AnswerOptions from '$lib/components/AnswerOptions.svelte';
	import FillInTheBlank from '$lib/components/FillInTheBlank.svelte';
	import QuestionAttachmentsSidebar from '$lib/components/QuestionAttachmentsSidebar.svelte';
	import QuestionMediaStrip from '$lib/components/QuestionMediaStrip.svelte';
	import MobileStudyBar from '$lib/components/MobileStudyBar.svelte';
	import QuestionNavigatorSheet, {
		type NavigatorItem
	} from '$lib/components/QuestionNavigatorSheet.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import { cameFrom } from '$lib/utils/backNavigation';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import { getErrorText } from '$lib/utils/errorHandling';
	import { slide } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import {
		PanelRight,
		ChevronLeft,
		Clock,
		Flag,
		CheckCircle2,
		Wifi,
		WifiOff,
		Save,
		Send,
		ArrowLeft,
		ArrowRight,
		Info,
		Calculator,
		StickyNote,
		Eraser,
		ToolCase
	} from 'lucide-svelte';

	type LocalResponse = {
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

	type AttemptRunnerBundle = NonNullable<
		FunctionReturnType<typeof api.customQuiz.getAttemptRunnerBundle>
	>;
	type AttemptRunnerItem = AttemptRunnerBundle['items'][number];

	const client = useConvexClient();
	const clerk = useClerkContext();
	const classId = $derived(page.params.classId as Id<'class'>);
	const attemptId = $derived(page.params.attemptId as Id<'quizAttempts'>);

	const runnerQuery = useQuery(api.customQuiz.getAttemptRunnerBundle, () =>
		attemptId ? { attemptId } : 'skip'
	);

	async function goBackToClasses() {
		if (cameFrom('/classes')) history.back();
		else await goto(resolve('/classes'), { state: { classId } });
	}

	let initializedAttemptId = $state<string | null>(null);
	let currentIndex = $state(0);
	let responses = $state<Record<string, LocalResponse>>({});
	let pendingTimeDeltas = $state<Record<string, number>>({});
	let elapsedMsLocal = $state(0);
	let syncStatus = $state<'idle' | 'syncing' | 'synced' | 'offline' | 'error'>('idle');
	let syncError = $state<string | null>(null);
	let submitError = $state<string | null>(null);
	let isSubmitting = $state(false);
	let autoSubmitTriggered = $state(false);
	let hideSidebar = $state(false);
	let showSubmitModal = $state(false);
	let navigatorOpen = $state(false);
	let toolsOpen = $state(false);

	let syncTimeout: number | null = null;
	let tickerHandle: number | null = null;
	let heartbeatHandle: number | null = null;
	let lastTickAt = 0;
	const dirtyItemIds: Record<string, true> = {};
	let syncInFlight = false;
	let syncRequestedWhileInFlight = false;
	let questionButtons = $state<HTMLButtonElement[]>([]);

	function cacheKey(id: string) {
		return `lt:testAttempt:${id}`;
	}

	function loadCache(id: string): LocalCache | null {
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

	function saveCache() {
		if (typeof window === 'undefined') return;
		if (!runnerQuery.data?.attempt?._id) return;
		const payload: LocalCache = {
			version: 1,
			attemptId: runnerQuery.data.attempt._id,
			classId: runnerQuery.data.attempt.classId,
			currentIndex,
			elapsedMs: elapsedMsLocal,
			responses,
			pendingTimeDeltas,
			updatedAt: Date.now()
		};
		try {
			window.localStorage.setItem(cacheKey(payload.attemptId), JSON.stringify(payload));
		} catch {
			// no-op
		}
	}

	function isFitb(type: string) {
		return String(type || '').toLowerCase() === 'fill_in_the_blank';
	}

	function isMatching(type: string) {
		return String(type || '').toLowerCase() === 'matching';
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

	function markDirty(itemId: string) {
		dirtyItemIds[itemId] = true;
		saveCache();
		scheduleSync();
	}

	function markVisited(itemId: string) {
		const existing = responses[itemId];
		if (!existing) return;
		if (existing.visited) return;
		responses = {
			...responses,
			[itemId]: { ...existing, visited: true }
		};
		markDirty(itemId);
	}

	function setResponse(itemId: string, updater: (prev: LocalResponse) => LocalResponse) {
		const prev = responses[itemId];
		if (!prev) return;
		responses = {
			...responses,
			[itemId]: updater(prev)
		};
		markDirty(itemId);
	}

	function toggleOption(item: AttemptRunnerItem, optionId: string) {
		if (isFitb(item.question.type) || isMatching(item.question.type)) return;
		setResponse(item._id, (prev) => {
			const already = prev.selectedOptions.includes(optionId);
			return {
				...prev,
				selectedOptions: already
					? prev.selectedOptions.filter((id) => id !== optionId)
					: [...prev.selectedOptions, optionId]
			};
		});
	}

	function clearAnswer(item: AttemptRunnerItem) {
		setResponse(item._id, (prev) => ({
			...prev,
			selectedOptions: [],
			eliminatedOptions: [],
			textResponse: undefined
		}));
	}

	function toggleFlag(item: AttemptRunnerItem) {
		setResponse(item._id, (prev) => ({
			...prev,
			isFlagged: !prev.isFlagged
		}));
	}

	function getCurrentItem() {
		return runnerQuery.data?.items?.[currentIndex] ?? null;
	}

	function nextQuestion() {
		if (!runnerQuery.data?.items) return;
		currentIndex = Math.min(currentIndex + 1, runnerQuery.data.items.length - 1);
		saveCache();
		scrollToCurrentButton();
	}

	function previousQuestion() {
		currentIndex = Math.max(currentIndex - 1, 0);
		saveCache();
		scrollToCurrentButton();
	}

	function jumpToQuestion(index: number) {
		const len = runnerQuery.data?.items?.length ?? 0;
		if (index < 0 || index >= len) return;
		currentIndex = index;
		saveCache();
		scrollToCurrentButton();
	}

	function scrollToCurrentButton() {
		requestAnimationFrame(() => {
			if (questionButtons[currentIndex]) {
				questionButtons[currentIndex].scrollIntoView({
					behavior: 'smooth',
					block: 'nearest',
					inline: 'center'
				});
			}
		});
	}

	function formatDuration(ms: number) {
		const totalSec = Math.max(0, Math.floor(ms / 1000));
		const hours = Math.floor(totalSec / 3600);
		const minutes = Math.floor((totalSec % 3600) / 60);
		const seconds = totalSec % 60;
		if (hours > 0) {
			return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
		}
		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	const remainingMs = $derived.by(() => {
		const attempt = runnerQuery.data?.attempt;
		if (!attempt?.timeLimitSec) return null;
		return Math.max(0, attempt.timeLimitSec * 1000 - elapsedMsLocal);
	});

	const answeredCount = $derived.by(() => {
		const items = runnerQuery.data?.items ?? [];
		return items.filter((item) => {
			const r = responses[item._id];
			if (!r) return false;
			if (isFitb(item.question.type)) {
				return String(r.textResponse ?? r.selectedOptions[0] ?? '').trim().length > 0;
			}
			return r.selectedOptions.length > 0;
		}).length;
	});

	const flaggedCount = $derived.by(() => {
		return Object.values(responses).filter((r) => r.isFlagged).length;
	});

	function isAnswered(item: AttemptRunnerItem) {
		const r = responses[item._id];
		if (!r) return false;
		return isFitb(item.question.type)
			? String(r.textResponse ?? r.selectedOptions[0] ?? '').trim().length > 0
			: r.selectedOptions.length > 0;
	}

	const navigatorItems: NavigatorItem[] = $derived(
		(runnerQuery.data?.items ?? []).map((item) => ({
			id: item._id,
			status: isAnswered(item) ? 'answered' : 'unanswered',
			flagged: responses[item._id]?.isFlagged ?? false
		}))
	);
	const isLastQuestion = $derived(currentIndex >= (runnerQuery.data?.items?.length ?? 1) - 1);

	// Swipe the question sideways to move between questions on touch screens.
	let swipe: { x: number; y: number; time: number } | null = null;
	function swipeStart(event: TouchEvent) {
		const touch = event.touches[0];
		const target = event.target as Element;
		const nearEdge = touch.clientX < 24 || touch.clientX > window.innerWidth - 24;
		swipe =
			event.touches.length === 1 &&
			!nearEdge &&
			!target.closest('[data-option], input, textarea, [contenteditable], pre, table, button')
				? { x: touch.clientX, y: touch.clientY, time: event.timeStamp }
				: null;
	}
	function swipeEnd(event: TouchEvent) {
		if (!swipe) return;
		const touch = event.changedTouches[0];
		const dx = touch.clientX - swipe.x;
		const dy = touch.clientY - swipe.y;
		const quick = event.timeStamp - swipe.time < 600;
		swipe = null;
		if (!quick || Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.5) return;
		if (window.getSelection()?.toString()) return;
		if (dx < 0) nextQuestion();
		else previousQuestion();
	}

	const currentItem = $derived(getCurrentItem());
	provideStudyToolContext(() => ({
		surface: 'test_attempt',
		classId,
		attemptId,
		questionId: currentItem?.questionId,
		moduleId: currentItem?.moduleId,
		questionType: currentItem?.question.type
	}));
	const currentResponse = $derived(currentItem ? responses[currentItem._id] : null);
	const currentSharedQuestion = $derived.by(() => {
		const item = currentItem;
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

	const testQuizUiAdapter = $derived.by(() => {
		// Touch response state so the adapter prop updates and shared components re-render.
		const item = currentItem;
		const response = item ? responses[item._id] : null;
		void response;

		return {
			get selectedAnswers() {
				const current = getCurrentItem();
				return current ? [...(responses[current._id]?.selectedOptions ?? [])] : [];
			},
			set selectedAnswers(next: string[]) {
				const current = getCurrentItem();
				if (!current) return;
				const textValue = isFitb(current.question.type) ? String((next ?? [])[0] ?? '') : undefined;
				setResponse(current._id, (prev) => ({
					...prev,
					selectedOptions: [...(next ?? [])],
					textResponse: isFitb(current.question.type) ? textValue || undefined : prev.textResponse
				}));
			},
			get eliminatedAnswers() {
				const current = getCurrentItem();
				return current ? [...(responses[current._id]?.eliminatedOptions ?? [])] : [];
			},
			set eliminatedAnswers(next: string[]) {
				const current = getCurrentItem();
				if (!current) return;
				const nextEliminated = [...new Set(next ?? [])];
				setResponse(current._id, (prev) => ({
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
				scheduleSync(250);
			},
			markCurrentQuestionInteracted() {
				const current = getCurrentItem();
				if (current) markVisited(current._id);
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
				const current = getCurrentItem();
				if (current && (responses[current._id]?.eliminatedOptions ?? []).includes(optionId)) return;
				if (current) toggleOption(current, optionId);
			},
			toggleElimination(optionId: string) {
				const current = getCurrentItem();
				if (!current) return;
				setResponse(current._id, (prev) => {
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
				const current = getCurrentItem();
				return current ? (responses[current._id]?.selectedOptions ?? []).includes(optionId) : false;
			},
			isOptionEliminated(_optionId: string) {
				const current = getCurrentItem();
				return current
					? (responses[current._id]?.eliminatedOptions ?? []).includes(_optionId)
					: false;
			},
			isCorrect() {
				return false;
			}
		};
	});

	function scheduleSync(delayMs = 800) {
		if (typeof window === 'undefined') return;
		if (syncTimeout !== null) {
			clearTimeout(syncTimeout);
		}
		syncTimeout = window.setTimeout(() => {
			void flushSync();
		}, delayMs);
	}

	async function flushSync(force = false) {
		if (!runnerQuery.data?.attempt || runnerQuery.data.attempt.status !== 'in_progress') return;
		if (syncInFlight) {
			syncRequestedWhileInFlight = true;
			return;
		}
		if (!force && Object.keys(dirtyItemIds).length === 0) return;
		if (typeof navigator !== 'undefined' && !navigator.onLine) {
			syncStatus = 'offline';
			return;
		}

		const ids = Object.keys(dirtyItemIds);

		syncStatus = 'syncing';
		syncError = null;
		syncInFlight = true;

		try {
			const changes = ids
				.map((id) => {
					const r = responses[id];
					if (!r) return null;
					return {
						itemId: id as Id<'quizAttemptItems'>,
						selectedOptions: r.selectedOptions,
						textResponse: r.textResponse ?? '',
						isFlagged: r.isFlagged,
						markVisited: r.visited,
						timeSpentDeltaMs: pendingTimeDeltas[id] ?? 0
					};
				})
				.filter(
					(
						change
					): change is {
						itemId: Id<'quizAttemptItems'>;
						selectedOptions: string[];
						textResponse: string;
						isFlagged: boolean;
						markVisited: boolean;
						timeSpentDeltaMs: number;
					} => change !== null
				);

			if (changes.length > 0 || force) {
				await client.mutation(api.customQuiz.patchAttemptResponses, {
					attemptId,
					elapsedMs: elapsedMsLocal,
					changes
				});
			}

			for (const id of ids) {
				delete dirtyItemIds[id];
			}
			if (ids.length > 0) {
				const nextDeltas = { ...pendingTimeDeltas };
				for (const id of ids) delete nextDeltas[id];
				pendingTimeDeltas = nextDeltas;
			}
			saveCache();
			syncStatus = 'synced';
		} catch (error: unknown) {
			syncStatus = 'error';
			syncError = getErrorText(error) || 'Sync failed';
		} finally {
			syncInFlight = false;
			if (syncRequestedWhileInFlight) {
				syncRequestedWhileInFlight = false;
				scheduleSync(150);
			}
		}
	}

	function hydrateFromBundle() {
		const bundle = runnerQuery.data;
		if (!bundle?.attempt || !bundle.items) return;
		if (initializedAttemptId === bundle.attempt._id) return;

		const serverResponses: Record<string, LocalResponse> = {};
		for (const item of bundle.items) {
			serverResponses[item._id] = getDefaultLocalResponse(item);
		}

		const cached = loadCache(bundle.attempt._id);
		let mergedResponses = serverResponses;
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
				dirtyItemIds[itemId] = true;
			}
		}

		responses = mergedResponses;
		pendingTimeDeltas = nextPendingDeltas;
		currentIndex = nextCurrentIndex;
		elapsedMsLocal = nextElapsedMs;
		initializedAttemptId = bundle.attempt._id;
		saveCache();
	}

	function currentQuestionTick(deltaMs: number) {
		const item = currentItem;
		if (!item) return;
		const current = responses[item._id];
		if (!current) return;
		const boundedDeltaMs = Math.min(Math.max(0, deltaMs), 10_000);
		responses = {
			...responses,
			[item._id]: {
				...current,
				timeSpentMs: current.timeSpentMs + boundedDeltaMs
			}
		};
		const nextAccumulatedDelta = (pendingTimeDeltas[item._id] ?? 0) + boundedDeltaMs;
		pendingTimeDeltas = {
			...pendingTimeDeltas,
			[item._id]: nextAccumulatedDelta
		};
		dirtyItemIds[item._id] = true;
		if (nextAccumulatedDelta >= 5_000) {
			scheduleSync(300);
		}
	}

	async function submitAttempt(auto = false) {
		if (isSubmitting) return;
		submitError = null;
		isSubmitting = true;
		try {
			await flushSync(true);
			await client.mutation(api.customQuiz.submitAttempt, {
				attemptId,
				elapsedMs: elapsedMsLocal
			});
			if (typeof window !== 'undefined') {
				window.localStorage.removeItem(cacheKey(String(attemptId)));
			}
			const resultsHref = resolve('/classes/[classId]/tests/[attemptId]/results', {
				classId,
				attemptId
			});
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			await goto(auto ? `${resultsHref}?autoSubmit=1` : resultsHref);
		} catch (error: unknown) {
			submitError =
				getErrorText(error) || 'Something went wrong while submitting. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	function selectedCountForCurrentItem() {
		const item = currentItem;
		const resp = currentResponse;
		if (!item || !resp) return 0;
		if (isFitb(item.question.type)) {
			return String(resp.textResponse ?? resp.selectedOptions[0] ?? '').trim().length > 0 ? 1 : 0;
		}
		return resp.selectedOptions.length;
	}

	function syncStatusIcon(status: string) {
		switch (status) {
			case 'synced':
				return 'text-success';
			case 'syncing':
				return 'text-info';
			case 'offline':
				return 'text-warning';
			case 'error':
				return 'text-error';
			default:
				return 'text-base-content/40';
		}
	}

	function syncStatusLabel(status: string) {
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

	$effect(() => {
		hydrateFromBundle();
	});

	$effect(() => {
		const item = currentItem;
		if (item) {
			markVisited(item._id);
		}
	});

	function handleRunnerKeydown(event: KeyboardEvent) {
		if (
			showSubmitModal ||
			event.defaultPrevented ||
			(event.target instanceof Element && event.target.closest('dialog'))
		)
			return;
		if (
			!['Tab', 'ArrowLeft', 'ArrowRight'].includes(event.key) &&
			(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
		) {
			return;
		}

		const item = currentItem;
		switch (event.key) {
			case 'ArrowRight':
				event.preventDefault();
				nextQuestion();
				break;
			case 'ArrowLeft':
				event.preventDefault();
				previousQuestion();
				break;
			case 'Tab':
				// Main quiz reveals rationale on Tab; test mode is submit-only.
				break;
			case 'Escape':
				event.preventDefault();
				if (item) clearAnswer(item);
				break;
			case 'f':
			case 'F':
				event.preventDefault();
				if (item) toggleFlag(item);
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
				if (!item) break;
				if (isFitb(item.question.type) || isMatching(item.question.type)) break;
				const options = item.question.options || [];
				const idx = event.key === '0' ? 9 : parseInt(event.key, 10) - 1;
				if (idx >= 0 && idx < options.length) {
					event.preventDefault();
					const option = options[idx];
					if (option?.id) toggleOption(item, option.id);
				}
				break;
			}
		}
	}

	onMount(() => {
		const onVisibility = () => {
			if (document.visibilityState === 'hidden') {
				void flushSync(true);
			}
		};
		const onPageHide = () => {
			void flushSync(true);
		};
		document.addEventListener('visibilitychange', onVisibility);
		window.addEventListener('pagehide', onPageHide);
		document.addEventListener('keydown', handleRunnerKeydown);

		lastTickAt = Date.now();
		tickerHandle = window.setInterval(() => {
			const bundle = runnerQuery.data;
			if (!bundle?.attempt || bundle.attempt.status !== 'in_progress') return;
			const now = Date.now();
			const delta = Math.max(0, now - lastTickAt);
			lastTickAt = now;
			elapsedMsLocal += delta;
			currentQuestionTick(delta);
			saveCache();

			const remaining = remainingMs;
			if (remaining !== null && remaining <= 0 && !autoSubmitTriggered) {
				autoSubmitTriggered = true;
				void submitAttempt(true);
			}
		}, 1000);

		heartbeatHandle = window.setInterval(() => {
			const bundle = runnerQuery.data;
			if (!bundle?.attempt || bundle.attempt.status !== 'in_progress') return;
			if (Object.keys(dirtyItemIds).length > 0 || Object.keys(pendingTimeDeltas).length > 0) {
				void flushSync();
			}
			void client
				.mutation(api.customQuiz.heartbeatAttempt, {
					attemptId,
					elapsedMs: elapsedMsLocal
				})
				.catch(() => {
					// no-op
				});
		}, 5000);

		return () => {
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('pagehide', onPageHide);
			document.removeEventListener('keydown', handleRunnerKeydown);
			if (syncTimeout !== null) clearTimeout(syncTimeout);
			if (tickerHandle !== null) clearInterval(tickerHandle);
			if (heartbeatHandle !== null) clearInterval(heartbeatHandle);
		};
	});
</script>

<div class="flex flex-col h-dvh lg:h-[calc(100dvh-4rem)]">
	{#if runnerQuery.isLoading}
		<div class="flex-1 flex items-center justify-center">
			<div class="text-center">
				<span class="loading loading-spinner loading-lg text-primary"></span>
				<p class="text-base-content/60 mt-3">Loading your test...</p>
			</div>
		</div>
	{:else if runnerQuery.error}
		<div class="flex-1 flex items-center justify-center p-4">
			<div class="alert alert-error rounded-2xl max-w-md">
				<span>{runnerQuery.error.toString()}</span>
			</div>
		</div>
	{:else if runnerQuery.data}
		{#if runnerQuery.data.attempt.status !== 'in_progress'}
			<div class="flex-1 flex items-center justify-center p-4">
				<div class="card bg-base-100 border border-base-300 rounded-2xl shadow-xs max-w-md w-full">
					<div class="card-body text-center">
						<CheckCircle2 class="mx-auto text-success mb-2" size={48} />
						<h1 class="card-title justify-center text-xl">Test Complete</h1>
						<p class="text-sm text-base-content/60 mt-1">This test has already been submitted.</p>
						<div class="card-actions justify-center mt-4">
							<a
								class="btn btn-primary rounded-full"
								href={resolve('/classes/[classId]/tests/[attemptId]/results', {
									classId,
									attemptId
								})}
							>
								View Results
							</a>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div
				class="flex flex-col lg:flex-row bg-base-100 h-full overflow-hidden lg:p-4 lg:gap-8 transition-all duration-500 ease-in-out"
				transition:slide={{ duration: 400, easing: cubicInOut, axis: 'y' }}
			>
				<!-- Sidebar -->
				<div
					class="hidden lg:flex lg:flex-col relative overflow-y-auto overflow-x-hidden border border-base-300 rounded-4xl p-3 px-4 transition-all duration-200 ease-out bg-base-100/80 backdrop-blur-md shadow-lg shrink-0 h-full
					{hideSidebar ? 'w-[72px]' : 'w-[min(22rem,30vw)] xl:w-[min(24rem,28vw)]'}"
				>
					<button
						class="btn btn-ghost btn-square btn-sm rounded-full w-9 h-9 absolute top-6 left-5"
						onclick={() => (hideSidebar = !hideSidebar)}
						aria-label="Toggle sidebar"
					>
						<PanelRight
							size={18}
							class="transition-transform duration-300 {hideSidebar ? 'rotate-180' : ''}"
						/>
					</button>

					{#if !hideSidebar}
						<div class="p-4 md:p-5 lg:p-6 pt-12 mt-8">
							<h4 class="font-bold text-sm tracking-wide text-secondary -ms-6">
								<button
									type="button"
									class="btn btn-ghost font-bold rounded-full"
									onclick={goBackToClasses}
								>
									<ChevronLeft size={16} />
									{runnerQuery.data.attempt.className}
								</button>
							</h4>
							<h2 class="font-semibold text-2xl mt-2 flex items-start gap-3 min-w-0">
								<span class="text-2xl shrink-0">📝</span>
								<span class="break-words hyphens-auto overflow-hidden">Test Mode</span>
							</h2>
							<p class="text-base-content/60 mt-2 text-sm">
								Answer all questions, then submit to see your score.
							</p>

							<div class="mt-6">
								<p class="text-base-content/60 mb-2">
									{answeredCount} of {runnerQuery.data.items.length} answered
								</p>
								<progress
									class="progress progress-primary w-full transition-colors"
									value={answeredCount}
									max={runnerQuery.data.items.length}
								></progress>
							</div>

							<div class="grid grid-cols-2 gap-2 text-sm mt-5">
								<div class="rounded-xl border border-base-300 p-3">
									<div class="text-xs text-base-content/50">Answered</div>
									<div class="font-bold text-lg">
										{answeredCount}<span class="text-base-content/40 text-sm font-normal">
											/ {runnerQuery.data.items.length}</span
										>
									</div>
								</div>
								<div class="rounded-xl border border-base-300 p-3">
									<div class="text-xs text-base-content/50 flex items-center gap-1">
										<Flag size={10} />
										Flagged
									</div>
									<div class="font-bold text-lg {flaggedCount > 0 ? 'text-warning' : ''}">
										{flaggedCount}
									</div>
								</div>
							</div>
						</div>

						<div class="flex flex-col justify-center m-4">
							<div class="card bg-base-100 shadow-xl rounded-2xl">
								<div class="card-body p-4">
									<div class="flex items-center gap-2 mb-1">
										<Clock size={14} class="text-base-content/50" />
										<span class="text-xs uppercase tracking-wide text-base-content/50">Timer</span>
									</div>
									<div class="text-3xl font-bold tabular-nums">
										{formatDuration(elapsedMsLocal)}
									</div>
									{#if remainingMs !== null}
										<div
											class="text-sm mt-1 {remainingMs <= 60_000
												? 'text-error font-semibold animate-pulse'
												: 'text-base-content/60'}"
										>
											{remainingMs <= 60_000 ? 'Hurry! ' : ''}{formatDuration(remainingMs)} remaining
										</div>
									{:else}
										<div class="text-xs mt-1 text-base-content/40">No time limit</div>
									{/if}
								</div>
							</div>

							<div class="flex items-center justify-center gap-2 mt-4 text-xs">
								{#if syncStatus === 'offline'}
									<WifiOff size={12} class="text-warning" />
								{:else}
									<Wifi size={12} class={syncStatusIcon(syncStatus)} />
								{/if}
								<span class={syncStatusIcon(syncStatus)}>{syncStatusLabel(syncStatus)}</span>
							</div>
							{#if syncError}
								<div class="text-error text-xs text-center mt-1">{syncError}</div>
							{/if}

							<QuestionAttachmentsSidebar
								questionId={currentItem?.questionId}
								showSolution={false}
								solutionOnlyBehavior="hide"
								showHiddenNote={true}
							/>
						</div>
					{:else}
						<div class="mt-16 justify-self-center flex flex-col items-center space-y-4 ms-1">
							<button
								type="button"
								class="group flex items-center justify-center font-bold text-secondary-content bg-secondary text-center w-full rounded-full transition-colors"
								onclick={goBackToClasses}
							>
								<span class="group-hover:hidden">📝</span>
								<span class="hidden group-hover:inline-flex items-center justify-center"
									><ChevronLeft size={24} /></span
								>
							</button>

							<div class="text-center">
								<div class="text-xs font-bold tabular-nums">{formatDuration(elapsedMsLocal)}</div>
								{#if remainingMs !== null}
									<div class="text-[10px] text-base-content/50 tabular-nums">
										{formatDuration(remainingMs)}
									</div>
								{/if}
							</div>

							<div
								class="radial-progress text-primary text-xs bg-base-300"
								style="--value:{Math.round(
									(answeredCount / Math.max(1, runnerQuery.data?.items?.length ?? 1)) * 100
								)}; --size:3rem; --thickness: 3px;"
								role="progressbar"
							>
								{answeredCount}
							</div>

							<div class="border-t border-base-300 w-full my-2"></div>

							<div class="flex flex-col items-center text-xs text-base-content/50 gap-1">
								<Wifi size={12} class={syncStatusIcon(syncStatus)} />
							</div>

							<QuestionAttachmentsSidebar
								questionId={currentItem?.questionId}
								showSolution={false}
								solutionOnlyBehavior="hide"
								collapsed={true}
							/>
						</div>
					{/if}
				</div>

				<MobileStudyBar
					title={runnerQuery.data.attempt.className}
					emoji="📝"
					subtitle="Question {currentIndex + 1} of {runnerQuery.data.items.length}"
					backLabel="Leave test"
					onback={goBackToClasses}
					onnavigate={() => (navigatorOpen = true)}
				>
					{#snippet trailing()}
						<span
							class="flex shrink-0 items-center gap-1 px-2 text-sm font-semibold tabular-nums {remainingMs !==
								null && remainingMs <= 60_000
								? 'text-error'
								: ''}"
							role="timer"
							aria-label={remainingMs !== null ? 'Time remaining' : 'Time elapsed'}
						>
							<Clock size={14} class="text-base-content/50" />
							{formatDuration(remainingMs ?? elapsedMsLocal)}
						</span>
					{/snippet}
					{#snippet tools()}
						<button
							type="button"
							class="btn btn-ghost btn-circle size-11 shrink-0 text-base-content/70"
							aria-label="Tools"
							aria-haspopup="dialog"
							onclick={() => (toolsOpen = true)}
						>
							<ToolCase size={20} />
						</button>
					{/snippet}
				</MobileStudyBar>

				<!-- Main content area -->
				<div
					class="w-full lg:flex-1 lg:min-w-0 flex flex-col max-w-full lg:max-w-none overflow-y-auto overscroll-contain grow min-h-0 h-full px-1 md:px-3 lg:px-0 pb-32 md:pb-36 lg:pb-48 relative"
				>
					<div class="hidden justify-end pb-2 lg:flex">
						{#if clerk.user && currentItem}<button
								type="button"
								class="btn btn-sm rounded-full {sidePanel.current === 'notes'
									? 'btn-soft btn-info'
									: 'btn-ghost'}"
								aria-pressed={sidePanel.current === 'notes'}
								onclick={() => sidePanel.toggle('notes')}
								><StickyNote size={18} /><span class="hidden sm:inline">Notes</span></button
							>{/if}
						<button
							type="button"
							class="btn btn-sm rounded-full {sidePanel.current === 'calculator'
								? 'btn-soft btn-info'
								: 'btn-ghost'}"
							aria-pressed={sidePanel.current === 'calculator'}
							onclick={() => sidePanel.toggle('calculator')}
							><Calculator size={18} /><span class="hidden sm:inline">Calculator</span></button
						>
					</div>
					<!-- Horizontal question navigator (matches QuizNavigation style) -->
					<div
						class="hidden lg:flex flex-row w-full overflow-x-auto overflow-y-hidden whitespace-nowrap space-x-4 relative items-center border border-base-300 px-6 py-3 rounded-4xl h-20 min-h-20 max-h-20 flex-none"
					>
						{#each runnerQuery.data.items as item, index (item._id)}
							{@const r = responses[item._id]}
							{@const answered = r
								? isFitb(item.question.type)
									? String(r.textResponse ?? r.selectedOptions[0] ?? '').trim().length > 0
									: r.selectedOptions.length > 0
								: false}
							<div class="indicator">
								{#if r?.isFlagged}
									<span
										class="indicator-item indicator-start badge badge-warning badge-xs -translate-x-1/4 -translate-y-1/4 z-[1]"
									></span>
								{/if}
								<button
									bind:this={questionButtons[index]}
									class="btn btn-circle btn-md btn-soft {index === currentIndex
										? 'btn-primary'
										: answered
											? 'btn-accent'
											: 'btn-outline'}"
									onclick={() => jumpToQuestion(index)}
									title={`Question ${index + 1}`}
								>
									{index + 1}
								</button>
							</div>
						{/each}
					</div>

					<!-- Question content -->
					{#if currentItem && currentResponse}
						<!-- Swiping sideways is a shortcut for the previous/next buttons. -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="sm:text-lg lg:text-xl p-3 sm:p-4"
							ontouchstart={swipeStart}
							ontouchend={swipeEnd}
						>
							<div class="hidden md:flex flex-row justify-between items-start mb-1">
								<div class="text-xs text-base-content/40 font-medium">
									Question {currentIndex + 1} of {runnerQuery.data.items.length}
								</div>
								<div class="flex items-center gap-2">
									<button
										class="btn btn-sm btn-circle {currentResponse?.isFlagged
											? 'btn-warning'
											: 'btn-warning btn-soft'}"
										onclick={() => toggleFlag(currentItem)}
										aria-label={currentResponse?.isFlagged ? 'Remove flag' : 'Flag for review'}
										title={currentResponse?.isFlagged ? 'Remove flag' : 'Flag for review'}
									>
										<Flag size={16} />
									</button>
								</div>
							</div>

							{#if !isFitb(currentItem.question.type)}
								<div
									class="text-base sm:text-xl leading-tight tiptap-content font-medium ms-2 mt-3"
								>
									{@html sanitizeHtml(currentItem.question.stem)}
								</div>
							{/if}

							<QuestionMediaStrip questionId={currentItem.questionId} />

							{#if isFitb(currentItem.question.type)}
								{#if currentSharedQuestion}
									<FillInTheBlank
										qs={testQuizUiAdapter}
										currentlySelected={currentSharedQuestion}
										submitOnly={true}
										allowSolution={false}
										showAnswerPanel={false}
										showRevealHint={false}
									/>
								{/if}
							{:else if isMatching(currentItem.question.type)}
								<div class="mt-5 space-y-3 ms-2">
									<div class="text-xs text-base-content/50 font-medium">
										Match each prompt to one unique answer.
									</div>
									{#if currentSharedQuestion}
										<Matching
											qs={testQuizUiAdapter}
											currentlySelected={currentSharedQuestion}
											allowSolution={false}
											allowClear={true}
										/>
									{/if}
								</div>
							{:else}
								<div
									class="text-base-content/60 font-medium text-base sm:text-lg leading-tight my-3 ms-2"
								>
									Select {currentItem.question.correctAnswerCount ?? 'all that apply'}.
								</div>
								<div class="text-xs text-base-content/45 ms-2 mb-2">
									Selected {selectedCountForCurrentItem()}
									{#if currentItem.question.correctAnswerCount}
										<span> / {currentItem.question.correctAnswerCount}</span>
									{/if}
								</div>
								{#if currentSharedQuestion}
									<AnswerOptions
										qs={testQuizUiAdapter}
										currentlySelected={currentSharedQuestion}
										allowElimination={true}
									/>
								{/if}
							{/if}
						</div>

						{#if submitError}
							<div class="alert alert-error rounded-full mx-4 mt-2">
								<span class="text-sm">{submitError}</span>
							</div>
						{/if}
					{/if}
				</div>
				{#if clerk.user && currentItem}{#key clerk.user.id}<QuestionNotesTool
							questionId={currentItem.questionId}
							userKey={clerk.user.id}
						/>{/key}{/if}
				{#key clerk.user?.id}<CalculatorTool storageKey={clerk.user?.id ?? 'guest'} />{/key}
			</div>

			<!-- Fixed bottom action bar (matches QuizDock floating style) -->
			<div
				class="items-center gap-2 px-3 sm:px-4 md:px-5 lg:px-6 py-3 sm:py-4 md:py-5 rounded-full backdrop-blur-md border border-base-300 shadow-xl w-auto fixed left-1/2 -translate-x-1/2 bottom-4 z-40 hidden md:inline-flex"
			>
				<button
					class="btn btn-sm btn-outline rounded-full"
					onclick={() => {
						if (currentItem) clearAnswer(currentItem);
					}}
				>
					Clear
				</button>
				<button
					class="btn btn-sm btn-circle {currentResponse?.isFlagged
						? 'btn-warning'
						: 'btn-warning btn-soft'}"
					onclick={() => {
						if (currentItem) toggleFlag(currentItem);
					}}
					aria-label={currentResponse?.isFlagged ? 'Remove flag' : 'Flag for review'}
				>
					<Flag size={18} />
				</button>
				<button
					class="btn btn-sm btn-ghost rounded-full"
					onclick={() => void flushSync(true)}
					title="Save progress"
				>
					<Save size={16} />
				</button>

				<div class="divider divider-horizontal mx-1"></div>

				<button
					class="btn btn-sm btn-outline {currentIndex === 0 ? 'btn-disabled' : ''}"
					style="border-radius: 9999px 50% 50% 9999px;"
					onclick={previousQuestion}
					disabled={currentIndex === 0}
				>
					<ArrowLeft size={18} />
				</button>
				<button
					class="btn btn-sm btn-outline {currentIndex === (runnerQuery.data?.items?.length ?? 1) - 1
						? 'btn-disabled'
						: ''}"
					style="border-radius: 50% 9999px 9999px 50%;"
					onclick={nextQuestion}
					disabled={currentIndex === (runnerQuery.data?.items?.length ?? 1) - 1}
				>
					<ArrowRight size={18} />
				</button>

				<div class="divider divider-horizontal mx-1"></div>

				<button
					class="btn btn-sm btn-primary rounded-full gap-1"
					onclick={() => (showSubmitModal = true)}
					disabled={isSubmitting}
				>
					<Send size={14} />
					{isSubmitting ? 'Submitting...' : 'Submit'}
				</button>
			</div>

			<!-- Phone dock: same shape as the quiz dock -->
			<div
				class="bottom-dock fixed inset-x-0 z-50 border-t border-base-300 bg-base-100/95 backdrop-blur-md md:hidden"
			>
				<div class="flex items-center gap-1 px-2 pt-2" role="toolbar" aria-label="Test controls">
					<div class="flex min-w-0 flex-1 items-center justify-center gap-1">
						<button
							class="btn btn-ghost btn-circle [--size:2.75rem]"
							onclick={() => {
								if (currentItem) clearAnswer(currentItem);
							}}
							aria-label="Clear answer"
						>
							<Eraser size={18} />
						</button>
						<button
							class="btn btn-circle [--size:2.75rem] {currentResponse?.isFlagged
								? 'btn-warning'
								: 'btn-warning btn-outline'}"
							onclick={() => {
								if (currentItem) toggleFlag(currentItem);
							}}
							aria-label={currentResponse?.isFlagged ? 'Remove flag' : 'Flag for review'}
							aria-pressed={currentResponse?.isFlagged ?? false}
						>
							<Flag size={18} />
						</button>
						<button
							class="btn btn-primary h-11 min-w-28 flex-1 gap-1.5 rounded-full {isLastQuestion
								? ''
								: 'btn-soft'}"
							onclick={() => (showSubmitModal = true)}
							disabled={isSubmitting}
						>
							<Send size={16} />
							{isSubmitting ? 'Submitting…' : 'Submit'}
						</button>
					</div>
					<!-- The same split pill as the desktop dock. -->
					<div class="ms-1 flex shrink-0 items-center gap-0.5">
						<button
							class="btn btn-outline [--size:2.75rem]"
							style="border-radius: 9999px 0.3rem 0.3rem 9999px;"
							onclick={previousQuestion}
							disabled={currentIndex === 0}
							aria-label="Previous question"
						>
							<ArrowLeft size={18} />
						</button>
						<button
							class="btn btn-outline [--size:2.75rem]"
							style="border-radius: 0.3rem 9999px 9999px 0.3rem;"
							onclick={nextQuestion}
							disabled={isLastQuestion}
							aria-label="Next question"
						>
							<ArrowRight size={18} />
						</button>
					</div>
				</div>
			</div>

			<QuestionNavigatorSheet
				bind:open={navigatorOpen}
				title="Questions"
				description="{answeredCount} of {runnerQuery.data.items.length} answered{flaggedCount
					? `, ${flaggedCount} flagged`
					: ''}"
				items={navigatorItems}
				{currentIndex}
				onselect={jumpToQuestion}
			>
				{#snippet footer()}
					<div class="flex items-center justify-between gap-3">
						<span class="flex items-center gap-1.5 text-xs {syncStatusIcon(syncStatus)}">
							{#if syncStatus === 'offline'}<WifiOff size={12} />{:else}<Wifi size={12} />{/if}
							{syncStatusLabel(syncStatus)}
						</span>
						<button
							type="button"
							class="btn btn-primary min-h-11 rounded-full px-5"
							onclick={() => {
								navigatorOpen = false;
								showSubmitModal = true;
							}}
							disabled={isSubmitting}><Send size={16} /> Submit test</button
						>
					</div>
				{/snippet}
			</QuestionNavigatorSheet>

			<Sheet bind:open={toolsOpen} title="Tools" desktop="bottom" width="sm:max-w-lg sm:mx-auto">
				<ul class="grid grid-cols-2 gap-2 pt-1">
					{#if clerk.user && currentItem}
						<li>
							<button
								type="button"
								class="flex min-h-20 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-base-300 text-sm font-medium active:scale-[0.97] {sidePanel.current ===
								'notes'
									? 'bg-info/12 text-info'
									: ''}"
								aria-pressed={sidePanel.current === 'notes'}
								onclick={() => {
									toolsOpen = false;
									sidePanel.toggle('notes', 'mobile');
								}}><StickyNote size={22} class="text-info" /> Notes</button
							>
						</li>
					{/if}
					<li>
						<button
							type="button"
							class="flex min-h-20 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-base-300 text-sm font-medium active:scale-[0.97] {sidePanel.current ===
							'calculator'
								? 'bg-info/12 text-info'
								: ''}"
							aria-pressed={sidePanel.current === 'calculator'}
							onclick={() => {
								toolsOpen = false;
								sidePanel.toggle('calculator', 'mobile');
							}}><Calculator size={22} class="text-info" /> Calculator</button
						>
					</li>
				</ul>
				<button
					type="button"
					class="btn btn-ghost mt-4 min-h-11 w-full rounded-full text-base-content/70"
					onclick={() => void flushSync(true)}
				>
					<Save size={16} /> Save progress now
				</button>
			</Sheet>

			<Sheet bind:open={showSubmitModal} title="Submit your test?">
				<div class="space-y-3">
					<p class="text-base-content/70">
						Once submitted, you won't be able to change your answers. You'll be able to review each
						question with the correct answers and rationales.
					</p>
					<div class="grid grid-cols-2 gap-2 text-sm">
						<div class="rounded-xl border border-base-300 p-3">
							<div class="text-xs text-base-content/50">Answered</div>
							<div class="font-semibold">
								{answeredCount} / {runnerQuery.data?.items?.length ?? 0}
							</div>
						</div>
						<div class="rounded-xl border border-base-300 p-3">
							<div class="text-xs text-base-content/50">Unanswered</div>
							<div
								class="font-semibold {(runnerQuery.data?.items?.length ?? 0) - answeredCount > 0
									? 'text-warning'
									: ''}"
							>
								{(runnerQuery.data?.items?.length ?? 0) - answeredCount}
							</div>
						</div>
					</div>
					{#if (runnerQuery.data?.items?.length ?? 0) - answeredCount > 0}
						<div class="alert alert-warning rounded-xl text-sm">
							<Info size={14} />
							<span>You have unanswered questions. They will be marked as incorrect.</span>
						</div>
					{/if}
				</div>
				{#snippet footer()}
					<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<button
							class="btn btn-outline min-h-11 rounded-full"
							onclick={() => (showSubmitModal = false)}
						>
							Keep working
						</button>
						<button
							class="btn btn-primary min-h-11 rounded-full gap-1"
							onclick={() => {
								showSubmitModal = false;
								void submitAttempt(false);
							}}
							disabled={isSubmitting}
						>
							<Send size={14} />
							{isSubmitting ? 'Submitting…' : 'Submit test'}
						</button>
					</div>
				{/snippet}
			</Sheet>
		{/if}
	{/if}
</div>
