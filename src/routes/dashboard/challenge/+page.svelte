<script lang="ts">
	import type { PageData } from './$types';
	import { onDestroy, tick } from 'svelte';
	import {
		ArrowLeft,
		Eye,
		Flag,
		ArrowRight,
		Shuffle,
		BookmarkCheck,
		ChevronUp,
		ListRestart
	} from 'lucide-svelte';
	import { QuestionMap } from './states.svelte';
	import { useClerkContext } from 'svelte-clerk';

	const ctx = useClerkContext();
	const admin = $derived(ctx.user?.publicMetadata.role === 'admin');

	// Props and initial state
	let { data }: { data: PageData } = $props();
	const qm = new QuestionMap(data);

	qm.initializeState();
	qm.restorefromDB();

	// Handles keyboard navigation and shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			return;
		}
		const key = event.key.toLowerCase();
		switch (key) {
			case 'tab':
				event.preventDefault();
				qm.handleSolution();
				break;
			case 'enter':
				qm.checkAnswers();
				break;
			case 'escape':
				qm.clearselectedAnswers();
				break;
			case 'arrowright':
				qm.goToNextQuestion();
				break;
			case 'arrowleft':
				qm.goToPreviousQuestion();
				break;
			case 'f':
				qm.toggleFlag();
				break;
			case 's':
				if (event.shiftKey) {
					event.preventDefault();
					qm.toggleShuffle();
				}
				break;
		}
	}

	// Update question map and attach keydown listener.
	$effect(() => {
		qm.questionMap = Object.fromEntries(qm.questions.map((q) => [q.id, q]));
		qm.questionIds = qm.questions.map((q) => q.id);
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});

	// Scroll to the currently selected question whenever it changes.
	$effect(() => {
		// This dependency causes the effect to re-run when qm.currentlySelectedId changes.
		void qm.currentlySelectedId;
		tick().then(() => {
			const currentIds = qm.getCurrentQuestionIds();
			const index = currentIds.indexOf(qm.currentlySelectedId);
			if (index > -1 && qm.questionButtons[index]) {
				qm.questionButtons[index].scrollIntoView({
					behavior: 'smooth',
					block: 'nearest',
					inline: 'center'
				});
			}
		});
	});

	// --- Debounce Implementation ---

	/**
	 * A type‑safe debounce helper that delays the execution of a function until after
	 * `delay` milliseconds have passed since its last call.
	 *
	 * @param func The function to debounce.
	 * @param delay The delay in milliseconds.
	 * @returns A debounced version of `func`.
	 */
	function debounce<T extends (...args: unknown[]) => void>(
		func: T,
		delay: number,
		{ immediate = false } = {}
	): (...args: Parameters<T>) => void {
		let timeoutId: ReturnType<typeof setTimeout>;
		return (...args: Parameters<T>) => {
			const callNow = immediate && !timeoutId;
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				if (!immediate) func(...args);
			}, delay);
			if (callNow) func(...args);
		};
	}

	// Create a debounced version of saveAllProgressToDB (with a 2-second delay)
	const debouncedSaveAllProgressToDB = debounce(() => {
		qm.saveAllProgressToDB();
	}, 5000);

	// Trigger the debounced save whenever the currently selected question changes.
	$effect(() => {
		const currentId = qm.currentlySelectedId;
		// If currentId is defined, schedule a save.
		if (currentId !== undefined) {
			debouncedSaveAllProgressToDB();
		}
	});

	// Ensure progress is saved immediately when the component is destroyed.
	onDestroy(() => {
		qm.saveAllProgressToDB();
	});
</script>

