<script lang="ts">
	import type { PageData } from './$types';
	import type { Question } from '$lib/types';

	let { data }: { data: PageData } = $props();
	let questions: Question[] = data.questions;
</script>

<div class="container mx-auto px-4 max-w-2xl flex flex-col items-center p-4 sm:p-8">
	{#each questions as question, index}
		<div class="w-full mb-8">
			<div class="font-bold text-lg mb-4">{index + 1}. {question.question_data.question}</div>
			<div class="flex flex-col justify-start mt-4 space-y-4">
				{#each question.question_data.options as option}
					<label class="label cursor-pointer bg-base-200 rounded-full flex items-center">
						<span class="flex-grow ml-8 my-2">
							{option}
						</span>
						<div class="flex items-center justify-center w-16 mr-4">
							<input type="checkbox" class="checkbox checkbox-primary" />
						</div>
					</label>
				{/each}
			</div>
			<div class="my-4">{question.question_data.explanation}</div>
		</div>
	{/each}
</div>
