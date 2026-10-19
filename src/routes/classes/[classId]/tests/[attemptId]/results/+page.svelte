<script lang="ts">
	import { DOCK_ISLAND_CLASS, dockGlass } from '$lib/components/quiz-dock/dockStyles';
	import { RadialProgress } from '$lib/components/ui/radial-progress';
	import { formatClock } from '$lib/utils/format';
	import QuestionSources from '$lib/components/QuestionSources.svelte';
	import ExamFindings from '$lib/components/exam-findings/ExamFindings.svelte';
	import { page } from '$app/state';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../../../../convex/_generated/api';
	import type { Id } from '../../../../../../convex/_generated/dataModel';
	import QuestionAttachmentsSidebar from '$lib/components/QuestionAttachmentsSidebar.svelte';
	import { getRationale, hasRationale } from '$lib/utils/rationale';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import { fade, slide } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import { resolve } from '$app/paths';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import Clock from '@lucide/svelte/icons/clock';
	import Target from '@lucide/svelte/icons/target';
	import Flag from '@lucide/svelte/icons/flag';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import MinusCircle from '@lucide/svelte/icons/minus-circle';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Plus from '@lucide/svelte/icons/plus';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Progress } from '$lib/components/ui/progress';
	import { LoadingState } from '$lib/components/ui/spinner';

	const classId = $derived(page.params.classId as Id<'class'>);
	const attemptId = $derived(page.params.attemptId as Id<'quizAttempts'>);

	const resultsQuery = useQuery(api.customQuiz.getAttemptResults, () =>
		attemptId ? { attemptId } : 'skip'
	);
	type ResultsQueryData = NonNullable<typeof resultsQuery.data>;
	type ReviewItem = ResultsQueryData['reviewItems'][number];
	type ReviewFilter = 'all' | 'flagged' | 'unanswered' | 'incorrect';

	let tab = $state<'summary' | 'review'>('summary');
	let reviewFilter = $state<ReviewFilter>('all');
	let selectedQuestionId = $state<string | null>(null);
	let hideSidebar = $state(false);
	let questionButtons = $state<HTMLElement[]>([]);

	function isFitb(type: string) {
		return String(type || '').toLowerCase() === 'fill_in_the_blank';
	}

	function isMatching(type: string) {
		return String(type || '').toLowerCase() === 'matching';
	}

	function optionTextById(item: ReviewItem, id: string) {
		const raw = String(id ?? '').trim();
		const byId = item.question.options.find((o) => o.id === raw)?.text;
		if (byId) return byId;
		if (/^\d+$/.test(raw)) {
			const index = Number(raw);
			if (Number.isInteger(index) && index >= 0 && index < item.question.options.length) {
				return item.question.options[index]?.text ?? raw;
			}
		}
		return raw;
	}

	function answerLabel(text: string) {
		return String(text).replace(/^\s*answer:\s*/i, '');
	}

	function promptLabel(text: string) {
		return String(text).replace(/^\s*prompt:\s*/i, '');
	}

	function parseMatchingPairs(values: string[]): Array<{ promptId: string; answerId: string }> {
		return (values || [])
			.map((value) => {
				const [promptId, answerToken] = String(value).split('::');
				const answerId = String(answerToken ?? '')
					.split('|')
					.map((part) => part.trim())
					.find((id) => id.length > 0);
				return promptId && answerId ? { promptId, answerId } : null;
			})
			.filter((pair): pair is { promptId: string; answerId: string } => Boolean(pair));
	}

	function friendlyTypeName(raw: string): string {
		switch (raw) {
			case 'multiple_choice':
				return 'Multiple Choice';
			case 'fill_in_the_blank':
				return 'Fill in the Blank';
			case 'matching':
				return 'Matching';
			default:
				return raw;
		}
	}

	function friendlyStatus(status: string): string {
		switch (status) {
			case 'submitted':
				return 'Completed';
			case 'timed_out':
				return 'Time Expired';
			case 'abandoned':
				return 'Abandoned';
			default:
				return status.replace('_', ' ');
		}
	}

	function setEq(a: string[], b: string[]) {
		if (a.length !== b.length) return false;
		const as = [...a].sort();
		const bs = [...b].sort();
		return as.every((v, i) => v === bs[i]);
	}

	function multiSelectAnalysis(item: ReviewItem) {
		const selected = (item.response?.selectedOptions ?? []) as string[];
		const correct = (item.correctAnswerDisplay ?? []) as string[];
		const selectedSet = new Set(selected);
		const correctSet = new Set(correct);
		const correctlySelected = selected.filter((id) => correctSet.has(id));
		const incorrectSelected = selected.filter((id) => !correctSet.has(id));
		const missedCorrect = correct.filter((id) => !selectedSet.has(id));
		return {
			isExact: setEq(selected, correct),
			correctlySelectedCount: correctlySelected.length,
			incorrectSelectedCount: incorrectSelected.length,
			missedCorrectCount: missedCorrect.length,
			hasPartialCreditLikePattern:
				correctlySelected.length > 0 && (incorrectSelected.length > 0 || missedCorrect.length > 0)
		};
	}

	function isUnansweredItem(item: ReviewItem) {
		return (
			!(item.response?.selectedOptions?.length ?? 0) &&
			!String(item.response?.textResponse ?? '').trim()
		);
	}

	function isIncorrectItem(item: ReviewItem) {
		return !isUnansweredItem(item) && item.score?.isCorrect !== true;
	}

	function isSkippedItem(item: ReviewItem) {
		return item.score == null || item.score?.isCorrect === undefined || isUnansweredItem(item);
	}

	function matchesReviewFilter(item: ReviewItem, filter: ReviewFilter) {
		switch (filter) {
			case 'flagged':
				return item.response?.isFlagged === true;
			case 'unanswered':
				return isUnansweredItem(item);
			case 'incorrect':
				return isIncorrectItem(item);
			default:
				return true;
		}
	}

	function normalizeAnswerText(text: string) {
		return answerLabel(text).trim().toLowerCase().replace(/\s+/g, ' ');
	}

	function matchingReviewRows(item: ReviewItem) {
		const promptOptions = (item.question.options || []).filter((option) =>
			String(option.text).trimStart().toLowerCase().startsWith('prompt:')
		);

		const userByPrompt = new Map(
			parseMatchingPairs(item.response?.selectedOptions ?? []).map((pair) => [
				pair.promptId,
				pair.answerId
			])
		);
		const correctByPrompt = new Map(
			parseMatchingPairs(item.correctAnswerDisplay ?? []).map((pair) => [
				pair.promptId,
				pair.answerId
			])
		);

		return promptOptions.map((prompt) => {
			const userAnswerId = userByPrompt.get(prompt.id) ?? '';
			const correctAnswerId = correctByPrompt.get(prompt.id) ?? '';
			const userAnswerText = userAnswerId
				? answerLabel(optionTextById(item, userAnswerId))
				: 'No answer';
			const correctAnswerText = correctAnswerId
				? answerLabel(optionTextById(item, correctAnswerId))
				: 'No answer key';
			const isAnswered = userAnswerId.length > 0;
			const isCorrect =
				isAnswered &&
				normalizeAnswerText(optionTextById(item, userAnswerId)) ===
					normalizeAnswerText(optionTextById(item, correctAnswerId));
			return {
				promptId: prompt.id,
				promptText: promptLabel(optionTextById(item, prompt.id)),
				userAnswerText,
				correctAnswerText,
				isAnswered,
				isCorrect
			};
		});
	}

	function matchingReviewStats(item: ReviewItem) {
		const rows = matchingReviewRows(item);
		const correct = rows.filter((row) => row.isCorrect).length;
		const unanswered = rows.filter((row) => !row.isAnswered).length;
		return {
			total: rows.length,
			correct,
			unanswered,
			incorrect: Math.max(0, rows.length - correct - unanswered)
		};
	}

	const reviewEntries = $derived.by(() =>
		(resultsQuery.data?.reviewItems ?? []).map((item, originalIndex) => ({ item, originalIndex }))
	);

	const filteredReviewEntries = $derived.by(() =>
		reviewEntries.filter(({ item }) => matchesReviewFilter(item, reviewFilter))
	);

	const reviewFilterCounts = $derived.by(() => {
		let flagged = 0;
		let unanswered = 0;
		let incorrect = 0;
		for (const { item } of reviewEntries) {
			if (item.response?.isFlagged) flagged += 1;
			if (isUnansweredItem(item)) unanswered += 1;
			if (isIncorrectItem(item)) incorrect += 1;
		}
		return {
			all: reviewEntries.length,
			flagged,
			unanswered,
			incorrect
		};
	});

	const selectedEntry = $derived.by(() => {
		const entries = filteredReviewEntries;
		if (entries.length === 0) return null;
		if (!selectedQuestionId) return entries[0];
		return entries.find(({ item }) => item._id === selectedQuestionId) ?? entries[0];
	});

	const selectedItem = $derived(selectedEntry?.item ?? null);
	const selectedIndex = $derived.by(() => {
		const current = selectedEntry;
		if (!current) return 0;
		return filteredReviewEntries.findIndex(({ item }) => item._id === current.item._id);
	});
	const selectedOriginalIndex = $derived(selectedEntry?.originalIndex ?? -1);

	$effect(() => {
		const entries = filteredReviewEntries;
		if (entries.length === 0) {
			selectedQuestionId = null;
			return;
		}
		if (!selectedQuestionId || !entries.some(({ item }) => item._id === selectedQuestionId)) {
			selectedQuestionId = entries[0].item._id;
		}
	});

	function scrollToCurrentButton() {
		requestAnimationFrame(() => {
			if (questionButtons[selectedIndex]) {
				questionButtons[selectedIndex].scrollIntoView({
					behavior: 'smooth',
					block: 'nearest',
					inline: 'center'
				});
			}
		});
	}

	function goToReviewQuestion(idx: number) {
		const entry = filteredReviewEntries[idx];
		if (!entry) return;
		selectedQuestionId = entry.item._id;
		scrollToCurrentButton();
	}

	function goToAdjacentReviewQuestion(delta: number) {
		const len = filteredReviewEntries.length;
		if (len === 0) return;
		const next = Math.min(len - 1, Math.max(0, selectedIndex + delta));
		goToReviewQuestion(next);
	}

	function setReviewFilter(filter: ReviewFilter) {
		reviewFilter = filter;
		scrollToCurrentButton();
	}
