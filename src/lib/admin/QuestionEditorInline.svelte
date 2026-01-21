<script lang="ts">
	import {
		X,
		Bold,
		Italic,
		FileText,
		CheckCircle,
		Archive,
		CheckSquare,
		ToggleLeft,
		Edit3,
		ListChecks,
		Underline as UnderlineIcon,
		Strikethrough as StrikethroughIcon,
		Code as CodeIcon,
		Quote as QuoteIcon,
		List as ListIcon,
		ListOrdered as ListOrderedIcon,
		Link as LinkIcon,
		Highlighter as HighlighterIcon,
		MessageSquare,
		Hash,
		Lightbulb
	} from 'lucide-svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id, Doc } from '../../convex/_generated/dataModel';
	import { QUESTION_TYPES } from '../types';
	import { createUploader } from '$lib/utils/uploadthing';
	import { UploadDropzone } from '@uploadthing/svelte';
	import { onMount } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { createEditor, Editor, EditorContent } from 'svelte-tiptap';
	import { getEditorExtensions } from '../config/tiptap';
	import { useClerkContext } from 'svelte-clerk';

	type QuestionItem = Doc<'question'>;

	let {
		moduleId,
		editingQuestion = null,
		mode = 'add',
		onSave,
		onCancel,
		onChange = () => {}
	}: {
		moduleId: string;
		editingQuestion?: QuestionItem | null;
		mode?: 'add' | 'edit';
		onSave: () => void;
		onCancel: () => void;
		onChange?: () => void;
	} = $props();

	let editor = $state() as Readable<Editor>;
	let explanationEditor = $state() as Readable<Editor>;

	onMount(() => {
		editor = createEditor({
			extensions: getEditorExtensions(),
			content: editingQuestion?.stem || '',
			editorProps: {
				attributes: {
					class: 'prose prose-sm max-w-none focus:outline-none min-h-12 p-3'
				}
			}
		});

		explanationEditor = createEditor({
			extensions: getEditorExtensions(),
			content: editingQuestion?.explanation || '',
			editorProps: {
				attributes: {
					class: 'prose prose-sm max-w-none focus:outline-none min-h-16 p-3'
				}
			}
		});
	});

	const toggleBold = () => $editor.chain().focus().toggleBold().run();
	const toggleItalic = () => $editor.chain().focus().toggleItalic().run();
	const toggleUnderline = () => $editor.chain().focus().toggleUnderline().run();
	const toggleStrike = () => $editor.chain().focus().toggleStrike().run();
	const toggleCode = () => $editor.chain().focus().toggleCode().run();
	const toggleBlockquote = () => $editor.chain().focus().toggleBlockquote().run();
	const toggleBulletList = () => $editor.chain().focus().toggleBulletList().run();
	const toggleOrderedList = () => $editor.chain().focus().toggleOrderedList().run();
	const setLink = () => {
		const url = prompt('Enter URL:');
		if (url) $editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
	};
	const unsetLink = () => $editor.chain().focus().extendMarkRange('link').unsetLink().run();
	const toggleHighlight = () => $editor.chain().focus().toggleHighlight().run();
	const isActive = (name: string, attrs = {}) => $editor?.isActive(name, attrs) ?? false;

	const menuItems = $derived([
		{ name: 'bold', command: toggleBold, icon: Bold, active: () => isActive('bold') },
		{ name: 'italic', command: toggleItalic, icon: Italic, active: () => isActive('italic') },
		{ name: 'underline', command: toggleUnderline, icon: UnderlineIcon, active: () => isActive('underline') },
		{ name: 'strike', command: toggleStrike, icon: StrikethroughIcon, active: () => isActive('strike') },
		{ name: 'code', command: toggleCode, icon: CodeIcon, active: () => isActive('code') },
		{ name: 'highlight', command: toggleHighlight, icon: HighlighterIcon, active: () => isActive('highlight') },
		{ name: 'link', command: isActive('link') ? unsetLink : setLink, icon: LinkIcon, active: () => isActive('link') },
		{ name: 'blockquote', command: toggleBlockquote, icon: QuoteIcon, active: () => isActive('blockquote') },
		{ name: 'bullet-list', command: toggleBulletList, icon: ListIcon, active: () => isActive('bulletList') },
		{ name: 'ordered-list', command: toggleOrderedList, icon: ListOrderedIcon, active: () => isActive('orderedList') }
	]);

	const toggleExpBold = () => $explanationEditor.chain().focus().toggleBold().run();
	const toggleExpItalic = () => $explanationEditor.chain().focus().toggleItalic().run();
	const toggleExpUnderline = () => $explanationEditor.chain().focus().toggleUnderline().run();
	const isExpActive = (name: string) => $explanationEditor?.isActive(name) ?? false;

	const expMenuItems = $derived([
		{ name: 'bold', command: toggleExpBold, icon: Bold, active: () => isExpActive('bold') },
		{ name: 'italic', command: toggleExpItalic, icon: Italic, active: () => isExpActive('italic') },
		{ name: 'underline', command: toggleExpUnderline, icon: UnderlineIcon, active: () => isExpActive('underline') }
	]);

	const questionTypeOptions = [
		{ value: QUESTION_TYPES.MULTIPLE_CHOICE, label: 'Multiple Choice', icon: CheckSquare },
		{ value: QUESTION_TYPES.TRUE_FALSE, label: 'True/False', icon: ToggleLeft },
		{ value: QUESTION_TYPES.FILL_IN_THE_BLANK, label: 'Fill in Blank', icon: Edit3 },
		{ value: QUESTION_TYPES.MATCHING, label: 'Matching', icon: ListChecks }
	];

	const statusOptions = [
		{ value: 'published', label: 'Published', icon: CheckCircle, colorClass: 'btn-success btn-soft' },
		{ value: 'draft', label: 'Draft', icon: FileText, colorClass: 'btn-info btn-soft' },
		{ value: 'archived', label: 'Archived', icon: Archive, colorClass: 'btn-error btn-soft' }
	];

	$effect(() => {
		if ($editor) {
			const updateStem = () => {
				questionStem = $editor.getHTML();
				onChange();
			};
			$editor.on('update', updateStem);
			return () => $editor.off('update', updateStem);
		}
	});

	$effect(() => {
		if ($explanationEditor) {
			const updateExp = () => {
				questionExplanation = $explanationEditor.getHTML();
				onChange();
			};
			$explanationEditor.on('update', updateExp);
			return () => $explanationEditor.off('update', updateExp);
		}
	});

	const client = useConvexClient();
	const clerk = useClerkContext();
	const clerkUser = $derived(clerk.user);

	let questionStem: string = $state(editingQuestion?.stem || '');
	let questionExplanation: string = $state(editingQuestion?.explanation || '');
	let questionStatus: string = $state(editingQuestion?.status || 'draft');
	let questionType: string = $state(editingQuestion?.type || 'multiple_choice');
	let options: Array<{ id?: string; text: string }> = $state(
		editingQuestion?.options?.length ? [...editingQuestion.options] : [{ text: '' }, { text: '' }, { text: '' }, { text: '' }]
	);
	
	// Convert option IDs to indices for correct answers
	let correctAnswers: string[] = $state(
		editingQuestion?.correctAnswers && editingQuestion?.options
			? editingQuestion.correctAnswers
					.map((answerId) => {
						const index = editingQuestion.options.findIndex((opt) => opt.id === answerId);
						return index !== -1 ? index.toString() : null;
					})
					.filter((idx): idx is string => idx !== null)
			: []
	);
	let isSubmitting: boolean = $state(false);

	let mediaError: string = $state('');
	let queuedMedia: Array<{
		url: string;
		key?: string;
		name?: string;
		sizeBytes?: number;
		mimeType?: string;
		showOnSolution?: boolean;
	}> = $state([]);

	function mediaTypeFromMime(mime: string | undefined): string {
		const t = mime || '';
		if (t.startsWith('image/')) return 'image';
		if (t.startsWith('video/')) return 'video';
		if (t.startsWith('audio/')) return 'audio';
		return 'file';
	}

	function addMediaItem(mediaItem: (typeof queuedMedia)[0]) {
		queuedMedia = [...queuedMedia, mediaItem];
		onChange();
	}

	function setMediaError(error: string) {
		mediaError = error;
	}

	const mediaUploader = createUploader('questionMediaUploader', {
		onClientUploadComplete: (res) => {
			try {
				const f = Array.isArray(res) ? res[0] : null;
				if (!f) return;
				const url = (f as any)?.ufsUrl ?? (f as any)?.url;
				const key = (f as any)?.key ?? (f as any)?.fileKey;
				const name = (f as any)?.name ?? '';
				const size = Number((f as any)?.size ?? 0);
				const mime = (f as any)?.type ?? '';

				if (!url) {
					setMediaError('Missing file URL');
					return;
				}

				addMediaItem({
					url,
					key,
					name,
					sizeBytes: size || undefined,
					mimeType: mime || undefined,
					showOnSolution: false
				});
				setMediaError('');
			} catch (e) {
				setMediaError(e instanceof Error ? e.message : 'Upload failed');
			}
		},
		onUploadError: (error: Error) => {
			setMediaError(error.message);
		}
	});

	function removeQueuedMedia(index: number) {
		queuedMedia = queuedMedia.filter((_, i) => i !== index);
		onChange();
	}

	const questions = useQuery(api.question.getQuestionsByModule, {
		id: moduleId as Id<'module'>
	});

	function addOption() {
		if (questionType === QUESTION_TYPES.TRUE_FALSE || questionType === QUESTION_TYPES.FILL_IN_THE_BLANK) return;
		options = [...options, { text: '' }];
		onChange();
	}

	function removeOption(index: number) {
		if (questionType === QUESTION_TYPES.TRUE_FALSE) return;
		if (options.length <= 2) return;
		options = options.filter((_, i) => i !== index);
		correctAnswers = correctAnswers
			.filter((answerIndex) => parseInt(answerIndex) !== index)
			.map((answerIndex) => {
				const idx = parseInt(answerIndex);
				return idx > index ? (idx - 1).toString() : answerIndex;
			});
		onChange();
	}

	function toggleCorrectAnswer(index: number) {
		const indexStr = index.toString();
		if (questionType === QUESTION_TYPES.TRUE_FALSE) {
			correctAnswers = correctAnswers.includes(indexStr) ? [] : [indexStr];
		} else if (correctAnswers.includes(indexStr)) {
			correctAnswers = correctAnswers.filter((id) => id !== indexStr);
		} else {
			correctAnswers = [...correctAnswers, indexStr];
		}
		onChange();
	}

	function handleTypeChange() {
		if (questionType === QUESTION_TYPES.TRUE_FALSE) {
			options = [{ text: 'True' }, { text: 'False' }];
			correctAnswers = [];
		} else if (questionType === QUESTION_TYPES.MULTIPLE_CHOICE) {
			options = [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
			correctAnswers = [];
		}
	}

	async function handleSubmit() {
		if (!questionStem || !moduleId) return;

		const filledOptions = options.filter((opt) => opt.text.trim());
		if (questionType === QUESTION_TYPES.TRUE_FALSE && correctAnswers.length !== 1) return;
		if (questionType === QUESTION_TYPES.MULTIPLE_CHOICE && filledOptions.length < 2) return;

		isSubmitting = true;

		try {
			let questionId: Id<'question'> | undefined;

			// Strip out 'id' field from options - only send 'text'
			const cleanOptions = filledOptions.map((opt) => ({ text: opt.text }));

			// Get createdBy from Clerk user
			const createdBy =
				clerkUser?.firstName && clerkUser?.lastName
					? {
							firstName: clerkUser.firstName,
							lastName: clerkUser.lastName
						}
					: undefined;

			if (mode === 'edit' && editingQuestion) {
				await client.mutation(api.question.updateQuestion, {
					questionId: editingQuestion._id as Id<'question'>,
					moduleId: moduleId as Id<'module'>,
					type: questionType,
					stem: questionStem,
					options: cleanOptions,
					correctAnswers,
					explanation: questionExplanation || '',
					status: questionStatus.toLowerCase(),
					createdBy
				});
				questionId = editingQuestion._id as Id<'question'>;
			} else {
				const nextOrder = questions.data?.length
					? Math.max(...questions.data.map((q) => q.order || 0)) + 1
					: 0;

				questionId = await client.mutation(api.question.insertQuestion, {
					moduleId: moduleId as Id<'module'>,
					type: questionType,
					stem: questionStem,
					options: cleanOptions,
					correctAnswers,
					explanation: questionExplanation || '',
					aiGenerated: false,
					status: questionStatus.toLowerCase(),
					order: nextOrder,
					metadata: {},
					updatedAt: Date.now(),
					createdBy
				});
			}

			if (questionId && queuedMedia.length > 0) {
				for (let i = 0; i < queuedMedia.length; i++) {
					const m = queuedMedia[i];
					await client.mutation((api as any).questionMedia.create, {
						questionId: questionId,
						url: m.url,
						mediaType: mediaTypeFromMime(m.mimeType),
						mimeType: m.mimeType || 'application/octet-stream',
						altText: m.name || '',
						caption: '',
						order: i,
						showOnSolution: m.showOnSolution ?? false,
						metadata: {
							uploadthingKey: m.key || '',
							sizeBytes: m.sizeBytes || 0,
							originalFileName: m.name || ''
						}
					});
				}
			}

			onSave();
		} catch (error) {
			console.error('Failed to save question', error);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="h-full flex flex-col overflow-hidden">
	<div class="flex items-center justify-between p-4 border-b border-base-300 bg-base-100 flex-shrink-0">
		<h3 class="text-lg font-semibold">{mode === 'edit' ? 'Edit Question' : 'New Question'}</h3>
		<div class="flex items-center gap-2">
			<button class="btn btn-ghost" onclick={onCancel} disabled={isSubmitting}>Cancel</button>
			<button
				class="btn btn-primary gap-2"
				onclick={handleSubmit}
				disabled={isSubmitting || !questionStem}
			>
				{#if isSubmitting}
					<span class="loading loading-spinner loading-sm"></span>
					<span>{mode === 'edit' ? 'Saving...' : 'Creating...'}</span>
				{:else}
					<span>{mode === 'edit' ? 'Save Changes' : 'Create Question'}</span>
				{/if}
			</button>
		</div>
	</div>

	<div class="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
		<div class="flex flex-col gap-2">
			<label class="font-semibold flex items-center gap-2 text-sm">
				<MessageSquare size={16} class="text-primary/80" />
				Question
			</label>
			<div class="border border-base-300 rounded-lg overflow-hidden bg-base-100">
				<div class="bg-base-200 border-b border-base-300 p-2 flex gap-1 flex-wrap">
					{#each menuItems as item (item.name)}
						<button
							type="button"
							class="btn btn-ghost btn-xs gap-1 {item.active() ? 'btn-active' : ''}"
							onclick={item.command}
							title={item.name}
						>
							<item.icon size={14} />
						</button>
					{/each}
				</div>
				<EditorContent editor={$editor} class="min-h-12" />
			</div>
		</div>

		<div class="flex flex-col gap-2">
			<label class="font-semibold flex items-center gap-2 text-sm">
				<Hash size={16} class="text-primary/80" />
				Type
			</label>
			<div class="join join-horizontal w-full">
				{#each questionTypeOptions as option (option.value)}
					<label
						class="join-item btn flex-1 gap-2 px-3 py-2 text-sm {questionType === option.value ? 'btn-active' : ''}"
					>
						<input
							type="radio"
							name="question-type-inline"
							class="hidden"
							value={option.value}
							bind:group={questionType}
							onchange={() => {
								handleTypeChange();
								onChange();
							}}
						/>
						<option.icon size={14} />
						<span class="hidden xl:inline">{option.label}</span>
					</label>
				{/each}
			</div>
		</div>

		<div class="flex flex-col gap-2">
			<label class="font-semibold flex items-center gap-2 text-sm">
				<Hash size={16} class="text-primary/80" />
				Status
			</label>
			<div class="join join-horizontal w-full">
				{#each statusOptions as option (option.value)}
					<label
						class="join-item btn flex-1 gap-2 px-3 py-2 text-sm {option.colorClass} {questionStatus === option.value ? 'btn-active' : ''}"
					>
						<input
							type="radio"
							name="question-status-inline"
							class="hidden"
							value={option.value}
							bind:group={questionStatus}
							onchange={onChange}
						/>
						<option.icon size={14} />
						<span class="hidden xl:inline">{option.label}</span>
					</label>
				{/each}
			</div>
		</div>

		{#if questionType === QUESTION_TYPES.MULTIPLE_CHOICE || questionType === QUESTION_TYPES.TRUE_FALSE}
			<div class="card bg-base-200/50 border border-base-300">
				<div class="card-body p-4">
					<h6 class="font-semibold mb-3 flex items-center gap-2 text-sm">
						<ListChecks size={16} class="text-primary/80" />
						Options & Answers
					</h6>
					<div class="space-y-3">
						{#each options as option, index (index)}
							<div class="flex items-center gap-3">
								<input
									type="checkbox"
									class="checkbox checkbox-primary"
									checked={correctAnswers.includes(index.toString())}
									onchange={() => toggleCorrectAnswer(index)}
								/>
								<input
									type="text"
									class="input input-bordered flex-1 rounded-lg"
									bind:value={option.text}
									disabled={questionType === QUESTION_TYPES.TRUE_FALSE}
									placeholder="Option {index + 1}"
									oninput={onChange}
								/>
								{#if options.length > 2 && questionType !== QUESTION_TYPES.TRUE_FALSE}
									<button type="button" class="btn btn-ghost btn-sm btn-circle" onclick={() => removeOption(index)}>
										<X size={16} />
									</button>
								{/if}
							</div>
						{/each}
						{#if questionType === QUESTION_TYPES.MULTIPLE_CHOICE}
							<button type="button" class="btn btn-sm btn-outline" onclick={addOption}>Add Option</button>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<div class="card bg-base-200/50 border border-base-300">
			<div class="card-body p-4">
				<h6 class="font-semibold mb-3 flex items-center gap-2 text-sm">
					<Lightbulb size={16} class="text-primary/80" />
					Explanation
				</h6>
				<div class="border border-base-300 rounded-lg overflow-hidden bg-base-100">
					<div class="bg-base-200 border-b border-base-300 p-2 flex gap-1">
						{#each expMenuItems as item (item.name)}
							<button
								type="button"
								class="btn btn-ghost btn-xs gap-1 {item.active() ? 'btn-active' : ''}"
								onclick={item.command}
								title={item.name}
							>
								<item.icon size={12} />
							</button>
						{/each}
					</div>
					<EditorContent editor={$explanationEditor} class="min-h-16" />
				</div>
			</div>
		</div>

		<div class="card bg-base-200/50 border border-base-300">
			<div class="card-body p-4">
				<h6 class="font-semibold mb-3 text-sm">Attachments</h6>
				<div class="flex justify-center">
					<div class="w-full max-w-xs">
						<UploadDropzone
							uploader={mediaUploader}
							aria-label="Upload image attachment"
							appearance={{
								container: 'rounded-lg',
								label: 'text-sm',
								allowedContent: 'text-[11px] opacity-70'
							}}
						/>
					</div>
				</div>
				{#if mediaError}
					<div class="alert alert-error alert-sm mt-3">
						<span class="text-sm">{mediaError}</span>
					</div>
				{/if}
				{#if queuedMedia.length > 0}
					<div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
						{#each queuedMedia as m, idx (idx)}
							<div class="border border-base-300 rounded-lg overflow-hidden bg-base-100">
								<img src={m.url} alt={m.name} class="w-full h-24 object-cover" />
								<div class="p-3 space-y-2">
									<input
										class="input input-bordered input-sm w-full"
										placeholder="Alt text"
										bind:value={m.name}
										oninput={onChange}
									/>
									<label class="label cursor-pointer gap-2 text-sm">
										<input
											type="checkbox"
											class="checkbox checkbox-sm"
											bind:checked={m.showOnSolution}
											onchange={onChange}
										/>
										<span>Show on solution</span>
									</label>
									<div class="flex justify-end">
										<button
											class="btn btn-ghost btn-xs text-error"
											onclick={() => removeQueuedMedia(idx)}>Remove</button
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
