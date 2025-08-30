<script lang="ts">
	let { isEditModalOpen, closeEditModal, editingQuestion, moduleId } = $props();

	import { X } from 'lucide-svelte';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id } from '../../convex/_generated/dataModel';
	import { DISPLAY_QUESTION_TYPES, QUESTION_TYPES } from '../types';
	import { createUploader } from '$lib/utils/uploadthing';
	import { UploadDropzone } from '@uploadthing/svelte';

	const client = useConvexClient();

	let questionStem: string = $state('');
	let questionExplanation: string = $state('');
	let questionStatus: string = $state('draft');
	let questionType: string = $state('multiple_choice');
	let options: Array<{ text: string }> = $state([]);
	let correctAnswers: string[] = $state([]);
	let isSubmitting: boolean = $state(false);
	let mediaError: string = $state('');
	let mediaList: Array<{
		_id: string;
		url: string;
		altText: string;
		caption?: string;
		order: number;
	}> = $state([]);

	const mediaUploader = createUploader('questionMediaUploader', {
		onClientUploadComplete: async (res) => {
			try {
				const f = Array.isArray(res) ? res[0] : null;
				if (!f || !editingQuestion) return;
				const url = (f as any)?.ufsUrl ?? (f as any)?.url;
				const key = (f as any)?.key ?? (f as any)?.fileKey;
				const name = (f as any)?.name ?? '';
				const size = Number((f as any)?.size ?? 0);
				const mime = (f as any)?.type ?? '';
				if (!url) throw new Error('Missing file URL');
				await client.mutation((api as any).questionMedia.create, {
					questionId: editingQuestion._id as Id<'question'>,
					url,
					mediaType: 'image',
					mimeType: mime || 'image/*',
					altText: name || '',
					order: mediaList.length,
					metadata: { uploadthingKey: key, sizeBytes: size, originalFileName: name }
				});
				await refreshMedia();
				mediaError = '';
			} catch (e) {
				mediaError = e instanceof Error ? e.message : 'Upload failed';
			}
		},
		onUploadError: (error: Error) => {
			mediaError = error.message;
		}
	});

	async function refreshMedia() {
		if (!editingQuestion) return;
		const r = await client.query((api as any).questionMedia.getByQuestionId, {
			questionId: editingQuestion._id as Id<'question'>
		});
		mediaList = (r || []).sort((a: any, b: any) => a.order - b.order);
	}

	$effect(() => {
		if (editingQuestion) {
			void refreshMedia();
		}
	});

	async function removeMedia(id: string) {
		const res = await client.mutation((api as any).questionMedia.softDelete, { mediaId: id });
		try {
			const key = (res as any)?.fileKey;
			if (typeof key === 'string' && key.length > 0) {
				await fetch('/api/processdoc', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ pdfUrl: undefined, fileKey: key })
				});
			}
		} catch {}
		await refreshMedia();
	}

	async function saveMediaMeta(id: string, alt: string, caption: string) {
		await client.mutation((api as any).questionMedia.update, {
			mediaId: id,
			altText: alt,
			caption
		});
		await refreshMedia();
	}

	function handleMediaMetaChange(id: string, alt: string, caption: string) {
		saveMediaMeta(id, alt, caption);
	}

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

	// Caches to preserve per-type state when switching types
	let mcOptionsCache: Array<{ text: string }> = $state([]);
	let mcCorrectCache: string[] = $state([]);
	let tfCorrectCache: string = $state('');
	let fitbAnswersCache: FitbAnswerRow[] = $state([
		{ value: '', mode: 'exact', flags: { ignorePunct: false, normalizeWs: false } }
	]);

	$effect(() => {
		const eq = editingQuestion;
		if (!eq) return;

		const nextType: string = eq.type || 'multiple_choice';
		const nextStem: string = eq.stem || '';
		const nextExplanation: string = eq.explanation || '';
		const nextStatus: string = eq.status || 'draft';

		const nextOptions: Array<{ text: string }> = (eq.options || []).map(
			(opt: { id: string; text: string }) => ({ text: opt.text })
		);

		const correctAnswerIndices: string[] =
			eq.correctAnswers
				?.map((optionId: string) => {
					const optionIndex = eq.options?.findIndex(
						(opt: { id: string; text: string }) => opt.id === optionId
					);
					return optionIndex >= 0 ? optionIndex.toString() : '';
				})
				.filter((index: string) => index !== '') || [];

		let nextFitbAnswers: FitbAnswerRow[] = [];
		if (nextType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			nextFitbAnswers = (eq.options || []).map((opt: { text: string }) => {
				const [before, flagsPart] = opt.text.split(' | flags=');
				const [modeMaybe, ...rest] = before.split(':');
				const mode = ['exact', 'exact_cs', 'contains', 'regex'].includes(modeMaybe)
					? (modeMaybe as FitbMode)
					: 'exact';
				const value = rest.join(':');
				const flags = {
					ignorePunct: !!flagsPart?.includes('ignore_punct'),
					normalizeWs: !!flagsPart?.includes('normalize_ws')
				};
				return { value, mode, flags } as FitbAnswerRow;
			});
			if (nextFitbAnswers.length === 0) {
				nextFitbAnswers = [
					{ value: '', mode: 'exact', flags: { ignorePunct: false, normalizeWs: false } }
				];
			}
		}

		// Commit assignments
		questionStem = nextStem;
		questionExplanation = nextExplanation;
		questionStatus = nextStatus;
		questionType = nextType;
		options = nextOptions;
		correctAnswers = correctAnswerIndices;
		if (nextType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			fitbAnswers = nextFitbAnswers;
		}

		// Initialize caches based on loaded question type (use locals; avoid reading $state)
		if (nextType === QUESTION_TYPES.MULTIPLE_CHOICE) {
			mcOptionsCache = [...nextOptions];
			mcCorrectCache = [...correctAnswerIndices];
		} else if (nextType === QUESTION_TYPES.TRUE_FALSE) {
			tfCorrectCache = correctAnswerIndices[0] ?? '';
		} else if (nextType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			fitbAnswersCache = [...(nextFitbAnswers.length ? nextFitbAnswers : fitbAnswers)];
		}
	});

	function handleTypeChange(e: Event) {
		const newType = (e.target as HTMLSelectElement).value as string;
		const fromType = questionType;

		// cache current state by previous type
		if (fromType === QUESTION_TYPES.MULTIPLE_CHOICE) {
			mcOptionsCache = [...options];
			mcCorrectCache = [...correctAnswers];
		} else if (fromType === QUESTION_TYPES.TRUE_FALSE) {
			tfCorrectCache = correctAnswers[0] ?? '';
		} else if (fromType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			fitbAnswersCache = [...fitbAnswers];
		}

		// switch type
		questionType = newType;

		if (newType === QUESTION_TYPES.TRUE_FALSE) {
			options = [{ text: 'True' }, { text: 'False' }];
			correctAnswers = tfCorrectCache ? [tfCorrectCache] : [];
		} else if (newType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			options = [{ text: '' }];
			fitbAnswers = fitbAnswersCache.length
				? [...fitbAnswersCache]
				: [{ value: '', mode: 'exact', flags: { ignorePunct: false, normalizeWs: false } }];
			correctAnswers = [];
		} else if (newType === QUESTION_TYPES.MULTIPLE_CHOICE) {
			options =
				mcOptionsCache.length >= 2
					? [...mcOptionsCache]
					: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
			correctAnswers = [...mcCorrectCache];
		}
	}

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

	async function handleSubmit() {
		if (!questionStem || !editingQuestion) return;

		if (questionType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			const sanitized = fitbAnswers.filter((r) => r.value.trim());
			if (sanitized.length < 1) return;
			const encoded = sanitized.map((row) => ({
				text: `${row.mode}:${row.value}${row.flags.ignorePunct || row.flags.normalizeWs ? ` | flags=${[row.flags.ignorePunct ? 'ignore_punct' : '', row.flags.normalizeWs ? 'normalize_ws' : ''].filter(Boolean).join(',')}` : ''}`
			}));
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
			const filteredCorrectAnswers = correctAnswers
				.map((index) => parseInt(index))
				.filter((index) => index < filledOptions.length)
				.map((index) => index.toString());

			await client.mutation(api.question.updateQuestion, {
				questionId: editingQuestion._id,
				moduleId: moduleId as Id<'module'>,
				type: questionType,
				stem: questionStem,
				options: filledOptions,
				correctAnswers: filteredCorrectAnswers,
				explanation: questionExplanation,
				status: questionStatus
			});

			closeEditModal();
		} catch (error) {
			console.error('Failed to update question', error);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<dialog class="modal p-8" class:modal-open={isEditModalOpen}>
	<div class="modal-box w-full max-w-4xl rounded-2xl border border-base-300 shadow-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
				onclick={closeEditModal}
				aria-label="Close"
			>
				<X size={18} />
			</button>
		</form>

		<div class="mb-6 flex items-center gap-2">
			<h3 class="text-2xl font-extrabold tracking-tight">Edit Question</h3>
		</div>

		{#if !editingQuestion}
			<div class="alert alert-error mb-6">
				<span>No question selected for editing.</span>
			</div>
		{:else}
			<div class="space-y-6">
				<!-- Question Stem and Type -->
				<div class="card bg-base-200/50 border border-base-300">
					<div class="card-body space-y-4">
						<div class="grid grid-cols-[150px_1fr] items-center gap-4">
							<label for="question-stem" class="font-semibold">Question</label>
							<textarea
								id="question-stem"
								class="textarea textarea-bordered w-full min-h-24"
								bind:value={questionStem}
								placeholder="Enter your question..."
							></textarea>
						</div>
						<div class="grid grid-cols-[150px_1fr] items-center gap-4">
							<label for="question-type" class="font-semibold">Type</label>
							<select
								id="question-type"
								class="select select-bordered w-full"
								value={questionType}
								onchange={handleTypeChange}
							>
								{#each Object.entries(DISPLAY_QUESTION_TYPES) as [value, label] (value)}
									<option {value}>{label}</option>
								{/each}
							</select>
						</div>
						<div class="grid grid-cols-[150px_1fr] items-center gap-4">
							<label for="question-status" class="font-semibold">Status</label>
							<select
								id="question-status"
								class="select select-bordered w-full"
								bind:value={questionStatus}
							>
								<option value="draft">Draft</option>
								<option value="published">Published</option>
								<option value="archived">Archived</option>
							</select>
						</div>
					</div>
				</div>

				<!-- Options / Answers -->
				<div class="card bg-base-200/50 border border-base-300">
					<div class="card-body">
						<h4 class="card-title mb-4">Options & Answers</h4>
						{#if questionType === QUESTION_TYPES.FILL_IN_THE_BLANK}
							<div class="space-y-4">
								{#each fitbAnswers as row, index (index)}
									<div class="p-3 rounded-lg border border-base-300 bg-base-100">
										<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
											<input
												class="input input-bordered w-full"
												placeholder="Answer {index + 1}"
												bind:value={row.value}
											/>
											<select class="select select-bordered w-full" bind:value={row.mode}>
												{#each Object.entries(FITB_MODE_LABELS) as [value, label], index (index)}
													<option {value}>{label}</option>
												{/each}
											</select>
										</div>
										<div class="flex items-center gap-4 mt-3">
											<label class="label cursor-pointer gap-2 text-sm">
												<input
													type="checkbox"
													class="checkbox checkbox-sm"
													bind:checked={row.flags.ignorePunct}
												/>
												<span>Ignore Punctuation</span>
											</label>
											<label class="label cursor-pointer gap-2 text-sm">
												<input
													type="checkbox"
													class="checkbox checkbox-sm"
													bind:checked={row.flags.normalizeWs}
												/>
												<span>Normalize Whitespace</span>
											</label>
											<div class="flex-grow"></div>
											{#if fitbAnswers.length > 1}
												<button
													class="btn btn-ghost btn-sm btn-circle"
													onclick={() => (fitbAnswers = fitbAnswers.filter((_, i) => i !== index))}
												>
													<X size={16} />
												</button>
											{/if}
										</div>
									</div>
								{/each}
								<button
									type="button"
									class="btn btn-sm btn-outline mt-2"
									onclick={() =>
										(fitbAnswers = [
											...fitbAnswers,
											{
												value: '',
												mode: 'exact',
												flags: { ignorePunct: false, normalizeWs: false }
											}
										])}
								>
									Add Alternative Answer
								</button>
							</div>
						{:else}
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
												class="btn btn-ghost btn-sm btn-circle"
												onclick={() => removeOption(index)}
											>
												<X size={16} />
											</button>
										{/if}
									</div>
								{/each}
								{#if questionType !== QUESTION_TYPES.TRUE_FALSE && questionType !== QUESTION_TYPES.FILL_IN_THE_BLANK}
									<button type="button" class="btn btn-sm btn-outline mt-2" onclick={addOption}>
										Add Option
									</button>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Explanation -->
				<div class="card bg-base-200/50 border border-base-300">
					<div class="card-body">
						<div class="grid grid-cols-[150px_1fr] items-center gap-4">
							<label for="question-explanation" class="font-semibold">Explanation</label>
							<textarea
								id="question-explanation"
								class="textarea textarea-bordered w-full min-h-24"
								bind:value={questionExplanation}
								placeholder="Enter explanation (optional)..."
							></textarea>
						</div>
					</div>
				</div>

				<!-- Media Management -->
				<div class="card bg-base-200/50 border border-base-300">
					<div class="card-body">
						<h4 class="card-title mb-4">Attachments</h4>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<UploadDropzone
									uploader={mediaUploader}
									aria-label="Upload image attachment"
									appearance={{
										container: 'p-2 rounded-lg border-dashed',
										label: 'text-sm',
										allowedContent: 'text-[11px] opacity-70'
									}}
								/>
								{#if mediaError}
									<div class="alert alert-error alert-sm mt-3">
										<span class="text-sm">{mediaError}</span>
									</div>
								{/if}
							</div>
							<div class="space-y-4">
								{#if mediaList.length > 0}
									<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
										{#each mediaList as m (m._id)}
											<div class="border border-base-300 rounded-lg overflow-hidden bg-base-100">
												<img src={m.url} alt={m.altText} class="w-full h-24 object-cover" />
												<div class="p-3 space-y-2">
													<input
														class="input input-bordered input-sm w-full"
														placeholder="Alt text"
														bind:value={m.altText}
														oninput={() => handleMediaMetaChange(m._id, m.altText, m.caption || '')}
													/>
													<input
														class="input input-bordered input-sm w-full"
														placeholder="Caption (optional)"
														bind:value={m.caption}
														oninput={() => handleMediaMetaChange(m._id, m.altText, m.caption || '')}
													/>
													<div class="flex justify-between items-center pt-1">
														<span class="text-xs opacity-60">Order: {m.order}</span>
														<button
															class="btn btn-ghost btn-xs text-error"
															onclick={() => removeMedia(m._id)}>Remove</button
														>
													</div>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<div class="text-center text-base-content/60 p-8">No attachments yet.</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="modal-action mt-8">
				<form method="dialog" class="flex gap-3">
					<button class="btn btn-ghost" onclick={closeEditModal} disabled={isSubmitting}
						>Cancel</button
					>
					<button
						class="btn btn-primary gap-2"
						onclick={handleSubmit}
						disabled={isSubmitting || !questionStem}
					>
						{#if isSubmitting}
							<span class="loading loading-spinner loading-sm"></span>
							<span>Updating...</span>
						{:else}
							<span>Update Question</span>
						{/if}
					</button>
				</form>
			</div>
		{/if}
	</div>
</dialog>
