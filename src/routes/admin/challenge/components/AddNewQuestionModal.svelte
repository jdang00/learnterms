<script>
	import { Trash2 } from 'lucide-svelte';
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
</script>

<div>
	<dialog class="modal max-w-full p-4" class:modal-open={isAddModalOpen}>
		<div class="modal-box w-11/12 max-w-4xl">
			<form method="dialog">
				<button
					class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
					onclick={() => {
						isAddModalOpen = false;
						newQuestion = null;
					}}>✕</button
				>
			</form>
			<h3 class="text-lg font-bold mb-4">Add New Question</h3>

			{#if newQuestion}
				<div class="grid grid-cols-1 gap-6">
					<!-- Chapter -->
					<div class="form-control">
						<label for="new-chapter" class="label">
							<span class="label-text">Chapter</span>
						</label>
						<select
							id="new-chapter"
							class="select select-bordered"
							bind:value={newQuestion.chapter}
						>
							{#each Array.from(new Set(questions.map((q) => q.chapter))).sort() as chapter}
								{#if chapter}
									<option value={chapter}>{chapter}</option>
								{/if}
							{/each}
						</select>
					</div>

					<!-- Question Text -->
					<div class="form-control">
						<label for="new-question-text" class="label">
							<span class="label-text">Question</span>
						</label>
						<textarea
							id="new-question-text"
							class="textarea textarea-bordered h-24"
							bind:value={newQuestion.question_data.question}
							placeholder="Enter question text"
						></textarea>
					</div>

					<!-- Options -->
					<fieldset class="form-control">
						<legend class="text-base font-medium mb-2">Options</legend>

						{#each newQuestion.question_data.options as _, i}
							<div class="flex items-center mb-2">
								<label for={`new-option-${i}`} class="sr-only">Option {i + 1}</label>
								<input
									id={`new-option-${i}`}
									type="text"
									class="input input-bordered w-full mr-2"
									bind:value={newQuestion.question_data.options[i]}
									placeholder={`Option ${String.fromCharCode(65 + i)}`}
								/>
								<button
									class="btn btn-sm btn-error btn-soft"
									onclick={() => removeNewOption(i)}
									type="button"
									aria-label={`Remove option ${i + 1}`}
									disabled={newQuestion.question_data.options.length <= 2}
								>
									<Trash2 size="16" />
								</button>
							</div>
						{/each}

						<button class="btn btn-sm btn-outline mt-2 w-full" onclick={addNewOption} type="button">
							Add Option
						</button>
					</fieldset>

					<!-- Correct Answers -->
					<fieldset class="form-control">
						<legend class="text-base font-medium mb-2">Correct Answers</legend>

						{#each newQuestion.question_data.correct_answers as _, i}
							<div class="flex items-center mb-2">
								<label for={`new-correct-answer-${i}`} class="sr-only">Correct answer {i + 1}</label
								>
								<select
									id={`new-correct-answer-${i}`}
									class="select select-bordered w-full mr-2"
									bind:value={newQuestion.question_data.correct_answers[i]}
								>
									<option value="" disabled>Select correct answer</option>
									{#each ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as letter, letterIdx}
										<!-- Only include options that exist -->
										{#if letterIdx < newQuestion.question_data.options.length}
											<option value={letter}>{letter}</option>
										{/if}
									{/each}
								</select>
								<button
									class="btn btn-sm btn-error btn-soft"
									onclick={() => removeNewCorrectAnswer(i)}
									type="button"
									aria-label={`Remove correct answer ${i + 1}`}
									disabled={newQuestion.question_data.correct_answers.length <= 1}
								>
									<Trash2 size="16" />
								</button>
							</div>
						{/each}

						<button
							class="btn btn-sm btn-outline mt-2 w-full"
							onclick={addNewCorrectAnswer}
							type="button"
						>
							Add Correct Answer
						</button>
					</fieldset>

					<!-- Explanation -->
					<div class="form-control">
						<label for="new-explanation" class="label">
							<span class="label-text">Explanation</span>
						</label>
						<textarea
							id="new-explanation"
							class="textarea textarea-bordered h-24"
							bind:value={newQuestion.question_data.explanation}
							placeholder="Enter explanation text"
						></textarea>
					</div>

					<!-- Image Upload -->
					<fieldset class="form-control">
						<legend class="text-base font-medium mb-2">Upload Picture</legend>

						{#if newImageUrl}
							<div class="mb-4">
								<div class="flex items-center mb-2">
									<img src={newImageUrl} alt="Uploaded preview" class="max-h-56 rounded-lg" />
									<button
										class="btn btn-sm btn-error ml-4"
										onclick={() => (newImageUrl = null)}
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
								onchange={handleNewImageUpload}
								class="file-input file-input-bordered w-full"
								disabled={addImageUploading}
							/>
							{#if addImageUploading}
								<div class="ml-2">
									<span class="loading loading-spinner text-primary"></span>
								</div>
							{/if}
						</div>
					</fieldset>
				</div>

				{#if addError}
					<div class="alert alert-error my-4">
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
						<span>Error: {addError}</span>
					</div>
				{/if}

				<div class="modal-action">
					<button
						class="btn btn-outline"
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
							Adding...
						{:else}
							Add Question
						{/if}
					</button>
				</div>
			{/if}
		</div>
	</dialog>
</div>
