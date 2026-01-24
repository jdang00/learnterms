<script lang="ts">
	import { Check, Trash2, Zap, ChevronDown, Settings, FileText, Sparkles, CheckCircle } from 'lucide-svelte';
	import { resolveProduct, defaultProductModelId, productModelOptions } from '$lib/config/generation';
	import ModuleLimitModal from './ModuleLimitModal.svelte';

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
	let isLimitModalOpen = $state(false);
	let usageError = $state('');
	let limitReached = $state(false);
	let limitType = $state<'free' | 'pro'>('free');
	let productModelId = $state(defaultProductModelId);
	let numQuestions = $state('10');
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
		selected = selectAll ? new Set(generated.map((_, i) => i)) : new Set();
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
		usageError = '';
		limitReached = false;
		try {
			const res = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					material,
					productModelId,
					numQuestions: parseInt(numQuestions),
					customPrompt
				})
			});
			const data = await res.json();
			if (!res.ok) {
				const errMsg = data?.error || 'unknown error';
				console.error(`Generate error: ${errMsg}`);
				if (errMsg.includes('Daily generation limit')) {
					limitReached = true;
					limitType = errMsg.includes('Upgrade to Pro') ? 'free' : 'pro';
				} else {
					usageError = errMsg;
				}
				return;
			}
			generated = (data.questions as GeneratedQuestionInput[]).map((q, i) => ({ ...q, order: i }));
			selected = new Set();
		} finally {
			isGenerating = false;
		}
	}

	async function addSelected() {
		if (!onAddSelected || selected.size === 0) return;
		isAdding = true;
		try {
			const picked = generated.filter((_, i) => selected.has(i));
			await onAddSelected({ questions: picked });
			generated = [];
			selected = new Set();
		} catch (error: any) {
			console.error('Failed to add questions:', error);
			if (error.message?.includes('Module limit reached') || error.toString().includes('Module limit reached')) {
				isLimitModalOpen = true;
			}
		} finally {
			isAdding = false;
		}
	}

	const cap = 3500;
	const qualityStatus = $derived(
		charCount === 0 ? 'empty' : charCount > cap ? 'over' : charCount < 800 ? 'low' : 'good'
	);
	const isDisabled = $derived(!canGenerate || charCount === 0 || isGenerating);
</script>

