<script lang="ts">
	import type { PageData } from './$types';
	import { ArrowLeft, Eye, Flag } from 'lucide-svelte';
	import type { Question, Chapter } from '$lib/types';

	let { data }: { data: PageData } = $props();
	let questions: Question[] = data.questions;
	let chapterData: Chapter = data.chapters;
	let currentlySelected = $state(0);
	let selectedAnswers: Record<number, Set<string>> = {};
	let flags = new Set<number>();
	let flagCount = $state(0);
	let checkResult = $state<string | null>(null);
	let refreshKey = $state(0);
	let unblur = $state(false);
	let isModalOpen = $state(false);

	let questionOptions = $derived(
		questions[currentlySelected]?.question_data.options.map((option, index) => ({
			text: option,
			letter: option.split('.')[0].trim(),
			isSelected: selectedAnswers[currentlySelected]?.has(option.split('.')[0].trim()) || false
		})) || []
	);

	let questionSolution = $derived(questions[currentlySelected].question_data.explanation);

	function toggleFlag(index: number) {
		flags.has(index) ? flags.delete(index) : flags.add(index);
		flagCount = flags.size;
	}

	function changeSelected(index: number) {
		saveSelectedAnswers();
		currentlySelected = index;
		checkResult = null;
		restoreSelectedAnswers();
	}

	function toggleOption(index: number) {
		const option = questionOptions[index].letter;
		selectedAnswers[currentlySelected] ??= new Set();
		selectedAnswers[currentlySelected].has(option)
			? selectedAnswers[currentlySelected].delete(option)
			: selectedAnswers[currentlySelected].add(option);
		questionOptions[index].isSelected = !questionOptions[index].isSelected;
	}

	function checkAnswers() {
		const correctAnswers = new Set(questions[currentlySelected].question_data.correct_answers);
		const selected = selectedAnswers[currentlySelected] || new Set();

		checkResult =
			Array.from(selected).every((a) => correctAnswers.has(a)) &&
			Array.from(correctAnswers).every((a) => selected.has(a))
				? 'Correct!'
				: 'Incorrect. Try again.';
	}

	function saveSelectedAnswers() {
		selectedAnswers[currentlySelected] = new Set(
			questionOptions.filter((o) => o.isSelected).map((o) => o.letter)
		);
	}

	function restoreSelectedAnswers() {
		const saved = selectedAnswers[currentlySelected] || new Set();
		questionOptions.forEach((o) => (o.isSelected = saved.has(o.letter)));
	}

	function clearSelectedAnswers() {
		selectedAnswers[currentlySelected] = new Set();
		questionOptions.forEach((o) => (o.isSelected = false));
		checkResult = null;
		refreshKey++;
	}
</script>

<div class="flex flex-row max-h-screen lg:h-screen lg:border-t border-b border-base-300">
	<div class="hidden lg:block w-1/4 lg:border-r border-base-300">
		<a class="btn btn-ghost mt-4 ms-2" href="/pharm"> <ArrowLeft />Back</a>

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
						<button class="btn btn-ghost" onclick={() => (unblur = !unblur)}><Eye /></button>
					</div>

					<p class="{unblur ? '' : 'blur'} mt-2">{questionSolution}</p>
				</div>
			</div>
		</div>
	</div>

	<div class="container mx-auto lg:w-3/4 flex flex-col items-center min-h-screen">
		<div class="lg:hidden flex flex-row mt-2 items-center w-full justify-between">
			<a class="btn btn-ghost flex-shrink-0" href="/pharm">
				<ArrowLeft />Back
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
		<div class="flex flex-row w-full lg:mt-6 mt-4 overflow-y-scroll">
			{#key flagCount}
				{#each questions as _, index}
					<div class="indicator">
						{#if flags.has(index + 1)}
							<span
								class="indicator-item indicator-start badge badge-warning badge-xs !right-10 translate-x-1/2 translate-y-1/4
"
							></span>
						{/if}
						<button
							class="btn btn-circle mx-2 {currentlySelected === index
								? 'btn-primary'
								: 'btn-outline'} {selectedAnswers[index]?.size > 0 ? 'btn-accent' : ''}"
							aria-label="question {index + 1}"
							onclick={() => changeSelected(index)}
						>
							{index + 1}
						</button>
					</div>
				{/each}
			{/key}
		</div>

		<div class="border-t border-base-300 w-full my-6"></div>

		{#if questions[currentlySelected]}
			<div class="w-full mb-8 mt-2">
				<div class="mx-6 sm:mx-8">
					<div class="font-bold text-lg mb-4">
						{questions[currentlySelected].question_data.question}
					</div>

					{#key refreshKey}
						<div class="flex flex-col justify-start mt-4 space-y-4">
							{#each questionOptions as option, index}
								<label class="label cursor-pointer bg-base-200 rounded-full flex items-center">
									<span class="flex-grow ml-8 my-2">{option.text}</span>
									<div class="flex items-center justify-center w-16 mr-4">
										{#key currentlySelected}
											<input
												type="checkbox"
												class="checkbox checkbox-primary"
												checked={option.isSelected ? 'checked' : undefined}
												onclick={() => toggleOption(index)}
											/>
										{/key}
									</div>
								</label>
							{/each}
						</div>
					{/key}
				</div>
				<div class="flex flex-row justify-center mt-8 gap-4">
					<button class="btn btn-outline" onclick={clearSelectedAnswers}>Clear</button>

					<button class="btn btn-outline btn-success" onclick={checkAnswers}>Check</button>
					<button
						class="btn btn-warning btn-outline"
						aria-label="flag question {currentlySelected + 1}"
						onclick={() => toggleFlag(currentlySelected + 1)}
					>
						<Flag />
					</button>
					<button class="btn modal-button lg:hidden" onclick={() => (isModalOpen = true)}
						><Eye /></button
					>
					<dialog class="modal" class:modal-open={isModalOpen}>
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
</div>
