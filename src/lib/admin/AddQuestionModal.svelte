<script lang="ts">
	let { isAddModalOpen, closeAddModal, moduleId } = $props();

	import { X, MessageSquare, Hash, ListChecks, Lightbulb } from 'lucide-svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id } from '../../convex/_generated/dataModel';
	import { DISPLAY_QUESTION_TYPES, QUESTION_TYPES } from '../types';

	const client = useConvexClient();

	let questionStem: string = $state('');
	let questionExplanation: string = $state('');
	let questionStatus: string = $state('draft');
	let questionType: string = $state('multiple_choice');
	let options: Array<{ text: string }> = $state([
		{ text: '' },
		{ text: '' },
		{ text: '' },
		{ text: '' }
	]);
	let correctAnswers: string[] = $state([]);
	let isSubmitting: boolean = $state(false);

	// Fill in the Blank editor state
	type FitbMode = 'exact' | 'exact_cs' | 'contains' | 'regex';
	type FitbAnswerRow = {
		value: string;
		mode: FitbMode;
		flags: { ignorePunct: boolean; normalizeWs: boolean };
	};

	const FITB_MODE_LABELS: Record<FitbMode, string> = {
		exact: 'Exact (case-insensitive)',
		exact_cs: 'Exact (case-sensitive)',
		contains: 'Contains',
		regex: 'Regex'
	};

	let fitbAnswers: FitbAnswerRow[] = $state([
		{ value: '', mode: 'exact', flags: { ignorePunct: false, normalizeWs: false } }
	]);

	const questions = useQuery(api.question.getQuestionsByModule, {
		id: moduleId as Id<'module'>
	});

	function addOption() {
		if (
			questionType === QUESTION_TYPES.TRUE_FALSE ||
			questionType === QUESTION_TYPES.FILL_IN_THE_BLANK
		)
			return;
		options = [...options, { text: '' }];
	}

	function removeOption(index: number) {
		if (
			questionType === QUESTION_TYPES.TRUE_FALSE ||
			questionType === QUESTION_TYPES.FILL_IN_THE_BLANK
		)
			return;
		if (options.length <= 2) return;
		options = options.filter((_, i) => i !== index);
		correctAnswers = correctAnswers
			.filter((answerIndex) => parseInt(answerIndex) !== index)
			.map((answerIndex) => {
				const idx = parseInt(answerIndex);
				return idx > index ? (idx - 1).toString() : answerIndex;
			});
	}

	function toggleCorrectAnswer(index: number) {
		const indexStr = index.toString();
		if (questionType === QUESTION_TYPES.FILL_IN_THE_BLANK) return;
		if (questionType === QUESTION_TYPES.TRUE_FALSE) {
			correctAnswers = correctAnswers.includes(indexStr) ? [] : [indexStr];
			return;
		}
		if (correctAnswers.includes(indexStr)) {
			correctAnswers = correctAnswers.filter((id) => id !== indexStr);
		} else {
			correctAnswers = [...correctAnswers, indexStr];
		}
	}

	function handleTypeChange() {
		if (questionType === QUESTION_TYPES.TRUE_FALSE) {
			options = [{ text: 'True' }, { text: 'False' }];
			correctAnswers = [];
		} else if (questionType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			options = [{ text: '' }];
			fitbAnswers = [
				{ value: '', mode: 'exact', flags: { ignorePunct: false, normalizeWs: false } }
			];
			correctAnswers = [];
		} else if (questionType === QUESTION_TYPES.MULTIPLE_CHOICE) {
			options = [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
			correctAnswers = [];
		}
	}

	function addFitbRow() {
		fitbAnswers = [
			...fitbAnswers,
			{ value: '', mode: 'exact', flags: { ignorePunct: false, normalizeWs: false } }
		];
	}

	function removeFitbRow(index: number) {
		if (fitbAnswers.length <= 1) return;
		fitbAnswers = fitbAnswers.filter((_, i) => i !== index);
	}

	function updateFitbValue(index: number, value: string) {
		fitbAnswers = fitbAnswers.map((row, i) => (i === index ? { ...row, value } : row));
	}

	function updateFitbMode(index: number, mode: FitbMode) {
		fitbAnswers = fitbAnswers.map((row, i) => (i === index ? { ...row, mode } : row));
	}

	function toggleFitbFlag(index: number, flag: 'ignorePunct' | 'normalizeWs') {
		fitbAnswers = fitbAnswers.map((row, i) =>
			i === index ? { ...row, flags: { ...row.flags, [flag]: !row.flags[flag] } } : row
		);
	}

	function encodeFitbAnswer(row: FitbAnswerRow): string {
		const base = `${row.mode}:${row.value}`;
		const enabledFlags: string[] = [];
		if (row.flags.ignorePunct) enabledFlags.push('ignore_punct');
		if (row.flags.normalizeWs) enabledFlags.push('normalize_ws');
		return enabledFlags.length ? `${base} | flags=${enabledFlags.join(',')}` : base;
	}

	async function handleSubmit() {
		if (!questionStem || !moduleId) return;

		if (questionType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			// Build encoded options from fitbAnswers
			const sanitized = fitbAnswers.filter((r) => r.value.trim());
			if (sanitized.length < 1) return;
			const encoded = sanitized.map((row) => ({ text: encodeFitbAnswer(row) }));
			options = encoded;
			correctAnswers = encoded.map((_, i) => i.toString());
		}

		const filledOptions = options.filter((opt) => opt.text.trim());

		if (questionType === QUESTION_TYPES.TRUE_FALSE) {
			if (filledOptions.length !== 2) return;
			if (correctAnswers.length !== 1) return;
		} else if (questionType === QUESTION_TYPES.MULTIPLE_CHOICE) {
			if (filledOptions.length < 2) return;
		}

		isSubmitting = true;

		try {
			const nextOrder = questions.data?.length
				? Math.max(...questions.data.map((q) => q.order)) + 1
				: 0;

			const filteredCorrectAnswers = correctAnswers
				.map((index) => parseInt(index))
				.filter((index) => index < filledOptions.length)
				.map((index) => index.toString());

			await client.mutation(api.question.insertQuestion, {
				moduleId: moduleId as Id<'module'>,
				type: questionType,
				stem: questionStem,
				options: filledOptions,
				correctAnswers: filteredCorrectAnswers,
				explanation: questionExplanation,
				aiGenerated: false,
				status: questionStatus.toLowerCase(),
				order: nextOrder,
				metadata: {},
				updatedAt: Date.now()
			});

			questionStem = '';
			questionExplanation = '';
			questionStatus = 'draft';
			questionType = 'multiple_choice';
			options = [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
			correctAnswers = [];
			closeAddModal();
		} catch (error) {
			console.error('Failed to create question', error);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<dialog class="modal p-8" class:modal-open={isAddModalOpen}>
	<div class="modal-box w-full max-w-4xl rounded-2xl border border-base-300 shadow-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
				onclick={closeAddModal}
				aria-label="Close"
			>
				<X size={18} />
			</button>
		</form>

		<div class="mb-6 flex items-center gap-2">
			<h3 class="text-2xl font-extrabold tracking-tight">Add New Question</h3>
		</div>

		<div class="flex flex-col gap-6">
			<div class="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-[auto_1fr]">
				<label
					class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80"
					for="question-stem"
				>
					<MessageSquare size={18} class="text-primary/80" />
					<span>Question</span>
				</label>
				<textarea
					id="question-stem"
					class="textarea textarea-bordered w-full min-h-12"
					bind:value={questionStem}
					placeholder="Enter your question..."
				></textarea>

				<label
					class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80"
					for="question-type"
				>
					<Hash size={18} class="text-primary/80" />
					<span>Type</span>
				</label>
				<select
					id="question-type"
					class="select select-bordered w-full"
					bind:value={questionType}
					onchange={handleTypeChange}
				>
					{#each Object.entries(DISPLAY_QUESTION_TYPES) as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</select>

				<label
					class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80"
					for="question-status"
				>
					<Hash size={18} class="text-primary/80" />
					<span>Status</span>
				</label>
				<select
					id="question-status"
					class="select select-bordered w-full"
					bind:value={questionStatus}
				>
					<option value="draft">Draft</option>
					<option value="published">Published</option>
					<option value="archived">Archived</option>
				</select>

				{#if questionType === QUESTION_TYPES.FILL_IN_THE_BLANK}
					<label
						class="label m-0 flex items-center gap-2 self-start p-0 text-base font-medium text-base-content/80"
						for="fitb-answers"
					>
						<ListChecks size={18} class="text-primary/80" />
						<span>Accepted Answers</span>
					</label>
					<div class="space-y-3">
						{#each fitbAnswers as row, index (index)}
							<div class="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto] md:items-center">
								<input
									class="input input-bordered w-full"
									placeholder="Answer {index + 1}"
									value={row.value}
									oninput={(e) => updateFitbValue(index, (e.target as HTMLInputElement).value)}
								/>
								<select
									class="select select-bordered"
									value={row.mode}
									onchange={(e) =>
										updateFitbMode(index, (e.target as HTMLSelectElement).value as FitbMode)}
								>
									{#each Object.entries(FITB_MODE_LABELS) as [value, label]}
										<option {value}>{label}</option>
									{/each}
								</select>
								<div class="flex items-center gap-3">
									<label class="label cursor-pointer gap-2">
										<input
											type="checkbox"
											class="checkbox checkbox-sm"
											checked={row.flags.ignorePunct}
											onchange={() => toggleFitbFlag(index, 'ignorePunct')}
										/>
										<span class="text-sm">Ignore punctuation</span>
									</label>
									<label class="label cursor-pointer gap-2">
										<input
											type="checkbox"
											class="checkbox checkbox-sm"
											checked={row.flags.normalizeWs}
											onchange={() => toggleFitbFlag(index, 'normalizeWs')}
										/>
										<span class="text-sm">Normalize whitespace</span>
									</label>
									{#if fitbAnswers.length > 1}
										<button class="btn btn-ghost btn-sm" onclick={() => removeFitbRow(index)}>
											<X size={16} />
										</button>
									{/if}
								</div>
							</div>
						{/each}
						<button type="button" class="btn btn-ghost btn-sm" onclick={addFitbRow}>
							Add Alternative Answer
						</button>
					</div>
				{:else}
					<label
						class="label m-0 flex items-center gap-2 self-start p-0 text-base font-medium text-base-content/80"
						for="question-options"
					>
						<ListChecks size={18} class="text-primary/80" />
						<span>Options</span>
					</label>
					<div class="space-y-3">
						{#each options as option, index (index)}
							<div class="flex items-center gap-3">
								<input
									type="checkbox"
									class="checkbox checkbox-primary"
									checked={correctAnswers.includes(index.toString())}
									onchange={() => toggleCorrectAnswer(index)}
									disabled={questionType === QUESTION_TYPES.FILL_IN_THE_BLANK}
								/>
								<input
									type="text"
									class="input input-bordered flex-1"
									bind:value={option.text}
									disabled={questionType === QUESTION_TYPES.TRUE_FALSE}
									placeholder="Option {index + 1}"
								/>
								{#if options.length > 2 && questionType !== QUESTION_TYPES.TRUE_FALSE && questionType !== QUESTION_TYPES.FILL_IN_THE_BLANK}
									<button
										type="button"
										class="btn btn-ghost btn-sm"
										onclick={() => removeOption(index)}
									>
										<X size={16} />
									</button>
								{/if}
							</div>
						{/each}
						{#if questionType !== QUESTION_TYPES.TRUE_FALSE && questionType !== QUESTION_TYPES.FILL_IN_THE_BLANK}
							<button type="button" class="btn btn-ghost btn-sm" onclick={addOption}>
								Add Option
							</button>
						{/if}
					</div>
				{/if}

				<label
					class="label m-0 flex items-center gap-2 self-start p-0 text-base font-medium text-base-content/80"
					for="question-explanation"
				>
					<Lightbulb size={18} class="text-primary/80" />
					<span>Explanation</span>
				</label>
				<textarea
					id="question-explanation"
					class="textarea textarea-bordered w-full min-h-24"
					bind:value={questionExplanation}
					placeholder="Enter explanation (optional)..."
				></textarea>
			</div>
		</div>

		<div class="modal-action mt-8">
			<form method="dialog" class="flex gap-3">
				<button class="btn btn-ghost" onclick={closeAddModal} disabled={isSubmitting}>Cancel</button
				>
				<button
					class="btn btn-primary gap-2"
					onclick={handleSubmit}
					disabled={isSubmitting || !questionStem}
				>
					{#if isSubmitting}
						<span class="loading loading-spinner loading-sm"></span>
						<span>Creating...</span>
					{:else}
						<span>Create Question</span>
					{/if}
				</button>
			</form>
		</div>
	</div>
</dialog>
