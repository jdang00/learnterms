<script lang="ts">
	import type { AdminQuestions } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const questions: AdminQuestions[] = data.questions;
</script>

<div class="overflow-x-auto">
	<table class="table table-zebra">
		<thead>
			<tr>
				<th>Question</th>
				<th>Options</th>
				<th>Explanation</th>
				<th>Correct Answer(s)</th>
			</tr>
		</thead>
		<tbody>
			{#each questions as question}
				<tr>
					<td>{question.question_data.question}</td>
					<td>
						<ul class="list-disc list-inside">
							{#each question.question_data.options as option}
								<li>{option}</li>
							{/each}
						</ul>
					</td>
					<td>{question.question_data.explanation}</td>
					<td>
						<ul class="list-disc list-inside">
							{#each question.question_data.correct_answers as answer}
								<li>{answer}</li>
							{/each}
						</ul>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
