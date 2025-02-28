<script lang="ts">
	import supabase from '$lib/supabaseClient';
	import type { AdminQuestions } from '$lib/types';
	import type { PageData } from './$types';
	import { Trash2, Pencil } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	// Retrieve the questions from props.
	let { data }: { data: PageData } = $props();
	let questions: AdminQuestions[] = $state(data.questions);

	// Reactive states for search query, chapter filter, and the currently editing question.
	let searchQuery = $state('');
	let selectedChapter = $state('');
	let editingId: string = $state('');
	let isDeleteModalOpen = $state(false);
	let pendingDeleteId = $state<string>('');
	let isDeleting = $state(false);
	let deleteError = $state<string | null>(null);
	let deleteAllModal = $state(false);

	onMount(() => {
		if (browser) {
			// Initialize from URL parameters
			const urlParams = new URLSearchParams(window.location.search);
			searchQuery = urlParams.get('search') || '';

			// Create effect for URL updates
			$effect(() => {
				const params = new URLSearchParams();
				if (searchQuery) params.set('search', searchQuery);

				const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
				window.history.replaceState({}, '', newUrl);
			});

			// Handle browser back/forward navigation
			window.addEventListener('popstate', () => {
				const params = new URLSearchParams(window.location.search);
				searchQuery = params.get('search') || '';
			});
		}
	});

	// Derive filtered questions based on searchQuery and selectedChapter.
	let filteredQuestions = $derived(
		questions.filter(
			(q) =>
				q.question_data.question.toLowerCase().includes(searchQuery.toLowerCase()) &&
				(selectedChapter === '' || q.chapter === selectedChapter)
		)
	);

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
	async function handleDelete() {
		if (!pendingDeleteId) return;

		isDeleting = true;
		deleteError = null;

		const { error } = await supabase.from('pharmquestions').delete().eq('id', pendingDeleteId);

		isDeleting = false;

		if (error) {
			deleteError = error.message;
		} else {
			questions = questions.filter((q) => q.id !== pendingDeleteId);
			pendingDeleteId = '';
			isDeleteModalOpen = false;
		}
	}
</script>

<div class="flex flex-row justify-between mt-12 mx-6">
	<button class="btn btn-error btn-soft" onclick={() => (deleteAllModal = true)}>Delete All</button>
	<!-- Controls: Search Bar and Chapter Filter -->
	<div class="flex flex-row space-x-2 justify-end">
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
				{#each Array.from(new Set(questions.map((q) => q.chapter))).sort() as chapter}
					{#if chapter}
						<option value={chapter} selected={selectedChapter === chapter}>{chapter}</option>
					{/if}
				{/each}
			</select>
		</div>
	</div>
</div>

<div>
	<dialog class="modal max-w-full p-4" class:modal-open={deleteAllModal}>
		<div class="modal-box">
			<form method="dialog">
				<button
					class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
					onclick={() => {
						deleteAllModal = false;
					}}>✕</button
				>
			</form>
			<h3 class="text-lg font-bold">⁉️</h3>
			<p>Yo what?</p>
		</div>
	</dialog>
</div>

<div>
	<dialog class="modal max-w-full p-4" class:modal-open={isDeleteModalOpen}>
		<div class="modal-box">
			<form method="dialog">
				<button
					class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
					onclick={() => {
						isDeleteModalOpen = false;
						pendingDeleteId = '';
					}}>✕</button
				>
			</form>
			<h3 class="text-lg font-bold">Delete Question</h3>
			{#if pendingDeleteId}
				<p class="py-4">Are you sure you want to delete this question?</p>
				<div class="my-4 p-4 bg-base-200 rounded-box">
					{questions.find((q) => q.id === pendingDeleteId)?.question_data.question}
				</div>
			{/if}

			{#if deleteError}
				<div class="alert alert-error mb-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="stroke-current shrink-0 h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>Error: {deleteError}</span>
				</div>
			{/if}

			<div class="modal-action">
				<button
					class="btn btn-outline"
					onclick={() => {
						isDeleteModalOpen = false;
						pendingDeleteId = '';
					}}
					disabled={isDeleting}
				>
					Cancel
				</button>
				<button class="btn btn-error" onclick={handleDelete} disabled={isDeleting}>
					{#if isDeleting}
						<span class="loading loading-spinner"></span>
						Deleting...
					{:else}
						Delete
					{/if}
				</button>
			</div>
		</div>
	</dialog>
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
							{#each question.question_data.options as _, i}
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
							onclick={() => {
								pendingDeleteId = question.id;
								isDeleteModalOpen = true;
							}}
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
