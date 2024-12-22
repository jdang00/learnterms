<script lang="ts">
	import type { PageData } from './$types';
	import { Flag } from 'lucide-svelte';
	import { ArrowLeft } from 'lucide-svelte';
	import type { Question, Chapter } from './types';

	let { data }: { data: PageData } = $props();
	let questions: Question[] = data.questions;
	let chapterData: Chapter = data.chapters;
	let currentlySelected = $state(0);
	let selectedAnswers: Record<number, Set<string>> = {};
	let flags = new Set<number>();
	let flagCount = $state(0);
	let checkResult = $state<string | null>(null);

	let questionOptions = $derived(
		questions[currentlySelected]?.question_data.options.map((option, index) => ({
			text: option,
			letter: option.split('.')[0].trim(),
			isSelected: selectedAnswers[currentlySelected]?.has(option.split('.')[0].trim()) || false
		})) || []
	);

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
</script>

<div class="flex flex-row max-h-screen h-full lg:h-screen lg:border-t border-base-300">
	<div class="hidden lg:block w-1/4 lg:border-r border-base-300">
		<div class="mx-8 mt-8">
			<h1 class="text-3xl font-bold">{chapterData.name}</h1>
			<p class="text-base-content mt-2">{chapterData.desc}</p>
		</div>
	</div>

	<div class="container mx-auto lg:w-3/4 flex flex-col items-center min-h-screen">
		<div class="flex flex-row w-full mt-6 overflow-y-scroll">
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
				</div>

				<div class="flex flex-row justify-center mt-8 gap-4">
					<a class="btn btn-outline" href="/pharm"> <ArrowLeft />Back</a>
					<button class="btn btn-outline btn-success" onclick={checkAnswers}>Check</button>
					<button
						class="btn btn-warning btn-outline"
						aria-label="flag question {currentlySelected + 1}"
						onclick={() => toggleFlag(currentlySelected + 1)}
					>
						<Flag />
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
</div>