<div class="flex flex-row max-h-screen lg:h-screen lg:border-t border-b border-base-300">
	<!--Sidebar -->
	<div class="hidden lg:block w-1/4 lg:border-r border-base-300 overflow-y-auto">
		<div class="flex flex-row justify-between">
			<a class="btn btn-ghost mt-4 ms-2" href="/dashboard"> <ArrowLeft />Back</a>
		</div>

		<div class="mx-8 mt-4">
			<p class="font-bold text-sm tracking-wide text-secondary mb-2">
				CHAPTER {qm.chapterData.chapter}
			</p>
			<h1 class="text-3xl font-bold">{qm.chapterData.name}</h1>
			<p class="text-base-content mt-2">{qm.chapterData.desc}</p>

			<p class="text-base-content/60 mt-4">{qm.progress}% done.</p>
			<p>
				<progress
					class="progress progress-success w-full transition-colors"
					value={qm.progress}
					max="100"
				></progress>
			</p>

			{#if qm.questionPic != ''}
				<img src={qm.questionPic} alt="Current questions" class="w-full h-auto mt-12" />
			{/if}

			<div class="flex flex-col justify-center">
				<div class="card bg-base-100 shadow-xl mt-12">
					<div class="card-body">
						<div class="flex flex-row justify-between border-b pb-2">
							<h2 class="card-title">Solution</h2>
							<button class="btn btn-ghost" onclick={() => qm.handleSolution()}><Eye /></button>
						</div>

						<p
							class={`mt-2 transition-all duration-300 ${qm.showSolution ? 'blur-none' : 'blur-sm'}`}
						>
							{qm.questionSolution}
						</p>
					</div>
				</div>

				<div class="flex flex-row mt-12 justify-center space-x-2">
					<button class="btn btn-error btn-soft" onclick={() => (qm.isResetModalOpen = true)}
						>Reset</button
					>
					{#if admin}
						<a class="btn btn-info btn-soft" href="/admin" target="_blank">Admin Panel</a>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<div>
		<dialog class="modal max-w-full p-4" class:modal-open={qm.isResetModalOpen}>
			<div class="modal-box">
				<form method="dialog">
					<button
						class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
						onclick={() => (qm.isResetModalOpen = false)}>✕</button
					>
				</form>
				<h3 class="text-lg font-bold">Reset Progress</h3>
				<p class="py-4">
					Do you want to start over? All current progress for this chapter will be lost.
				</p>

				<div class="flex justify-end space-x-2">
					<button class="btn btn-outline" onclick={() => (qm.isResetModalOpen = false)}
						>Cancel</button
					>
					<button class="btn btn-error" onclick={() => qm.reset()}>Reset</button>
				</div>
			</div>
		</dialog>
	</div>

	<!--Mobile info -->
	<div class="container mx-auto lg:w-3/4 flex flex-col items-center lg:min-h-screen">
		<div
			class="lg:hidden flex flex-row mt-2 items-center w-full justify-between sticky top-0 bg-base-100 z-40 py-2"
		>
			<a class="btn btn-ghost flex-shrink-0 flex items-center ms-3" href="/dashboard">
				<ArrowLeft />
			</a>

			<div class="flex flex-row gap-2 justify-center grow">
				<p class="font-bold tracking-wide text-secondary hidden md:block">
					CHAPTER {qm.chapterData.chapter}
				</p>
				<p class="hidden md:block">·</p>
				<h1 class="font-bold">{qm.chapterData.name}</h1>
			</div>

			<div class="flex-shrink-0 w-24"></div>
		</div>

		{#if qm.noFlags}
			<!-- Alert Box (Responsive & Centered) -->
			<div
				role="alert"
				class="alert alert-warning fixed top-4 sm:top-6 md:top-8 left-1/2 transform -translate-x-1/2 z-50 w-11/12 sm:w-max max-w-xs sm:max-w-sm md:max-w-md p-4 text-center animate-fade"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6 shrink-0 stroke-current inline-block align-middle mr-2"
					fill="none"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
				<span class="align-middle">No Questions Flagged.</span>
				<button
					class="btn btn-sm btn-ghost btn-warning"
					onclick={() => {
						qm.noFlags = false;
					}}>X</button
				>
			</div>
		{/if}

		<!-- Question Selection Menu -->
		<div class="flex flex-row w-full mb-4 overflow-x-auto lg:mb-0 lg:mt-6 space-x-2 relative">
			{#key qm.flagCount}
				{#each qm.getCurrentQuestionIds() as id, index}
					<div class="indicator">
						{#if qm.flags.has(id)}
							<span
								class="indicator-item indicator-start badge badge-warning badge-xs !right-10 translate-x-1/4 translate-y-1/4"
							></span>
						{/if}
						<button
							class="btn btn-circle btn-soft mx-2 {qm.currentlySelectedId === id
								? 'btn-primary'
								: 'btn-outline'} {qm.selectedAnswers[id]?.selected?.size > 0 ? 'btn-accent' : ''}"
							aria-label="question {index + 1}"
							onclick={() => qm.changeSelected(id)}
							bind:this={qm.questionButtons[index]}
						>
							{index + 1}
						</button>
					</div>
				{/each}
			{/key}
		</div>

		<div class="hidden sm:block border-t border-base-300 w-full my-6"></div>

		<!--Quizzing Sections -->
		{#if qm.questionMap[qm.currentlySelectedId]}
			<div class="w-full mb-8 mt-2 overflow-y-auto max-h-[70vh] pb-16 sm:pb-0">
				<div class="mx-4 sm:mx-6">
					<div class="flex flex-row justify-between">
						<div class="font-bold text-lg sm:text-xl mb-4 self-center">
							{qm.questionMap[qm.currentlySelectedId].question_data.question}
							<span class="text-base-content/50 font-medium text-sm ms-2"
								>Pick {qm.correctAnswersCount}.</span
							>
						</div>

						<div class="dropdown dropdown-end lg:block hidden">
							<div tabindex="0" role="button" class="btn btn-soft btn-accent m-1">Sort</div>
							<ul
								tabindex="-1"
								class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
							>
								<li>
									<button onclick={qm.toggleSortByFlagged}
										><Flag size="16" />{qm.showFlagged ? 'Show All' : 'Show Flagged'}</button
									>
								</li>
								<li>
									<button onclick={qm.toggleShowIncomplete}>
										<BookmarkCheck size="16" />
										{qm.showIncomplete ? 'Show All' : 'Show Incomplete'}
									</button>
								</li>
							</ul>
						</div>
					</div>

					{#key qm.refreshKey}
						<div class="flex flex-col justify-start mt-4 space-y-4">
							{#each qm.questionAnswerStates as option, index}
								<label
									class="label cursor-pointer rounded-full flex items-center border-2 border-base-300 bg-base-200 transition-colors
        {qm.showSolution ? (option.isCorrect ? 'border-success' : 'border-error') : ''}"
								>
									<input
										type="checkbox"
										class="checkbox checkbox-primary checkbox-sm ms-6"
										checked={option.isSelected ? true : false}
										onclick={() => qm.toggleOption(index)}
										disabled={option.isEliminated || qm.showSolution}
									/>
									<span
										class="flex-grow text-wrap break-words ml-8 my-4 {option.isEliminated
											? 'line-through opacity-50'
											: ''}"
									>
										{option.text}
									</span>
									<div class="flex items-center justify-center w-16 mr-4">
										<button
											class="btn btn-ghost btn-circle"
											onclick={() => qm.toggleElimination(index)}
											disabled={qm.showSolution}
											aria-label="eliminate option {option.letter}"
										>
											<Eye />
										</button>
									</div>
								</label>
							{/each}
						</div>
					{/key}
				</div>

				<!--Button Section -->
				<div class=" flex-row justify-center mt-8 gap-4 hidden lg:flex">
					<button class="btn btn-outline" onclick={qm.clearselectedAnswers}>Clear</button>
					<button class="btn btn-soft btn-success" onclick={qm.checkAnswers}>Check</button>
					<button
						class="btn btn-warning btn-soft"
						aria-label="flag question {qm.questionIds.indexOf(qm.currentlySelectedId)}"
						onclick={() => qm.toggleFlag()}
					>
						<Flag />
					</button>
					<button class="btn btn-secondary" onclick={qm.toggleShuffle}
						><Shuffle size="18" /> {qm.isShuffled ? 'Unshuffle' : 'Shuffle'}
					</button>
					<button
						class="btn btn-outline"
						onclick={qm.goToPreviousQuestion}
						disabled={qm.questionIds.indexOf(qm.currentlySelectedId) === 0}
					>
						<ArrowLeft />
					</button>
					<button
						class="btn btn-outline"
						onclick={qm.goToNextQuestion}
						disabled={qm.questionIds.indexOf(qm.currentlySelectedId) === qm.questions.length - 1}
					>
						<ArrowRight />
					</button>
				</div>

				{#if qm.checkResult !== null}
					<div
						class="my-4 text-center font-bold {qm.checkResult === 'Correct!'
							? 'text-green-500'
							: 'text-red-500'}"
					>
						{qm.checkResult}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!--Mobile Menu-->
	<div
		class="fixed bottom-0 left-0 w-full bg-base-100 shadow-lg border-t border-base-300 z-50 flex gap-2 items-center px-4 py-4 lg:hidden flex-wrap justify-center"
	>
		<button class="btn btn-outline btn-sm" onclick={qm.clearselectedAnswers}>Clear</button>
		<button class="btn btn-outline btn-success btn-sm" onclick={qm.checkAnswers}>Check</button>
		<button
			class="btn btn-warning btn-outline btn-sm"
			aria-label="flag question {qm.questionIds.indexOf(qm.currentlySelectedId)}"
			onclick={() => qm.toggleFlag()}
		>
			<Flag />
		</button>
		<div class="flex flex-row gap-2">
			<button
				class="btn btn-outline btn-sm"
				onclick={qm.goToPreviousQuestion}
				disabled={qm.questionIds.indexOf(qm.currentlySelectedId) === 0}
			>
				<ArrowLeft />
			</button>
			<button
				class="btn btn-outline btn-sm"
				onclick={qm.goToNextQuestion}
				disabled={qm.questionIds.indexOf(qm.currentlySelectedId) === qm.questions.length - 1}
			>
				<ArrowRight />
			</button>
		</div>
		<button class="btn modal-button lg:hidden btn-sm" onclick={() => (qm.isModalOpen = true)}
			><Eye /></button
		>

		<div class="dropdown dropdown-top dropdown-center">
			<div tabindex="0" role="button" class="btn btn-sm btn-soft btn-accent m-1">
				Options <ChevronUp />
			</div>
			<ul
				tabindex="-1"
				class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
			>
				<li>
					<button class="text-error" onclick={() => (qm.isResetModalOpen = true)}
						><ListRestart size="18" />Reset</button
					>
				</li>
				<li>
					<button class="" onclick={qm.toggleShuffle}
						><Shuffle size="18" /> {qm.isShuffled ? 'Unshuffle' : 'Shuffle'}
					</button>
				</li>
				<li>
					<button onclick={qm.toggleSortByFlagged}
						><Flag size="16" />{qm.showFlagged ? 'Show All' : 'Show Flagged'}</button
					>
				</li>
				<li>
					<button onclick={qm.toggleShowIncomplete}>
						<BookmarkCheck size="16" />
						{qm.showIncomplete ? 'Show All' : 'Show Incomplete'}
					</button>
				</li>
			</ul>
		</div>

		<dialog class="modal max-w-full p-4" class:modal-open={qm.isModalOpen}>
			<div class="modal-box">
				<form method="dialog">
					<button
						class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
						onclick={() => (qm.isModalOpen = false)}>✕</button
					>
				</form>
				<h3 class="text-lg font-bold">Solution</h3>
				<p class="py-4">{qm.questionSolution}</p>
			</div>
		</dialog>
	</div>
</div>

<style>
	@keyframes fadeInOut {
		0% {
			opacity: 0;
			transform: translateY(-10px);
		}

		100% {
			opacity: 1;
			transform: translateY(-10px);
		}
	}
	.animate-fade {
		animation: fadeInOut 0.5s forwards;
	}
</style>
