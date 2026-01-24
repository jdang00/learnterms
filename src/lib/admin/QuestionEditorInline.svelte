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
		defaultStatus = 'draft',
		onSave,
		onCancel,
		onChange = () => {}
	}: {
		moduleId: string;
		editingQuestion?: QuestionItem | null;
		mode?: 'add' | 'edit';
		defaultStatus?: 'published' | 'draft';
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
	let questionStatus: string = $state(editingQuestion?.status || defaultStatus);
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
		caption?: string;
		sizeBytes?: number;
		mimeType?: string;
		showOnSolution?: boolean;
	}> = $state([]);

	// Existing media from database (for edit mode)
	let existingMedia: Array<{
		_id: string;
		url: string;
		altText: string;
		caption?: string;
		order: number;
		showOnSolution?: boolean;
	}> = $state([]);

	// Fetch existing media when in edit mode
	async function refreshMedia() {
		if (!editingQuestion) return;
		try {
			const r = await client.query((api as any).questionMedia.getByQuestionId, {
				questionId: editingQuestion._id as Id<'question'>
			});
			existingMedia = (r || []).sort((a: any, b: any) => a.order - b.order);
		} catch (e) {
			console.error('Failed to fetch media:', e);
		}
	}

	// Load existing media when editing
	$effect(() => {
		if (mode === 'edit' && editingQuestion) {
			void refreshMedia();
		} else {
			existingMedia = [];
		}
	});

	// Remove existing media from database
	async function removeExistingMedia(id: string) {
		try {
			const res = await client.mutation((api as any).questionMedia.softDelete, { mediaId: id });
			// Try to delete from uploadthing
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
			onChange();
		} catch (e) {
			mediaError = e instanceof Error ? e.message : 'Failed to remove media';
		}
	}

	// Update existing media metadata
	async function updateExistingMediaMeta(id: string, altText: string, caption: string, showOnSolution?: boolean) {
		try {
			await client.mutation((api as any).questionMedia.update, {
				mediaId: id,
				altText,
				caption,
				showOnSolution
			});
			await refreshMedia();
		} catch (e) {
			console.error('Failed to update media:', e);
		}
	}

	function handleExistingMediaChange(id: string, altText: string, caption: string, showOnSolution?: boolean) {
		updateExistingMediaMeta(id, altText, caption, showOnSolution);
		onChange();
	}

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
					caption: '',
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

	// Initialize FITB and Matching from editingQuestion
	$effect(() => {
		if (editingQuestion && editingQuestion.type && editingQuestion.options) {
			if (editingQuestion.type === QUESTION_TYPES.FILL_IN_THE_BLANK) {
				const decoded = editingQuestion.options.map((opt) => {
					const [before, flagsPart] = (opt.text || '').split(' | flags=');
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
				if (decoded.length > 0) {
					fitbAnswers = decoded;
				}
			} else if (editingQuestion.type === QUESTION_TYPES.MATCHING) {
				const opts = editingQuestion.options;
				const prompts = opts
					.filter((o) => o.text && o.text.startsWith('prompt:'))
					.map((o) => o.text.slice('prompt:'.length));
				const answers = opts
					.filter((o) => o.text && o.text.startsWith('answer:'))
					.map((o) => o.text.slice('answer:'.length));
				if (prompts.length > 0) matchingPrompts = prompts;
				if (answers.length > 0) matchingAnswers = answers;
			}
		}
	});

	function addFitbRow() {
		fitbAnswers = [
			...fitbAnswers,
			{ value: '', mode: 'exact', flags: { ignorePunct: false, normalizeWs: false } }
		];
		onChange();
	}

	function removeFitbRow(index: number) {
		if (fitbAnswers.length <= 1) return;
		fitbAnswers = fitbAnswers.filter((_, i) => i !== index);
		onChange();
	}

	function updateFitbMode(index: number, mode: FitbMode) {
		fitbAnswers = fitbAnswers.map((row, i) => (i === index ? { ...row, mode } : row));
		onChange();
	}

	function toggleFitbFlag(index: number, flag: 'ignorePunct' | 'normalizeWs') {
		fitbAnswers = fitbAnswers.map((row, i) =>
			i === index ? { ...row, flags: { ...row.flags, [flag]: !row.flags[flag] } } : row
		);
		onChange();
	}

	function encodeFitbAnswer(row: FitbAnswerRow): string {
		const base = `${row.mode}:${row.value}`;
		const enabledFlags: string[] = [];
		if (row.flags.ignorePunct) enabledFlags.push('ignore_punct');
		if (row.flags.normalizeWs) enabledFlags.push('normalize_ws');
		return enabledFlags.length ? `${base} | flags=${enabledFlags.join(',')}` : base;
	}

	// Matching editor state
	let matchingPrompts: string[] = $state(['', '']);
	let matchingAnswers: string[] = $state(['', '']);

	function addMatchingPrompt() {
		matchingPrompts = [...matchingPrompts, ''];
		onChange();
	}

	function removeMatchingPrompt(index: number) {
		if (matchingPrompts.length <= 1) return;
		matchingPrompts = matchingPrompts.filter((_, i) => i !== index);
		onChange();
	}

	function addMatchingAnswer() {
		matchingAnswers = [...matchingAnswers, ''];
		onChange();
	}

	function removeMatchingAnswer(index: number) {
		if (matchingAnswers.length <= 1) return;
		matchingAnswers = matchingAnswers.filter((_, i) => i !== index);
		onChange();
	}

	const questions = useQuery(
		api.question.getQuestionsByModule,
		moduleId ? { id: moduleId as Id<'module'> } : 'skip'
	);

	function addOption() {
		if (questionType === QUESTION_TYPES.TRUE_FALSE || questionType === QUESTION_TYPES.FILL_IN_THE_BLANK || questionType === QUESTION_TYPES.MATCHING) return;
		options = [...options, { text: '' }];
		onChange();
	}

	function removeOption(index: number) {
		if (questionType === QUESTION_TYPES.TRUE_FALSE || questionType === QUESTION_TYPES.FILL_IN_THE_BLANK || questionType === QUESTION_TYPES.MATCHING) return;
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
		if (questionType === QUESTION_TYPES.FILL_IN_THE_BLANK || questionType === QUESTION_TYPES.MATCHING) return;
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
		} else if (questionType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			options = [{ text: '' }];
			fitbAnswers = [
				{ value: '', mode: 'exact', flags: { ignorePunct: false, normalizeWs: false } }
			];
			correctAnswers = [];
		} else if (questionType === QUESTION_TYPES.MULTIPLE_CHOICE) {
			options = [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
			correctAnswers = [];
		} else if (questionType === QUESTION_TYPES.MATCHING) {
			matchingPrompts = ['', ''];
			matchingAnswers = ['', ''];
			correctAnswers = [];
		}
	}

	async function handleSubmit() {
		if (!questionStem || !moduleId) return;

		if (questionType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			const sanitized = fitbAnswers.filter((r) => r.value.trim());
			if (sanitized.length < 1) return;
			const encoded = sanitized.map((row) => ({ text: encodeFitbAnswer(row) }));
			options = encoded;
			correctAnswers = encoded.map((_, i) => i.toString());
		}

		if (questionType === QUESTION_TYPES.MATCHING) {
			const rawPrompts = matchingPrompts.map((t) => t.trim()).filter((t) => t.length > 0);
			const rawAnswers = matchingAnswers.map((t) => t.trim()).filter((t) => t.length > 0);
			if (rawPrompts.length === 0 || rawAnswers.length === 0) return;

			function makeOptionId(stem: string, text: string, index: number): string {
				const input = `${stem}|${text}|${index}`;
				let hash = 0;
				for (let i = 0; i < input.length; i++) {
					const char = input.charCodeAt(i);
					hash = (hash << 5) - hash + char;
					hash = hash & hash;
				}
				return Math.abs(hash).toString(36).padStart(8, '0').slice(0, 8);
			}

			const promptOptions = rawPrompts.map((text, i) => {
				const full = `prompt:${text}`;
				return {
					id: makeOptionId(questionStem, full, i),
					text: full
				};
			});
			const answersOffset = promptOptions.length;
			const answerOptions = rawAnswers.map((text, i) => {
				const full = `answer:${text}`;
				return {
					id: makeOptionId(questionStem, full, answersOffset + i),
					text: full
				};
			});
			const mappings: string[] = [];
			const n = Math.min(rawPrompts.length, rawAnswers.length);
			for (let i = 0; i < n; i++) {
				mappings.push(`${promptOptions[i].id}::${answerOptions[i].id}`);
			}
			options = [...promptOptions, ...answerOptions];
			correctAnswers = mappings;
		}

		const filledOptions = options.filter((opt) => opt.text.trim());
		if (questionType === QUESTION_TYPES.TRUE_FALSE && correctAnswers.length !== 1) return;
		if (questionType === QUESTION_TYPES.MULTIPLE_CHOICE && filledOptions.length < 2) return;
		if (questionType === QUESTION_TYPES.FILL_IN_THE_BLANK && filledOptions.length < 1) return;
		if (questionType === QUESTION_TYPES.MATCHING && correctAnswers.length < 1) return;

		isSubmitting = true;

		try {
			let questionId: Id<'question'> | undefined;

			// Strip out 'id' field from options - only send 'text'
			const cleanOptions = filledOptions.map((opt) => ({ text: opt.text }));

			if (mode === 'edit' && editingQuestion) {
				await client.mutation(api.question.updateQuestion, {
					questionId: editingQuestion._id as Id<'question'>,
					moduleId: moduleId as Id<'module'>,
					type: questionType,
					stem: questionStem,
					options: cleanOptions,
					correctAnswers,
					explanation: questionExplanation || '',
					status: questionStatus.toLowerCase()
				});
				questionId = editingQuestion._id as Id<'question'>;
			} else {
				const nextOrder = questions.data?.length
					? Math.max(...questions.data.map((q) => q.order || 0)) + 1
					: 0;

				const createdBy =
					clerkUser?.firstName && clerkUser?.lastName
						? {
								firstName: clerkUser.firstName,
								lastName: clerkUser.lastName
							}
						: undefined;

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
				// Calculate starting order based on existing media
				const startOrder = existingMedia.length;
				for (let i = 0; i < queuedMedia.length; i++) {
					const m = queuedMedia[i];
					await client.mutation((api as any).questionMedia.create, {
						questionId: questionId,
						url: m.url,
						mediaType: mediaTypeFromMime(m.mimeType),
						mimeType: m.mimeType || 'application/octet-stream',
						altText: m.name || '',
						caption: m.caption || '',
						order: startOrder + i,
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

	<div class="flex-1 overflow-y-auto p-4 pb-12 space-y-4 min-h-0">
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
			{#if editor}
				<EditorContent editor={$editor} class="min-h-12" />
			{/if}
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

		<div class="card bg-base-200/50 border border-base-300">
			<div class="card-body p-4">
				<h6 class="font-semibold mb-3 flex items-center gap-2 text-sm">
					<ListChecks size={16} class="text-primary/80" />
					Options & Answers
				</h6>

				{#if questionType === QUESTION_TYPES.FILL_IN_THE_BLANK}
					<div class="space-y-4">
						{#each fitbAnswers as row, index (index)}
							<div class="p-3 rounded-lg border border-base-300 bg-base-100">
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									<input
										type="text"
										class="input input-bordered w-full"
										placeholder="Answer text"
										bind:value={row.value}
										oninput={onChange}
									/>
									<select
										class="select select-bordered w-full"
										value={row.mode}
										onchange={(e) => updateFitbMode(index, e.currentTarget.value as FitbMode)}
									>
										{#each Object.entries(FITB_MODE_LABELS) as [mode, label]}
											<option value={mode}>{label}</option>
										{/each}
									</select>
								</div>
								<div class="flex items-center gap-4 mt-3">
									<label class="label cursor-pointer gap-2">
										<input
											type="checkbox"
											class="checkbox checkbox-sm"
											checked={row.flags.ignorePunct}
											onchange={() => toggleFitbFlag(index, 'ignorePunct')}
										/>
										<span class="label-text text-sm">Ignore punctuation</span>
									</label>
									<label class="label cursor-pointer gap-2">
										<input
											type="checkbox"
											class="checkbox checkbox-sm"
											checked={row.flags.normalizeWs}
											onchange={() => toggleFitbFlag(index, 'normalizeWs')}
										/>
										<span class="label-text text-sm">Normalize whitespace</span>
									</label>
									{#if fitbAnswers.length > 1}
										<button
											type="button"
											class="btn btn-ghost btn-xs text-error ml-auto"
											onclick={() => removeFitbRow(index)}
										>
											<X size={14} />
										</button>
									{/if}
								</div>
							</div>
						{/each}
						<button type="button" class="btn btn-sm btn-outline" onclick={addFitbRow}>
							Add Alternative Answer
						</button>
					</div>
				{:else if questionType === QUESTION_TYPES.MATCHING}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<h6 class="text-sm font-semibold mb-2">Prompts</h6>
							<div class="space-y-3">
								{#each matchingPrompts as p, i (i)}
									<div class="flex items-center gap-2">
										<input
											type="text"
											class="input input-bordered flex-1"
											placeholder="Prompt {i + 1}"
											bind:value={matchingPrompts[i]}
											oninput={onChange}
										/>
										{#if matchingPrompts.length > 1}
											<button
												type="button"
												class="btn btn-ghost btn-sm btn-circle"
												onclick={() => removeMatchingPrompt(i)}
											>
												<X size={16} />
											</button>
										{/if}
									</div>
								{/each}
								<button type="button" class="btn btn-sm btn-outline" onclick={addMatchingPrompt}>
									Add Prompt
								</button>
							</div>
						</div>
						<div>
							<h6 class="text-sm font-semibold mb-2">Answers</h6>
							<div class="space-y-3">
								{#each matchingAnswers as a, i (i)}
									<div class="flex items-center gap-2">
										<input
											type="text"
											class="input input-bordered flex-1"
											placeholder="Answer {i + 1}"
											bind:value={matchingAnswers[i]}
											oninput={onChange}
										/>
										{#if matchingAnswers.length > 1}
											<button
												type="button"
												class="btn btn-ghost btn-sm btn-circle"
												onclick={() => removeMatchingAnswer(i)}
											>
												<X size={16} />
											</button>
										{/if}
									</div>
								{/each}
								<button type="button" class="btn btn-sm btn-outline" onclick={addMatchingAnswer}>
									Add Answer
								</button>
							</div>
						</div>
					</div>
				{:else if questionType === QUESTION_TYPES.MULTIPLE_CHOICE || questionType === QUESTION_TYPES.TRUE_FALSE}
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
				{/if}
			</div>
		</div>

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
				{#if explanationEditor}
					<EditorContent editor={$explanationEditor} class="min-h-16" />
				{/if}
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

				{#if existingMedia.length > 0 || queuedMedia.length > 0}
					<div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
						<!-- Existing media (from database) -->
						{#each existingMedia as m (m._id)}
							<div class="border border-base-300 rounded-lg overflow-hidden bg-base-100">
								<img src={m.url} alt={m.altText} class="w-full h-24 object-cover" />
								<div class="p-3 space-y-2">
									<input
										class="input input-bordered input-sm w-full"
										placeholder="Alt text"
										bind:value={m.altText}
										oninput={() => handleExistingMediaChange(m._id, m.altText, m.caption || '', m.showOnSolution)}
									/>
									<input
										class="input input-bordered input-sm w-full"
										placeholder="Caption (optional)"
										bind:value={m.caption}
										oninput={() => handleExistingMediaChange(m._id, m.altText, m.caption || '', m.showOnSolution)}
									/>
									<label class="label cursor-pointer gap-2 text-sm">
										<input
											type="checkbox"
											class="checkbox checkbox-sm"
											bind:checked={m.showOnSolution}
											onchange={() => handleExistingMediaChange(m._id, m.altText, m.caption || '', m.showOnSolution)}
										/>
										<span>Show on solution</span>
									</label>
									<div class="flex justify-between items-center pt-1">
										<span class="text-xs opacity-60">Order: {m.order}</span>
										<button
											class="btn btn-ghost btn-xs text-error"
											onclick={() => removeExistingMedia(m._id)}>Remove</button
										>
									</div>
								</div>
							</div>
						{/each}

						<!-- Queued media (newly uploaded, not saved yet) -->
						{#each queuedMedia as m, idx (idx)}
							<div class="border border-primary/50 rounded-lg overflow-hidden bg-base-100 relative">
								<div class="absolute top-2 left-2 badge badge-primary badge-sm">New</div>
								<img src={m.url} alt={m.name} class="w-full h-24 object-cover" />
								<div class="p-3 space-y-2">
									<input
										class="input input-bordered input-sm w-full"
										placeholder="Alt text"
										bind:value={m.name}
										oninput={onChange}
									/>
									<input
										class="input input-bordered input-sm w-full"
										placeholder="Caption (optional)"
										bind:value={m.caption}
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
