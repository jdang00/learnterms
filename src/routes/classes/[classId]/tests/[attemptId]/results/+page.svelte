<script lang="ts">
	import { page } from '$app/state';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../../../../convex/_generated/api';
	import type { Id } from '../../../../../../convex/_generated/dataModel';
	import QuestionAttachmentsSidebar from '$lib/components/QuestionAttachmentsSidebar.svelte';
	import { fade, slide } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import createDOMPurify from 'dompurify';
	import {
		ChevronLeft,
		PanelRight,
		Clock,
		Target,
		Flag,
		CheckCircle2,
		XCircle,
		MinusCircle,
		ArrowLeft,
		ArrowRight,
		BarChart3,
		BookOpen,
		Plus
	} from 'lucide-svelte';

	const classId = $derived(page.params.classId as Id<'class'>);
	const attemptId = $derived(page.params.attemptId as Id<'quizAttempts'>);

	const resultsQuery = useQuery(api.customQuiz.getAttemptResults, () =>
		attemptId ? { attemptId } : 'skip'
	);
	type ResultsQueryData = NonNullable<typeof resultsQuery.data>;
	type ReviewItem = ResultsQueryData['reviewItems'][number];
	let domPurify: ReturnType<typeof createDOMPurify> | null = null;

	let selectedIndex = $state(0);
	let tab = $state<'summary' | 'review'>('summary');
	let hideSidebar = $state(false);
	let questionButtons = $state<HTMLButtonElement[]>([]);

	function formatDuration(ms: number) {
		const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
		const h = Math.floor(totalSec / 3600);
		const m = Math.floor((totalSec % 3600) / 60);
		const s = totalSec % 60;
		return h > 0
			? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
			: `${m}:${String(s).padStart(2, '0')}`;
	}

	function isFitb(type: string) {
		return String(type || '').toLowerCase() === 'fill_in_the_blank';
	}

	function isMatching(type: string) {
		return String(type || '').toLowerCase() === 'matching';
	}

	function sanitizeHtml(value: string | undefined | null) {
		const raw = String(value ?? '');
		if (typeof window === 'undefined') {
			return raw
				.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
				.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
				.replace(/\son[a-z]+\s*=\s*(["'])[\s\S]*?\1/gi, '')
				.replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
		}
		domPurify ??= createDOMPurify(window);
		return domPurify.sanitize(raw);
	}

	function optionTextById(item: ReviewItem, id: string) {
		return item.question.options.find((o) => o.id === id)?.text ?? id;
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
				const [promptId, answerId] = String(value).split('::');
				return promptId && answerId ? { promptId, answerId } : null;
			})
			.filter((pair): pair is { promptId: string; answerId: string } => Boolean(pair));
	}

	function friendlyTypeName(raw: string): string {
		switch (raw) {
			case 'multiple_choice': return 'Multiple Choice';
			case 'fill_in_the_blank': return 'Fill in the Blank';
			case 'matching': return 'Matching';
			default: return raw;
		}
	}

	function friendlyStatus(status: string): string {
		switch (status) {
			case 'submitted': return 'Completed';
			case 'timed_out': return 'Time Expired';
			case 'abandoned': return 'Abandoned';
			default: return status.replace('_', ' ');
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

	const selectedItem = $derived(resultsQuery.data?.reviewItems?.[selectedIndex] ?? null);

	$effect(() => {
		const len = resultsQuery.data?.reviewItems?.length ?? 0;
		if (selectedIndex >= len) selectedIndex = Math.max(0, len - 1);
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
		selectedIndex = idx;
		scrollToCurrentButton();
	}
</script>

<div class="flex flex-col h-[calc(100vh-4rem)]" transition:fade={{ duration: 200 }}>
	{#if resultsQuery.isLoading}
		<div class="flex-1 flex items-center justify-center">
			<div class="text-center">
				<span class="loading loading-spinner loading-lg text-primary"></span>
				<p class="text-base-content/60 mt-3">Loading your results...</p>
			</div>
		</div>
	{:else if resultsQuery.error}
		<div class="flex-1 flex items-center justify-center p-4">
			<div class="alert alert-error rounded-2xl max-w-md">
				<span>{resultsQuery.error.toString()}</span>
			</div>
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
							<a
								class="btn btn-ghost btn-sm font-bold rounded-full text-secondary mb-2"
								href="/classes?classId={classId}"
							>
								<ChevronLeft size={16} /> Back to Class
							</a>
							<h1 class="text-2xl sm:text-3xl font-bold">Your Results</h1>
							<p class="text-sm text-base-content/50 mt-1">
								{friendlyStatus(attempt.status)} · {attempt.className ?? 'Test'}
							</p>
						</div>
						<div class="flex gap-2">
							<a class="btn btn-ghost btn-sm rounded-full" href={`/classes/${classId}/tests/new`}>
								<Plus size={16} />
								New Test
							</a>
						</div>
					</div>

					<!-- Score hero card -->
					<div class="card bg-base-100 border border-base-300 rounded-2xl shadow-sm overflow-hidden">
						<div class="card-body p-6 sm:p-8">
							<div class="flex flex-col sm:flex-row items-center sm:items-start gap-8">
								<div class="flex flex-col items-center text-center shrink-0">
									<div class="radial-progress text-4xl font-bold {summary?.passed ? 'text-success' : 'text-error'}"
										style="--value:{summary?.scorePct ?? 0}; --size:10rem; --thickness: 8px;"
										role="progressbar"
									>
										{summary?.scorePct ?? 0}%
									</div>
									<div class="badge rounded-full mt-4 {summary?.passed ? 'badge-success' : 'badge-error'} badge-lg font-semibold px-5 py-3">
										{summary?.passed ? 'Passed' : 'Not Passed'}
									</div>
								</div>

								<div class="flex-1 w-full">
									<div class="grid grid-cols-3 gap-3">
										<div class="rounded-xl border border-success/20 bg-success/5 p-4 text-center">
											<CheckCircle2 class="mx-auto text-success mb-1" size={20} />
											<div class="font-bold text-2xl text-success">{summary?.correctCount ?? 0}</div>
											<div class="text-xs text-base-content/50">Correct</div>
										</div>
										<div class="rounded-xl border border-error/20 bg-error/5 p-4 text-center">
											<XCircle class="mx-auto text-error mb-1" size={20} />
											<div class="font-bold text-2xl text-error">{summary?.incorrectCount ?? 0}</div>
											<div class="text-xs text-base-content/50">Incorrect</div>
										</div>
										<div class="rounded-xl border border-base-300 p-4 text-center">
											<MinusCircle class="mx-auto text-base-content/30 mb-1" size={20} />
											<div class="font-bold text-2xl">{summary?.unansweredCount ?? 0}</div>
											<div class="text-xs text-base-content/50">Skipped</div>
										</div>
									</div>

									<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
										<div class="rounded-xl border border-base-300 p-3 flex items-center gap-2">
											<Target size={14} class="text-base-content/40 shrink-0" />
											<div>
												<div class="text-xs text-base-content/40">Pass at</div>
												<div class="font-semibold">{summary?.passThresholdPct ?? 0}%</div>
											</div>
										</div>
										<div class="rounded-xl border border-base-300 p-3 flex items-center gap-2">
											<Clock size={14} class="text-base-content/40 shrink-0" />
											<div>
												<div class="text-xs text-base-content/40">Time</div>
												<div class="font-semibold tabular-nums">{formatDuration(attempt.elapsedMs)}</div>
											</div>
										</div>
										<div class="rounded-xl border border-base-300 p-3 flex items-center gap-2">
											<Flag size={14} class="text-base-content/40 shrink-0" />
											<div>
												<div class="text-xs text-base-content/40">Flagged</div>
												<div class="font-semibold">{attempt.progressCounters?.flaggedCount ?? 0}</div>
											</div>
										</div>
										<div class="rounded-xl border border-base-300 p-3 flex items-center gap-2">
											<BookOpen size={14} class="text-base-content/40 shrink-0" />
											<div>
												<div class="text-xs text-base-content/40">Questions</div>
												<div class="font-semibold">{attempt.configSnapshot?.questionCountActual ?? '—'}</div>
											</div>
										</div>
									</div>

									{#if attempt.configSnapshot?.moduleIds?.length > 0 || attempt.timeLimitSec}
										<div class="flex flex-wrap gap-2 mt-3">
											{#if attempt.timeLimitSec}
												<div class="badge badge-soft badge-sm rounded-full">
													<Clock size={10} class="mr-1" />
													{Math.round(attempt.timeLimitSec / 60)} min limit
												</div>
											{:else}
												<div class="badge badge-soft badge-sm rounded-full">Untimed</div>
											{/if}
											<div class="badge badge-soft badge-sm rounded-full">
												{attempt.configSnapshot.moduleIds.length} {attempt.configSnapshot.moduleIds.length === 1 ? 'module' : 'modules'}
											</div>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>

					<!-- Review CTA -->
					<button
						class="btn btn-primary rounded-full w-full py-4 text-base gap-2 group shadow-lg hover:shadow-xl transition-all duration-200"
						onclick={() => (tab = 'review')}
					>
						<BookOpen size={20} class="transition-transform group-hover:scale-110" />
						Review Your Answers
					</button>

					<!-- Breakdowns -->
					<div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
						<div class="card bg-base-100 border border-base-300 rounded-2xl shadow-sm">
							<div class="card-body">
								<h2 class="card-title text-base flex items-center gap-2">
									<BarChart3 size={16} class="text-base-content/50" />
									By Module
								</h2>
								{#if !summary?.byModule?.length}
									<p class="text-sm text-base-content/50">No module data available.</p>
								{:else}
									<div class="space-y-2">
										{#each summary.byModule as row (row.moduleId)}
											<div class="border border-base-300 rounded-xl p-3">
												<div class="flex items-center justify-between gap-2">
													<div class="font-medium text-sm">{row.moduleTitle}</div>
													<div class="badge badge-soft rounded-full text-xs {row.accuracyPct >= (summary?.passThresholdPct ?? 70) ? 'badge-success' : 'badge-error'}">{row.accuracyPct}%</div>
												</div>
												<div class="flex gap-3 text-xs text-base-content/50 mt-1.5">
													<span class="text-success">{row.correct} correct</span>
													<span class="text-error">{row.incorrect} incorrect</span>
													{#if row.unanswered > 0}
														<span>{row.unanswered} skipped</span>
													{/if}
												</div>
												<progress
													class="progress progress-sm mt-2 {row.accuracyPct >= (summary?.passThresholdPct ?? 70) ? 'progress-success' : 'progress-error'}"
													value={row.accuracyPct}
													max="100"
												></progress>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>

						<div class="card bg-base-100 border border-base-300 rounded-2xl shadow-sm">
							<div class="card-body">
								<h2 class="card-title text-base flex items-center gap-2">
									<BarChart3 size={16} class="text-base-content/50" />
									By Question Type
								</h2>
								{#if !summary?.byType?.length}
									<p class="text-sm text-base-content/50">No type data available.</p>
								{:else}
									<div class="space-y-2">
										{#each summary.byType as row (row.questionType)}
											<div class="border border-base-300 rounded-xl p-3">
												<div class="flex items-center justify-between gap-2">
													<div class="font-medium text-sm">{friendlyTypeName(row.questionType)}</div>
													<div class="badge badge-soft rounded-full text-xs {row.accuracyPct >= (summary?.passThresholdPct ?? 70) ? 'badge-success' : 'badge-error'}">{row.accuracyPct}%</div>
												</div>
												<div class="flex gap-3 text-xs text-base-content/50 mt-1.5">
													<span class="text-success">{row.correct} correct</span>
													<span class="text-error">{row.incorrect} incorrect</span>
													{#if row.unanswered > 0}
														<span>{row.unanswered} skipped</span>
													{/if}
												</div>
												<progress
													class="progress progress-sm mt-2 {row.accuracyPct >= (summary?.passThresholdPct ?? 70) ? 'progress-success' : 'progress-error'}"
													value={row.accuracyPct}
													max="100"
												></progress>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- Review view - matches free study module layout -->
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
									<ChevronLeft size={16} /> {attempt.className ?? 'Class'}
								</a>
							</h4>
							<h2 class="font-semibold text-2xl mt-2 flex items-start gap-3 min-w-0">
								<span class="text-2xl shrink-0">📋</span>
								<span class="break-words hyphens-auto overflow-hidden">Review Mode</span>
							</h2>
							<p class="text-base-content/60 mt-2 text-sm">
								Step through each question to see the correct answer and explanation.
							</p>

							<div class="mt-6">
								<div class="flex items-center gap-3 text-sm">
									<div class="radial-progress text-sm font-bold {summary?.passed ? 'text-success' : 'text-error'}"
										style="--value:{summary?.scorePct ?? 0}; --size:3rem; --thickness: 3px;"
										role="progressbar"
									>
										{summary?.scorePct ?? 0}%
									</div>
									<div>
										<div class="font-semibold">{summary?.passed ? 'Passed' : 'Not Passed'}</div>
										<div class="text-xs text-base-content/50">{summary?.scoreEarned ?? 0}/{summary?.scorePossible ?? 0} points</div>
									</div>
								</div>
							</div>

							<div class="grid grid-cols-3 gap-2 text-sm mt-5">
								<div class="rounded-xl border border-base-300 p-2 text-center">
									<div class="font-bold text-success">{summary?.correctCount ?? 0}</div>
									<div class="text-[10px] text-base-content/40">Correct</div>
								</div>
								<div class="rounded-xl border border-base-300 p-2 text-center">
									<div class="font-bold text-error">{summary?.incorrectCount ?? 0}</div>
									<div class="text-[10px] text-base-content/40">Wrong</div>
								</div>
								<div class="rounded-xl border border-base-300 p-2 text-center">
									<div class="font-bold">{summary?.unansweredCount ?? 0}</div>
									<div class="text-[10px] text-base-content/40">Skipped</div>
								</div>
							</div>
						</div>

						<div class="flex flex-col justify-center m-4 gap-3">
							<button
								class="btn btn-soft btn-sm rounded-full"
								onclick={() => (tab = 'summary')}
							>
								<BarChart3 size={16} />
								Back to Summary
							</button>
							<a
								class="btn btn-soft btn-primary btn-sm rounded-full"
								href={`/classes/${classId}/tests/new`}
							>
								<Plus size={16} />
								New Test
							</a>

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
								class="group flex items-center justify-center font-bold text-secondary-content bg-secondary text-center w-full rounded-full transition-colors"
								href={`/classes?classId=${classId}`}
							>
								<span class="group-hover:hidden">📋</span>
								<span class="hidden group-hover:inline-flex items-center justify-center"
									><ChevronLeft size={24} /></span
								>
							</a>
							<div
								class="radial-progress {summary?.passed ? 'text-success' : 'text-error'} text-xs bg-base-300"
								style="--value:{summary?.scorePct ?? 0}; --size:3rem; --thickness: 3px;"
								role="progressbar"
							>
								{summary?.scorePct ?? 0}%
							</div>
							<button
								class="btn btn-circle btn-lg btn-soft"
								onclick={() => (tab = 'summary')}
								title="Back to Summary"
							>
								<BarChart3 size={20} />
							</button>
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
					<button
						class="btn btn-ghost btn-sm rounded-full text-secondary"
						onclick={() => (tab = 'summary')}
					>
						<ChevronLeft size={16} /> Summary
					</button>
					<div class="badge rounded-full {summary?.passed ? 'badge-success' : 'badge-error'} badge-sm">
						{summary?.scorePct ?? 0}%
					</div>
				</div>

				<!-- Main review content -->
				<div class="w-full lg:flex-1 lg:min-w-0 flex flex-col max-w-full lg:max-w-none overflow-y-auto flex-grow min-h-0 h-full pb-24 sm:pb-36 lg:pb-48 relative">

					<!-- Horizontal question navigator -->
					<div class="flex flex-row w-full overflow-x-auto overflow-y-hidden whitespace-nowrap space-x-4 relative items-center border border-base-300 px-6 py-3 rounded-4xl h-20 min-h-20 max-h-20 flex-none">
						{#each resultsQuery.data.reviewItems as item, idx (item._id)}
							{@const isCorrect = item.score?.isCorrect === true}
							{@const unanswered = !item.response?.selectedOptions?.length && !String(item.response?.textResponse ?? '').trim()}
							<div class="indicator">
								{#if item.response?.isFlagged}
										<span class="indicator-item indicator-start badge badge-warning badge-xs -translate-x-1/4 -translate-y-1/4 z-[1]"></span>
								{/if}
								<button
									bind:this={questionButtons[idx]}
									class="btn btn-circle btn-md btn-soft {idx === selectedIndex ? 'btn-primary' : unanswered ? 'btn-outline' : isCorrect ? 'btn-success' : 'btn-error'}"
									onclick={() => goToReviewQuestion(idx)}
									title={`Question ${idx + 1} - ${isCorrect ? 'Correct' : unanswered ? 'Skipped' : 'Incorrect'}`}
								>
									{idx + 1}
								</button>
							</div>
						{/each}
					</div>

					<!-- Selected question review -->
					{#if selectedItem}
						<div class="text-md sm:text-lg lg:text-xl p-4 sm:pe-4">
							<div class="flex flex-row justify-between items-start mb-1">
								<div>
									<div class="text-xs text-base-content/40 font-medium">
										Question {selectedIndex + 1} of {resultsQuery.data.reviewItems.length}
										{#if selectedItem.moduleTitle}
											<span class="text-base-content/30 mx-1">·</span>
											<span>{selectedItem.moduleTitle}</span>
										{/if}
									</div>
									<div class="mt-1.5">
										<span class="badge rounded-full badge-sm {selectedItem.score?.isCorrect ? 'badge-success' : 'badge-error'}">
											{selectedItem.score?.isCorrect ? 'Correct' : 'Incorrect'}
										</span>
										{#if selectedItem.response?.isFlagged}
											<span class="badge rounded-full badge-sm badge-warning ml-1">Flagged</span>
										{/if}
									</div>
								</div>
								<div class="text-xs text-base-content/40 flex items-center gap-1">
									<Clock size={12} />
									{formatDuration(selectedItem.response?.timeSpentMs ?? 0)}
								</div>
							</div>

							<div class="text-base sm:text-xl leading-tight tiptap-content font-medium ms-2 mt-4">
									{@html sanitizeHtml(selectedItem.question.stem)}
							</div>

							{#if isFitb(selectedItem.question.type)}
								<div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 ms-2">
									<div class="rounded-full border-2 border-base-300 bg-base-200 p-3 px-6">
										<div class="text-xs text-base-content/40 mb-1">Your answer</div>
										<div class="font-medium text-sm">
											{selectedItem.response?.textResponse || selectedItem.response?.selectedOptions?.[0] || 'No answer given'}
										</div>
									</div>
									<div class="rounded-full border-2 border-success/30 bg-success/5 p-3 px-6">
										<div class="text-xs text-base-content/40 mb-1">Correct answer</div>
										<div class="font-medium text-sm text-success">
											{#each selectedItem.correctAnswerDisplay as ans, i (i)}
												{#if i > 0}, {/if}{ans}
											{/each}
										</div>
									</div>
								</div>
							{:else if isMatching(selectedItem.question.type)}
								<div class="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4 ms-2">
									<div class="rounded-xl border-2 border-base-300 p-4">
										<div class="text-xs uppercase text-base-content/40 mb-2">Your matches</div>
										{#if parseMatchingPairs(selectedItem.response?.selectedOptions ?? []).length === 0}
											<div class="text-sm text-base-content/50">No answer given</div>
										{:else}
											<div class="space-y-2">
												{#each parseMatchingPairs(selectedItem.response?.selectedOptions ?? []) as pair, i (i)}
													<div class="text-sm flex items-center gap-2">
														<span class="font-medium">
															{promptLabel(optionTextById(selectedItem, pair.promptId))}
														</span>
														<ArrowRight size={12} class="text-base-content/30 shrink-0" />
														<span>{answerLabel(optionTextById(selectedItem, pair.answerId))}</span>
													</div>
												{/each}
											</div>
										{/if}
									</div>
									<div class="rounded-xl border-2 border-success/30 bg-success/5 p-4">
										<div class="text-xs uppercase text-base-content/40 mb-2">Correct matches</div>
										<div class="space-y-2">
											{#each parseMatchingPairs(selectedItem.correctAnswerDisplay ?? []) as pair, i (i)}
												<div class="text-sm flex items-center gap-2">
													<span class="font-medium">
														{promptLabel(optionTextById(selectedItem, pair.promptId))}
													</span>
													<ArrowRight size={12} class="text-success/50 shrink-0" />
													<span class="text-success">{answerLabel(optionTextById(selectedItem, pair.answerId))}</span>
												</div>
											{/each}
										</div>
									</div>
								</div>
							{:else}
								{@const mcqAnalysis = multiSelectAnalysis(selectedItem)}
								<div class="flex flex-wrap gap-2 mt-4 ms-2">
									<div class="badge badge-soft rounded-full">
										Selected {selectedItem.response?.selectedOptions?.length ?? 0}
									</div>
									<div class="badge badge-success badge-soft rounded-full">
										Correct picks: {mcqAnalysis.correctlySelectedCount}
									</div>
									{#if mcqAnalysis.missedCorrectCount > 0}
										<div class="badge badge-warning badge-soft rounded-full">
											Missed correct: {mcqAnalysis.missedCorrectCount}
										</div>
									{/if}
									{#if mcqAnalysis.incorrectSelectedCount > 0}
										<div class="badge badge-error badge-soft rounded-full">
											Wrong picks: {mcqAnalysis.incorrectSelectedCount}
										</div>
									{/if}
									{#if !selectedItem.score?.isCorrect && mcqAnalysis.hasPartialCreditLikePattern}
										<div class="badge badge-ghost rounded-full">
											Partially correct selections (score still counted as incorrect)
										</div>
									{/if}
								</div>
								<div class="flex flex-col justify-start space-y-2 md:space-y-3 lg:space-y-4 mt-5">
									{#each selectedItem.question.options as option, i (option.id)}
										{@const selected = (selectedItem.response?.selectedOptions ?? []).includes(option.id)}
										{@const correct = (selectedItem.correctAnswerDisplay ?? []).includes(option.id)}
										<label
											class="label rounded-full flex items-center transition-colors border-2 p-2 md:p-3
											{correct ? 'border-success bg-success/5' : selected ? 'border-error bg-error/5' : 'border-base-300 bg-base-200'}"
										>
											<input type="checkbox" class="checkbox checkbox-sm ms-4 {correct ? 'checkbox-success' : selected ? 'checkbox-error' : ''}" checked={selected} disabled />
											<span class="flex-grow text-wrap break-words ml-3 md:ml-4 my-3 text-sm md:text-base">
												<span class="font-semibold mr-2 select-none">{String.fromCharCode(65 + i)}.</span>
													<span class="tiptap-content">{@html sanitizeHtml(option.text)}</span>
											</span>
											{#if correct}
												<span class="badge badge-success badge-soft badge-sm rounded-full mr-4">Correct</span>
											{:else if selected}
												<span class="badge badge-error badge-soft badge-sm rounded-full mr-4">Your pick</span>
											{/if}
										</label>
									{/each}
								</div>
							{/if}

							<!-- Rationale -->
							{#if selectedItem.question.explanation}
								<div class="card bg-base-100 shadow-xl mt-6 rounded-2xl ms-2">
									<div class="card-body">
										<h3 class="card-title text-base">Rationale</h3>
										<div class="tiptap-content text-sm text-base-content/80">
												{@html sanitizeHtml(selectedItem.question.explanation)}
										</div>
									</div>
								</div>
							{:else}
								<div class="rounded-xl border border-base-300 p-4 mt-6 ms-2">
									<div class="text-sm text-base-content/40">No explanation available for this question.</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Fixed bottom nav bar for review -->
			<div
				class="items-center gap-2 px-3 sm:px-4 md:px-5 lg:px-6 py-3 sm:py-4 md:py-5 rounded-full backdrop-blur-md border border-base-300 shadow-xl w-auto fixed left-1/2 -translate-x-1/2 bottom-4 z-40 hidden md:inline-flex"
			>
				<button
					class="btn btn-sm btn-soft rounded-full"
					onclick={() => (tab = 'summary')}
				>
					<BarChart3 size={16} />
					Summary
				</button>

				<div class="divider divider-horizontal mx-1"></div>

				<button
					class="btn btn-sm btn-outline {selectedIndex === 0 ? 'btn-disabled' : ''}"
					style="border-radius: 9999px 50% 50% 9999px;"
					onclick={() => goToReviewQuestion(Math.max(0, selectedIndex - 1))}
					disabled={selectedIndex === 0}
				>
					<ArrowLeft size={18} />
				</button>
				<button
					class="btn btn-sm btn-outline {selectedIndex === (resultsQuery.data?.reviewItems?.length ?? 1) - 1 ? 'btn-disabled' : ''}"
					style="border-radius: 50% 9999px 9999px 50%;"
					onclick={() => goToReviewQuestion(Math.min((resultsQuery.data?.reviewItems?.length ?? 1) - 1, selectedIndex + 1))}
					disabled={selectedIndex === (resultsQuery.data?.reviewItems?.length ?? 1) - 1}
				>
					<ArrowRight size={18} />
				</button>
			</div>

			<!-- Mobile bottom nav for review -->
			<div class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-base-100 border-t border-base-300 p-3 flex items-center justify-between gap-2">
				<button
					class="btn btn-sm btn-outline rounded-full"
					onclick={() => goToReviewQuestion(Math.max(0, selectedIndex - 1))}
					disabled={selectedIndex === 0}
				>
					<ArrowLeft size={16} /> Prev
				</button>
				<button
					class="btn btn-sm btn-soft rounded-full"
					onclick={() => (tab = 'summary')}
				>
					Summary
				</button>
				<button
					class="btn btn-sm btn-outline rounded-full"
					onclick={() => goToReviewQuestion(Math.min((resultsQuery.data?.reviewItems?.length ?? 1) - 1, selectedIndex + 1))}
					disabled={selectedIndex === (resultsQuery.data?.reviewItems?.length ?? 1) - 1}
				>
					Next <ArrowRight size={16} />
				</button>
			</div>

		{/if}
	{/if}
</div>
