<script lang="ts">
	import { NewSetLogic } from '../new-set/NewSetLogic.svelte';
	import { FileImage, Plus, Trash2, HelpCircle } from 'lucide-svelte';
	import type { NewQuestionInput } from '$lib/types'; // Adjust path as needed

	let {
		question = $bindable(),
		index,
		logic,
		handleImageUploadForRow
	}: {
		question: NewQuestionInput;
		index: number;
		logic: NewSetLogic;
		handleImageUploadForRow: (event: Event, index: number) => void;
	} = $props();

	let imageState = $derived(logic.imageStates[index] || { uploading: false, url: null });

	// Function to get the letter prefix (e.g., "A.")
	function getOptionPrefix(optionIndex: number): string {
		return String.fromCharCode('A'.charCodeAt(0) + optionIndex) + '.';
	}

	// Function to extract text after the prefix (e.g., " Option text")
	function getOptionText(optionValue: string): string {
		const dotIndex = optionValue.indexOf('.');
		return dotIndex !== -1 ? optionValue.substring(dotIndex + 1) : optionValue;
	}

	// Function to update the option value while preserving the prefix
	function updateOptionText(optionIndex: number, newText: string) {
		const prefix = getOptionPrefix(optionIndex);
		// Ensure the bound value includes the prefix and a space
		question.question_data.options[optionIndex] = `${prefix} ${newText.trim()}`;
	}
</script>

