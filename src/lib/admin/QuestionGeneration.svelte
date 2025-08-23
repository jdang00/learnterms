<script lang="ts">
	import { Check, Trash2, Target, Clock, Hash, Settings, Zap } from 'lucide-svelte';
	import { resolveProduct, defaultProductModelId, productModelOptions } from '$lib/config/generation';
	export interface Props {
		material?: string;
		wordCount?: number;
		charCount?: number;
		canGenerate?: boolean;
		destinationSummary?: string;
		onAddSelected?: (payload: { questions: GeneratedQuestionInput[] }) => Promise<void> | void;
	}
	let {
		material = '',
		wordCount = 0,
		charCount = 0,
		canGenerate = false,
		destinationSummary = '',
		onAddSelected
	}: Props = $props();

	let isGenerating = $state(false);
	let isAdding = $state(false);
	let productModelId = $state(defaultProductModelId);
	let questions = $state('10');
	let customPrompt = $state('');
	let resolved = $derived(resolveProduct(productModelId));

	type GeneratedQuestionInput = {
		type: string;
		stem: string;
		options: { text: string }[];
		correctAnswers: string[];
		explanation: string;
		aiGenerated: boolean;
		status: string;
		order: number;
		metadata: {};
		updatedAt: number;
	};

	let generated = $state<GeneratedQuestionInput[]>([]);
	let selected = $state<Set<number>>(new Set());

	function toggleSelectAll(selectAll: boolean) {
		if (selectAll) {
			selected = new Set(generated.map((_, i) => i));
		} else {
			selected = new Set();
		}
	}

	function toggleOne(i: number) {
		const s = new Set(selected);
		if (s.has(i)) s.delete(i);
		else s.add(i);
		selected = s;
	}

	function removeOne(i: number) {
		generated = generated.filter((_, idx) => idx !== i).map((q, idx) => ({ ...q, order: idx }));
		const remapped = new Set<number>();
		selected.forEach((idx) => {
			if (idx === i) return;
			remapped.add(idx > i ? idx - 1 : idx);
		});
		selected = remapped;
	}

	async function generate() {
		if (!canGenerate || !material.trim()) return;
		isGenerating = true;
		try {
			const res = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					material,
					productModelId,
					numQuestions: parseInt(questions),
					customPrompt
				})
			});
			const data = await res.json();
			if (!res.ok) {
				console.error(`Generate error: ${data?.error || 'unknown'}`);
				return;
			}
			generated = (data.questions as GeneratedQuestionInput[]).map((q, i) => ({ ...q, order: i }));
			selected = new Set();
		} finally {
			isGenerating = false;
		}
	}

	let qualityClass = $derived(
		charCount === 0
			? 'badge-ghost'
			: charCount > 3500
				? 'badge-error'
				: charCount < 800
					? 'badge-warning'
					: 'badge-success'
	);
	let qualityLabel = $derived(
		charCount === 0
			? 'Empty'
			: charCount > 3500
				? 'Too long'
				: charCount < 800
					? 'Needs more'
					: 'Optimal'
	);
	let qualityTip = $derived(
		charCount === 0
			? 'Add some material to begin.'
			: charCount > 3500
				? 'Consider trimming to avoid truncation.'
				: charCount < 800
					? 'Add more context for better results.'
					: 'Good balance for coherent questions.'
	);
	let cap = 3500;
	let pct = $derived(Math.min(100, Math.round((charCount / cap) * 100)));
	let isDisabled = $derived(!canGenerate || charCount === 0 || isGenerating);
</script>