</script>

<div class="flex flex-col h-[calc(100dvh-4rem)]" transition:fade={{ duration: 200 }}>
	{#if resultsQuery.isLoading}
		<LoadingState label="Loading your results…" class="flex-1 text-base" />
	{:else if resultsQuery.error}
		<div class="flex-1 flex items-center justify-center p-4">
			<Alert.Root tone="error" class="max-w-md">
				<CircleAlert />
				<Alert.Title>{resultsQuery.error.toString()}</Alert.Title>
			</Alert.Root>
		</div>
	{:else if resultsQuery.data}
		{@const attempt = resultsQuery.data.attempt}
		{@const summary = attempt.resultSummary}

		{#if tab === 'summary'}
			<!-- Summary view - scrollable page layout -->
			<div class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20">
				<div class="max-w-5xl mx-auto space-y-6">
					<div class="flex items-center justify-between gap-3 flex-wrap">
						<div>
							<Button
								href={resolve('/classes')}
								variant="ghost"
								tone="secondary"
								size="sm"
								class="mb-2 font-bold"
							>
								<ChevronLeft size={16} /> Back to Class
							</Button>
							<h1 class="title-page">Your Results</h1>
							<p class="text-sm text-foreground/50 mt-1">
								{friendlyStatus(attempt.status)} · {attempt.className ?? 'Test'}
							</p>
						</div>
						<div class="flex gap-2">
							<Button
								href={resolve('/classes/[classId]/tests/new', { classId })}
								variant="ghost"
								tone="neutral"
								size="sm"
							>
								<Plus size={16} />
								New Test
							</Button>
						</div>
					</div>

					<!-- Score hero card -->
					<Card.Root class="py-0 shadow-xs overflow-hidden">
						<Card.Content class="p-6 sm:p-8">
							<div class="flex flex-col sm:flex-row items-center sm:items-start gap-8">
								<div class="flex flex-col items-center text-center shrink-0">
									<RadialProgress
										value={summary?.scorePct ?? 0}
										tone={summary?.passed ? 'success' : 'error'}
										thickness={8}
										label="Score"
										class="size-40 text-4xl font-bold"
									>
										{summary?.scorePct ?? 0}%
									</RadialProgress>
									<Badge
										variant="solid"
										tone={summary?.passed ? 'success' : 'error'}
										size="md"
										class="mt-4 px-5 text-sm"
									>
										{summary?.passed ? 'Passed' : 'Not Passed'}
									</Badge>
								</div>

								<div class="flex-1 w-full">
									<div class="grid grid-cols-3 gap-3">
										<div class="rounded-xl border border-success/20 bg-success/5 p-4 text-center">
											<CheckCircle2 class="mx-auto text-success mb-1" size={20} />
											<div class="font-bold text-2xl text-success-ink">
												{summary?.correctCount ?? 0}
											</div>
											<div class="text-xs text-foreground/50">Correct</div>
										</div>
										<div class="rounded-xl border border-error/20 bg-error/5 p-4 text-center">
											<XCircle class="mx-auto text-error mb-1" size={20} />
											<div class="font-bold text-2xl text-error-ink">
												{summary?.incorrectCount ?? 0}
											</div>
											<div class="text-xs text-foreground/50">Incorrect</div>
										</div>
										<div class="surface-sm p-4 text-center">
											<MinusCircle class="mx-auto text-foreground/30 mb-1" size={20} />
											<div class="font-bold text-2xl">{summary?.unansweredCount ?? 0}</div>
											<div class="text-xs text-foreground/50">Skipped</div>
										</div>
									</div>

									<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
										<div class="surface-sm p-3 flex items-center gap-2">
											<Target size={14} class="text-foreground/40 shrink-0" />
											<div>
												<div class="text-xs text-foreground/40">Pass at</div>
												<div class="font-semibold">{summary?.passThresholdPct ?? 0}%</div>
											</div>
										</div>
										<div class="surface-sm p-3 flex items-center gap-2">
											<Clock size={14} class="text-foreground/40 shrink-0" />
											<div>
												<div class="text-xs text-foreground/40">Time</div>
												<div class="font-semibold tabular-nums">
													{formatClock(attempt.elapsedMs)}
												</div>
											</div>
										</div>
										<div class="surface-sm p-3 flex items-center gap-2">
											<Flag size={14} class="text-foreground/40 shrink-0" />
											<div>
												<div class="text-xs text-foreground/40">Flagged</div>
												<div class="font-semibold">
													{attempt.progressCounters?.flaggedCount ?? 0}
												</div>
											</div>
										</div>
										<div class="surface-sm p-3 flex items-center gap-2">
											<BookOpen size={14} class="text-foreground/40 shrink-0" />
											<div>
												<div class="text-xs text-foreground/40">Questions</div>
												<div class="font-semibold">
													{attempt.configSnapshot?.questionCountActual ?? '—'}
												</div>
											</div>
										</div>
									</div>

									{#if attempt.configSnapshot?.moduleIds?.length > 0 || attempt.timeLimitSec}
										<div class="flex flex-wrap gap-2 mt-3">
											{#if attempt.timeLimitSec}
												<Badge variant="soft" size="sm">
													<Clock size={10} class="mr-1" />
													{Math.round(attempt.timeLimitSec / 60)} min limit
												</Badge>
											{:else}
												<Badge variant="soft" size="sm">Untimed</Badge>
											{/if}
											<Badge variant="soft" size="sm">
												{attempt.configSnapshot.moduleIds.length}
												{attempt.configSnapshot.moduleIds.length === 1 ? 'module' : 'modules'}
											</Badge>
										</div>
									{/if}
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Review CTA -->
					<Button
						size="lg"
						class="h-14 w-full gap-2 group shadow-lg hover:shadow-xl transition-all duration-200"
						onclick={() => (tab = 'review')}
					>
						<BookOpen size={20} class="transition-transform group-hover:scale-110" />
						Review Your Answers
					</Button>

					<!-- Breakdowns -->
					<div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
						<Card.Root class="py-0 shadow-xs">
							<Card.Content class="p-8">
								<h2 class="flex items-center gap-2 text-base font-semibold">
									<BarChart3 size={16} class="text-foreground/50" />
									By Module
								</h2>
								{#if !summary?.byModule?.length}
									<p class="text-sm text-foreground/50">No module data available.</p>
								{:else}
									<div class="space-y-2">
										{#each summary.byModule as row (row.moduleId)}
											<div class="surface-sm p-3">
												<div class="flex items-center justify-between gap-2">
													<div class="font-medium text-sm">{row.moduleTitle}</div>
													<Badge
														variant="soft"
														size="md"
														tone={row.accuracyPct >= (summary?.passThresholdPct ?? 70)
															? 'success'
															: 'error'}
													>
														{row.accuracyPct}%
													</Badge>
												</div>
												<div class="flex gap-3 text-xs text-foreground/50 mt-1.5">
													<span class="text-success-ink">{row.correct} correct</span>
													<span class="text-error-ink">{row.incorrect} incorrect</span>
													{#if row.unanswered > 0}
														<span>{row.unanswered} skipped</span>
													{/if}
												</div>
												<Progress
													class="mt-2"
													value={row.accuracyPct}
													max={100}
													tone={row.accuracyPct >= (summary?.passThresholdPct ?? 70)
														? 'success'
														: 'error'}
												/>
											</div>
										{/each}
									</div>
								{/if}
							</Card.Content>
						</Card.Root>

						<Card.Root class="py-0 shadow-xs">
							<Card.Content class="p-8">
								<h2 class="flex items-center gap-2 text-base font-semibold">
									<BarChart3 size={16} class="text-foreground/50" />
									By Question Type
								</h2>
								{#if !summary?.byType?.length}
									<p class="text-sm text-foreground/50">No type data available.</p>
								{:else}
									<div class="space-y-2">
										{#each summary.byType as row (row.questionType)}
											<div class="surface-sm p-3">
												<div class="flex items-center justify-between gap-2">
													<div class="font-medium text-sm">
														{friendlyTypeName(row.questionType)}
													</div>
													<Badge
														variant="soft"
														size="md"
														tone={row.accuracyPct >= (summary?.passThresholdPct ?? 70)
															? 'success'
															: 'error'}
													>
														{row.accuracyPct}%
													</Badge>
												</div>
												<div class="flex gap-3 text-xs text-foreground/50 mt-1.5">
													<span class="text-success-ink">{row.correct} correct</span>
													<span class="text-error-ink">{row.incorrect} incorrect</span>
													{#if row.unanswered > 0}
														<span>{row.unanswered} skipped</span>
													{/if}
												</div>
												<Progress
													class="mt-2"
													value={row.accuracyPct}
													max={100}
													tone={row.accuracyPct >= (summary?.passThresholdPct ?? 70)
														? 'success'
														: 'error'}
												/>
											</div>
										{/each}
									</div>
								{/if}
							</Card.Content>
						</Card.Root>
					</div>
				</div>
			</div>
		{:else}
			<!-- Review view - matches free study module layout -->
			<div
				class="flex flex-col md:flex-col lg:flex-row bg-background h-full overflow-hidden p-2 md:p-3 lg:p-4 gap-3 sm:gap-4 lg:gap-8 transition-all duration-500 ease-in-out"
				transition:slide={{ duration: 400, easing: cubicInOut, axis: 'y' }}
			>
				<!-- Sidebar -->
				<div
					class="hidden lg:flex lg:flex-col relative overflow-y-auto overflow-x-hidden border border-border rounded-4xl p-3 px-4 transition-all duration-200 ease-out bg-background/80 backdrop-blur-md shadow-lg shrink-0 h-full
					{hideSidebar ? 'w-[72px]' : 'w-[min(22rem,30vw)] xl:w-[min(24rem,28vw)]'}"
				>
					<Button
						variant="ghost"
						tone="neutral"
						size="sm"
						shape="circle"
						class="absolute top-6 left-5 size-9"
						onclick={() => (hideSidebar = !hideSidebar)}
						aria-label="Toggle sidebar"
					>
						<PanelRight
							size={18}
							class="transition-transform duration-300 {hideSidebar ? 'rotate-180' : ''}"
						/>
					</Button>

					{#if !hideSidebar}
						<div class="p-4 md:p-5 lg:p-6 pt-12 mt-8">
							<h4 class="font-bold text-sm tracking-wide text-secondary-ink -ms-6">
								<Button
									href={resolve('/classes')}
									variant="ghost"
									tone="secondary"
									class="font-bold"
								>
									<ChevronLeft size={16} />
									{attempt.className ?? 'Class'}
								</Button>
							</h4>
							<h2 class="font-semibold text-2xl mt-2 flex items-start gap-3 min-w-0">
								<span class="text-2xl shrink-0">📋</span>
								<span class="break-words hyphens-auto overflow-hidden">Review Mode</span>
							</h2>
							<p class="text-foreground/60 mt-2 text-sm">
								Step through each question to see the correct answer and rationale.
							</p>

							<div class="mt-6">
								<div class="flex items-center gap-3 text-sm">
									<RadialProgress
										value={summary?.scorePct ?? 0}
										tone={summary?.passed ? 'success' : 'error'}
										thickness={3}
										label="Score"
										class="text-sm font-bold"
									>
										{summary?.scorePct ?? 0}%
									</RadialProgress>
									<div>
										<div class="font-semibold">{summary?.passed ? 'Passed' : 'Not Passed'}</div>
										<div class="text-xs text-foreground/50">
											{summary?.scoreEarned ?? 0}/{summary?.scorePossible ?? 0} points
										</div>
									</div>
								</div>
							</div>

							<div class="grid grid-cols-3 gap-2 text-sm mt-5">
								<div class="surface-sm p-2 text-center">
									<div class="font-bold text-success-ink">{summary?.correctCount ?? 0}</div>
									<div class="text-[10px] text-foreground/40">Correct</div>
								</div>
								<div class="surface-sm p-2 text-center">
									<div class="font-bold text-error-ink">{summary?.incorrectCount ?? 0}</div>
									<div class="text-[10px] text-foreground/40">Wrong</div>
								</div>
								<div class="surface-sm p-2 text-center">
									<div class="font-bold">{summary?.unansweredCount ?? 0}</div>
									<div class="text-[10px] text-foreground/40">Skipped</div>
								</div>
							</div>
						</div>

						<div class="flex flex-col justify-center m-4 gap-3">
							<Button variant="soft" tone="neutral" size="sm" onclick={() => (tab = 'summary')}>
								<BarChart3 size={16} />
								Back to Summary
							</Button>
							<Button
								href={resolve('/classes/[classId]/tests/new', { classId })}
								variant="soft"
								tone="primary"
								size="sm"
							>
								<Plus size={16} />
								New Test
							</Button>

							<QuestionAttachmentsSidebar
								questionId={selectedItem?.questionId}
								showSolution={true}
								solutionOnlyBehavior="show"
								showSolutionBadges={true}
							/>
						</div>
					{:else}
						<div class="mt-16 justify-self-center flex flex-col items-center space-y-4 ms-1">
							<a
								class="group flex items-center justify-center font-bold text-secondary-foreground bg-secondary text-center w-full rounded-full transition-colors"
								href={resolve('/classes')}
							>
								<span class="group-hover:hidden">📋</span>
								<span class="hidden group-hover:inline-flex items-center justify-center"
									><ChevronLeft size={24} /></span
								>
							</a>
							<RadialProgress
								value={summary?.scorePct ?? 0}
								tone={summary?.passed ? 'success' : 'error'}
								thickness={3}
								label="Score"
								class="text-xs"
							>
								{summary?.scorePct ?? 0}%
							</RadialProgress>
							<Button
								variant="soft"
								tone="neutral"
								size="lg"
								shape="circle"
								onclick={() => (tab = 'summary')}
								title="Back to Summary"
							>
								<BarChart3 size={20} />
							</Button>
							<QuestionAttachmentsSidebar
								questionId={selectedItem?.questionId}
								showSolution={true}
								solutionOnlyBehavior="show"
								showSolutionBadges={true}
								collapsed={true}
							/>
						</div>
					{/if}
				</div>

				<!-- Mobile header for review -->
				<div class="lg:hidden flex items-center justify-between gap-2 px-2">
					<Button variant="ghost" tone="secondary" size="sm" onclick={() => (tab = 'summary')}>
						<ChevronLeft size={16} /> Summary
					</Button>
					<Badge variant="solid" tone={summary?.passed ? 'success' : 'error'} size="sm">
						{summary?.scorePct ?? 0}%
					</Badge>
				</div>

				<!-- Main review content -->
				<div
					class="w-full lg:flex-1 lg:min-w-0 flex flex-col max-w-full lg:max-w-none overflow-y-auto grow min-h-0 h-full pb-24 sm:pb-36 lg:pb-48 relative"
				>
					<div class="flex flex-wrap gap-2 mb-3">
						<Button
							size="sm"
							variant={reviewFilter === 'all' ? 'soft' : 'ghost'}
							tone={reviewFilter === 'all' ? 'primary' : 'neutral'}
							class={reviewFilter === 'all' ? '' : 'border border-border'}
							onclick={() => setReviewFilter('all')}
						>
							All ({reviewFilterCounts.all})
						</Button>
						<Button
							size="sm"
							variant={reviewFilter === 'flagged' ? 'solid' : 'ghost'}
							tone={reviewFilter === 'flagged' ? 'warning' : 'neutral'}
							class={reviewFilter === 'flagged' ? '' : 'border border-border'}
							onclick={() => setReviewFilter('flagged')}
						>
							Flagged ({reviewFilterCounts.flagged})
						</Button>
						<Button
							size="sm"
							variant={reviewFilter === 'unanswered' ? 'soft' : 'ghost'}
							tone={reviewFilter === 'unanswered' ? 'info' : 'neutral'}
							class={reviewFilter === 'unanswered' ? '' : 'border border-border'}
							onclick={() => setReviewFilter('unanswered')}
						>
							Unanswered ({reviewFilterCounts.unanswered})
						</Button>
						<Button
							size="sm"
							variant={reviewFilter === 'incorrect' ? 'soft' : 'ghost'}
							tone={reviewFilter === 'incorrect' ? 'error' : 'neutral'}
							class={reviewFilter === 'incorrect' ? '' : 'border border-border'}
							onclick={() => setReviewFilter('incorrect')}
						>
							Incorrect only ({reviewFilterCounts.incorrect})
						</Button>
					</div>

					{#if filteredReviewEntries.length === 0}
						<div class="surface p-5 text-sm text-foreground/60">
							No questions match this filter.
							<Button
								variant="ghost"
								tone="neutral"
								size="xs"
								class="ml-2"
								onclick={() => setReviewFilter('all')}
							>
								Show all
							</Button>
						</div>
					{:else}
						<!-- Horizontal question navigator -->
						<div
							class="flex flex-row w-full overflow-x-auto overflow-y-hidden whitespace-nowrap space-x-4 relative items-center border border-border px-6 py-3 rounded-4xl h-20 min-h-20 max-h-20 flex-none"
						>
							{#each filteredReviewEntries as entry, idx (entry.item._id)}
								{@const item = entry.item}
								{@const isCorrect = item.score?.isCorrect === true}
								{@const unanswered = isUnansweredItem(item)}
								{@const navSelected = idx === selectedIndex}
								<div class="relative inline-flex">
									{#if item.response?.isFlagged}
										<span
											class="absolute start-0 top-0 z-[1] inline-block size-2.5 rounded-full bg-warning -translate-x-1/4 -translate-y-1/4"
										></span>
									{/if}
									<Button
										bind:ref={questionButtons[idx]}
										variant={unanswered && !navSelected ? 'outline' : 'soft'}
										tone={navSelected
											? 'primary'
											: unanswered
												? 'neutral'
												: isCorrect
													? 'success'
													: 'error'}
										shape="circle"
										size="md"
										onclick={() => goToReviewQuestion(idx)}
										title={`Question ${entry.originalIndex + 1} - ${isCorrect ? 'Correct' : unanswered ? 'Skipped' : 'Incorrect'}`}
									>
										{entry.originalIndex + 1}
									</Button>
								</div>
							{/each}
						</div>
					{/if}

					<!-- Selected question review -->
					{#if selectedItem}
						<div class="text-md sm:text-lg lg:text-xl p-4 sm:pe-4">
							<div class="flex flex-row justify-between items-start mb-1">
								<div>
									<div class="text-xs text-foreground/40 font-medium">
										Question {selectedOriginalIndex + 1} of {reviewEntries.length}
										{#if reviewFilter !== 'all'}
											<span class="text-foreground/30 mx-1">·</span>
											<span>Filtered {selectedIndex + 1} of {filteredReviewEntries.length}</span>
										{/if}
										{#if selectedItem.moduleTitle}
											<span class="text-foreground/30 mx-1">·</span>
											<span>{selectedItem.moduleTitle}</span>
										{/if}
									</div>
									<div class="mt-1.5">
										<Badge
											variant="solid"
											size="sm"
											tone={isSkippedItem(selectedItem)
												? 'warning'
												: selectedItem.score?.isCorrect
													? 'success'
													: 'error'}
										>
											{isSkippedItem(selectedItem)
												? 'Skipped'
												: selectedItem.score?.isCorrect
													? 'Correct'
													: 'Incorrect'}
										</Badge>
										{#if selectedItem.response?.isFlagged}
											<Badge variant="solid" tone="warning" size="sm" class="ml-1">Flagged</Badge>
										{/if}
									</div>
								</div>
								<div class="text-xs text-foreground/40 flex items-center gap-1">
									<Clock size={12} />
									{formatClock(selectedItem.response?.timeSpentMs ?? 0)}
								</div>
							</div>

							<div class="text-base sm:text-xl leading-tight tiptap-content font-medium ms-2 mt-4">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html sanitizeHtml(selectedItem.question.stem)}
							</div>

							<ExamFindings
								findings={selectedItem.question.examFindings}
								compact={selectedItem.question.examFindingsStyle === 'compact'}
								class="ms-2"
							/>

							{#if isFitb(selectedItem.question.type)}
								<div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 ms-2">
									<div class="rounded-full border-2 border-border bg-muted p-3 px-6">
										<div class="text-xs text-foreground/40 mb-1">Your answer</div>
										<div class="font-medium text-sm">
											{selectedItem.response?.textResponse ||
												selectedItem.response?.selectedOptions?.[0] ||
												'No answer given'}
										</div>
									</div>
									<div class="rounded-full border-2 border-success/30 bg-success/5 p-3 px-6">
										<div class="text-xs text-foreground/40 mb-1">Correct answer</div>
										<div class="font-medium text-sm text-success-ink">
											{#each selectedItem.correctAnswerDisplay as ans, i (i)}
												{#if i > 0},
												{/if}{ans}
											{/each}
										</div>
									</div>
								</div>
							{:else if isMatching(selectedItem.question.type)}
								{@const rows = matchingReviewRows(selectedItem)}
								{@const stats = matchingReviewStats(selectedItem)}
								<div class="mt-5 ms-2 space-y-3">
									<div class="flex flex-wrap gap-2">
										<Badge variant="soft" size="md">
											Matched: {stats.correct}/{stats.total}
										</Badge>
										{#if stats.incorrect > 0}
											<Badge variant="soft" tone="error" size="md">
												Incorrect: {stats.incorrect}
											</Badge>
										{/if}
										{#if stats.unanswered > 0}
											<Badge variant="soft" tone="warning" size="md">
												Skipped: {stats.unanswered}
											</Badge>
										{/if}
									</div>

									{#if rows.length === 0}
										<div class="surface-sm p-4 text-sm text-foreground/50">
											No matching pairs found for this question.
										</div>
									{:else}
										<div class="surface-inset overflow-hidden divide-y divide-border/40">
											{#each rows as row (row.promptId)}
												<div
													class="flex items-start gap-2.5 px-3 py-2.5 {row.isCorrect
														? 'bg-success/[0.03]'
														: row.isAnswered
															? 'bg-error/[0.03]'
															: ''}"
												>
													<div class="pt-0.5 shrink-0">
														{#if row.isCorrect}
															<CheckCircle2 size={15} class="text-success" />
														{:else if row.isAnswered}
															<XCircle size={15} class="text-error" />
														{:else}
															<MinusCircle size={15} class="text-warning" />
														{/if}
													</div>
													<div class="min-w-0 flex-1">
														<div class="text-sm font-medium">{row.promptText}</div>
														{#if row.isCorrect}
															<div class="text-sm text-success-ink mt-0.5">
																{row.correctAnswerText}
															</div>
														{:else if row.isAnswered}
															<div class="text-sm text-error-ink line-through mt-0.5">
																{row.userAnswerText}
															</div>
															<div class="text-sm text-success-ink mt-0.5 flex items-center gap-1">
																<ArrowRight size={11} class="shrink-0 text-success/50" />
																{row.correctAnswerText}
															</div>
														{:else}
															<div class="text-sm text-warning-ink italic mt-0.5">No answer</div>
															<div class="text-sm text-success-ink mt-0.5 flex items-center gap-1">
																<ArrowRight size={11} class="shrink-0 text-success/50" />
																{row.correctAnswerText}
															</div>
														{/if}
													</div>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{:else}
								{@const mcqAnalysis = multiSelectAnalysis(selectedItem)}
								<div class="flex flex-wrap gap-2 mt-4 ms-2">
									<Badge variant="soft" size="md">
										Selected {selectedItem.response?.selectedOptions?.length ?? 0}
									</Badge>
									<Badge variant="soft" tone="success" size="md">
										Correct picks: {mcqAnalysis.correctlySelectedCount}
									</Badge>
									{#if mcqAnalysis.missedCorrectCount > 0}
										<Badge variant="soft" tone="warning" size="md">
											Missed correct: {mcqAnalysis.missedCorrectCount}
										</Badge>
									{/if}
									{#if mcqAnalysis.incorrectSelectedCount > 0}
										<Badge variant="soft" tone="error" size="md">
											Wrong picks: {mcqAnalysis.incorrectSelectedCount}
										</Badge>
									{/if}
									{#if !selectedItem.score?.isCorrect && mcqAnalysis.hasPartialCreditLikePattern}
										<Badge variant="soft" size="md">
											Partially correct selections (score still counted as incorrect)
										</Badge>
									{/if}
								</div>
								<div class="flex flex-col justify-start space-y-2 md:space-y-3 lg:space-y-4 mt-5">
									{#each selectedItem.question.options as option, i (option.id)}
										{@const selected = (selectedItem.response?.selectedOptions ?? []).includes(
											option.id
										)}
										{@const correct = (selectedItem.correctAnswerDisplay ?? []).includes(option.id)}
										<label
											class="rounded-full flex items-center transition-colors border-2 p-2 md:p-3
											{correct
												? 'border-success bg-success/5'
												: selected
													? 'border-error bg-error/5'
													: 'border-border bg-muted'}"
										>
											<Checkbox
												class="size-4 ms-4 disabled:opacity-100 {correct
													? 'border-success data-checked:border-success data-checked:bg-success data-checked:text-success-foreground'
													: selected
														? 'border-error data-checked:border-error data-checked:bg-error data-checked:text-error-foreground'
														: ''}"
												checked={selected}
												disabled
											/>
											<span
												class="grow text-wrap break-words ml-3 md:ml-4 my-3 text-sm md:text-base"
											>
												<span class="font-semibold mr-2 select-none"
													>{String.fromCharCode(65 + i)}.</span
												>
												<!-- eslint-disable-next-line svelte/no-at-html-tags -->
												<span class="tiptap-content">{@html sanitizeHtml(option.text)}</span>
											</span>
											{#if correct}
												<Badge variant="soft" tone="success" size="sm" class="mr-4">Correct</Badge>
											{:else if selected}
												<Badge variant="soft" tone="error" size="sm" class="mr-4">Your pick</Badge>
											{/if}
										</label>
									{/each}
								</div>
							{/if}

							<!-- Rationale -->
							{#if hasRationale(selectedItem.question)}
								<Card.Root class="mt-6 ms-2 py-0 shadow-xl">
									<Card.Content class="p-8">
										<h3 class="text-base font-semibold">Rationale</h3>
										<div class="tiptap-content text-sm text-foreground/80">
											<!-- eslint-disable-next-line svelte/no-at-html-tags -->
											{@html sanitizeHtml(getRationale(selectedItem.question))}
										</div>
										<QuestionSources source={selectedItem.question.source} />
									</Card.Content>
								</Card.Root>
							{:else}
								<div class="surface-sm p-4 mt-6 ms-2">
									<div class="text-sm text-foreground/40">
										No rationale available for this question.
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Fixed bottom nav bar for review -->
			<div class={DOCK_ISLAND_CLASS}>
				<Button
					class={dockGlass('soft')}
					size="sm"
					variant="soft"
					tone="neutral"
					onclick={() => (tab = 'summary')}
				>
					<BarChart3 size={16} />
					Summary
				</Button>

				<span
					class="mx-1 h-7 w-px shrink-0 bg-linear-to-b from-transparent via-foreground/18 to-transparent"
					aria-hidden="true"
				></span>

				<Button
					class={dockGlass('outline')}
					variant="outline"
					tone="neutral"
					shape="segment-start"
					onclick={() => goToAdjacentReviewQuestion(-1)}
					disabled={selectedIndex === 0}
				>
					<ArrowLeft size={18} />
				</Button>
				<Button
					class={dockGlass('outline')}
					variant="outline"
					tone="neutral"
					shape="segment-end"
					onclick={() => goToAdjacentReviewQuestion(1)}
					disabled={selectedIndex === (filteredReviewEntries.length || 1) - 1}
				>
					<ArrowRight size={18} />
				</Button>
			</div>

			<!-- Mobile bottom nav for review -->
			<div
				class="md:hidden bottom-dock fixed inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-3 pt-2 flex items-center justify-between gap-2"
			>
				<Button
					variant="outline"
					tone="neutral"
					class="min-h-11"
					onclick={() => goToAdjacentReviewQuestion(-1)}
					disabled={selectedIndex === 0}
				>
					<ArrowLeft size={16} /> Prev
				</Button>
				<Button variant="soft" tone="neutral" class="min-h-11" onclick={() => (tab = 'summary')}>
					Summary
				</Button>
				<Button
					variant="outline"
					tone="neutral"
					class="min-h-11"
					onclick={() => goToAdjacentReviewQuestion(1)}
					disabled={selectedIndex === (filteredReviewEntries.length || 1) - 1}
				>
					Next <ArrowRight size={16} />
				</Button>
			</div>
		{/if}
	{/if}
</div>
