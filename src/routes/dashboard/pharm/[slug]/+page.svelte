<script lang="ts">
	import type { PageData } from './$types';
	import { ArrowLeft, Eye, Flag, ArrowRight } from 'lucide-svelte';
	import type { Question, Chapter } from '$lib/types';

	let { data }: { data: PageData } = $props();
	let questions: Question[] = data.questions;
	let chapterData: Chapter = data.chapters;
	let currentlySelected = $state(0);
	let selectedAnswers: Record<number, { selected: Set<string>; eliminated: Set<string> }> = {};
	let flags = new Set<number>();
	let flagCount = $state(0);
	let checkResult = $state<string | null>(null);
	let refreshKey = $state(0);
	let unblur = $state(false);
	let showSolution = $state(false);
	let isModalOpen = $state(false);

	let questionOptions = $derived(
		questions[currentlySelected]?.question_data.options.map((option, index) => ({
			text: option,
			letter: option.split('.')[0].trim(),
			isSelected:
				selectedAnswers[currentlySelected]?.selected?.has(option.split('.')[0].trim()) || false,
			isEliminated:
				selectedAnswers[currentlySelected]?.eliminated?.has(option.split('.')[0].trim()) || false
		})) || []
	);

	let questionAnswerStates = $derived(
		showSolution
			? questionOptions.map((option) => ({
					...option,
					isCorrect: questions[currentlySelected].question_data.correct_answers.includes(
						option.letter
					)
				}))
			: questionOptions
	);

	let questionSolution = $derived(questions[currentlySelected].question_data.explanation);

	function toggleFlag(index: number) {
		if (flags.has(index)) {
			flags.delete(index);
		} else {
			flags.add(index);
		}
		flagCount = flags.size;
	}

	function changeSelected(index: number) {
		saveSelectedAnswers();
		currentlySelected = index;
		checkResult = null;
		unblur = false;
		showSolution = false;
		restoreSelectedAnswers();
		refreshKey++;
	}

	function toggleOption(index: number) {
		if (questionOptions[index].isEliminated) return;
		const option = questionOptions[index].letter;

		if (!selectedAnswers[currentlySelected]) {
			selectedAnswers[currentlySelected] = {
				selected: new Set(),
				eliminated: new Set()
			};
		}

		if (selectedAnswers[currentlySelected].selected.has(option)) {
			selectedAnswers[currentlySelected].selected.delete(option);
		} else {
			selectedAnswers[currentlySelected].selected.add(option);
		}

		questionOptions[index].isSelected = !questionOptions[index].isSelected;
	}

	function checkAnswers() {
		const correctAnswers = new Set(questions[currentlySelected].question_data.correct_answers);
		const selected = selectedAnswers[currentlySelected]?.selected || new Set();

		checkResult =
			Array.from(selected).every((a) => correctAnswers.has(a)) &&
			Array.from(correctAnswers).every((a) => selected.has(a))
				? 'Correct!'
				: 'Incorrect. Try again.';
	}

	function saveSelectedAnswers() {
		if (!selectedAnswers[currentlySelected]) {
			selectedAnswers[currentlySelected] = {
				selected: new Set(),
				eliminated: new Set()
			};
		}

		selectedAnswers[currentlySelected].selected = new Set(
			questionOptions.filter((o) => o.isSelected).map((o) => o.letter)
		);

		selectedAnswers[currentlySelected].eliminated = new Set(
			questionOptions.filter((o) => o.isEliminated).map((o) => o.letter)
		);
	}

	function restoreSelectedAnswers() {
		const saved = selectedAnswers[currentlySelected] || {
			selected: new Set(),
			eliminated: new Set()
		};

		questionOptions.forEach((o) => {
			o.isSelected = saved.selected?.has(o.letter) || false;
			o.isEliminated = saved.eliminated?.has(o.letter) || false;
		});
	}

	function clearSelectedAnswers() {
		selectedAnswers[currentlySelected] = {
			selected: new Set(),
			eliminated: new Set()
		};
		questionOptions.forEach((o) => {
			o.isSelected = false;
			o.isEliminated = false;
		});
		checkResult = null;
		refreshKey++;
	}

	function goToNextQuestion() {
		if (currentlySelected < questions.length - 1) {
			changeSelected(currentlySelected + 1);
		}
	}

	function goToPreviousQuestion() {
		if (currentlySelected > 0) {
			changeSelected(currentlySelected - 1);
		}
	}

	function toggleElimination(index: number) {
		const option = questionOptions[index];
		option.isEliminated = !option.isEliminated;

		if (!selectedAnswers[currentlySelected]) {
			selectedAnswers[currentlySelected] = {
				selected: new Set(),
				eliminated: new Set()
			};
		}

		if (option.isEliminated) {
			selectedAnswers[currentlySelected].eliminated.add(option.letter);
			if (option.isSelected) {
				selectedAnswers[currentlySelected].selected.delete(option.letter);
				option.isSelected = false;
			}
		} else {
			selectedAnswers[currentlySelected].eliminated.delete(option.letter);
		}

		refreshKey++;
	}

	function handleSolution() {
		showSolution = !showSolution;
		unblur = !unblur;
		refreshKey++;
	}

	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'Tab':
				event.preventDefault();
				handleSolution();
				break;
			case 'Enter':
				checkAnswers();
				break;
			case 'Escape':
				clearSelectedAnswers();
				break;
			case 'ArrowRight':
				goToNextQuestion();
				break;
			case 'ArrowLeft':
				goToPreviousQuestion();
				break;
		}
	}

	$effect(() => {
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
</script>

<div class="flex flex-row max-h-screen lg:h-screen lg:border-t border-b border-base-300">
	<div class="hidden lg:block w-1/4 lg:border-r border-base-300 overflow-y-auto">
		<a class="btn btn-ghost mt-4 ms-2" href="/dashboard"> <ArrowLeft />Back</a>

		<div class="mx-8 mt-4">
			<p class="font-bold text-sm tracking-wide text-secondary mb-2">
				CHAPTER {chapterData.chapter}
			</p>
			<h1 class="text-3xl font-bold">{chapterData.name}</h1>
			<p class="text-base-content mt-2">{chapterData.desc}</p>

			<div class="card bg-base-100 shadow-xl mt-12">
				<div class="card-body">
					<div class="flex flex-row justify-between border-b pb-2">
						<h2 class="card-title">Solution</h2>
						<button class="btn btn-ghost" onclick={() => handleSolution()}><Eye /></button>
					</div>

					<p class="{unblur ? '' : 'blur'} mt-2">{questionSolution}</p>
				</div>
			</div>
		</div>
	</div>

	<div class="container mx-auto lg:w-3/4 flex flex-col items-center lg:min-h-screen">
		<div
			class="lg:hidden flex flex-row mt-2 items-center w-full justify-between sticky top-0 bg-base-100 z-40 py-2"
		>
			<a class="btn btn-ghost flex-shrink-0 flex items-center ms-3" href="/dashboard">
				<ArrowLeft />
			</a>

			<div class="flex flex-row gap-2 justify-center grow">
				<p class="font-bold tracking-wide text-secondary hidden md:block">
					CHAPTER {chapterData.chapter}
				</p>
				<p class="hidden md:block">·</p>
				<h1 class="font-bold">{chapterData.name}</h1>
			</div>

			<div class="flex-shrink-0 w-24"></div>
		</div>

		<!--Question Selection Menu -->
		<div class="flex flex-row w-full mb-4 overflow-x-auto lg:mb-0 lg:mt-6 space-x-2">
			{#key flagCount}
				{#each questions, index}
					<div class="indicator">
						{#if flags.has(index + 1)}
							<span
								class="indicator-item indicator-start badge badge-warning badge-xs !right-10 translate-x-1/4 translate-y-1/4
"
							></span>
						{/if}
						<button
							class="btn btn-circle btn-soft mx-2 {currentlySelected === index
								? 'btn-primary'
								: 'btn-outline'} {selectedAnswers[index]?.selected?.size > 0 ? 'btn-accent' : ''}"
							aria-label="question {index + 1}"
							onclick={() => changeSelected(index)}
						>
							{index + 1}
						</button>
					</div>
				{/each}
			{/key}
		</div>

		<div class="hidden sm:block border-t border-base-300 w-full my-6"></div>

		<!--Quizzing Sections -->
		{#if questions[currentlySelected]}
			<div class="w-full mb-8 mt-2 overflow-y-auto max-h-[70vh] pb-16 sm:pb-0">
				<div class="mx-4 sm:mx-6">
					<div class="font-bold text-lg sm:text-xl mb-4">
						{questions[currentlySelected].question_data.question}
					</div>

					{#key refreshKey}
						<div class="flex flex-col justify-start mt-4 space-y-4">
							{#each questionAnswerStates as option, index}
								<label
									class="label cursor-pointer rounded-full flex items-center border-2 border-base-300 bg-base-200 transition-colors
        {showSolution ? (option.isCorrect ? 'border-success' : 'border-error') : ''}"
								>
									<input
										type="checkbox"
										class="checkbox checkbox-primary checkbox-sm ms-6"
										checked={option.isSelected ? 'checked' : undefined}
										onclick={() => toggleOption(index)}
										disabled={option.isEliminated || showSolution}
									/>
									<span
										class="flex-grow ml-8 my-4 {option.isEliminated
											? 'line-through opacity-50'
											: ''}"
									>
										{option.text}
									</span>
									<div class="flex items-center justify-center w-16 mr-4">
										<button
											class="btn btn-ghost btn-circle"
											onclick={() => toggleElimination(index)}
											disabled={showSolution}
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
				<div class=" flex-row justify-center mt-8 gap-4 hidden lg:flex">
					<button class="btn btn-outline" onclick={clearSelectedAnswers}>Clear</button>
					<button class="btn btn-outline btn-success" onclick={checkAnswers}>Check</button>
					<button
						class="btn btn-warning btn-outline"
						aria-label="flag question {currentlySelected + 1}"
						onclick={() => toggleFlag(currentlySelected + 1)}
					>
						<Flag />
					</button>
					<button
						class="btn btn-outline"
						onclick={goToPreviousQuestion}
						disabled={currentlySelected === 0}
					>
						<ArrowLeft />
					</button>
					<button
						class="btn btn-outline"
						onclick={goToNextQuestion}
						disabled={currentlySelected === questions.length - 1}
					>
						<ArrowRight />
					</button>
				</div>

				{#if checkResult !== null}
					<div
						class="my-4 text-center font-bold {checkResult === 'Correct!'
							? 'text-green-500'
							: 'text-red-500'}"
					>
						{checkResult}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!--Mobile Menu-->
	<div
		class="fixed bottom-0 left-0 w-full bg-base-100 shadow-lg border-t border-base-300 z-50 flex gap-2 items-center px-4 py-4 lg:hidden flex-wrap justify-center"
	>
		<button class="btn btn-outline btn-sm" onclick={clearSelectedAnswers}>Clear</button>
		<button class="btn btn-outline btn-success btn-sm" onclick={checkAnswers}>Check</button>
		<button
			class="btn btn-warning btn-outline btn-sm"
			aria-label="flag question {currentlySelected + 1}"
			onclick={() => toggleFlag(currentlySelected + 1)}
		>
			<Flag />
		</button>
		<div class="flex flex-row gap-2">
			<button
				class="btn btn-outline btn-sm"
				onclick={goToPreviousQuestion}
				disabled={currentlySelected === 0}
			>
				<ArrowLeft />
			</button>
			<button
				class="btn btn-outline btn-sm"
				onclick={goToNextQuestion}
				disabled={currentlySelected === questions.length - 1}
			>
				<ArrowRight />
			</button>
		</div>
		<button class="btn modal-button lg:hidden btn-sm" onclick={() => (isModalOpen = true)}
			><Eye /></button
		>
		<dialog class="modal max-w-full p-4" class:modal-open={isModalOpen}>
			<div class="modal-box">
				<form method="dialog">
					<button
						class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
						onclick={() => (isModalOpen = false)}>✕</button
					>
				</form>
				<h3 class="text-lg font-bold">Solution</h3>
				<p class="py-4">{questionSolution}</p>
			</div>
		</dialog>
	</div>
</div>
