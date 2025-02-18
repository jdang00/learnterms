<script lang="ts">
	import supabase from '$lib/supabaseClient';
	import type { AdminQuestions, Question } from '$lib/types';
	import type { PageData } from './$types';
	import { Trash2, Pencil } from 'lucide-svelte';

	// Retrieve the questions from props.
	let { data }: { data: PageData } = $props();
	// Use 'let' here so we can reassign on deletion.
	let questions: AdminQuestions[] = data.questions;

	// Reactive states for search query, chapter filter, and the currently editing question.
	let searchQuery = $state('');
	let selectedChapter = $state('');
	let editingId: string = $state('');

	// Derive filtered questions based on searchQuery and selectedChapter.
	let filteredQuestions = $derived(
		questions.filter(
			(q) =>
				q.question_data.question.toLowerCase().includes(searchQuery.toLowerCase()) &&
				(selectedChapter === '' || q.chapter === selectedChapter)
		)
	);

	// Utility function to edit parts of the JSON blob (if needed).
	function editJsonBlob({
		jsonBlob,
		options,
		question,
		explanation,
		correct_answers
	}: {
		jsonBlob: Question;
		options?: string[];
		question?: string;
		explanation?: string;
		correct_answers?: string[];
	}): Question {
		if (!jsonBlob || typeof jsonBlob !== 'object') {
			throw new Error('Invalid JSON object.');
		}

		if (options !== undefined) {
			if (!Array.isArray(options)) throw new Error('Options must be an array.');
			jsonBlob.question_data.options = options;
		}

		if (question !== undefined) {
			if (typeof question !== 'string') throw new Error('Question must be a string.');
			jsonBlob.question_data.question = question;
		}

		if (explanation !== undefined) {
			if (typeof explanation !== 'string') throw new Error('Explanation must be a string.');
			jsonBlob.question_data.explanation = explanation;
		}

		if (correct_answers !== undefined) {
			if (!Array.isArray(correct_answers)) throw new Error('Correct answers must be an array.');
			jsonBlob.question_data.correct_answers = correct_answers;
		}

		return jsonBlob;
	}

	/**
	 * Update the question in the database.
	 * Sends an UPDATE request with the current question_data and chapter.
	 */
	async function updateQuestion(question: AdminQuestions) {
		const { data, error } = await supabase
			.from('pharmquestions')
			.update({
				question_data: question.question_data,
				chapter: question.chapter
			})
			.eq('id', question.id);

		if (error) {
			console.error('Error updating question:', error);
		} else {
			console.log('Question updated:', data);
			// Exit editing mode after a successful update.
			editingId = '';
		}
	}

	/**
	 * Delete the question from the database.
	 */
	async function deleteQuestion(questionId: string) {
		const { data, error } = await supabase.from('pharmquestions').delete().eq('id', questionId);

		if (error) {
			console.error('Error deleting question:', error);
		} else {
			console.log('Question deleted:', data);
			// Remove the deleted question from the local array.
			questions = questions.filter((q) => q.id !== questionId);
		}
	}

	/**
	 * Toggle a correct answer for a question.
	 * If the option exists in correct_answers, remove it; otherwise, add it.
	 * Then, update the question in the database.
	 */
	function toggleCorrectAnswer(question: AdminQuestions, option: string) {
		const index = question.question_data.correct_answers.indexOf(option);
		if (index === -1) {
			question.question_data.correct_answers.push(option);
		} else {
			question.question_data.correct_answers.splice(index, 1);
		}
		updateQuestion(question);
	}
</script>

<!-- Controls: Search Bar and Chapter Filter -->
<div class="flex flex-row space-x-2 justify-end me-6 mt-12">
	<div class="mb-4">
		<label class="input">
			<svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
				<g
					stroke-linejoin="round"
					stroke-linecap="round"
					stroke-width="2.5"
					fill="none"
					stroke="currentColor"
				>
					<circle cx="11" cy="11" r="8"></circle>
					<path d="m21 21-4.3-4.3"></path>
				</g>
			</svg>
			<input type="search" placeholder="Search" bind:value={searchQuery} class="grow" />
		</label>
	</div>

	<div class="mb-4">
		<select class="select" bind:value={selectedChapter}>
			<option value="">All Chapters</option>
			{#each Array.from(new Set(questions.map((q) => q.chapter))) as chapter}
				<option value={chapter}>{chapter}</option>
			{/each}
		</select>
	</div>
</div>

<!-- Questions Table -->
<div class="overflow-x-auto rounded-box border border-base-content/12 bg-base-100 mx-6">
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
			{#each filteredQuestions as question}
				<tr>
					<td>
						{#if editingId === question.id}
							<input
								type="text"
								class="input input-bordered w-full"
								bind:value={question.question_data.question}
							/>
						{:else}
							{question.question_data.question}
						{/if}
					</td>
					<td>
						{#if editingId === question.id}
							{#each question.question_data.options, i}
								<input
									type="text"
									class="input input-bordered w-full mb-2"
									bind:value={question.question_data.options[i]}
								/>
							{/each}
						{:else}
							{#each question.question_data.options as option}
								<div>{option}</div>
							{/each}
						{/if}
					</td>
					<td>
						{#if editingId === question.id}
							<input
								type="text"
								class="input input-bordered w-full"
								bind:value={question.question_data.explanation}
							/>
						{:else}
							{question.question_data.explanation}
						{/if}
					</td>
					<td>
						{#if editingId === question.id}
							{#each question.question_data.correct_answers as answer, i}
								<input
									type="text"
									class="input input-bordered w-full mb-2"
									bind:value={question.question_data.correct_answers[i]}
								/>
							{/each}
						{:else}
							{#each question.question_data.correct_answers as answer}
								<div class="font-mono">{answer}</div>
							{/each}
						{/if}
					</td>
					<td class="flex flex-row space-x-2">
						<button
							class="btn btn-sm btn-soft btn-error rounded-full"
							onclick={() => deleteQuestion(question.id)}
						>
							<Trash2 size="16" />
						</button>

						{#if editingId === question.id}
							<button
								class="btn btn-sm btn-primary rounded-full ml-2"
								onclick={() => updateQuestion(question)}
							>
								Save
							</button>
							<button
								class="btn btn-sm btn-soft rounded-full"
								onclick={() => (editingId = editingId === question.id ? '' : question.id)}
							>
								Cancel
							</button>
						{:else}
							<button
								class="btn btn-sm btn-soft btn-accent rounded-full"
								onclick={() => (editingId = editingId === question.id ? '' : question.id)}
							>
								<Pencil size="16" />
							</button>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
