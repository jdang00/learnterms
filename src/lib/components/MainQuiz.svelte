<script lang="ts">
	import HighlightedStem from './HighlightedStem.svelte';
	import QuizSideBar from '$lib/components/QuizSideBar.svelte';
	import QuizNavigation from '$lib/components/QuizNavigation.svelte';
	import AnswerOptions from '$lib/components/AnswerOptions.svelte';
	import FillInTheBlank from '$lib/components/FillInTheBlank.svelte';
	import Matching from '$lib/components/Matching.svelte';
	import QuizDock from '$lib/components/quiz-dock/QuizDock.svelte';
	import MobileQuizDock from '$lib/components/quiz-dock/MobileQuizDock.svelte';
	import QuizShortcuts from '$lib/components/quiz-dock/QuizShortcuts.svelte';
	import { createQuizCommands, setQuizCommands } from '$lib/components/quiz-dock/commands.svelte';
	import DockCustomizer from '$lib/components/quiz-dock/DockCustomizer.svelte';
	import {
		DockPreferences,
		setDockPreferences
	} from '$lib/components/quiz-dock/dockPreferences.svelte';
	import MobileInfo from '$lib/components/MobileInfo.svelte';
	import { useQuery } from 'convex-svelte';
	import { untrack } from 'svelte';
	import { api } from '../../convex/_generated/api';
	import ResultBanner from '$lib/components/ResultBanner.svelte';
	import ErrorDisplay from '$lib/components/ErrorDisplay.svelte';
	import { Flag, BookmarkCheck, ArrowDownNarrowWide, Pencil } from 'lucide-svelte';
	import { QUESTION_TYPES } from '$lib/utils/questionType';
	import { getErrorText } from '$lib/utils/errorHandling';
	import { slide } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import { useClerkContext } from 'svelte-clerk/client';
	import { resolve } from '$app/paths';

	let {
		qs,
		questions,
		currentlySelected,
		userId,
		data,
		handleSelect,
		handleFilterToggle,
		client,
		module,
		suppressAuthErrors = false
	} = $props();

	const clerk = useClerkContext();
	const userDataQuery = useQuery(api.users.getUserById, () =>
		clerk.user ? { id: clerk.user.id } : 'skip'
	);
	$effect(() => {
		qs.saveHighlightPreference = (enabled: boolean) =>
			client.mutation(api.stemHighlights.setEnabled, { enabled });
		return () => {
			qs.saveHighlightPreference = null;
		};
	});
	$effect(() => {
		if (userDataQuery.data && !qs.highlightModeSaving) {
			qs.highlightEnabled = userDataQuery.data.stemHighlightEnabled ?? false;
		}
	});
	const canEdit = $derived(
		userDataQuery.data?.role === 'dev' ||
			userDataQuery.data?.role === 'admin' ||
			userDataQuery.data?.role === 'curator'
	);

	const quizCommands = setQuizCommands(
		createQuizCommands({
			get qs() {
				return qs;
			},
			question: () => currentlySelected,
			classId: () => data.classId,
			toggleFilter: (filter) => handleFilterToggle(filter),
			selectQuestion: (question) => handleSelect(question),
			canEdit: () => canEdit,
			editHref: () =>
				canEdit && currentlySelected
					? resolve(`/admin/${data.classId}/module/${data.moduleId}?edit=${currentlySelected._id}`)
					: null
		})
	);

	const dockPreferences = setDockPreferences(new DockPreferences());
	dockPreferences.connect({
		save: (layout) => client.mutation(api.quizDock.saveLayout, { layout })
	});
	const dockLayoutQuery = useQuery(api.quizDock.getLayout, () => (clerk.user ? {} : 'skip'));
	$effect(() => dockPreferences.load());
	$effect(() => {
		const remote = dockLayoutQuery.data;
		if (remote === undefined) return;
		untrack(() => dockPreferences.hydrate(remote));
	});

	function isAuthError(error: unknown): boolean {
		if (!error) return false;
		const message = getErrorText(error);
		const patterns = [
			'unauthorized',
			'authentication',
			'not authenticated',
			'session expired',
			'token expired',
			'invalid token',
			'jwt',
			'access denied',
			'forbidden'
		];
		return patterns.some((pattern) => message.toLowerCase().includes(pattern));
	}

	let shouldShowError = $derived(
		questions.error && !(suppressAuthErrors && isAuthError(questions.error))
	);
</script>

