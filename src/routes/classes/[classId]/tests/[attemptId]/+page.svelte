<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../../../../convex/_generated/api';
	import { fade, slide } from 'svelte/transition';
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
		Eraser,
		Info
	} from 'lucide-svelte';

	type LocalResponse = {
		selectedOptions: string[];
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

	const client = useConvexClient();
	const classId = $derived(page.params.classId as any);
	const attemptId = $derived(page.params.attemptId as any);

	const runnerQuery = useQuery((api as any).customQuiz.getAttemptRunnerBundle, () =>
		attemptId ? { attemptId } : 'skip'
	);

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

	let syncTimeout: number | null = null;
	let tickerHandle: number | null = null;
	let heartbeatHandle: number | null = null;
	let lastTickAt = 0;
	const dirtyItemIds = new Set<string>();
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

	function getDefaultLocalResponse(item: any): LocalResponse {
		return {
			selectedOptions: [...(item.response?.selectedOptions || [])],
			textResponse: item.response?.textResponse ?? undefined,
			isFlagged: item.response?.isFlagged ?? false,
			timeSpentMs: item.response?.timeSpentMs ?? 0,
			visited: item.response?.visitedAt !== undefined
		};
	}

	function markDirty(itemId: string) {
		dirtyItemIds.add(itemId);
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

	function toggleOption(item: any, optionId: string) {
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

	function setFitbText(item: any, text: string) {
		setResponse(item._id, (prev) => ({
			...prev,
			textResponse: text,
			selectedOptions: text.trim().length > 0 ? [text] : []
		}));
	}

	function clearAnswer(item: any) {
		setResponse(item._id, (prev) => ({
			...prev,
			selectedOptions: [],
			textResponse: undefined
		}));
	}

	function toggleFlag(item: any) {
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
		return items.filter((item: any) => {
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

	const currentItem = $derived(getCurrentItem());
	const currentResponse = $derived(currentItem ? responses[currentItem._id] : null);

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
		if (!force && dirtyItemIds.size === 0) return;
		if (typeof navigator !== 'undefined' && !navigator.onLine) {
			syncStatus = 'offline';
			return;
		}

		const ids = Array.from(dirtyItemIds);
		if (ids.length === 0 && !force) return;

		syncStatus = 'syncing';
		syncError = null;
		syncInFlight = true;

		try {
			const changes = ids
				.map((id) => {
					const r = responses[id];
					if (!r) return null;
					return {
						itemId: id,
						selectedOptions: r.selectedOptions,
						textResponse: r.textResponse ?? '',
						isFlagged: r.isFlagged,
						markVisited: r.visited,
						timeSpentDeltaMs: pendingTimeDeltas[id] ?? 0
					};
				})
				.filter(Boolean);

			if (changes.length > 0 || force) {
				await client.mutation((api as any).customQuiz.patchAttemptResponses, {
					attemptId,
					elapsedMs: elapsedMsLocal,
					changes
				});
			}

			for (const id of ids) {
				dirtyItemIds.delete(id);
			}
			if (ids.length > 0) {
				const nextDeltas = { ...pendingTimeDeltas };
				for (const id of ids) delete nextDeltas[id];
				pendingTimeDeltas = nextDeltas;
			}
			saveCache();
			syncStatus = 'synced';
		} catch (error: any) {
			syncStatus = 'error';
			syncError = error?.message ?? 'Sync failed';
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
			nextCurrentIndex = Math.min(Math.max(0, cached.currentIndex ?? 0), Math.max(bundle.items.length - 1, 0));
			nextElapsedMs = Math.max(nextElapsedMs, cached.elapsedMs ?? 0);
			nextPendingDeltas = cached.pendingTimeDeltas ?? {};

			for (const [itemId, localResponse] of Object.entries(cached.responses ?? {})) {
				if (!serverResponses[itemId]) continue;
				mergedResponses[itemId] = {
					...serverResponses[itemId],
					...localResponse,
					selectedOptions: [...(localResponse.selectedOptions ?? serverResponses[itemId].selectedOptions ?? [])]
				};
				dirtyItemIds.add(itemId);
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
		dirtyItemIds.add(item._id);
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
			await client.mutation((api as any).customQuiz.submitAttempt, {
				attemptId,
				elapsedMs: elapsedMsLocal
			});
			if (typeof window !== 'undefined') {
				window.localStorage.removeItem(cacheKey(String(attemptId)));
			}
			await goto(`/classes/${classId}/tests/${attemptId}/results${auto ? '?autoSubmit=1' : ''}`);
		} catch (error: any) {
			submitError = error?.message ?? 'Something went wrong while submitting. Please try again.';
			isSubmitting = false;
		}
	}

	function promptsForMatching(item: any) {
		return (item.question.options || []).filter((o: any) => String(o.text).startsWith('prompt:'));
	}

	function answersForMatching(item: any) {
		return (item.question.options || []).filter((o: any) => String(o.text).startsWith('answer:'));
	}

	function selectedAnswerIdForPrompt(itemId: string, promptId: string) {
		const selections = responses[itemId]?.selectedOptions ?? [];
		const pair = selections.find((s) => String(s).startsWith(`${promptId}::`));
		return pair ? String(pair).split('::')[1] : '';
	}

	function setMatchingSelection(item: any, promptId: string, answerId: string) {
		setResponse(item._id, (prev) => {
			const others = (prev.selectedOptions ?? []).filter((s) => {
				const text = String(s);
				if (text.startsWith(`${promptId}::`)) return false;
				if (!answerId) return true;
				return !text.endsWith(`::${answerId}`);
			});
			return {
				...prev,
				selectedOptions: answerId ? [...others, `${promptId}::${answerId}`] : others
			};
		});
	}

	function availableAnswersForPrompt(item: any, promptId: string) {
		const allAnswers = answersForMatching(item);
		const selections = responses[item._id]?.selectedOptions ?? [];
		const currentSelectedAnswerId = selectedAnswerIdForPrompt(item._id, promptId);
		const takenByOtherPrompts = new Set(
			selections
				.filter((s) => !String(s).startsWith(`${promptId}::`))
				.map((s) => String(s).split('::')[1])
				.filter(Boolean)
		);
		return allAnswers.filter(
			(ans: any) => ans.id === currentSelectedAnswerId || !takenByOtherPrompts.has(ans.id)
		);
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

	function answerLabel(text: string) {
		return String(text).startsWith('answer:') ? String(text).slice('answer:'.length).trim() : text;
	}
	function promptLabel(text: string) {
		return String(text).startsWith('prompt:') ? String(text).slice('prompt:'.length).trim() : text;
	}

	function syncStatusIcon(status: string) {
		switch (status) {
			case 'synced': return 'text-success';
			case 'syncing': return 'text-info';
			case 'offline': return 'text-warning';
			case 'error': return 'text-error';
			default: return 'text-base-content/40';
		}
	}

	function syncStatusLabel(status: string) {
		switch (status) {
			case 'synced': return 'Saved';
			case 'syncing': return 'Saving...';
			case 'offline': return 'Offline';
			case 'error': return 'Save failed';
			default: return 'Ready';
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
			if (dirtyItemIds.size > 0 || Object.keys(pendingTimeDeltas).length > 0) {
				void flushSync();
			}
			void client.mutation((api as any).customQuiz.heartbeatAttempt, {
				attemptId,
				elapsedMs: elapsedMsLocal
			}).catch(() => {
				// no-op
			});
		}, 5000);

		return () => {
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('pagehide', onPageHide);
			if (syncTimeout !== null) clearTimeout(syncTimeout);
			if (tickerHandle !== null) clearInterval(tickerHandle);
			if (heartbeatHandle !== null) clearInterval(heartbeatHandle);
		};
	});
</script>

<div class="flex flex-col h-[calc(100vh-4rem)]" transition:fade={{ duration: 200 }}>
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
				<div class="card bg-base-100 border border-base-300 rounded-2xl shadow-sm max-w-md w-full">
					<div class="card-body text-center">
						<CheckCircle2 class="mx-auto text-success mb-2" size={48} />
						<h1 class="card-title justify-center text-xl">Test Complete</h1>
						<p class="text-sm text-base-content/60 mt-1">
							This test has already been submitted.
						</p>
						<div class="card-actions justify-center mt-4">
							<a
								class="btn btn-primary rounded-full"
								href={`/classes/${classId}/tests/${attemptId}/results`}
							>
								View Results
							</a>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div
				class="flex flex-col md:flex-col lg:flex-row bg-base-100 h-full overflow-hidden p-2 md:p-3 lg:p-4 gap-3 sm:gap-4 lg:gap-8 transition-all duration-500 ease-in-out"
				transition:slide={{ duration: 400, easing: cubicInOut, axis: 'y' }}
			>
				<!-- Sidebar -->
				<div
					class="hidden lg:flex lg:flex-col relative overflow-y-auto overflow-x-hidden border border-base-300 rounded-4xl p-3 px-4 transition-all duration-200 ease-out bg-base-100 backdrop-blur-md bg-opacity-80 shadow-lg flex-shrink-0 h-full
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
								<a
									class="btn btn-ghost font-bold rounded-full"
									href={`/classes?classId=${classId}`}
								>
									<ChevronLeft size={16} /> {runnerQuery.data.attempt.className}
								</a>
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
									<div class="font-bold text-lg">{answeredCount}<span class="text-base-content/40 text-sm font-normal"> / {runnerQuery.data.items.length}</span></div>
								</div>
								<div class="rounded-xl border border-base-300 p-3">
									<div class="text-xs text-base-content/50 flex items-center gap-1">
										<Flag size={10} />
										Flagged
									</div>
									<div class="font-bold text-lg {flaggedCount > 0 ? 'text-warning' : ''}">{flaggedCount}</div>
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
									<div class="text-3xl font-bold tabular-nums">{formatDuration(elapsedMsLocal)}</div>
									{#if remainingMs !== null}
										<div class="text-sm mt-1 {remainingMs <= 60_000 ? 'text-error font-semibold animate-pulse' : 'text-base-content/60'}">
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
								<span class="{syncStatusIcon(syncStatus)}">{syncStatusLabel(syncStatus)}</span>
							</div>
							{#if syncError}
								<div class="text-error text-xs text-center mt-1">{syncError}</div>
							{/if}
						</div>
					{:else}
						<div class="mt-16 justify-self-center flex flex-col items-center space-y-4 ms-1">
							<a
								class="group flex items-center justify-center font-bold text-secondary-content bg-secondary text-center w-full rounded-full transition-colors"
								href={`/classes?classId=${classId}`}
							>
								<span class="group-hover:hidden">📝</span>
								<span class="hidden group-hover:inline-flex items-center justify-center"
									><ChevronLeft size={24} /></span
								>
							</a>

							<div class="text-center">
								<div class="text-xs font-bold tabular-nums">{formatDuration(elapsedMsLocal)}</div>
								{#if remainingMs !== null}
									<div class="text-[10px] text-base-content/50 tabular-nums">{formatDuration(remainingMs)}</div>
								{/if}
							</div>

							<div
								class="radial-progress text-primary text-xs bg-base-300"
								style="--value:{Math.round((answeredCount / Math.max(1, runnerQuery.data?.items?.length ?? 1)) * 100)}; --size:3rem; --thickness: 3px;"
								role="progressbar"
							>
								{answeredCount}
							</div>

							<div class="border-t border-base-300 w-full my-2"></div>

							<div class="flex flex-col items-center text-xs text-base-content/50 gap-1">
								<Wifi size={12} class={syncStatusIcon(syncStatus)} />
							</div>
						</div>
					{/if}
				</div>

				<!-- Mobile header -->
				<div class="lg:hidden flex items-center justify-between gap-2 px-2">
					<a
						class="btn btn-ghost btn-sm rounded-full text-secondary"
						href={`/classes?classId=${classId}`}
					>
						<ChevronLeft size={16} />
						<span class="truncate max-w-[120px]">{runnerQuery.data.attempt.className}</span>
					</a>
					<div class="flex items-center gap-3 text-sm">
						<div class="flex items-center gap-1 tabular-nums font-medium">
							<Clock size={14} class="text-base-content/50" />
							{formatDuration(elapsedMsLocal)}
						</div>
						{#if remainingMs !== null}
							<span class="text-xs {remainingMs <= 60_000 ? 'text-error font-semibold' : 'text-base-content/50'}">
								{formatDuration(remainingMs)}
							</span>
						{/if}
					</div>
				</div>

				<!-- Main content area -->
				<div class="w-full lg:flex-1 lg:min-w-0 flex flex-col max-w-full lg:max-w-none overflow-y-auto flex-grow min-h-0 h-full pb-24 sm:pb-36 lg:pb-48 relative">

					<!-- Horizontal question navigator (matches QuizNavigation style) -->
					<div class="flex flex-row w-full overflow-x-auto overflow-y-hidden whitespace-nowrap space-x-4 relative items-center border border-base-300 px-6 py-3 rounded-4xl h-20 min-h-20 max-h-20 flex-none">
						{#each runnerQuery.data.items as item, index (item._id)}
							{@const r = responses[item._id]}
							{@const answered = r ? (isFitb(item.question.type) ? String(r.textResponse ?? r.selectedOptions[0] ?? '').trim().length > 0 : r.selectedOptions.length > 0) : false}
							<div class="indicator">
								{#if r?.isFlagged}
									<span class="indicator-item indicator-start badge badge-warning badge-xs translate-x-[-1/4] translate-y-[-1/4] z-[1]"></span>
								{/if}
								<button
									bind:this={questionButtons[index]}
									class="btn btn-circle btn-md btn-soft {index === currentIndex ? 'btn-primary' : answered ? 'btn-accent' : 'btn-outline'}"
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
						<div class="text-md sm:text-lg lg:text-xl p-4 sm:pe-4">
							<div class="flex flex-row justify-between items-start mb-1">
								<div class="text-xs text-base-content/40 font-medium">
									Question {currentIndex + 1} of {runnerQuery.data.items.length}
								</div>
								<div class="flex items-center gap-2">
									<button
										class="btn btn-sm btn-warning btn-soft btn-circle"
										onclick={() => toggleFlag(currentItem)}
										aria-label={currentResponse.isFlagged ? 'Remove flag' : 'Flag for review'}
										title={currentResponse.isFlagged ? 'Remove flag' : 'Flag for review'}
									>
										<Flag size={16} />
									</button>
								</div>
							</div>

							{#if !isFitb(currentItem.question.type)}
								<div class="text-base sm:text-xl leading-tight tiptap-content font-medium ms-2 mt-3">
									{@html currentItem.question.stem}
								</div>
							{/if}

							{#if isFitb(currentItem.question.type)}
								<div class="text-base sm:text-xl leading-tight tiptap-content font-medium ms-2 mt-3 mb-5">
									{@html currentItem.question.stem}
								</div>
								<div class="ms-2">
									<input
										type="text"
										class="input input-bordered w-full rounded-full bg-base-200 border-2 border-base-300 px-6 py-3 text-base"
										placeholder="Type your answer..."
										value={currentResponse.textResponse ?? ''}
										oninput={(e) => setFitbText(currentItem, (e.target as HTMLInputElement).value)}
									/>
								</div>
							{:else if isMatching(currentItem.question.type)}
								<div class="mt-5 space-y-3 ms-2">
									<div class="text-xs text-base-content/50 font-medium">
										Match each prompt to one unique answer.
									</div>
									{#each promptsForMatching(currentItem) as prompt (prompt.id)}
										<div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)] gap-3 items-center">
											<div class="border-2 border-base-300 rounded-full p-3 px-5 bg-base-200/50 tiptap-content text-sm">
												{@html promptLabel(prompt.text)}
											</div>
											<select
												class="select select-bordered rounded-full w-full bg-base-200/50"
												value={selectedAnswerIdForPrompt(currentItem._id, prompt.id)}
												onchange={(e) =>
													setMatchingSelection(
														currentItem,
														prompt.id,
														(e.target as HTMLSelectElement).value
													)}
											>
												<option value="">Choose a match...</option>
												{#each availableAnswersForPrompt(currentItem, prompt.id) as ans (ans.id)}
													<option value={ans.id}>{answerLabel(ans.text)}</option>
												{/each}
											</select>
										</div>
									{/each}
								</div>
							{:else}
								<div class="text-base-content/60 font-medium text-base sm:text-lg leading-tight my-3 ms-2">
									Select {currentItem.question.correctAnswerCount ?? 'all that apply'}.
								</div>
								<div class="text-xs text-base-content/45 ms-2 mb-2">
									Selected {selectedCountForCurrentItem()}
									{#if currentItem.question.correctAnswerCount}
										<span> / {currentItem.question.correctAnswerCount}</span>
									{/if}
								</div>
								<div class="flex flex-col justify-start space-y-2 md:space-y-3 lg:space-y-4">
									{#each currentItem.question.options as option, i (option.id)}
										<label
											class="label cursor-pointer rounded-full flex items-center border-base-300 bg-base-200 transition-colors border-2 p-2 md:p-3
											{currentResponse.selectedOptions.includes(option.id) ? 'border-primary bg-primary/5' : 'hover:border-primary/30'}"
										>
											<input
												type="checkbox"
												class="checkbox checkbox-primary checkbox-sm ms-4"
												checked={currentResponse.selectedOptions.includes(option.id)}
												onchange={() => toggleOption(currentItem, option.id)}
											/>
											<span class="flex-grow text-wrap break-words ml-3 md:ml-4 my-3 text-sm md:text-base">
												<span class="font-semibold mr-2 select-none">{String.fromCharCode(65 + i)}.</span>
												<span class="tiptap-content">{@html option.text}</span>
											</span>
										</label>
									{/each}
								</div>
							{/if}
						</div>

						{#if submitError}
							<div class="alert alert-error rounded-full mx-4 mt-2">
								<span class="text-sm">{submitError}</span>
							</div>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Fixed bottom action bar (matches ActionButtons style) -->
			<div
				class="items-center gap-2 px-3 sm:px-4 md:px-5 lg:px-6 py-3 sm:py-4 md:py-5 rounded-full backdrop-blur-md border border-base-300 shadow-xl w-auto fixed left-1/2 -translate-x-1/2 bottom-4 z-40 hidden md:inline-flex"
			>
				<button
					class="btn btn-sm btn-outline rounded-full"
					onclick={() => { if (currentItem) clearAnswer(currentItem); }}
				>
					Clear
				</button>
				<button
					class="btn btn-sm btn-warning btn-soft btn-circle"
					onclick={() => { if (currentItem) toggleFlag(currentItem); }}
					aria-label="Flag for review"
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
					class="btn btn-sm btn-outline {currentIndex === (runnerQuery.data?.items?.length ?? 1) - 1 ? 'btn-disabled' : ''}"
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

			<!-- Mobile bottom bar -->
			<div class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-base-100 border-t border-base-300 p-3 flex items-center justify-between gap-2">
				<div class="flex gap-2">
					<button
						class="btn btn-sm btn-outline rounded-full"
						onclick={previousQuestion}
						disabled={currentIndex === 0}
					>
						<ArrowLeft size={16} />
					</button>
					<button
						class="btn btn-sm btn-outline rounded-full"
						onclick={nextQuestion}
						disabled={currentIndex === (runnerQuery.data?.items?.length ?? 1) - 1}
					>
						<ArrowRight size={16} />
					</button>
				</div>
				<div class="flex gap-2">
					<button
						class="btn btn-sm btn-ghost rounded-full"
						onclick={() => { if (currentItem) clearAnswer(currentItem); }}
					>
						Clear
					</button>
					<button
						class="btn btn-sm btn-warning btn-soft btn-circle"
						onclick={() => { if (currentItem) toggleFlag(currentItem); }}
					>
						<Flag size={14} />
					</button>
					<button
						class="btn btn-sm btn-primary rounded-full gap-1"
						onclick={() => (showSubmitModal = true)}
						disabled={isSubmitting}
					>
						<Send size={12} />
						Submit
					</button>
				</div>
			</div>

			<!-- Submit confirmation modal -->
			<dialog class="modal max-w-full p-4 z-[1000]" class:modal-open={showSubmitModal}>
				<div class="modal-box rounded-2xl">
					<form method="dialog">
						<button
							class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
							onclick={() => (showSubmitModal = false)}
						>
							✕
						</button>
					</form>
					<h3 class="text-lg font-bold">Submit Your Test?</h3>
					<div class="py-4 space-y-3">
						<p class="text-base-content/70">
							Once submitted, you won't be able to change your answers. You'll be able to review each question with the correct answers and explanations.
						</p>
						<div class="grid grid-cols-2 gap-2 text-sm">
							<div class="rounded-xl border border-base-300 p-3">
								<div class="text-xs text-base-content/50">Answered</div>
								<div class="font-semibold">{answeredCount} / {runnerQuery.data?.items?.length ?? 0}</div>
							</div>
							<div class="rounded-xl border border-base-300 p-3">
								<div class="text-xs text-base-content/50">Unanswered</div>
								<div class="font-semibold {(runnerQuery.data?.items?.length ?? 0) - answeredCount > 0 ? 'text-warning' : ''}">{(runnerQuery.data?.items?.length ?? 0) - answeredCount}</div>
							</div>
						</div>
						{#if (runnerQuery.data?.items?.length ?? 0) - answeredCount > 0}
							<div class="alert alert-warning rounded-xl text-sm">
								<Info size={14} />
								<span>You have unanswered questions. They will be marked as incorrect.</span>
							</div>
						{/if}
					</div>
					<div class="flex justify-end space-x-2">
						<button class="btn btn-outline rounded-full" onclick={() => (showSubmitModal = false)}>
							Keep Working
						</button>
						<button
							class="btn btn-primary rounded-full gap-1"
							onclick={() => { showSubmitModal = false; void submitAttempt(false); }}
							disabled={isSubmitting}
						>
							<Send size={14} />
							{isSubmitting ? 'Submitting...' : 'Submit Test'}
						</button>
					</div>
				</div>
				<div
					class="modal-backdrop bg-black/50"
					role="button"
					tabindex="-1"
					aria-label="Close submit dialog"
					onclick={() => (showSubmitModal = false)}
					onkeydown={(e) => {
						if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							showSubmitModal = false;
						}
					}}
				></div>
			</dialog>
		{/if}
	{/if}
</div>
