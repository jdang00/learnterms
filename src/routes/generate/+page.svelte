<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { Sparkles, FileText, CheckCircle, Copy, Check, Download } from 'lucide-svelte';

	interface Question {
		question: string;
		options: string[];
		correct_answers: string[];
		explanation: string;
	}

	const sampleMaterial = `# Cell Wall Inhibitors
Penicillins and other B-lactam antibiotics ß-lactam antibiotics are so-called because they all contain a B-lactam ring in their chemical structures. These antibiotics act to inhibit bacterial wall synthesis by inactivating bacterial transpeptidase and preventing the cross-linking of peptidoglycan. Humans do not have peptidoglycan cell walls so most of these are not toxic to human cells (PCN, cephalosporin) unless they act on human cell receptors. These drugs are broad-spectrum, generally bactericidal, antibiotics with activity against both Gram + and Gram - bacterial strains. Bacteria can produce B-lactamase (penicillinase being the main example) as a mechanism of acquired resistance to B-lactam antibiotics. Co-administration of B-lactamase inhibitors can partially mitigate resistance. The ability of penicillin to inhibit growth of gram negative bacilli is dependent on the rate of influx across the outer membrane being greater than the rate of hydrolysis by B-lactamases. Alteration in the penicillin side chain governs gram negative activity, generally by enhancing penetration across the outer membrane rather than reducing the rate of hydrolysis. PhO H N AS AMe *''Me СОзН Penicillin V (1) Click for PCN mechanism of action video Natural PCN (penicillin G, V) - Mainly effective with gram+ bacteria. Penicillin G is used intra- muscularly (I.M.) and penicillin V used orally (not broken down by stomach acids like Pen-G). Benzathine penicillin gives longer retention time in body - combination of pen G and benzathine and used commonly for syphilis treatment. Natural penicillin has a narrow spectrum of activity and susceptible to penicillinase. Semi synthetic penicillins are broad spectrum and bactericidal and have a natural PCN base with chemically altered side chains to allow for better gram- penetration. Examples: Aminopenicillins (ampicillin, amoxicillin). Ampicillin can be dosed PO, IV, or IM and can be combined with sulbactam, a beta-lactamase inhibitor. Amoxicillin is PO and often combined with clavulanic acid (Augmentin) which is also a beta-lactamase inhibitor.
`;

	const loadingMessages = [
		'Analyzing material structure...',
		'Identifying key concepts...',
		'Evaluating content complexity...',
		'Generating question frameworks...',
		'Crafting multiple-choice options...',
		'Validating answer accuracy...',
		'Developing explanations...',
		'Optimizing question difficulty...',
		'Reviewing educational standards...',
		'Finalizing question set...',
		'Preparing detailed explanations...',
		'Quality checking responses...',
		'Completing generation process...'
	];

	let materialInput = $state('');
	let generatedQuestions = $state<Question[]>([]);
	let jsonOutput = $state('');
	let loading = $state(false);
	let activeTab = $state<'questions' | 'json'>('questions');
	let copied = $state(false);
	let loadingMessage = $state(loadingMessages[0]);

	let wordCount = $derived(materialInput.trim().split(/\s+/).filter(Boolean).length);

	let loadingInterval: ReturnType<typeof setInterval>;

	async function submitGeneration(): Promise<void> {
		loading = true;
		let messageIndex = 0;
		loadingInterval = setInterval(() => {
			messageIndex = (messageIndex + 1) % loadingMessages.length;
			loadingMessage = loadingMessages[messageIndex];
		}, 6000);

		generatedQuestions = [];
		jsonOutput = '';

		try {
			const response = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ material: materialInput })
			});
			const data = await response.json();
			if (!response.ok) {
				const errorMessage =
					data?.error || `API Error: ${response.statusText} (${response.status})`;
				throw new Error(errorMessage);
			}
			if (Array.isArray(data)) {
				generatedQuestions = data as Question[];
				jsonOutput = JSON.stringify(data, null, 2);
				activeTab = 'questions';
			} else {
				console.error('Received unexpected response format:', data);
				throw new Error('Received unexpected response format from API.');
			}
		} catch (err) {
			if (err instanceof Error) {
				jsonOutput = `Error: ${err.message}`;
			} else {
				jsonOutput = 'An unknown error occurred.';
			}
			activeTab = 'json';
		} finally {
			loading = false;
			clearInterval(loadingInterval);
			loadingMessage = loadingMessages[0];
		}
	}

	function copyToClipboard() {
		if (!jsonOutput) return;
		navigator.clipboard.writeText(jsonOutput);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function exportAsPlainText() {
		if (generatedQuestions.length === 0) return;

		let textContent = 'Generated Questions\n\n';
		generatedQuestions.forEach((q, i) => {
			textContent += `Question ${i + 1}: ${q.question}\n`;
			q.options.forEach((opt) => {
				const letter = opt.charAt(0);
				const isCorrect = q.correct_answers.includes(letter);
				textContent += `  [${isCorrect ? 'X' : ' '}] ${opt}\n`;
			});
			textContent += `\nExplanation: ${q.explanation}\n`;
			textContent += '--------------------------------------------------\n\n';
		});

		const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'generated_questions.txt';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function loadSample() {
		materialInput = sampleMaterial;
	}

	let hasOutput = $derived(generatedQuestions.length > 0 || jsonOutput.trim() !== '');
</script>

<div class="container mx-auto p-6 max-w-7xl">
	<div class="card bg-base-100 shadow-lg rounded-lg overflow-hidden">
		<div class="p-6 border-b border-base-200">
			<h2 class="text-2xl font-bold mb-1">Question Generator</h2>
			<p class="text-base-content/70 text-sm">
				Enter a focused section of your study material to generate targeted multiple-choice
				questions.
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-0">
			<!-- Material input section -->
			<div class="p-6 bg-base-200/30 border-r border-base-200 flex flex-col">
				<div class="form-control">
					<div class="flex justify-between items-center mb-2">
						<label class="label font-medium" for="material">
							<span class="label-text">Pharm Material</span>
						</label>
						<button class="btn btn-ghost" onclick={loadSample}>Load Sample</button>
					</div>
					<textarea
						id="material"
						bind:value={materialInput}
						placeholder="Paste the pharm material for question generation here..."
						class="textarea textarea-bordered w-full min-h-[300px] bg-base-100"
					></textarea>
				</div>

				<!-- Word count and tip directly below textarea -->
				<div class="text-xs text-base-content/60 mt-2 mb-4 flex justify-between">
					<span>Word Count: {wordCount}</span>
					<span class="text-right">Tip: For best results, use 200-500 words.</span>
				</div>

				<!-- Generate button - only show when not loading -->
				{#if !loading}
					<div class="mt-auto flex justify-end" transition:fade={{ duration: 150 }}>
						<button
							onclick={submitGeneration}
							class="btn btn-primary gap-2"
							disabled={!materialInput.trim()}
						>
							<Sparkles size={18} />
							<span>Generate Questions</span>
						</button>
					</div>
				{/if}
			</div>

			<!-- Results section -->
			<div class="border-t lg:border-t-0 border-base-200">
				{#if loading}
					<!-- Full-panel loading state -->
					<div
						class="flex flex-col items-center justify-center h-full p-12 bg-primary/5"
						transition:fade={{ duration: 300 }}
					>
						<div class="loading loading-spinner loading-lg text-primary mb-6"></div>
						<div class="text-center">
							<h3 class="text-xl font-semibold mb-2">Generating Questions</h3>
							<p class="text-base-content/70 mb-4">
								This process typically takes 45-60 seconds as we analyze your material and craft
								high-quality questions.
							</p>
							<div class="bg-base-100 p-4 rounded-lg shadow-sm">
								<p class="text-sm font-medium text-primary">{loadingMessage}</p>
							</div>
						</div>
					</div>
				{:else if !hasOutput}
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
							JSON & Export
						</button>
					</div>

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
								<div class="text-center p-8 text-base-content/70">No questions generated yet.</div>
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
									<label class="label-text font-medium" for="output">Raw JSON & Export</label>
									<div class="flex items-center gap-2">
										<button
											class="btn btn-sm btn-ghost gap-2"
											onclick={exportAsPlainText}
											disabled={generatedQuestions.length === 0}
										>
											<Download size={16} />
											<span>.txt</span>
										</button>
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
												<span>Copy JSON</span>
											{/if}
										</button>
									</div>
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
