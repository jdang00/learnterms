<script lang="ts">
	import type { PageData } from './$types';
	import { Flag } from 'lucide-svelte';

	interface Option {
		text: string;
		isSelected: boolean;
		letter: string;
	}

	interface QuestionData {
		options: string[];
		question: string;
		explanation: string;
		correct_answers: string[];
	}

	interface Question {
		question_data: QuestionData;
	}

	let { data }: { data: PageData } = $props();
	let questions: Question[] = data.questions;
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

<div class="container mx-auto px-4 max-w-2xl flex flex-col items-center p-4 sm:p-8">
	<div class="flex flex-row w-full pt-2 px-2 overflow-y-scroll">
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

	<div class="divider"></div>

	{#if questions[currentlySelected]}
		<div class="w-full mb-8 mt-2">
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

			<div class="flex flex-row justify-center mt-8 gap-4">
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
