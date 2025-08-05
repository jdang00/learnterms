<script lang="ts">
	let { isAddModalOpen, closeAddModal, moduleId } = $props();

	import { X, MessageSquare, Hash, ListChecks, Lightbulb } from 'lucide-svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id } from '../../convex/_generated/dataModel';

	const client = useConvexClient();

	let questionStem: string = $state('');
	let questionExplanation: string = $state('');
	let questionStatus: string = $state('draft');
	let questionType: string = $state('multiple_choice');
	let options: Array<{ text: string }> = $state([
		{ text: '' },
		{ text: '' },
		{ text: '' },
		{ text: '' }
	]);
	let correctAnswers: string[] = $state([]);
	let isSubmitting: boolean = $state(false);

	const questions = useQuery(api.question.getQuestionsByModule, {
		id: moduleId as Id<'module'>
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
		if (!questionStem || !moduleId) return;

		const filledOptions = options.filter((opt) => opt.text.trim());
		if (filledOptions.length < 2) return;

		isSubmitting = true;

		try {
			const nextOrder = questions.data?.length
				? Math.max(...questions.data.map((q) => q.order)) + 1
				: 0;

			const filteredCorrectAnswers = correctAnswers
				.map((index) => parseInt(index))
				.filter((index) => index < filledOptions.length)
				.map((index) => index.toString());

			await client.mutation(api.question.insertQuestion, {
				moduleId: moduleId as Id<'module'>,
				type: questionType,
				stem: questionStem,
				options: filledOptions,
				correctAnswers: filteredCorrectAnswers,
				explanation: questionExplanation,
				aiGenerated: false,
				status: questionStatus.toLowerCase(),
				order: nextOrder,
				metadata: {},
				updatedAt: Date.now()
			});

			questionStem = '';
			questionExplanation = '';
			questionStatus = 'draft';
			questionType = 'multiple_choice';
			options = [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
			correctAnswers = [];
			closeAddModal();
		} catch (error) {
			console.error('Failed to create question', error);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<dialog class="modal p-6" class:modal-open={isAddModalOpen}>
	<div class="modal-box w-full max-w-4xl rounded-2xl border border-base-300 shadow-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
				onclick={closeAddModal}
				aria-label="Close"
			>
				<X size={18} />
			</button>
		</form>

		<div class="mb-6 flex items-center gap-2">
			<h3 class="text-2xl font-extrabold tracking-tight">Add New Question</h3>
		</div>

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
					class="textarea textarea-bordered w-full min-h-12"
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
				<select id="question-type" class="select select-bordered w-full" bind:value={questionType}>
					<option value="multiple_choice">Multiple Choice</option>
					<option value="true_false">True/False</option>
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
				<button class="btn btn-ghost" onclick={closeAddModal} disabled={isSubmitting}>Cancel</button
				>
				<button
					class="btn btn-primary gap-2"
					onclick={handleSubmit}
					disabled={isSubmitting || !questionStem || correctAnswers.length === 0}
				>
					{#if isSubmitting}
						<span class="loading loading-spinner loading-sm"></span>
						<span>Creating...</span>
					{:else}
						<span>Create Question</span>
					{/if}
				</button>
			</form>
		</div>
	</div>
</dialog>
