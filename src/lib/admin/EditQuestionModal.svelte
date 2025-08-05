<script lang="ts">
	let { isEditModalOpen, closeEditModal, editingQuestion, moduleId } = $props();

	import { X, MessageSquare, Hash, ListChecks, Lightbulb } from 'lucide-svelte';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id } from '../../convex/_generated/dataModel';
	import { DISPLAY_QUESTION_TYPES } from '../types';

	const client = useConvexClient();

	let questionStem: string = $state('');
	let questionExplanation: string = $state('');
	let questionStatus: string = $state('draft');
	let questionType: string = $state('multiple_choice');
	let options: Array<{ text: string }> = $state([]);
	let correctAnswers: string[] = $state([]);
	let isSubmitting: boolean = $state(false);

	$effect(() => {
		if (editingQuestion) {
			questionStem = editingQuestion.stem || '';
			questionExplanation = editingQuestion.explanation || '';
			questionStatus = editingQuestion.status || 'draft';
			questionType = editingQuestion.type || 'multiple_choice';
			options = (editingQuestion.options || []).map((opt: { id: string; text: string }) => ({
				text: opt.text
			}));

			const correctAnswerIndices =
				editingQuestion.correctAnswers
					?.map((optionId: string) => {
						const optionIndex = editingQuestion.options?.findIndex(
							(opt: { id: string; text: string }) => opt.id === optionId
						);
						return optionIndex >= 0 ? optionIndex.toString() : '';
					})
					.filter((index: string) => index !== '') || [];

			correctAnswers = correctAnswerIndices;
		}
	});

	function addOption() {
		options = [...options, { text: '' }];
	}

	function removeOption(index: number) {
		if (options.length <= 2) return;
		options = options.filter((_, i) => i !== index);
		correctAnswers = correctAnswers
			.filter((answerIndex) => parseInt(answerIndex) !== index)
			.map((answerIndex) => {
				const idx = parseInt(answerIndex);
				return idx > index ? (idx - 1).toString() : answerIndex;
			});
	}

	function toggleCorrectAnswer(index: number) {
		const indexStr = index.toString();
		if (correctAnswers.includes(indexStr)) {
			correctAnswers = correctAnswers.filter((id) => id !== indexStr);
		} else {
			correctAnswers = [...correctAnswers, indexStr];
		}
	}

	async function handleSubmit() {
		if (!questionStem || !editingQuestion) return;

		const filledOptions = options.filter((opt) => opt.text.trim());
		if (filledOptions.length < 2) return;

		isSubmitting = true;

		try {
			const filteredCorrectAnswers = correctAnswers
				.map((index) => parseInt(index))
				.filter((index) => index < filledOptions.length)
				.map((index) => index.toString());

			await client.mutation(api.question.updateQuestion, {
				questionId: editingQuestion._id,
				moduleId: moduleId as Id<'module'>,
				type: questionType,
				stem: questionStem,
				options: filledOptions,
				correctAnswers: filteredCorrectAnswers,
				explanation: questionExplanation,
				status: questionStatus
			});

			closeEditModal();
		} catch (error) {
			console.error('Failed to update question', error);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<dialog class="modal p-6" class:modal-open={isEditModalOpen}>
	<div class="modal-box w-full max-w-4xl rounded-2xl border border-base-300 shadow-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
				onclick={closeEditModal}
				aria-label="Close"
			>
				<X size={18} />
			</button>
		</form>

		<div class="mb-6 flex items-center gap-2">
			<h3 class="text-2xl font-extrabold tracking-tight">Edit Question</h3>
		</div>

		{#if !editingQuestion}
			<div class="alert alert-error mb-6">
				<span>No question selected for editing.</span>
			</div>
		{:else}
			<div class="flex flex-col gap-6">
				<div class="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-[auto_1fr]">
					<label
						class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80"
						for="question-stem"
					>
						<MessageSquare size={18} class="text-primary/80" />
						<span>Question</span>
					</label>
					<textarea
						id="question-stem"
						class="textarea textarea-bordered w-full min-h-24"
						bind:value={questionStem}
						placeholder="Enter your question..."
					></textarea>

					<label
						class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80"
						for="question-type"
					>
						<Hash size={18} class="text-primary/80" />
						<span>Type</span>
					</label>
					<select
						id="question-type"
						class="select select-bordered w-full"
						bind:value={questionType}
					>
						{#each Object.entries(DISPLAY_QUESTION_TYPES) as [value, label] (value)}
							<option value={value}>{label}</option>
						{/each}
					</select>

					<label
						class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80"
						for="question-status"
					>
						<Hash size={18} class="text-primary/80" />
						<span>Status</span>
					</label>
					<select
						id="question-status"
						class="select select-bordered w-full"
						bind:value={questionStatus}
					>
						<option value="draft">Draft</option>
						<option value="published">Published</option>
						<option value="archived">Archived</option>
					</select>

					<label
						class="label m-0 flex items-center gap-2 self-start p-0 text-base font-medium text-base-content/80"
						for="question-options"
					>
						<ListChecks size={18} class="text-primary/80" />
						<span>Options</span>
					</label>
					<div class="space-y-3">
						{#each options as option, index (index)}
							<div class="flex items-center gap-3">
								<input
									type="checkbox"
									class="checkbox checkbox-primary"
									checked={correctAnswers.includes(index.toString())}
									onchange={() => toggleCorrectAnswer(index)}
								/>
								<input
									type="text"
									class="input input-bordered flex-1"
									bind:value={option.text}
									placeholder="Option {index + 1}"
								/>
								{#if options.length > 2}
									<button
										type="button"
										class="btn btn-ghost btn-sm"
										onclick={() => removeOption(index)}
									>
										<X size={16} />
									</button>
								{/if}
							</div>
						{/each}
						<button type="button" class="btn btn-ghost btn-sm" onclick={addOption}>
							Add Option
						</button>
					</div>

					<label
						class="label m-0 flex items-center gap-2 self-start p-0 text-base font-medium text-base-content/80"
						for="question-explanation"
					>
						<Lightbulb size={18} class="text-primary/80" />
						<span>Explanation</span>
					</label>
					<textarea
						id="question-explanation"
						class="textarea textarea-bordered w-full min-h-24"
						bind:value={questionExplanation}
						placeholder="Enter explanation (optional)..."
					></textarea>
				</div>
			</div>

			<div class="modal-action mt-8">
				<form method="dialog" class="flex gap-3">
					<button class="btn btn-ghost" onclick={closeEditModal} disabled={isSubmitting}
						>Cancel</button
					>
					<button
						class="btn btn-primary gap-2"
						onclick={handleSubmit}
						disabled={isSubmitting || !questionStem || correctAnswers.length === 0}
					>
						{#if isSubmitting}
							<span class="loading loading-spinner loading-sm"></span>
							<span>Updating...</span>
						{:else}
							<span>Update Question</span>
						{/if}
					</button>
				</form>
			</div>
		{/if}
	</div>
</dialog>
