<script lang="ts">
	import { Trash2 } from 'lucide-svelte';
	let {
		isEditModalOpen = $bindable(false),
		editingQuestion = $bindable(null),
		questions,
		removeOption,
		removeCorrectAnswer,
		addCorrectAnswer,
		editImageUrl = $bindable(null),
		handleEditImageUpload,
		editImageUploading,
		saveError,
		isSaving,
		updateQuestion,
		addOption
	} = $props();
</script>

<div>
	<dialog class="modal max-w-full p-4" class:modal-open={isEditModalOpen}>
		<div class="modal-box w-11/12 max-w-4xl">
			<form method="dialog">
				<button
					class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
					onclick={() => {
						isEditModalOpen = false;
						editingQuestion = null;
					}}>✕</button
				>
			</form>
			<h3 class="text-lg font-bold mb-4">Edit Question</h3>

			{#if editingQuestion}
				<div class="grid grid-cols-1 gap-6">
					<!-- Chapter -->
					<div class="form-control">
						<label for="edit-chapter" class="label">
							<span class="label-text">Chapter</span>
						</label>
						<select
							id="edit-chapter"
							class="select select-bordered"
							bind:value={editingQuestion.chapter}
						>
							{#each Array.from(new Set(questions.map((q) => q.chapter))).sort() as chapter (chapter)}
								{#if chapter}
									<option value={chapter}>{chapter}</option>
								{/if}
							{/each}
						</select>
					</div>

					<!-- Question Text -->
					<div class="form-control">
						<label for="edit-question-text" class="label">
							<span class="label-text">Question</span>
						</label>
						<textarea
							id="edit-question-text"
							class="textarea textarea-bordered h-24"
							bind:value={editingQuestion.question_data.question}
							placeholder="Enter question text"
						></textarea>
					</div>
					<!-- Options -->
					<fieldset class="form-control">
						<legend class="text-base font-medium mb-2">Options</legend>

						{#each editingQuestion.question_data.options, i}
							<div class="flex items-center mb-2">
								<label for={`edit-option-${i}`} class="sr-only">Option {i + 1}</label>
								<input
									id={`edit-option-${i}`}
									type="text"
									class="input input-bordered w-full mr-2"
									bind:value={editingQuestion.question_data.options[i]}
									placeholder={`Option ${i + 1}`}
								/>
								<button
									class="btn btn-sm btn-error btn-soft"
									onclick={() => removeOption(i)}
									type="button"
									aria-label={`Remove option ${i + 1}`}
									disabled={editingQuestion.question_data.options.length <= 2}
								>
									<Trash2 size="16" />
								</button>
							</div>
						{/each}

						<button class="btn btn-sm btn-outline mt-2 w-full" onclick={addOption} type="button">
							Add Option
						</button>
					</fieldset>

					<!-- Correct Answers -->
					<fieldset class="form-control">
						<legend class="text-base font-medium mb-2">Correct Answers</legend>

						{#each editingQuestion.question_data.correct_answers, i}
							<div class="flex items-center mb-2">
								<label for={`edit-correct-answer-${i}`} class="sr-only"
									>Correct answer {i + 1}</label
								>
								<select
									id={`edit-correct-answer-${i}`}
									class="select select-bordered w-full mr-2"
									bind:value={editingQuestion.question_data.correct_answers[i]}
								>
									<option value="" disabled>Select correct answer</option>
									{#each ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as letter (letter)}
										<!-- Only include options that exist -->
										{#if editingQuestion.question_data.options.some( (opt) => opt.startsWith(`${letter}.`) )}
											<option value={letter}>{letter}</option>
										{/if}
									{/each}
								</select>
								<button
									class="btn btn-sm btn-error btn-soft"
									onclick={() => removeCorrectAnswer(i)}
									type="button"
									aria-label={`Remove correct answer ${i + 1}`}
									disabled={editingQuestion.question_data.correct_answers.length <= 1}
								>
									<Trash2 size="16" />
								</button>
							</div>
						{/each}

						<button
							class="btn btn-sm btn-outline mt-2 w-full"
							onclick={addCorrectAnswer}
							type="button"
						>
							Add Correct Answer
						</button>
					</fieldset>

					<!-- Explanation -->
					<div class="form-control">
						<label for="edit-explanation" class="label">
							<span class="label-text">Explanation</span>
						</label>
						<textarea
							id="edit-explanation"
							class="textarea textarea-bordered h-24"
							bind:value={editingQuestion.question_data.explanation}
							placeholder="Enter explanation text"
						></textarea>
					</div>

					<!-- Image Upload -->
					<fieldset class="form-control">
						<legend class="text-base font-medium mb-2">Question Image</legend>

						{#if editImageUrl}
							<div class="mb-4">
								<div class="flex items-center mb-2">
									<img src={editImageUrl} alt="Uploaded preview" class="max-h-56 rounded-lg" />
									<button
										class="btn btn-sm btn-error ml-4"
										onclick={() => (editImageUrl = null)}
										type="button"
									>
										Remove Image
									</button>
								</div>
							</div>
						{/if}

						<div class="flex items-center">
							<input
								type="file"
								accept="image/*"
								onchange={handleEditImageUpload}
								class="file-input file-input-bordered w-full"
								disabled={editImageUploading}
							/>
							{#if editImageUploading}
								<div class="ml-2">
									<span class="loading loading-spinner text-primary"></span>
								</div>
							{/if}
						</div>
					</fieldset>
				</div>

				{#if saveError}
					<div class="alert alert-error my-4">
						<span>Error: {saveError}</span>
					</div>
				{/if}

				<div class="modal-action">
					<button
						class="btn btn-outline"
						onclick={() => {
							isEditModalOpen = false;
							editingQuestion = null;
						}}
						disabled={isSaving || editImageUploading}
						type="button"
					>
						Cancel
					</button>
					<button
						class="btn btn-primary"
						onclick={updateQuestion}
						disabled={isSaving || editImageUploading}
						type="button"
					>
						{#if isSaving}
							<span class="loading loading-spinner"></span>
							Saving...
						{:else}
							Save Changes
						{/if}
					</button>
				</div>
			{/if}
		</div>
	</dialog>
</div>