<div class="h-full flex flex-col">
	<div class="p-4 border-b border-base-300 flex-shrink-0">
		<div class="flex items-center justify-between gap-4 mb-4">
			<div>
				<h2 class="text-sm font-semibold">Generate Questions</h2>
				{#if destinationSummary}
					<p class="text-xs text-base-content/50 mt-0.5">{destinationSummary}</p>
				{/if}
			</div>

			{#if generated.length === 0}
				<button
					class="btn btn-primary btn-sm gap-2"
					disabled={isDisabled}
					onclick={generate}
				>
					{#if isGenerating}
						<span class="loading loading-spinner loading-xs"></span>
						Generating...
					{:else}
						<Zap size={14} />
						Generate
					{/if}
				</button>
			{:else}
				<div class="flex gap-2">
					<button
						class="btn btn-ghost btn-sm"
						disabled={isGenerating || isAdding}
						onclick={() => { generated = []; selected = new Set(); }}
					>
						Discard
					</button>
					<button
						class="btn btn-ghost btn-sm"
						disabled={isGenerating || isAdding}
						onclick={generate}
					>
						Regenerate
					</button>
					<button
						class="btn btn-primary btn-sm gap-1"
						disabled={isAdding || selected.size === 0}
						onclick={addSelected}
					>
						{#if isAdding}
							<span class="loading loading-spinner loading-xs"></span>
						{/if}
						Add {selected.size > 0 ? `(${selected.size})` : ''}
					</button>
				</div>
			{/if}
		</div>

		<div class="flex flex-wrap items-center gap-3 text-xs">
			<div class="flex items-center gap-2">
				<span class="text-base-content/50">Words:</span>
				<span class="font-medium">{wordCount}</span>
			</div>
			<div class="h-3 w-px bg-base-300"></div>
			<div class="flex items-center gap-2">
				<span class="text-base-content/50">Chars:</span>
				<span class="font-medium">{charCount}</span>
				<div class="w-16 h-1.5 bg-base-200 rounded-full overflow-hidden">
					<div
						class="h-full transition-all rounded-full {qualityStatus === 'good'
							? 'bg-success'
							: qualityStatus === 'over'
								? 'bg-error'
								: qualityStatus === 'low'
									? 'bg-warning'
									: 'bg-base-300'}"
						style="width: {Math.min(100, (charCount / cap) * 100)}%"
					></div>
				</div>
			</div>
			<div class="h-3 w-px bg-base-300"></div>
			<div class="flex items-center gap-2">
				<span class="text-base-content/50">Questions:</span>
				<select class="select select-xs select-ghost" bind:value={numQuestions}>
					<option value="5">5</option>
					<option value="10">10</option>
					<option value="15">15</option>
				</select>
			</div>
		</div>
	</div>

	<div class="flex-1 overflow-y-auto p-4">
		{#if limitReached}
			<div class="card bg-base-100 border border-base-200 shadow-sm mb-4">
				<div class="card-body p-6 text-center items-center">
					<div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
						{#if limitType === 'pro'}
							<CheckCircle size={32} class="text-primary" />
						{:else}
							<Sparkles size={32} class="text-primary" />
						{/if}
					</div>
					
					{#if limitType === 'pro'}
						<h3 class="card-title text-xl font-bold mb-2">Wow, that's a lot of questions!</h3>
						<p class="text-sm text-base-content/70 mb-6">
							You've hit the daily Pro limit. That is some serious dedication to studying! To keep things running smoothly for everyone, we'll reset your limit tomorrow.
						</p>
						<div class="flex flex-col gap-3 w-full">
							<button class="btn btn-primary btn-block" onclick={() => limitReached = false}>Take a break</button>
						</div>
					{:else}
						<h3 class="card-title text-xl font-bold mb-2">Daily Limit Reached</h3>
						<p class="text-sm text-base-content/70 mb-6">
							You've hit the limit for today, but don't stop learning! Upgrading to Pro unlocks the full power of LearnTerms AI.
						</p>
						<div class="text-left w-full space-y-3 mb-6 bg-base-200/50 p-4 rounded-lg">
							<div class="flex items-start gap-3">
								<CheckCircle class="text-success mt-0.5 shrink-0" size={16} />
								<span class="text-xs"><strong>Unlimited Generation:</strong> Create as many practice questions as you need.</span>
							</div>
							<div class="flex items-start gap-3">
								<CheckCircle class="text-success mt-0.5 shrink-0" size={16} />
								<span class="text-xs"><strong>Deeper Understanding:</strong> Get detailed explanations for every answer.</span>
							</div>
							<div class="flex items-start gap-3">
								<CheckCircle class="text-success mt-0.5 shrink-0" size={16} />
								<span class="text-xs"><strong>Custom Tailored:</strong> Questions specific to your exact curriculum.</span>
							</div>
						</div>
						<div class="flex flex-col gap-3 w-full">
							<a href="/sign-up" target="_blank" class="btn btn-primary btn-block">Upgrade to Pro</a>
							<button class="btn btn-ghost btn-xs" onclick={() => limitReached = false}>Maybe later</button>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		{#if usageError}
			<div class="alert alert-error mb-4 text-sm shadow-lg">
				<Settings size={16} />
				<span>{usageError}</span>
			</div>
		{/if}

		{#if generated.length === 0}
			<div class="mb-4">
				<details class="group">
					<summary class="flex items-center gap-2 text-xs text-base-content/60 cursor-pointer hover:text-base-content/80">
						<Settings size={12} />
						<span>Advanced options</span>
						<ChevronDown size={12} class="group-open:rotate-180 transition-transform" />
					</summary>
					<div class="mt-3 p-3 bg-base-200/50 rounded-lg space-y-3">
						<div>
							<label class="text-xs font-medium mb-1 block" for="model-select">AI Model</label>
							<select id="model-select" class="select select-sm select-bordered w-full" bind:value={productModelId}>
								{#each productModelOptions as o (o.value)}
									<option value={o.value}>{o.label}</option>
								{/each}
							</select>
							<p class="text-xs text-base-content/50 mt-1">Focus: {resolved.focus}</p>
						</div>
						<div>
							<label class="text-xs font-medium mb-1 block" for="custom-prompt">Custom instructions</label>
							<textarea
								id="custom-prompt"
								class="textarea textarea-bordered textarea-sm w-full"
								placeholder="e.g., Focus on clinical applications..."
								rows="2"
								bind:value={customPrompt}
							></textarea>
						</div>
					</div>
				</details>
			</div>

			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-xs font-medium text-base-content/70">Content Preview</span>
					{#if !canGenerate}
						<span class="text-xs text-warning">Select a destination first</span>
					{:else if charCount === 0}
						<span class="text-xs text-base-content/50">Select content from documents</span>
					{:else if qualityStatus === 'over'}
						<span class="text-xs text-error">Content may be truncated</span>
					{:else if qualityStatus === 'low'}
						<span class="text-xs text-warning">Add more content for better results</span>
					{:else}
						<span class="text-xs text-success">Ready to generate</span>
					{/if}
				</div>
				<div class="bg-base-200/50 rounded-lg p-4 max-h-[50vh] overflow-auto">
					{#if material}
						<pre class="text-sm whitespace-pre-wrap break-words text-base-content/80">{material}</pre>
					{:else}
						<div class="flex flex-col items-center justify-center py-12 text-center">
							<FileText size={40} class="text-base-content/20 mb-3" />
							<p class="text-sm text-base-content/50">No content selected</p>
							<p class="text-xs text-base-content/40 mt-1">Select chunks from the document browser</p>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="mb-3 flex items-center justify-between">
				<span class="text-xs text-base-content/60">
					<span class="text-primary font-medium">{selected.size}</span> of {generated.length} selected
				</span>
				<div class="flex gap-1">
					<button class="btn btn-ghost btn-xs" onclick={() => toggleSelectAll(true)}>All</button>
					<button class="btn btn-ghost btn-xs" onclick={() => toggleSelectAll(false)}>None</button>
				</div>
			</div>

			<div class="space-y-3">
				{#each generated as q, i (i)}
					{@const isSelected = selected.has(i)}
					<div
						class="rounded-lg border p-4 transition-all {isSelected
							? 'border-primary bg-primary/5'
							: 'border-base-300'}"
					>
						<div class="flex items-start gap-3">
							<button
								class="mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 {isSelected
									? 'bg-primary border-primary'
									: 'border-base-300 hover:border-base-content/30'}"
								onclick={() => toggleOne(i)}
							>
								{#if isSelected}
									<Check size={12} class="text-primary-content" />
								{/if}
							</button>

							<div class="flex-1 min-w-0">
								<div class="flex items-start justify-between gap-2 mb-2">
									<p class="text-sm font-medium leading-relaxed">{q.stem}</p>
									<button
										class="btn btn-ghost btn-xs flex-shrink-0 opacity-50 hover:opacity-100"
										onclick={() => removeOne(i)}
									>
										<Trash2 size={14} />
									</button>
								</div>

								<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
									{#each q.options as opt, oi (oi)}
										{@const isCorrect = q.correctAnswers.includes(String(oi))}
										<div
											class="flex items-center gap-2 p-2 rounded text-xs {isCorrect
												? 'bg-success/10 text-success'
												: 'bg-base-200/50'}"
										>
											<span class="w-5 h-5 rounded-full bg-base-300 flex items-center justify-center font-mono text-xs flex-shrink-0">
												{String.fromCharCode('A'.charCodeAt(0) + oi)}
											</span>
											<span class="flex-1">{opt.text}</span>
											{#if isCorrect}
												<Check size={12} />
											{/if}
										</div>
									{/each}
								</div>

								{#if q.explanation?.trim()}
									<details class="text-xs">
										<summary class="text-base-content/50 cursor-pointer hover:text-base-content/70">
											Show explanation
										</summary>
										<p class="mt-2 p-2 bg-info/10 rounded text-base-content/70">{q.explanation}</p>
									</details>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<ModuleLimitModal isOpen={isLimitModalOpen} onClose={() => isLimitModalOpen = false} />
</div>
