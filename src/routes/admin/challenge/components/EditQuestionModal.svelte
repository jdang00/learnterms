<script lang="ts">
	import { Trash2, HelpCircle, FileImage, AlertCircle, Plus, X } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import type { AdminChallengeQuestions } from '$lib/types';

	let { lm = $bindable(), handleEditImageUpload } = $props();

	// Derived chapters list from existing questions.
	let chapters = $derived.by(() => {
		return Array.from(new Set(lm.questions.map((q: AdminChallengeQuestions) => q.chapter))).sort(
			(a, b) => Number(a) - Number(b)
		);
	});

	// A set of option letters for correct answers.
	const optionLetters: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
</script>

<div>
	{#if lm.isEditModalOpen}
		<div class="modal-backdrop" transition:fade={{ duration: 150 }}></div>
	{/if}

	<dialog class="modal max-w-full" class:modal-open={lm.isEditModalOpen}>
		<div
			class="modal-box w-11/12 max-w-5xl p-0 overflow-hidden bg-base-100 shadow-lg rounded-lg"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<div
				class="px-6 py-4 border-b border-base-200 flex justify-between items-center sticky top-0 bg-base-100 z-10"
			>
				<h3 class="text-xl font-bold">Edit Question</h3>
				<button
					class="btn btn-circle btn-ghost"
					onclick={() => {
						lm.isEditModalOpen = false;
						lm.editingQuestion = null;
						lm.editImageUrl = null;
					}}
					aria-label="Close modal"
				>
					<X size={20} />
				</button>
			</div>

			{#if lm.editingQuestion}
				<div class="p-6 overflow-y-auto max-h-[70vh]">
					<div class="grid grid-cols-1 gap-8">
						<!-- Question Content Card -->
						<div class="card bg-base-200/50 p-6 rounded-lg">
							<h4 class="text-lg font-medium mb-4 flex items-center">
								<span>Question Content</span>
								<div class="tooltip tooltip-right ml-2" data-tip="Edit the main question text">
									<HelpCircle size={16} class="text-base-content/60" />
								</div>
							</h4>

							<div class="space-y-4">
								<!-- Chapter Selection -->
								<div class="form-control w-full max-w-xs">
									<label for="edit-chapter" class="label font-medium">
										<span class="label-text">Chapter</span>
									</label>
									<select
										id="edit-chapter"
										class="select select-bordered w-full"
										bind:value={lm.editingQuestion.chapter}
									>
										<option value="" disabled>Select chapter</option>
										{#each chapters as chapter (chapter)}
											{#if chapter}
												<option value={chapter}>{chapter}</option>
											{/if}
										{/each}
									</select>
								</div>

								<!-- Question Text -->
								<div class="form-control">
									<label for="edit-question-text" class="label">
										<span class="label-text font-medium">Question Text</span>
									</label>
									<textarea
										id="edit-question-text"
										class="textarea textarea-bordered h-28 w-full"
										bind:value={lm.editingQuestion.question_data.question}
										placeholder="Enter your question here..."
									></textarea>
								</div>
							</div>
						</div>

						<!-- Image Upload Card -->
						<div class="card bg-base-200/50 p-6 rounded-lg">
							<h4 class="text-lg font-medium mb-4 flex items-center">
								<span>Question Image (Optional)</span>
								<div
									class="tooltip tooltip-right ml-2"
									data-tip="Upload or remove an image for the question"
								>
									<FileImage size={16} class="text-base-content/60" />
								</div>
							</h4>

							{#if lm.editImageUrl}
								<div class="mb-2 p-2 border border-base-300 rounded-lg bg-base-200/30">
									<div class="flex flex-col sm:flex-row items-center gap-3">
										<img
											src={lm.editImageUrl}
											alt="Uploaded preview"
											class="max-h-56 object-contain rounded-md"
										/>
										<button
											class="btn btn-sm btn-error btn-outline gap-1 self-end sm:self-start"
											onclick={() => (lm.editImageUrl = null)}
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
										onchange={handleEditImageUpload}
										class="hidden"
										disabled={lm.editImageUploading}
									/>
								</label>

								{#if lm.editImageUploading}
									<div class="flex items-center justify-center mt-2">
										<span class="loading loading-spinner text-primary"></span>
										<span class="ml-2 text-sm">Uploading image...</span>
									</div>
								{/if}
							{/if}
						</div>

						<!-- Answer Options Card -->
						<div class="card bg-base-200/50 p-6 rounded-lg">
							<h4 class="text-lg font-medium mb-4">Answer Options</h4>

							<div class="space-y-5">
								<!-- Options -->
								<div class="form-control">
									<label class="label font-medium flex justify-between">
										<span class="label-text">Options</span>
										<button
											class="btn btn-xs btn-primary gap-1"
											onclick={() => lm.addOption()}
											type="button"
										>
											<Plus size={14} />
											<span>Add Option</span>
										</button>
									</label>

									<div class="space-y-3 mt-2">
										{#each lm.editingQuestion.question_data.options, i}
											<div class="flex items-center gap-3">
												<input
													id={`edit-option-${i}`}
													type="text"
													class="input input-bordered w-full"
													bind:value={lm.editingQuestion.question_data.options[i]}
													placeholder="Enter option text"
												/>
												<button
													class="btn btn-sm btn-ghost text-error"
													onclick={() => lm.removeOption(i)}
													type="button"
													aria-label={`Remove option ${i + 1}`}
													disabled={lm.editingQuestion.question_data.options.length <= 2}
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
											onclick={() => lm.addCorrectAnswer()}
											type="button"
										>
											<Plus size={14} />
											<span>Add Correct Answer</span>
										</button>
									</label>

									<div class="space-y-3 mt-2">
										{#each lm.editingQuestion.question_data.correct_answers, i}
											<div class="flex items-center gap-3">
												<div class="badge badge-lg badge-success w-8 flex justify-center">✓</div>
												<select
													id={`edit-correct-answer-${i}`}
													class="select select-bordered w-full"
													bind:value={lm.editingQuestion.question_data.correct_answers[i]}
												>
													<option value="" disabled>Select correct answer</option>
													{#each optionLetters as letter (letter)}
														<!-- Only show letters that correspond to an existing option -->
														{#if lm.editingQuestion.question_data.options.some( (opt) => opt.startsWith(`${letter}.`) )}
															<option value={letter}>{letter}</option>
														{/if}
													{/each}
												</select>
												<button
													class="btn btn-sm btn-ghost text-error"
													onclick={() => lm.removeCorrectAnswer(i)}
													type="button"
													aria-label={`Remove correct answer ${i + 1}`}
													disabled={lm.editingQuestion.question_data.correct_answers.length <= 1}
												>
													<Trash2 size={18} />
												</button>
											</div>
										{/each}
									</div>
								</div>
							</div>
						</div>

						<!-- Explanation Card -->
						<div class="card bg-base-200/50 p-6 rounded-lg">
							<div class="form-control">
								<label for="edit-explanation" class="label">
									<span class="label-text font-medium">Explanation</span>
								</label>
								<textarea
									id="edit-explanation"
									class="textarea textarea-bordered h-36 w-full"
									bind:value={lm.editingQuestion.question_data.explanation}
									placeholder="Explain why the correct answer(s) are correct..."
								></textarea>
							</div>
						</div>
					</div>

					{#if lm.saveError}
						<div class="alert alert-error mt-6 flex items-center gap-2">
							<AlertCircle size={20} />
							<span>Error: {lm.saveError}</span>
						</div>
					{/if}
				</div>

				<!-- Modal Footer -->
				<div
					class="px-6 py-4 border-t border-base-200 flex justify-end gap-3 sticky bottom-0 bg-base-100 z-10"
				>
					<button
						class="btn btn-ghost"
						onclick={() => {
							lm.isEditModalOpen = false;
							lm.editingQuestion = null;
							lm.editImageUrl = null;
						}}
						disabled={lm.isSaving || lm.editImageUploading}
						type="button"
					>
						Cancel
					</button>
					<button
						class="btn btn-primary"
						onclick={() => lm.updateQuestion()}
						disabled={lm.isSaving || lm.editImageUploading}
						type="button"
					>
						{#if lm.isSaving}
							<span class="loading loading-spinner"></span>
							<span>Saving Changes...</span>
						{:else}
							<span>Save Changes</span>
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

	/* Smooth transitions for interactive elements */
	.btn,
	.input,
	.textarea,
	.select {
		transition: all 0.2s ease;
	}
</style>
