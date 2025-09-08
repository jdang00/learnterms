<script lang="ts">
	import QuizSideBar from '$lib/components/QuizSideBar.svelte';
	import QuizNavigation from '$lib/components/QuizNavigation.svelte';
	import AnswerOptions from '$lib/components/AnswerOptions.svelte';
	import FillInTheBlank from '$lib/components/FillInTheBlank.svelte';
	import ActionButtons from '$lib/components/ActionButtons.svelte';
	import MobileMenu from '$lib/components/MobileMenu.svelte';
	import MobileInfo from '$lib/components/MobileInfo.svelte';
	import ResultBanner from '$lib/components/ResultBanner.svelte';
	import ErrorDisplay from '$lib/components/ErrorDisplay.svelte';
	import { Flag, BookmarkCheck, ArrowDownNarrowWide, Maximize, Minimize } from 'lucide-svelte';
	import { QUESTION_TYPES } from '$lib/utils/questionType';
	import { slide, fade, scale } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';

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

	function isAuthError(error: any): boolean {
		if (!error) return false;
		const message = error.message || error.toString();
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
		class="flex flex-col md:flex-col lg:flex-row bg-base-100 {qs.fullscreenEnabled
			? ' min-h-[calc(100vh-3rem)] sm:min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)]'
			: 'h-[24rem] sm:h-[28rem] overflow-hidden'} pt-2 md:pt-3 lg:p-4 gap-3 sm:gap-4 lg:gap-8 rounded-t-xl transition-all duration-500 ease-in-out"
		transition:slide={{ duration: 400, easing: cubicInOut, axis: 'y' }}
	>
		{#if qs.fullscreenEnabled}
			<QuizSideBar
				{qs}
				{module}
				{currentlySelected}
				{userId}
				moduleId={data.moduleId}
				{client}
				classId={data.classId}
			/>
			<MobileInfo {module} classId={data.classId} />
		{/if}

		<div
			class="w-full lg:flex-1 lg:min-w-0 flex flex-col max-w-full lg:max-w-none overflow-y-auto flex-grow min-h-0 h-full {qs.fullscreenEnabled ? 'pb-24 sm:pb-36 lg:pb-48' : 'pb-4'} relative"
		>
			<ResultBanner bind:qs />
			{#if qs.noFlags}
				<div
					role="alert"
					class="alert alert-warning fixed top-4 sm:top-6 md:top-8 left-1/2 transform -translate-x-1/2 z-50 w-11/12 sm:w-max max-w-xs sm:max-w-sm md:max-w-md p-4 text-center"
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

			<div class="text-md sm:text-lg lg:text-xl p-3 sm:p-4">
				<div class="flex flex-row justify-between mb-4">
					{#if currentlySelected.type !== QUESTION_TYPES.FILL_IN_THE_BLANK}
						<div class="flex flex-row flex-wrap items-end gap-1 sm:gap-2">
							<h4 class="text-base sm:text-lg font-semibold leading-tight">
								{currentlySelected.stem}
							</h4>
							<span class="text-base-content/70 font-medium text-base sm:text-lg leading-tight">
								Select {currentlySelected.correctAnswers.length}.
							</span>
						</div>
					{/if}

					<div class="dropdown dropdown-end lg:block hidden">
						<div tabindex="0" role="button" class="btn btn-soft btn-accent m-1 btn-circle">
							<ArrowDownNarrowWide />
						</div>
						<ul
							tabindex="-1"
							class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-sm"
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
				{#if currentlySelected.type === QUESTION_TYPES.FILL_IN_THE_BLANK}
					<FillInTheBlank bind:qs {currentlySelected} />
				{:else}
					<AnswerOptions bind:qs {currentlySelected} />
				{/if}

				<ActionButtons {qs} {currentlySelected} />
			</div>
		</div>
		{#if qs.fullscreenEnabled}
			<div
				transition:slide={{ duration: 300, easing: cubicInOut, axis: 'y' }}
				class="transition-all duration-300 ease-in-out"
			>
				<MobileMenu bind:qs {currentlySelected} />
			</div>
		{/if}
	</div>
{:else}
	<p>No questions available.</p>
{/if}
