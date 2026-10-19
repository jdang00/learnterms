<script lang="ts">
	import { provideStudyToolContext } from '#lib/analytics/studyToolContext.js';
	import QuestionNotesTool from '#lib/components/question-notes/QuestionNotesTool.svelte';
	import CalculatorTool from '#lib/components/calculator/CalculatorTool.svelte';
	import { sidePanel } from '#lib/components/side-panel/state.svelte.js';
	import { useClerkContext } from 'svelte-clerk/client';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../../../../convex/_generated/api';
	import type { Id } from '../../../../../convex/_generated/dataModel';
	import MobileStudyBar from '#lib/components/MobileStudyBar.svelte';
	import QuestionNavigatorSheet from '#lib/components/QuestionNavigatorSheet.svelte';
	import AttemptSidebar from '#lib/tests/AttemptSidebar.svelte';
	import AttemptNavigator from '#lib/tests/AttemptNavigator.svelte';
	import AttemptQuestion from '#lib/tests/AttemptQuestion.svelte';
	import AttemptDock from '#lib/tests/AttemptDock.svelte';
	import AttemptToolsSheet from '#lib/tests/AttemptToolsSheet.svelte';
	import AttemptSubmitSheet from '#lib/tests/AttemptSubmitSheet.svelte';
	import {
		AttemptRunnerState,
		syncStatusIcon,
		syncStatusLabel
	} from '#lib/tests/attempt.svelte.js';
	import { cameFrom } from '#lib/utils/backNavigation.js';
	import { formatClock } from '#lib/utils/format.js';
	import { slide } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Clock from '@lucide/svelte/icons/clock';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Wifi from '@lucide/svelte/icons/wifi';
	import WifiOff from '@lucide/svelte/icons/wifi-off';
	import Send from '@lucide/svelte/icons/send';
	import Calculator from '@lucide/svelte/icons/calculator';
	import StickyNote from '@lucide/svelte/icons/sticky-note';
	import ToolCase from '@lucide/svelte/icons/tool-case';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { LoadingState } from '#lib/components/ui/spinner/index.js';

	let { data } = $props();

	const client = useConvexClient();
	const clerk = useClerkContext();
	const classId = $derived(page.params.classId as Id<'class'>);
	const attemptId = $derived(page.params.attemptId as Id<'quizAttempts'>);

	const runnerQuery = $derived(data.runner);

	const runner = new AttemptRunnerState(
		{
			patchResponses: (args) => client.mutation(api.tests.attempts.patchAttemptResponses, args),
			submit: (args) => client.mutation(api.tests.attempts.submitAttempt, args),
			heartbeat: (args) => client.mutation(api.tests.attempts.heartbeatAttempt, args)
		},
		{ bundle: () => runnerQuery?.data ?? undefined, attemptId: () => attemptId }
	);

	let hideSidebar = $state(false);
	let showSubmitModal = $state(false);
	let navigatorOpen = $state(false);
	let toolsOpen = $state(false);

	async function goBackToClasses() {
		if (cameFrom('/classes')) history.back();
		else await goto(resolve('/classes'), { state: { classId } });
	}

	provideStudyToolContext(() => ({
		surface: 'test_attempt',
		classId,
		attemptId,
		questionId: runner.currentItem?.questionId,
		moduleId: runner.currentItem?.moduleId,
		questionType: runner.currentItem?.question.type
	}));

	async function submitAttempt(auto = false) {
		const submitted = await runner.submitAttempt();
		if (!submitted) return;
		const resultsHref = resolve('/classes/[classId]/tests/[attemptId]/results', {
			classId,
			attemptId
		});
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() plus a query string
		await goto(auto ? `${resultsHref}?autoSubmit=1` : resultsHref);
	}

	$effect(() => {
		runner.hydrateFromBundle();
	});

	$effect(() => {
		const item = runner.currentItem;
		if (item) runner.markVisited(item._id);
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

		switch (event.key) {
			case 'ArrowRight':
				event.preventDefault();
				runner.nextQuestion();
				break;
			case 'ArrowLeft':
				event.preventDefault();
				runner.previousQuestion();
				break;
			case 'Tab':
				// Main quiz reveals rationale on Tab; test mode is submit-only.
				break;
			case 'Escape':
				event.preventDefault();
				runner.clearCurrent();
				break;
			case 'f':
			case 'F':
				event.preventDefault();
				runner.toggleCurrentFlag();
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
			case '0':
				if (runner.selectOptionByDigit(event.key)) event.preventDefault();
				break;
		}
	}

	onMount(() => {
		const onVisibility = () => {
			if (document.visibilityState === 'hidden') void runner.flushSync(true);
		};
		const onPageHide = () => {
			void runner.flushSync(true);
		};
		document.addEventListener('visibilitychange', onVisibility);
		window.addEventListener('pagehide', onPageHide);
		document.addEventListener('keydown', handleRunnerKeydown);

		runner.startClock();
		const tickerHandle = window.setInterval(() => {
			if (runner.tick()) void submitAttempt(true);
		}, 1000);
		const heartbeatHandle = window.setInterval(() => runner.heartbeat(), 5000);

		return () => {
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('pagehide', onPageHide);
			document.removeEventListener('keydown', handleRunnerKeydown);
			runner.dispose();
			clearInterval(tickerHandle);
			clearInterval(heartbeatHandle);
		};
	});
</script>

<div class="flex flex-col h-dvh lg:h-[calc(100dvh-4rem)]">
	{#if runnerQuery?.isLoading}
		<LoadingState label="Loading your test…" class="flex-1 text-base" />
	{:else if !runnerQuery || runnerQuery.error}
		<div class="flex-1 flex items-center justify-center p-4">
			<Alert.Root tone="error" class="max-w-md">
				<CircleAlert />
				<Alert.Title>{data.loadError ?? runnerQuery?.error?.toString()}</Alert.Title>
			</Alert.Root>
		</div>
	{:else if runnerQuery.data}
		{#if runnerQuery.data.attempt.status !== 'in_progress'}
			<div class="flex-1 flex items-center justify-center p-4">
				<Card.Root class="max-w-md w-full">
					<Card.Content class="text-center">
						<CheckCircle2 class="mx-auto text-success mb-2" size={48} />
						<h1 class="font-display text-xl font-bold">Test Complete</h1>
						<p class="text-sm text-foreground/60 mt-1">This test has already been submitted.</p>
						<div class="mt-4 flex justify-center">
							<Button
								href={resolve('/classes/[classId]/tests/[attemptId]/results', {
									classId,
									attemptId
								})}
							>
								View Results
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{:else}
			<div
				class="flex flex-col lg:flex-row bg-background h-full overflow-hidden lg:p-4 lg:gap-8 transition-all duration-500 ease-in-out"
				transition:slide={{ duration: 400, easing: cubicInOut, axis: 'y' }}
			>
				<AttemptSidebar
					{runner}
					className={runnerQuery.data.attempt.className}
					bind:hidden={hideSidebar}
					onBack={goBackToClasses}
				/>

				<MobileStudyBar
					title={runnerQuery.data.attempt.className}
					emoji="📝"
					subtitle="Question {runner.currentIndex + 1} of {runner.itemCount}"
					backLabel="Leave test"
					onback={goBackToClasses}
					onnavigate={() => (navigatorOpen = true)}
				>
					{#snippet trailing()}
						<span
							class="flex shrink-0 items-center gap-1 px-2 text-sm font-semibold tabular-nums {runner.remainingMs !==
								null && runner.remainingMs <= 60_000
								? 'text-error-ink'
								: ''}"
							role="timer"
							aria-label={runner.remainingMs !== null ? 'Time remaining' : 'Time elapsed'}
						>
							<Clock size={14} class="text-foreground/50" />
							{formatClock(runner.remainingMs ?? runner.elapsedMsLocal)}
						</span>
					{/snippet}
					{#snippet tools()}
						<Button
							variant="ghost"
							tone="neutral"
							shape="circle"
							class="size-11 shrink-0 text-foreground/70"
							aria-label="Tools"
							aria-haspopup="dialog"
							onclick={() => (toolsOpen = true)}
						>
							<ToolCase size={20} />
						</Button>
					{/snippet}
				</MobileStudyBar>

				<!-- Main content area -->
				<div
					class="w-full lg:flex-1 lg:min-w-0 flex flex-col max-w-full lg:max-w-none overflow-y-auto overscroll-contain grow min-h-0 h-full px-1 md:px-3 lg:px-0 pb-32 md:pb-36 lg:pb-48 relative"
				>
					<div class="hidden justify-end pb-2 lg:flex">
						{#if clerk.user && runner.currentItem}<Button
								size="sm"
								variant={sidePanel.current === 'notes' ? 'soft' : 'ghost'}
								tone={sidePanel.current === 'notes' ? 'info' : 'neutral'}
								aria-pressed={sidePanel.current === 'notes'}
								onclick={() => sidePanel.toggle('notes')}
								><StickyNote size={18} /><span class="hidden sm:inline">Notes</span></Button
							>{/if}
						<Button
							size="sm"
							variant={sidePanel.current === 'calculator' ? 'soft' : 'ghost'}
							tone={sidePanel.current === 'calculator' ? 'info' : 'neutral'}
							aria-pressed={sidePanel.current === 'calculator'}
							onclick={() => sidePanel.toggle('calculator')}
							><Calculator size={18} /><span class="hidden sm:inline">Calculator</span></Button
						>
					</div>
					<AttemptNavigator {runner} />
					<AttemptQuestion {runner} />
				</div>
				{#if clerk.user && runner.currentItem}{#key clerk.user.id}<QuestionNotesTool
							questionId={runner.currentItem.questionId}
							userKey={clerk.user.id}
						/>{/key}{/if}
				{#key clerk.user?.id}<CalculatorTool storageKey={clerk.user?.id ?? 'guest'} />{/key}
			</div>

			<AttemptDock {runner} onSubmitRequest={() => (showSubmitModal = true)} />

			<QuestionNavigatorSheet
				bind:open={navigatorOpen}
				title="Questions"
				description="{runner.answeredCount} of {runner.itemCount} answered{runner.flaggedCount
					? `, ${runner.flaggedCount} flagged`
					: ''}"
				items={runner.navigatorItems}
				currentIndex={runner.currentIndex}
				onselect={(index) => runner.jumpToQuestion(index)}
			>
				{#snippet footer()}
					<div class="flex items-center justify-between gap-3">
						<span class="flex items-center gap-1.5 text-xs {syncStatusIcon(runner.syncStatus)}">
							{#if runner.syncStatus === 'offline'}<WifiOff size={12} />{:else}<Wifi
									size={12}
								/>{/if}
							{syncStatusLabel(runner.syncStatus)}
						</span>
						<Button
							size="lg"
							onclick={() => {
								navigatorOpen = false;
								showSubmitModal = true;
							}}
							disabled={runner.isSubmitting}><Send size={16} /> Submit test</Button
						>
					</div>
				{/snippet}
			</QuestionNavigatorSheet>

			<AttemptToolsSheet
				bind:open={toolsOpen}
				showNotes={Boolean(clerk.user && runner.currentItem)}
				onSave={() => void runner.flushSync(true)}
			/>

			<AttemptSubmitSheet
				bind:open={showSubmitModal}
				{runner}
				onConfirm={() => void submitAttempt(false)}
			/>
		{/if}
	{/if}
</div>
