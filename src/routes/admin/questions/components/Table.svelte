<script lang="ts">
	import { Trash2, Pencil } from 'lucide-svelte';
	import PaginationControls from './PaginationControls.svelte';
	let { lm = $bindable() } = $props();
</script>

<div class="rounded-box border border-base-content/12 bg-base-100 mx-6 mb-4">
	<!-- Table content -->
	<div class="overflow-x-auto">
		<table class="table">
			<thead>
				<tr>
					<th>Question</th>
					<th>Options</th>
					<th>Explanation</th>
					<th>Correct Answer(s)</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each lm.paginatedQuestions as question (question.id)}
					<tr>
						<td class="max-w-xs">{question.question_data.question}</td>
						<td class="max-w-xs">
							{#each question.question_data.options as option (option)}
								<div class="truncate">{option}</div>
							{/each}
						</td>

						<td class="max-w-xs">{question.question_data.explanation}</td>
						<td>
							{#each question.question_data.correct_answers as answer (answer)}
								<div class="font-mono">{answer}</div>
							{/each}
						</td>
						<td class="flex flex-row space-x-2">
							<button
								class="btn btn-sm btn-soft btn-error rounded-full"
								onclick={() => {
									lm.pendingDeleteId = question.id;
									lm.isDeleteModalOpen = true;
								}}
								aria-label="Delete question"
							>
								<Trash2 size="16" />
							</button>
							<button
								class="btn btn-sm btn-soft btn-accent rounded-full"
								onclick={() => lm.openEditModal(question)}
								aria-label="Edit question"
							>
								<Pencil size="16" />
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination as table footer -->
	<div class="px-4 py-3 border-t border-base-content/10">
		<PaginationControls bind:lm />
	</div>
</div>
