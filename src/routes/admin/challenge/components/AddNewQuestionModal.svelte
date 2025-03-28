<script lang="ts">
	import { Trash2, HelpCircle, FileImage, AlertCircle, Plus, X } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import type { AdminChallengeQuestions } from '$lib/types';

	let {
		isAddModalOpen = $bindable(),
		newQuestion = $bindable(),
		questions,
		removeNewOption,
		addNewOption,
		removeNewCorrectAnswer,
		addNewCorrectAnswer,
		newImageUrl = $bindable(),
		handleNewImageUpload,
		addImageUploading,
		addError,
		isAddingSaving,
		addQuestion
	} = $props();

	// Ensure at least one correct answer is selected when the form opens
	$effect(() => {
		if (
			newQuestion &&
			(!newQuestion.question_data.correct_answers ||
				newQuestion.question_data.correct_answers.length === 0)
		) {
			newQuestion.question_data.correct_answers = ['A'];
		}
	});

	let chapters = $derived.by(() => {
		return Array.from(new Set(questions.map((q: AdminChallengeQuestions) => q.chapter))).sort(
			(a, b) => Number(a) - Number(b)
		);
	});
</script>

<div>
	{#if isAddModalOpen}
		<div class="modal-backdrop" transition:fade={{ duration: 150 }}></div>
	{/if}

	<dialog class="modal max-w-full" class:modal-open={isAddModalOpen}>
		<div
			class="modal-box w-11/12 max-w-5xl p-0 overflow-hidden bg-base-100 shadow-lg rounded-lg"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<div
				class="px-6 py-4 border-b border-base-200 flex justify-between items-center sticky top-0 bg-base-100 z-10"
			>
				<h3 class="text-xl font-bold">Add New Question</h3>
				<button
					class="btn btn-circle btn-ghost"
					onclick={() => {
						isAddModalOpen = false;
						newQuestion = null;
					}}
					aria-label="Close modal"
				>
					<X size={20} />
				</button>
			</div>

			{#if newQuestion}
				<div class="p-6 overflow-y-auto max-h-[70vh]">
					<div class="grid grid-cols-1 gap-8">
						<!-- Question Content -->
						<div class="card bg-base-200/50 p-6 rounded-lg">
							<h4 class="text-lg font-medium mb-4 flex items-center">
								<span>Question Content</span>
								<div class="tooltip tooltip-right ml-2" data-tip="Enter the main question text">
									<HelpCircle size={16} class="text-base-content/60" />
								</div>
							</h4>

							<div class="space-y-4">
								<!-- Chapter Selection -->
								<div class="form-control w-full max-w-xs">
									<label for="new-chapter" class="label font-medium">
										<span class="label-text">Chapter</span>
									</label>
									<select
										id="new-chapter"
										class="select select-bordered w-full"
										bind:value={newQuestion.chapter}
									>
										<option value="" disabled selected>Select chapter</option>
										{#each chapters as chapter (chapter)}
											{#if chapter}
												<option value={chapter}>{chapter}</option>
											{/if}
										{/each}
									</select>
								</div>

								<!-- Question Text -->
								<div class="form-control">
									<label for="new-question-text" class="label">
										<span class="label-text font-medium">Question Text</span>
									</label>
									<textarea
										id="new-question-text"
										class="textarea textarea-bordered h-28 w-full"
										bind:value={newQuestion.question_data.question}
										placeholder="Enter your question here..."
									></textarea>
								</div>
							</div>

							<!-- Image Upload -->
							<div class="form-control mt-5">
								<label for="questionImage" class="label font-medium flex justify-between">
									<span class="label-text">Question Image (Optional)</span>
								</label>

								{#if newImageUrl}
									<div class="mb-2 p-2 border border-base-300 rounded-lg bg-base-200/30">
										<div class="flex flex-col sm:flex-row items-center gap-3">
											<img
												src={newImageUrl}
												alt="Uploaded preview"
												class="max-h-56 object-contain rounded-md"
											/>
											<button
												class="btn btn-sm btn-error btn-outline gap-1 self-end sm:self-start"
												onclick={() => (newImageUrl = null)}
												type="button"
											>
												<Trash2 size={16} />
												<span>Remove</span>
											</button>
										</div>
									</div>
								{:else}
									<label
										class="flex flex-col items-center justify-center h-36 border-2 border-dashed border-base-300 rounded-lg cursor-pointer bg-base-200/30 hover:bg-base-200/60 transition-colors"
									>
										<div class="flex flex-col items-center justify-center p-5 text-center">
											<FileImage size={32} class="text-base-content/60 mb-2" />
											<p class="text-sm font-medium">Click to upload an image</p>
											<p class="text-xs text-base-content/60 mt-1">PNG, JPG or GIF (max 5MB)</p>
										</div>
										<input
											type="file"
											accept="image/*"
											onchange={handleNewImageUpload}
											class="hidden"
											disabled={addImageUploading}
										/>
									</label>

									{#if addImageUploading}
										<div class="flex items-center justify-center mt-2">
											<span class="loading loading-spinner text-primary"></span>
											<span class="ml-2 text-sm">Uploading image...</span>
										</div>
									{/if}
								{/if}
							</div>
						</div>

						<!-- Answer Options -->
						<div class="card bg-base-200/50 p-6 rounded-lg">
							<h4 class="text-lg font-medium mb-4">Answer Options</h4>

							<div class="space-y-5">
								<!-- Options -->
								<div class="form-control">
									<label class="label font-medium flex justify-between">
										<span class="label-text">Options</span>
										<button
											class="btn btn-xs btn-primary gap-1"
											onclick={addNewOption}
											type="button"
										>
											<Plus size={14} />
											<span>Add Option</span>
										</button>
									</label>

									<div class="space-y-3 mt-2">
										{#each newQuestion.question_data.options, i}
											<div class="flex items-center gap-3">
												<input
													id={`new-option-${i}`}
													type="text"
													class="input input-bordered w-full"
													bind:value={newQuestion.question_data.options[i]}
													placeholder="Enter option text"
												/>
												<button
													class="btn btn-sm btn-ghost text-error"
													onclick={() => removeNewOption(i)}
													type="button"
													aria-label={`Remove option ${i + 1}`}
													disabled={newQuestion.question_data.options.length <= 2}
												>
													<Trash2 size={18} />
												</button>
											</div>
										{/each}
									</div>
								</div>

								<!-- Correct Answers -->
								<div class="form-control">
									<label class="label font-medium flex justify-between">
										<span class="label-text">Correct Answers</span>
										<button
											class="btn btn-xs btn-primary gap-1"
											onclick={addNewCorrectAnswer}
											type="button"
										>
											<Plus size={14} />
											<span>Add Correct Answer</span>
										</button>
									</label>

									<div class="space-y-3 mt-2">
										{#each newQuestion.question_data.correct_answers, i}
											<div class="flex items-center gap-3">
												<div class="badge badge-lg badge-success w-8 flex justify-center">✓</div>
												<select
													id={`new-correct-answer-${i}`}
													class="select select-bordered w-full"
													bind:value={newQuestion.question_data.correct_answers[i]}
												>
													<option value="" disabled>Select correct answer</option>
													{#each ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as letter, letterIdx (letterIdx)}
														{#if letterIdx < newQuestion.question_data.options.length}
															<option value={letter}>{letter}</option>
														{/if}
													{/each}
												</select>
												<button
													class="btn btn-sm btn-ghost text-error"
													onclick={() => removeNewCorrectAnswer(i)}
													type="button"
													aria-label={`Remove correct answer ${i + 1}`}
													disabled={newQuestion.question_data.correct_answers.length <= 1}
												>
													<Trash2 size={18} />
												</button>
											</div>
										{/each}
									</div>
								</div>
							</div>
						</div>

						<!-- Explanation -->
						<div class="card bg-base-200/50 p-6 rounded-lg">
							<div class="form-control">
								<label for="new-explanation" class="label flex justify-between">
									<div class="flex items-center">
										<span class="label-text font-medium">Explanation</span>
									</div>
								</label>
								<textarea
									id="new-explanation"
									class="textarea textarea-bordered h-36 w-full"
									bind:value={newQuestion.question_data.explanation}
									placeholder="Explain why the correct answer(s) are correct..."
								></textarea>
							</div>
						</div>
					</div>

					{#if addError}
						<div class="alert alert-error mt-6 flex items-center gap-2">
							<AlertCircle size={20} />
							<span>Error: {addError}</span>
						</div>
					{/if}
				</div>

				<div
					class="px-6 py-4 border-t border-base-200 flex justify-end gap-3 sticky bottom-0 bg-base-100 z-10"
				>
					<button
						class="btn btn-ghost"
						onclick={() => {
							isAddModalOpen = false;
							newQuestion = null;
						}}
						disabled={isAddingSaving || addImageUploading}
						type="button"
					>
						Cancel
					</button>
					<button
						class="btn btn-primary"
						onclick={addQuestion}
						disabled={isAddingSaving || addImageUploading}
						type="button"
					>
						{#if isAddingSaving}
							<span class="loading loading-spinner"></span>
							<span>Adding Question...</span>
						{:else}
							<span>Add Question</span>
						{/if}
					</button>
				</div>
			{/if}
		</div>
	</dialog>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.4);
		z-index: 40;
	}

	/* Add smooth transitions to interactive elements */
	.btn,
	.input,
	.textarea,
	.select {
		transition: all 0.2s ease;
	}
</style>