{#if questions.isLoading}
	<p>Loading...</p>
{:else if shouldShowError}
	<ErrorDisplay error={questions.error} showReload={true} class="mb-4" />
{:else if currentlySelected}
	<div
		class="flex flex-col md:flex-col lg:flex-row bg-base-100 h-full overflow-hidden p-2 md:p-3 lg:p-4 lg:ps-2 gap-3 sm:gap-4 lg:gap-8 transition-all duration-500 ease-in-out"
		transition:slide={{ duration: 400, easing: cubicInOut, axis: 'y' }}
	>
		<span id="quiz-top" aria-hidden="true"></span>
		<QuizSideBar
			{qs}
			{module}
			{currentlySelected}
			{userId}
			moduleId={data.moduleId}
			{client}
			classId={data.classId}
		/>
		<MobileInfo {module} {qs} classId={data.classId} />

		<div
			class="w-full lg:flex-1 lg:min-w-0 flex flex-col max-w-full lg:max-w-none overflow-y-auto grow min-h-0 h-full pb-24 sm:pb-36 lg:pb-48 relative"
		>
			<ResultBanner bind:qs />
			{#if qs.noFlags}
				<div
					role="alert"
					class="alert alert-warning fixed top-4 sm:top-6 md:top-8 left-1/2 transform -translate-x-1/2 z-50 w-11/12 sm:w-max max-w-xs sm:max-w-sm md:max-w-md p-4 text-center rounded-full"
				>
					<Flag size="16" />
					<span class="align-middle">No Questions Flagged.</span>
					<button
						class="btn btn-sm btn-ghost btn-warning"
						onclick={() => {
							qs.noFlags = false;
						}}>X</button
					>
				</div>
			{/if}

			<QuizNavigation
				questions={{ data: qs.getFilteredQuestions() }}
				{handleSelect}
				{currentlySelected}
				{qs}
			/>

			<div
				class="text-md sm:text-lg lg:text-xl p-4 sm:pe-4"
				style:zoom={quizCommands.textScale === 1 ? undefined : quizCommands.textScale}
			>
				<div class="flex flex-row justify-between">
					{#if currentlySelected.type !== QUESTION_TYPES.FILL_IN_THE_BLANK}
						<div class="items-end gap-1 sm:gap-2 self-center">
							<div class="text-base sm:text-xl leading-tight tiptap-content font-medium ms-2">
								<HighlightedStem
									question={currentlySelected}
									enabled={qs.highlightEnabled}
									resetVersion={qs.highlightResetVersion}
								/>
							</div>
						</div>
					{/if}

					<div class="lg:flex hidden items-center gap-2">
						{#if canEdit && currentlySelected}
							<a
								class="btn btn-soft btn-secondary m-1 btn-circle"
								href={resolve(
									`/admin/${data.classId}/module/${data.moduleId}?edit=${currentlySelected._id}`
								)}
								target="_blank"
								rel="noopener noreferrer"
								title="Edit"
							>
								<Pencil size="16" />
							</a>
						{/if}
						<div class="dropdown dropdown-end">
							<div tabindex="0" role="button" class="btn btn-soft btn-accent m-1 btn-circle">
								<ArrowDownNarrowWide />
							</div>
							<ul
								tabindex="-1"
								class="dropdown-content menu bg-base-100 rounded-2xl z-[1] w-52 p-2 shadow-xs"
							>
								<li>
									<button onclick={() => handleFilterToggle('flagged')}>
										<Flag size="16" />
										{qs.showFlagged ? 'Show All' : 'Show Flagged'}
									</button>
								</li>
								<li>
									<button onclick={() => handleFilterToggle('incomplete')}>
										<BookmarkCheck size="16" />
										{qs.showIncomplete ? 'Show All' : 'Show Incomplete'}
									</button>
								</li>
							</ul>
						</div>
					</div>
				</div>

				{#if currentlySelected.type === QUESTION_TYPES.FILL_IN_THE_BLANK}
					<FillInTheBlank
						bind:qs
						{currentlySelected}
						highlightEnabled={qs.highlightEnabled}
						highlightResetVersion={qs.highlightResetVersion}
					/>
				{:else if currentlySelected.type === QUESTION_TYPES.MATCHING}
					<Matching bind:qs {currentlySelected} />
				{:else}
					<div
						class="text-base-content/70 font-medium text-base sm:text-lg leading-tight my-3 ms-2"
					>
						Select {currentlySelected.correctAnswers.length}.
					</div>
					<AnswerOptions bind:qs {currentlySelected} />
				{/if}

				{#if qs.highlightPreferenceError}<p role="alert" class="text-sm text-error">
						{qs.highlightPreferenceError}
					</p>{/if}
				<QuizDock surface="desktop" source="button" celebrate={qs.checkResult === 'Correct!'} />
			</div>
		</div>
		<div
			transition:slide={{ duration: 300, easing: cubicInOut, axis: 'y' }}
			class="transition-all duration-300 ease-in-out"
		>
			<MobileQuizDock bind:qs {currentlySelected} />
		</div>
		<QuizShortcuts disabled={qs.isResetModalOpen || dockPreferences.customizing} />
		<DockCustomizer />
	</div>
{:else}
	<p>No questions available.</p>
{/if}
