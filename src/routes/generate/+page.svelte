<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { Sparkles, Loader, FileText, CheckCircle, Copy, Check } from 'lucide-svelte';

	interface Question {
		question: string;
		options: string[];
		correct_answers: string[];
		explanation: string;
	}

	let materialInput = $state('');
	let generatedQuestions = $state<Question[]>([]);
	let jsonOutput = $state(''); // Used for raw JSON display or error messages
	let loading = $state(false);
	let activeTab = $state<'questions' | 'json'>('questions');
	let copied = $state(false);

	async function submitGeneration(): Promise<void> {
		loading = true;
		generatedQuestions = [];
		jsonOutput = ''; // Clear previous JSON/error output

		try {
			const response = await fetch('/api/generate', {
				// Ensure this path matches your backend route
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				// --- FIX 1: Use 'material' key ---
				body: JSON.stringify({ material: materialInput })
			});

			// Try to parse JSON regardless of response.ok to potentially get error details
			const data = await response.json();

			if (!response.ok) {
				// Use error message from backend if available, otherwise throw generic error
				const errorMessage =
					data?.error || `API Error: ${response.statusText} (${response.status})`;
				throw new Error(errorMessage);
			}

			// --- FIX 2: Check if data is the array directly ---
			if (Array.isArray(data)) {
				generatedQuestions = data as Question[]; // Assign the array directly
				// Create formatted JSON for display in the JSON tab
				jsonOutput = JSON.stringify(data, null, 2);
				activeTab = 'questions'; // Switch to questions tab on success
			} else {
				// Handle unexpected successful response format
				console.error('Received unexpected response format:', data);
				throw new Error('Received unexpected response format from API.');
			}
		} catch (err) {
			console.error('Generation Error:', err);
			if (err instanceof Error) {
				// Display the error message in the JSON tab
				jsonOutput = `Error: ${err.message}`;
			} else {
				jsonOutput = 'An unknown error occurred.';
			}
			activeTab = 'json'; // Switch to JSON tab to show the error
		} finally {
			loading = false;
		}
	}

	function copyToClipboard() {
		if (!jsonOutput) return; // Don't copy if there's nothing (e.g., before first generation)
		navigator.clipboard.writeText(jsonOutput);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	// Determine if there's any output (loading, questions, or JSON/error message)
	let hasOutput = $derived(loading || generatedQuestions.length > 0 || jsonOutput.trim() !== '');
</script>

<div class="container mx-auto p-6 max-w-7xl">
	<div class="card bg-base-100 shadow-lg rounded-lg overflow-hidden">
		<div class="p-6 border-b border-base-200">
			<h2 class="text-2xl font-bold mb-1">Question Generator</h2>
			<p class="text-base-content/70 text-sm">
				Enter pharm material to generate multiple-choice questions
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-0">
			<!-- Material input section -->
			<div class="p-6 bg-base-200/30 border-r border-base-200">
				<div class="form-control">
					<label class="label font-medium flex justify-between" for="material">
						<span class="label-text mb-3">Pharm Material</span>
					</label>
					<textarea
						id="material"
						bind:value={materialInput}
						placeholder="Paste the pharm material for question generation here..."
						class="textarea textarea-bordered w-full h-[calc(100vh-300px)] min-h-[300px] bg-base-100"
					></textarea>
				</div>

				<div class="mt-4 flex justify-end">
					<button
						onclick={submitGeneration}
						class="btn btn-primary gap-2"
						disabled={loading || !materialInput.trim()}
					>
						{#if loading}
							<Loader size={18} class="animate-spin" />
							<span>Generating...</span>
						{:else}
							<Sparkles size={18} />
							<span>Generate Questions</span>
						{/if}
					</button>
				</div>
			</div>

			<!-- Results section -->
			<div class="border-t lg:border-t-0 border-base-200">
				{#if !hasOutput}
					<div class="flex flex-col items-center justify-center h-full p-12 text-base-content/60">
						<FileText size={48} class="mb-4 opacity-30" />
						<p class="text-center">
							Enter your pharm material and click "Generate Questions" to see results here.
						</p>
					</div>
				{:else}
					<!-- Tabs -->
					<div class="tabs tabs-bordered px-6 bg-base-100">
						<button
							class="tab tab-lg {activeTab === 'questions' ? 'tab-active' : ''} gap-2"
							onclick={() => (activeTab = 'questions')}
						>
							<CheckCircle size={18} />
							Questions
						</button>
						<button
							class="tab tab-lg {activeTab === 'json' ? 'tab-active' : ''} gap-2"
							onclick={() => (activeTab = 'json')}
						>
							<FileText size={18} />
							JSON
						</button>
					</div>

					<!-- Loading indicator -->
					{#if loading}
						<div
							class="p-12 flex flex-col items-center justify-center"
							transition:fade={{ duration: 150 }}
						>
							<div class="loading loading-spinner loading-lg text-primary mb-4"></div>
							<p class="text-base-content/70">Generating questions...</p>
						</div>
					{:else}
						<!-- Questions display -->
						{#if activeTab === 'questions'}
							<div
								class="p-6 overflow-y-auto h-[calc(100vh-300px)] min-h-[300px]"
								transition:fade={{ duration: 150 }}
							>
								{#if generatedQuestions.length > 0}
									<div class="space-y-6">
										{#each generatedQuestions as question, i (i)}
											<div
												class="card bg-base-200/50 p-5 rounded-lg"
												transition:fly={{ y: 10, duration: 200, delay: i * 50 }}
											>
												<div class="flex items-start gap-3">
													<div
														class="badge badge-lg badge-primary text-white font-bold rounded-full w-8 h-8 p-0 flex items-center justify-center flex-shrink-0"
													>
														{i + 1}
													</div>
													<div class="space-y-3 w-full">
														<p class="font-medium text-lg">{question.question}</p>

														<div class="space-y-2 mt-3">
															{#each question.options as option, j (j)}
																<div
																	class="flex items-center p-3 rounded-md bg-base-100 border border-base-300 gap-3"
																>
																	<div
																		class="badge {question.correct_answers.includes(
																			String.fromCharCode(65 + j)
																		)
																			? 'badge-success text-white'
																			: 'badge-outline'} w-8 h-8 p-0 flex items-center justify-center rounded-full"
																	>
																		{String.fromCharCode(65 + j)}
																	</div>
																	<span>{option}</span>
																</div>
															{/each}
														</div>

														{#if question.explanation}
															<div class="mt-4 bg-base-100 p-4 rounded-md border border-base-300">
																<p class="text-sm font-medium mb-1">Explanation:</p>
																<p class="text-sm text-base-content/80">{question.explanation}</p>
															</div>
														{/if}
													</div>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<div class="text-center p-8 text-base-content/70">
										No questions generated yet.
									</div>
								{/if}
							</div>
						{:else if activeTab === 'json'}
							<!-- JSON output -->
							<div
								class="p-6 h-[calc(100vh-300px)] min-h-[300px] flex flex-col"
								transition:fade={{ duration: 150 }}
							>
								<div class="form-control flex-1 flex flex-col">
									<div class="flex justify-between items-center mb-2">
										<label class="label-text font-medium" for="output">Raw JSON Output</label>
										<button
											class="btn btn-sm btn-ghost gap-2"
											onclick={copyToClipboard}
											disabled={!jsonOutput}
										>
											{#if copied}
												<Check size={16} class="text-success" />
												<span class="text-success">Copied!</span>
											{:else}
												<Copy size={16} />
												<span>Copy</span>
											{/if}
										</button>
									</div>
									<div class="bg-base-300 rounded-lg p-1 flex-1">
										<textarea
											id="output"
											readonly
											value={jsonOutput}
											placeholder="Output will appear here..."
											class="textarea font-mono text-sm w-full h-full bg-base-300 border-none resize-none focus:outline-none"
										></textarea>
									</div>
								</div>
							</div>
						{/if}
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* Smooth transitions for interactive elements */
	.btn,
	.textarea,
	.tab {
		transition: all 0.2s ease;
	}

	/* Custom scrollbar for textareas */
	textarea::-webkit-scrollbar {
		width: 8px;
	}

	textarea::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.05);
		border-radius: 4px;
	}

	textarea::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.1);
		border-radius: 4px;
	}

	textarea::-webkit-scrollbar-thumb:hover {
		background: rgba(0, 0, 0, 0.2);
	}
</style>