<div class="h-full grid grid-rows-[auto_1fr]">
	<!-- Header Section -->
	<div class="p-6 border-b border-base-300">
		<!-- Title and Description Row -->
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
			<div>
				<h2 class="text-xl font-bold text-base-content">Question Generation</h2>
				<p class="text-sm text-base-content/70 mt-1">Prepare and generate questions from your content</p>
				<div class="mt-2 text-xs text-base-content/60">
					AI Model: <span class="badge badge-primary badge-sm">{resolved.label}</span>
					<span class="text-base-content/40 mx-2">•</span>
					<span class="text-xs">{resolved.focus}</span>
				</div>
			</div>

			<!-- Action Buttons - Top Right -->
			<div class="flex flex-col sm:flex-row gap-3">
				{#if generated.length === 0}
					<button class="btn btn-primary gap-3 px-8 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]" disabled={isDisabled} onclick={generate}>
						{#if isGenerating}
							<span class="loading loading-spinner loading-sm"></span>
							<span>Generating {questions} questions (~{Math.round(parseInt(questions) * 4)}s)</span>
						{:else}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
							</svg>
							<span>Generate Questions</span>
						{/if}
					</button>
				{:else}
					<button
						class="btn btn-ghost gap-3 px-6"
						disabled={isGenerating || isAdding}
						onclick={() => {
							generated = [];
							selected = new Set();
						}}
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
						</svg>
						<span>Discard All</span>
					</button>

					<button
						class="btn btn-outline gap-3 px-6"
						disabled={isGenerating || isAdding}
						onclick={generate}
					>
						{#if isGenerating}
							<span class="loading loading-spinner loading-sm"></span>
							<span>Regenerating...</span>
						{:else}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9a8 8 0 1115.356 2m-15.356 0H9"></path>
							</svg>
							<span>Regenerate</span>
						{/if}
					</button>

					<button
						class="btn btn-primary gap-3 px-8"
						disabled={isAdding || selected.size === 0}
						onclick={async () => {
							if (!onAddSelected) return;
							isAdding = true;
							try {
								const picked = generated.filter((_, i) => selected.has(i));
								await onAddSelected({ questions: picked });
								generated = [];
								selected = new Set();
							} finally {
								isAdding = false;
							}
						}}
					>
						{#if isAdding}
							<span class="loading loading-spinner loading-sm"></span>
							<span>Adding Questions...</span>
						{:else}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
							</svg>
							<span>Add Selected ({selected.size})</span>
						{/if}
					</button>
				{/if}
			</div>
		</div>

		<!-- Status Indicators - Below Title -->
		<div class="mb-6">
			<div class="flex items-center justify-between gap-4">
				<div class="flex-1">
					<div class="text-sm text-base-content/80">
						{#if charCount === 0}
							<div class="flex items-center gap-3">
								<svg class="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
								</svg>
								<span>Add content to enable generation</span>
							</div>
						{:else if !canGenerate}
							<div class="flex items-center gap-3">
								<svg class="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
								</svg>
								<span>Select a class and module to enable generation</span>
							</div>
						{:else}
							<div class="flex items-center gap-3">
								<svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
								<span>{qualityTip}</span>
							</div>
						{/if}
					</div>
					{#if generated.length > 0}
						<div class="text-sm text-base-content/60 mt-2 flex items-center gap-2">
							<span>Selection:</span>
							<span class="font-medium text-primary">{selected.size} of {generated.length}</span>
							<span class="text-xs">questions selected</span>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Compact Controls Grid -->
		<div class="bg-base-50/50 rounded-lg p-4 border border-base-300/50">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- Content Quality -->
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<Target size={14} class="text-base-content/60" />
						<span class="text-xs font-medium text-base-content/70">Quality</span>
					</div>
					<div class="flex items-center gap-2">
						<span class={`badge badge-xs ${qualityClass} flex-shrink-0`}>{qualityLabel}</span>
						<div class="flex-1">
							<progress
								class={`progress ${qualityClass.replace('badge', 'progress')} h-1.5`}
								value={pct}
								max="100"
							></progress>
						</div>
					</div>
					<div class="text-xs text-base-content/50 leading-tight">{qualityTip}</div>
				</div>

				<!-- Number of Questions & Time -->
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<Hash size={14} class="text-base-content/60" />
						<span class="text-xs font-medium text-base-content/70">Questions</span>
					</div>
					<select
						id="gen-num-top"
						class="select select-bordered select-xs w-full"
						bind:value={questions}
					>
						<option value="5">5 questions</option>
						<option value="10">10 questions</option>
						<option value="15">15 questions</option>
					</select>

					{#if questions}
						<div class="flex items-center gap-1 text-xs text-base-content/60 bg-base-200/30 rounded px-2 py-1">
							<Clock size={12} />
							<span class="font-medium">~{Math.round(parseInt(questions) * 4)}s</span>
						</div>
					{/if}
				</div>
			</div>


		</div>
	</div>

	<div class="p-6 overflow-x-hidden">
		<div class="mb-8">
			<div class="collapse collapse-arrow bg-base-100 border border-base-300 rounded-lg">
				<input type="checkbox" />
				<div class="collapse-title font-medium text-base-content">
					<span class="flex items-center gap-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
						</svg>
						Advanced Options
					</span>
				</div>
				<div class="collapse-content">
					<div class="p-4 space-y-4">
						<div class="form-control">
							<label class="label p-0" for="product-model">
								<span class="label-text font-medium text-base-content">AI Model</span>
							</label>
							<div class="flex flex-col sm:flex-row sm:items-center gap-4">
								<select id="product-model" class="select select-bordered flex-1" bind:value={productModelId}>
									{#each productModelOptions as o (o.value)}
										<option value={o.value}>{o.label}</option>
									{/each}
								</select>
								<div class="badge badge-info badge-sm whitespace-nowrap">
									Focus: {resolved.focus}
								</div>
							</div>
						</div>

						<div class="form-control">
							<label class="label p-0" for="custom-prompt">
								<span class="label-text font-medium text-base-content">Custom Prompt</span>
								<span class="label-text-alt text-xs text-base-content/60">Optional: Guide the AI with specific instructions</span>
							</label>
							<textarea
								id="custom-prompt"
								class="textarea textarea-bordered w-full min-h-20 resize-y"
								placeholder="Add specific guidance (e.g., emphasize clinical applications, focus on certain topics, or specify question style)"
								bind:value={customPrompt}
								rows="3"
							></textarea>
							<div class="label mt-1">
								<span class="label-text-alt text-xs text-base-content/60">
									Examples: "Focus on pharmacology concepts", "Include case studies", "Emphasize clinical decision-making"
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		{#if generated.length === 0}
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h3 class="text-xl font-semibold text-base-content">Content Preview</h3>
					<div class="flex items-center gap-4 text-sm">
						<div class="flex items-center gap-2">
							<span class="text-base-content/60">Words:</span>
							<span class="font-medium text-primary">{wordCount}</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-base-content/60">Characters:</span>
							<span class="font-medium text-primary">{charCount}</span>
						</div>
					</div>
				</div>
				<div class="bg-base-100 border border-base-300 rounded-lg">
					<div class="p-6">
						<pre
							id="material-preview"
							class="whitespace-pre-wrap break-words text-sm leading-relaxed min-h-32 max-h-80 overflow-auto"
							aria-readonly="true"
						>{material || "No content selected. Please select some text from the document browser to generate questions."}</pre>
					</div>
				</div>
			</div>
		{:else}
			<div class="space-y-6">
				<!-- Generated Questions Header -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<h3 class="text-lg font-semibold text-base-content">Generated Questions</h3>
						<div class="badge badge-primary badge-sm">{generated.length} questions</div>
					</div>
					<div class="flex items-center gap-2">
						<button class="btn btn-ghost btn-sm" onclick={() => toggleSelectAll(true)}>
							Select all
						</button>
						<button class="btn btn-ghost btn-sm" onclick={() => toggleSelectAll(false)}>
							Clear all
						</button>
					</div>
				</div>

				<!-- Generated Questions List -->
				<div class="space-y-4 min-h-32 max-h-[32rem] overflow-auto pr-2">
					{#each generated as q, i (i)}
						<div
							class={`border-2 rounded-xl p-5 transition-all duration-200 ${
								selected.has(i)
									? 'border-primary bg-primary/5 shadow-md'
									: 'border-base-300 bg-base-100 hover:border-base-content/20'
							}`}
						>
							<!-- Question Header -->
							<div class="flex items-start justify-between gap-3 mb-4">
								<div class="flex items-start gap-3 flex-1">
									<input
										type="checkbox"
										class="checkbox checkbox-primary checkbox-sm mt-1 flex-shrink-0"
										checked={selected.has(i)}
										onchange={() => toggleOne(i)}
									/>
									<div class="flex-1">
										<div class="text-base font-medium text-base-content leading-relaxed mb-2">
											{q.stem}
										</div>
										<div class="text-xs text-base-content/60">
											Question {i + 1} • {q.type.replace('_', ' ')}
										</div>
									</div>
								</div>
								<button
									class="btn btn-ghost btn-sm flex-shrink-0"
									title="Remove question"
									onclick={() => removeOne(i)}
								>
									<Trash2 size={16} />
								</button>
							</div>

							<!-- Options -->
							<div class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4 mb-4">
								{#each q.options as opt, oi (oi)}
									<div class="flex items-start gap-3 p-4 rounded-lg bg-base-200/50 border border-base-200 hover:bg-base-200/70 transition-colors">
										<div class="flex items-center justify-center w-8 h-8 rounded-full bg-base-300 font-mono text-sm font-bold flex-shrink-0">
											{String.fromCharCode('A'.charCodeAt(0) + oi)}
										</div>
										<div class="flex-1 text-sm leading-relaxed">
											{opt.text}
										</div>
										{#if q.correctAnswers.includes(String(oi))}
											<div class="text-success flex-shrink-0" title="Correct answer">
												<Check size={18} />
											</div>
										{/if}
									</div>
								{/each}
							</div>

							<!-- Explanation -->
							{#if typeof q.explanation === 'string' && q.explanation.trim().length > 0}
								<div class="bg-info/10 border border-info/20 rounded-lg p-3">
									<div class="text-xs font-medium text-info mb-1">Explanation</div>
									<div class="text-sm text-base-content/80 leading-relaxed">
										{q.explanation}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>


</div>
