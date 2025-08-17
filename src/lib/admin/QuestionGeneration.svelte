<script lang="ts">
	import { Check, Trash2 } from 'lucide-svelte';
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

<div class="h-full grid grid-rows-[auto_1fr_auto]">
	<div class="p-4 border-b border-base-300 flex flex-wrap items-center justify-between gap-3">
		<div class="min-w-40">
			<h2 class="text-lg font-semibold">Question Generation</h2>
			<p class="text-sm text-base-content/70">Prepare and generate questions</p>
			<div class="mt-1 text-xs text-base-content/60">Model: <span class="badge badge-outline">{resolved.label}</span></div>
		</div>

		<div class="stats stats-vertical sm:stats-horizontal bg-base-100 border border-base-300 me-4">
			<div class="stat p-2">
				<div class="stat-title text-xs">Words</div>
				<div class="stat-value text-base">{wordCount}</div>
			</div>
			<div class="stat p-2">
				<div class="stat-title text-xs">Chars</div>
				<div class="stat-value text-base">{charCount}</div>
			</div>
		</div>
		<div class="w-full sm:w-auto sm:ml-auto">
			<div
				class="flex items-end sm:items-center gap-3 justify-between w-full sm:w-[36rem] max-w-full"
			>
				<div class="flex flex-col items-end gap-1 shrink-0">
					<span class={`badge ${qualityClass}`}>{qualityLabel}</span>
					<progress
						class={`progress w-24 ${qualityClass.replace('badge', 'progress')}`}
						value={pct}
						max="100"
					></progress>
				</div>

				<div class="flex flex-wrap items-start gap-2 sm:me-4 w-full">
					<div class="form-control w-full sm:w-28 shrink-0">
						<label class="label" for="gen-num-top"
							><span class="label-text text-xs">Questions</span></label
						>
						<select
							id="gen-num-top"
							class="select select-bordered select-sm w-full sm:w-28"
							bind:value={questions}
						>
							<option value="5">5</option>
							<option value="10">10</option>
							<option value="15">15</option>
						</select>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="p-4 overflow-x-hidden">
		<div class="mb-4 grid grid-cols-1 gap-2">
			<div class="collapse collapse-arrow bg-base-100 border border-base-300">
				<input type="checkbox" />
				<div class="collapse-title text-sm">Advanced options (optional)</div>
				<div class="collapse-content">
					<div class="grid gap-3">
						<div class="form-control w-full sm:w-60">
							<label class="label" for="product-model"><span class="label-text">Model</span></label>
							<select id="product-model" class="select select-bordered w-full" bind:value={productModelId}>
								{#each productModelOptions as o (o.value)}
									<option value={o.value}>{o.label}</option>
								{/each}
							</select>
							<div class="label"><span class="label-text-alt text-[10px]">Focus: {resolved.focus}</span></div>
						</div>
						<div class="form-control">
							<label class="label" for="custom-prompt"><span class="label-text">Custom prompt</span></label>
							<input
								id="custom-prompt"
								type="text"
								class="input input-bordered w-full"
								placeholder="One-sentence guidance (e.g., emphasize ocular pharmacology)"
								bind:value={customPrompt}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
		{#if generated.length === 0}
			<div class="form-control">
				<label class="label" for="material-preview">
					<span class="label-text">Material preview</span>
					<span class="label-text-alt text-xs text-base-content/60">read-only</span>
				</label>
				<pre
					id="material-preview"
					class="textarea textarea-bordered w-full min-h-48 max-h-[40vh] sm:max-h-[45vh] lg:max-h-[50vh] overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed"
					aria-readonly="true">{material}</pre>
			</div>
		{:else}
			<div class="flex items-center justify-between mb-3">
				<div class="text-sm text-base-content/70">Generated: {generated.length}</div>
				<div class="flex items-center gap-2">
					<button class="btn btn-ghost btn-xs" onclick={() => toggleSelectAll(true)}
						>Select all</button
					>
					<button class="btn btn-ghost btn-xs" onclick={() => toggleSelectAll(false)}
						>Clear all</button
					>
				</div>
			</div>
			<div class="grid grid-cols-1 gap-3 max-h-[50vh] overflow-auto pr-1">
				{#each generated as q, i (i)}
					<div
						class={`border rounded-lg p-3 ${selected.has(i) ? 'border-primary' : 'border-base-300'} bg-base-100`}
					>
						<div class="flex items-start justify-between gap-2">
							<label class="label cursor-pointer gap-2 flex-1">
								<input
									type="checkbox"
									class="checkbox checkbox-sm"
									checked={selected.has(i)}
									onchange={() => toggleOne(i)}
								/>
								<span class="label-text text-sm break-words whitespace-pre-wrap max-w-full"
									>{q.stem}</span
								>
							</label>
							<button class="btn btn-ghost btn-xs shrink-0" title="Remove" onclick={() => removeOne(i)}
								><Trash2 size={14} /></button
							>
						</div>
						<div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
							{#each q.options as opt, oi (oi)}
								<div class="flex items-start gap-2 p-2 rounded-md border border-base-200 break-words">
									<div class="font-mono text-xs w-6 text-center">
										{String.fromCharCode('A'.charCodeAt(0) + oi)}
									</div>
									<div class="flex-1 text-sm break-words whitespace-pre-wrap">{opt.text}</div>
									{#if q.correctAnswers.includes(String(oi))}
										<div class="text-success" title="Correct"><Check size={16} /></div>
									{/if}
								</div>
							{/each}
						</div>
						<div class="mt-2 text-sm text-base-content/70">
							<span class="font-medium">Explanation:</span>
							{#if typeof q.explanation === 'string' && q.explanation.trim().length > 0}
								<span class="ms-1 break-words whitespace-pre-wrap">{q.explanation}</span>
							{:else}
								<span class="ms-1 text-base-content/50">No explanation</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="p-4 border-t border-base-300 flex items-center justify-between gap-3">
		<div class="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
			<div class="flex-1 text-xs text-base-content/70">
				{#if charCount === 0}
					Add content to enable generation.
				{:else if !canGenerate}
					Select a class and module to enable generation.
				{:else}
					{qualityTip}
				{/if}
			</div>
			{#if generated.length === 0}
				<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:ml-auto w-full sm:w-auto">
					<button class="btn btn-primary w-full sm:w-auto" disabled={isDisabled} onclick={generate}>
						{#if isGenerating}
							<span class="loading loading-spinner loading-sm"></span>
							Generating...
						{:else}
							Generate Questions
						{/if}
					</button>
				</div>
			{:else}
				<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:ml-auto w-full sm:w-auto">
					<button
						class="btn btn-ghost w-full sm:w-auto"
						onclick={() => {
							generated = [];
							selected = new Set();
						}}>Discard</button
					>
					<button class="btn btn-outline w-full sm:w-auto" disabled={isGenerating} onclick={generate}>
						{#if isGenerating}
							<span class="loading loading-spinner loading-sm"></span>
							Regenerating...
						{:else}
							Regenerate
						{/if}
					</button>
					<button
						class="btn btn-primary w-full sm:w-auto"
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
							Adding...
						{:else}
							Add Selected
						{/if}
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
