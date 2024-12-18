<script lang="ts">
	import type { PageData } from './$types';

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

	let questionOptions = $derived(
		questions[currentlySelected]?.question_data.options.map((option, index) => ({
			text: option,
			letter: option.split('.')[0].trim(),
			isSelected: false
		})) || []
	);

	let checkResult = $state<string | null>(null);

	function changeSelected(num: number) {
		currentlySelected = num;
		checkResult = null;
	}

	function toggleOption(index: number) {
		questionOptions[index].isSelected = !questionOptions[index].isSelected;
	}

	function checkAnswers() {
		const correctAnswers = questions[currentlySelected]?.question_data.correct_answers || [];
		const selectedAnswers = questionOptions
			.filter((option) => option.isSelected)
			.map((option) => option.letter);
		const isCorrect =
			correctAnswers.length === selectedAnswers.length &&
			correctAnswers.every((correct) => selectedAnswers.includes(correct));

		checkResult = isCorrect ? 'Correct!' : 'Incorrect, try again.';
	}
</script>

<div class="container mx-auto px-4 max-w-2xl flex flex-col items-center p-4 sm:p-8">
	<div class="flex flex-row">
		{#each questions as _, index}
			<button
				class="btn btn-circle {currentlySelected === index ? 'btn-primary' : 'btn-outline'} mx-2"
				aria-label="question {index + 1}"
				onclick={() => changeSelected(index)}
			>
				{index + 1}
			</button>
		{/each}
	</div>

	{#if questions[currentlySelected]}
		<div class="w-full mb-8 mt-8">
			<div class="font-bold text-lg mb-4">
				{questions[currentlySelected].question_data.question}
			</div>
			<div class="flex flex-col justify-start mt-4 space-y-4">
				{#each questionOptions as option, index}
					<label class="label cursor-pointer bg-base-200 rounded-full flex items-center">
						<span class="flex-grow ml-8 my-2">
							{option.text}
						</span>
						<div class="flex items-center justify-center w-16 mr-4">
							{#key currentlySelected}
								<input
									type="checkbox"
									class="checkbox checkbox-primary"
									onclick={() => toggleOption(index)}
								/>
							{/key}
						</div>
					</label>
				{/each}
			</div>
			<div class="my-4">{questions[currentlySelected].question_data.explanation}</div>
			<div class="flex justify-center mt-4">
				<button class="btn btn-outline btn-success" onclick={checkAnswers}>Check</button>
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