<div class="card bg-base-100 border border-base-content/10 shadow-md rounded-lg overflow-hidden">
	<!-- Card Header -->
	<div class="bg-base-200/50 px-4 py-3 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<span class="badge badge-primary badge-lg font-bold">{index + 1}</span>
			<h3 class="font-medium text-lg">Question {index + 1}</h3>
		</div>
		<button
			class="btn btn-sm btn-ghost text-error hover:bg-error/10"
			onclick={() => logic.removeRow(index)}
			aria-label="Remove question {index + 1}"
		>
			<Trash2 size={18} />
			<span class="sm:inline hidden ml-1">Remove</span>
		</button>
	</div>

	<!-- Card Body -->
	<div class="p-5">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">
			<!-- Left Column: Question Text & Image -->
			<section class="space-y-5">
				<!-- Question Text -->
				<div class="form-control">
					<label for="question-text-{index}" class="label pb-1">
						<span class="label-text font-medium">Question Text</span>
						<!-- Removed "Required" text -->
					</label>
					<textarea
						id="question-text-{index}"
						class="textarea textarea-bordered h-32 w-full"
						bind:value={question.question_data.question}
						placeholder="Enter the question..."
					></textarea>
				</div>

				<!-- Image Upload -->
				<div class="form-control">
					<label for="question-image-container-{index}" class="label pb-1">
						<span class="label-text font-medium">Image (Optional)</span>
						<div class="tooltip tooltip-left" data-tip="Add an optional image for this question">
							<HelpCircle size={16} class="text-base-content/50 cursor-help" />
						</div>
					</label>
					<div id="question-image-container-{index}">
						{#if imageState.url}
							<div class="rounded-lg border border-base-300 overflow-hidden">
								<div class="relative group">
									<img
										src={imageState.url}
										alt="Question {index + 1}"
										class="w-full max-h-48 object-contain object-center bg-base-200/30"
									/>
									<div
										class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
									>
										<button
											class="btn btn-sm btn-error shadow"
											onclick={() => logic.removeImage(index)}
											type="button"
											disabled={imageState.uploading}
										>
											<Trash2 size={16} />
											<span>Remove Image</span>
										</button>
									</div>
								</div>
							</div>
						{:else if imageState.uploading}
							<div
								class="flex items-center justify-center h-32 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5"
							>
								<div class="flex flex-col items-center">
									<span class="loading loading-spinner loading-md text-primary mb-2"></span>
									<span class="text-sm text-primary">Uploading...</span>
								</div>
							</div>
						{:else}
							<label for="question-image-{index}" class="image-upload-area block">
								<div
									class="flex flex-col items-center justify-center h-32 border-2 border-dashed border-base-300 rounded-lg cursor-pointer bg-base-200/30 hover:bg-base-content/5 transition-colors"
								>
									<div class="flex flex-col items-center justify-center text-center p-4">
										<FileImage size={28} class="text-base-content/50 mb-2" />
										<p class="text-sm font-medium text-base-content/80">Click to upload image</p>
										<p class="text-xs text-base-content/60 mt-1">PNG, JPG up to 5MB</p>
									</div>
								</div>
							</label>
							<input
								id="question-image-{index}"
								type="file"
								accept="image/png, image/jpeg"
								onchange={(e) => handleImageUploadForRow(e, index)}
								class="hidden"
								disabled={imageState.uploading}
							/>
						{/if}
					</div>
				</div>
			</section>

			<!-- Right Column: Options, Correct Answers, Explanation -->
			<section class="space-y-5">
				<!-- Options -->
				<div class="form-control">
					<div class="flex justify-between items-center mb-2">
						<label for="options-container-{index}" class="label-text font-medium">
							Answer Options
							<!-- Removed "(Min. 2 required)" text -->
						</label>
						<button
							class="btn btn-xs btn-primary"
							onclick={() => logic.addOption(index)}
							type="button"
							disabled={question.question_data.options.length >= 6}
							aria-label="Add answer option"
						>
							<Plus size={14} />
							<span>Add</span>
						</button>
					</div>
					<div id="options-container-{index}" class="space-y-2">
						{#each question.question_data.options as optionValue, i (i)}
							<div class="flex items-center gap-2">
								<!-- Removed letter badge -->
								<!-- Use helper functions to manage prefix and text separately -->
								<span class="font-medium w-6 text-center">{getOptionPrefix(i)}</span>
								<input
									type="text"
									id="option-{index}-{i}"
									class="input input-bordered input-sm w-full"
									value={getOptionText(optionValue)}
									oninput={(e) => updateOptionText(i, e.currentTarget.value)}
									placeholder="Enter option text..."
									aria-label={`Option ${getOptionPrefix(i)}`}
								/>
								<button
									class="btn btn-xs btn-ghost text-error hover:bg-error/10"
									onclick={() => logic.removeOption(index, i)}
									type="button"
									aria-label="Remove option {getOptionPrefix(i)}"
									disabled={question.question_data.options.length <= 2}
								>
									<Trash2 size={16} />
								</button>
							</div>
						{/each}
					</div>
				</div>

				<!-- Correct Answers -->
				<div class="form-control">
					<div class="flex justify-between items-center mb-2">
						<label for="correct-answers-container-{index}" class="label-text font-medium">
							Correct Answer(s)
							<!-- Removed "(Required)" text -->
						</label>
						<button
							class="btn btn-xs btn-primary"
							onclick={() => logic.addCorrectAnswer(index)}
							type="button"
							disabled={question.question_data.correct_answers.length >=
								question.question_data.options.length}
							aria-label="Add correct answer selection"
						>
							<Plus size={14} />
							<span>Add</span>
						</button>
					</div>
					<div id="correct-answers-container-{index}">
						{#if !question.question_data.correct_answers || question.question_data.correct_answers.length === 0}
							<!-- Keep this alert as it's helpful UI feedback -->
							<div class="alert alert-warning shadow-sm p-2 text-sm justify-start">
								<HelpCircle size={16} />
								<span>Select at least one correct answer using the dropdowns.</span>
							</div>
						{:else}
							<div class="space-y-2">
								{#each question.question_data.correct_answers, i (i)}
									<div class="flex items-center gap-2">
										<select
											id="correct-answer-{index}-{i}"
											class="select select-bordered select-sm w-full"
											bind:value={question.question_data.correct_answers[i]}
											aria-label={`Correct answer ${i + 1}`}
										>
											<option value="" disabled>Select correct option letter</option>
											{#each (question?.question_data?.options || []).map( (_option: string, optIdx: number) => String.fromCharCode('A'.charCodeAt(0) + optIdx) ) as letter (letter)}
												<option value={letter}>{letter}</option>
											{/each}
										</select>
										<button
											class="btn btn-xs btn-ghost text-error hover:bg-error/10"
											onclick={() => logic.removeCorrectAnswer(index, i)}
											type="button"
											aria-label="Remove correct answer {i + 1}"
											disabled={question.question_data.correct_answers.length <= 1}
										>
											<Trash2 size={16} />
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Explanation -->
				<div class="form-control">
					<label for="explanation-{index}" class="label pb-1">
						<span class="label-text font-medium">Explanation (Optional)</span>
						<div class="tooltip tooltip-left" data-tip="Explain why the answer(s) are correct">
							<HelpCircle size={16} class="text-base-content/50 cursor-help" />
						</div>
					</label>
					<textarea
						id="explanation-{index}"
						class="textarea textarea-bordered h-28 w-full"
						bind:value={question.question_data.explanation}
						placeholder="Explain the answer..."
					></textarea>
				</div>
			</section>
		</div>
	</div>
</div>

<style>
	/* Scoped styles remain the same */
	:global(.image-upload-area:hover) {
		opacity: 0.9;
	}
	:global(.image-upload-area:active) {
		opacity: 0.7;
	}
</style>
