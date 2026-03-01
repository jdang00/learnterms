<script lang="ts">
	import {
		X,
		Bold,
		Italic,
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
		Plus,
		Shuffle,
		Clipboard,
		Trash2,
		Save,
		Image as ImageIcon,
		Check,
		FileText,
		Sparkles
	} from 'lucide-svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id, Doc } from '../../convex/_generated/dataModel';
	import { QUESTION_TYPES } from '$lib/types';
	import { createUploader, createUploadThing } from '$lib/utils/uploadthing';
	import { UploadDropzone } from '@uploadthing/svelte';
	import { onMount } from 'svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Readable } from 'svelte/store';
	import { createEditor, Editor, EditorContent } from 'svelte-tiptap';
	import { getEditorExtensions } from '../config/tiptap';
	import { useClerkContext } from 'svelte-clerk';
	import type { Focus } from '$lib/config/generation';
	import { Loader2 } from 'lucide-svelte';

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
		onSave: (newQuestionId?: string) => void;
		onCancel: () => void;
		onChange?: () => void;
	} = $props();

	let editor = $state() as Readable<Editor>;
	let explanationEditor = $state() as Readable<Editor>;

	function handleKeyboardSave(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			if (!isSubmitting && questionStem) handleSubmit();
		}
	}

	onMount(() => {
		editor = createEditor({
			extensions: getEditorExtensions(),
			content: editingQuestion?.stem || '',
			editorProps: {
				attributes: {
					class: 'prose prose-sm max-w-none focus:outline-none min-h-[3rem] p-3 tiptap-content'
				}
			}
		});

		explanationEditor = createEditor({
			extensions: getEditorExtensions(),
			content: editingQuestion?.explanation || '',
			editorProps: {
				attributes: {
					class: 'prose prose-sm max-w-none focus:outline-none min-h-[3rem] p-3 tiptap-content text-sm'
				}
			}
		});

		window.addEventListener('keydown', handleKeyboardSave);
		return () => window.removeEventListener('keydown', handleKeyboardSave);
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
	let isGeneratingAI: boolean = $state(false);

	// Get user's domain focus from metadata or default to 'general'
	let userFocus: Focus = $state('general'); // TODO: fetch from user settings/metadata when available

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
					await fetch('/api/uploads/delete', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ fileKey: key })
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

	// Paste upload support
	const { startUpload, isUploading } = createUploadThing('questionMediaUploader', {
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

	let isPasteUploading = $state(false);

	async function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;

		const files: File[] = [];
		for (const item of items) {
			if (item.kind === 'file') {
				const file = item.getAsFile();
				if (file) files.push(file);
			}
		}

		if (files.length === 0) return;

		e.preventDefault();
		isPasteUploading = true;
		setMediaError('');

		try {
			await startUpload(files);
		} catch (err) {
			setMediaError(err instanceof Error ? err.message : 'Paste upload failed');
		} finally {
			isPasteUploading = false;
		}
	}

	async function removeQueuedMedia(index: number) {
		const media = queuedMedia[index];
		// Delete from UploadThing if we have a key
		if (media?.key) {
			try {
				await fetch('/api/uploads/delete', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ fileKey: media.key })
				});
			} catch (e) {
				console.error('Failed to delete from UploadThing:', e);
			}
		}
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
		exact: 'Exact',
		exact_cs: 'Case-sensitive',
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

	function shuffleOptions() {
		if (
			questionType === QUESTION_TYPES.TRUE_FALSE ||
			questionType === QUESTION_TYPES.FILL_IN_THE_BLANK ||
			questionType === QUESTION_TYPES.MATCHING
		)
			return;
		const pairs = options.map((opt, idx) => ({ opt, idx }));
		for (let i = pairs.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[pairs[i], pairs[j]] = [pairs[j], pairs[i]];
		}
		const newCorrect = correctAnswers.map((oldIdx) => {
			const newIdx = pairs.findIndex((p) => p.idx === parseInt(oldIdx));
			return newIdx.toString();
		});
		options = pairs.map((p) => p.opt);
		correctAnswers = newCorrect;
		onChange();
	}

	// AI Assistant - inline generation
	function canGenerateAI(): boolean {
		if (isGeneratingAI || questionStem.trim().length === 0) return false;
		if (questionType === QUESTION_TYPES.MULTIPLE_CHOICE) {
			return correctAnswers.length > 0;
		}
		if (questionType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			return fitbAnswers.some((row) => row.value.trim().length > 0);
		}
		return false;
	}

	async function generateAIOptions() {
		if (!canGenerateAI()) return;

		isGeneratingAI = true;
		try {
			if (questionType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
				const answer = fitbAnswers
					.map((row) => row.value.trim())
					.filter((t) => t.length > 0)
					.join('; ');

				const result = await client.action(api.question.generateExplanation, {
					stem: questionStem,
					answer,
					focus: userFocus,
					existingExplanation: questionExplanation.trim() || undefined
				});

				if (result.explanation) {
					questionExplanation = result.explanation;
					if ($explanationEditor) {
						$explanationEditor.commands.setContent(result.explanation);
					}
				}

				onChange();
				toastStore.success('Explanation generated');
			} else {
				const correctTexts = correctAnswers
					.map((idx) => options[parseInt(idx)]?.text || '')
					.filter((t) => t.trim().length > 0);
				const existingTexts = options.map((o) => o.text).filter((t) => t.trim().length > 0);

				// Count empty option slots — that's how many distractors the user wants
				const emptyCount = options.filter((o) => o.text.trim().length === 0).length;
				const numDistractors = Math.max(1, emptyCount);

				const result = await client.action(api.question.generateDistractorsAndExplanation, {
					stem: questionStem,
					correctAnswers: correctTexts,
					existingOptions: existingTexts,
					focus: userFocus,
					numDistractors,
					existingExplanation: questionExplanation.trim() || undefined
				});

				// Fill empty slots with generated distractors
				let distractorIdx = 0;
				options = options.map((o) => {
					if (o.text.trim().length === 0 && distractorIdx < result.distractors.length) {
						return { text: result.distractors[distractorIdx++] };
					}
					return o;
				});

				if (result.explanation) {
					questionExplanation = result.explanation;
					if ($explanationEditor) {
						$explanationEditor.commands.setContent(result.explanation);
					}
				}

				onChange();
				toastStore.success('Options generated');
			}
		} catch (err: any) {
			console.error('AI generation error:', err);
			if (err.message?.includes('Daily generation limit')) {
				toastStore.error(err.message);
			} else {
				toastStore.error('Failed to generate. Try again.');
			}
		} finally {
			isGeneratingAI = false;
		}
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
		if (!questionStem || !moduleId) {
			toastStore.error('Question stem is required');
			return;
		}

		if (questionType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			const sanitized = fitbAnswers.filter((r) => r.value.trim());
			if (sanitized.length < 1) {
				toastStore.error('At least one answer is required');
				return;
			}
			const existingFitb = mode === 'edit' && editingQuestion ? editingQuestion.options || [] : [];
			const encoded = sanitized.map((row, i) => ({
				id: existingFitb[i]?.id,
				text: encodeFitbAnswer(row)
			}));
			options = encoded;
			correctAnswers = encoded.map((_, i) => i.toString());
		}

		if (questionType === QUESTION_TYPES.MATCHING) {
			const rawPrompts = matchingPrompts.map((t) => t.trim()).filter((t) => t.length > 0);
			const rawAnswers = matchingAnswers.map((t) => t.trim()).filter((t) => t.length > 0);
			if (rawPrompts.length === 0 || rawAnswers.length === 0) {
				toastStore.error('At least one prompt and one answer are required');
				return;
			}

			const promptOptions = rawPrompts.map((text, i) => {
				const full = `prompt:${text}`;
				return {
					text: full
				};
			});
			const answersOffset = promptOptions.length;
			const answerOptions = rawAnswers.map((text, i) => {
				const full = `answer:${text}`;
				return {
					text: full
				};
			});
			const mappings: string[] = [];
			const n = Math.min(rawPrompts.length, rawAnswers.length);
			for (let i = 0; i < n; i++) {
				mappings.push(`${i}::${answersOffset + i}`);
			}
			options = [...promptOptions, ...answerOptions];
			correctAnswers = mappings;
		}

		const filledOptions = options.filter((opt) => opt.text.trim());
		if (questionType === QUESTION_TYPES.TRUE_FALSE && correctAnswers.length !== 1) {
			toastStore.error('Select True or False as the correct answer');
			return;
		}
		if (questionType === QUESTION_TYPES.MULTIPLE_CHOICE && filledOptions.length < 2) {
			toastStore.error('At least 2 options are required');
			return;
		}
		if (questionType === QUESTION_TYPES.FILL_IN_THE_BLANK && filledOptions.length < 1) {
			toastStore.error('At least one answer is required');
			return;
		}
		if (questionType === QUESTION_TYPES.MATCHING && correctAnswers.length < 1) {
			toastStore.error('At least one matching pair is required');
			return;
		}

		isSubmitting = true;

		try {
			let questionId: Id<'question'> | undefined;

			const cleanOptions = filledOptions.map((opt) => ({
				id: opt.id,
				text: opt.text
			}));

			if (mode === 'edit' && editingQuestion) {
				await client.mutation(api.question.updateQuestion as any, {
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
					options: cleanOptions.map((opt) => ({ text: opt.text })),
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

			toastStore.success(mode === 'edit' ? 'Question saved' : 'Question created');
			onSave(mode === 'add' ? questionId : undefined);
		} catch (error) {
			console.error('Failed to save question', error);
			toastStore.error('Failed to save question');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="h-full flex flex-col overflow-hidden bg-base-100">
	<!-- Top Bar: Title & Actions -->
	<div class="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-100 flex-shrink-0">
		<h3 class="text-base font-semibold">{mode === 'edit' ? 'Edit Question' : 'New Question'}</h3>
		<div class="flex items-center gap-2">
			<button class="btn btn-sm btn-ghost rounded-full" onclick={onCancel} disabled={isSubmitting}>Cancel</button>
			<button
				class="btn btn-sm btn-primary rounded-full gap-2"
				onclick={handleSubmit}
				disabled={isSubmitting || !questionStem}
			>
				{#if isSubmitting}
					<span class="loading loading-spinner loading-xs"></span>
				{:else}
					<Save size={14} />
				{/if}
				{mode === 'edit' ? 'Save' : 'Create'}
			</button>
		</div>
	</div>

	<!-- Toolbar: Type & Status -->
	<div class="flex flex-wrap items-center gap-8 px-6 py-4 border-b border-base-300 bg-base-200/30 flex-shrink-0">
		<!-- Type Selector -->
		<div class="flex flex-col gap-2">
			<span class="text-[10px] font-bold text-base-content/40 uppercase tracking-wider ml-1">Type</span>
			<div class="flex shadow-sm bg-base-100 rounded-full border border-base-300 p-1 gap-0.5">
				{#each questionTypeOptions as option (option.value)}
					<button
						class="btn btn-xs sm:btn-sm rounded-full border-0 {questionType === option.value ? 'btn-active font-medium' : 'btn-ghost opacity-60 hover:opacity-100 font-normal'}"
						onclick={() => {
							questionType = option.value;
							handleTypeChange();
							onChange();
						}}
						title={option.label}
					>
						<option.icon size={16} />
						<span class="hidden md:inline">{option.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="w-px h-10 bg-base-300 hidden sm:block"></div>

		<!-- Status Selector -->
		<div class="flex flex-col gap-2">
			<span class="text-[10px] font-bold text-base-content/40 uppercase tracking-wider ml-1">Status</span>
			<div class="flex shadow-sm bg-base-100 rounded-full border border-base-300 p-1 gap-0.5">
				{#each statusOptions as option (option.value)}
					<button
						class="btn btn-xs sm:btn-sm rounded-full border-0 {questionStatus === option.value ? option.colorClass + ' btn-active font-medium' : 'btn-ghost opacity-60 hover:opacity-100 font-normal'}"
						onclick={() => {
							questionStatus = option.value;
							onChange();
						}}
						title={option.label}
					>
						<option.icon size={16} />
						<span class="hidden md:inline">{option.label}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Main Scrollable Content -->
	<div class="flex-1 overflow-y-auto min-h-0 p-4 pb-40 sm:p-6 sm:pb-40" onpaste={handlePaste}>
		<div class="w-full max-w-none space-y-8">
			
			<!-- Question Stem -->
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<label class="text-xs font-semibold uppercase tracking-wide text-base-content/60 flex items-center gap-2">
						<MessageSquare size={14} /> Question
					</label>
					<span class="text-[10px] text-base-content/40 font-medium hidden sm:inline">Ctrl + S to save</span>
				</div>
				<div class="border border-base-300 rounded-2xl overflow-hidden bg-base-100 shadow-sm group focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
					{#if editor}
						<div class="bg-base-200/50 border-b border-base-300 p-1 flex gap-1 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
							{#each menuItems as item (item.name)}
								<button
									type="button"
									class="btn btn-ghost btn-xs btn-square {item.active() ? 'btn-active text-primary' : ''}"
									onclick={item.command}
									title={item.name}
								>
									<item.icon size={12} />
								</button>
							{/each}
						</div>
						<EditorContent editor={$editor} />
					{/if}
				</div>
			</div>

			<div class="divider my-2 opacity-50"></div>

			<!-- Options Section -->
			<div>
				{#if questionType === QUESTION_TYPES.FILL_IN_THE_BLANK}
					<div class="space-y-4">
						<div class="flex items-center justify-between mb-2">
							<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Accepted Answers</div>
							<button
								class="btn btn-xs btn-ghost gap-1"
								onclick={generateAIOptions}
								disabled={!canGenerateAI()}
								title={canGenerateAI() ? 'Generate explanation with AI' : 'Add stem and answer first'}
							>
								{#if isGeneratingAI}
									<Loader2 size={12} class="animate-spin" />
								{:else}
									<Sparkles size={12} />
								{/if}
								<span class="hidden sm:inline">AI</span>
							</button>
						</div>
						<div class="card bg-base-100 border border-base-300 shadow-sm rounded-3xl overflow-hidden">
							<div class="card-body p-4 gap-4">
								{#each fitbAnswers as row, index (index)}
									<div class="flex flex-col sm:flex-row gap-3 items-start">
										<div class="flex-1 w-full">
											<div class="flex items-center gap-2 mb-1">
												<span class="badge badge-sm {index === 0 ? 'badge-success' : 'badge-ghost'}">
													{index === 0 ? 'Primary' : 'Alt'}
												</span>
												{#if fitbAnswers.length > 1}
													<button class="btn btn-ghost btn-xs text-error ml-auto sm:hidden" onclick={() => removeFitbRow(index)}>
														<X size={14} />
													</button>
												{/if}
											</div>
											<input
												type="text"
												class="input input-bordered input-sm w-full font-medium"
												placeholder="Answer text"
												bind:value={row.value}
												oninput={onChange}
											/>
										</div>
										<div class="flex flex-wrap items-center gap-2 w-full sm:w-auto pt-6">
											<select
												class="select select-bordered select-sm"
												value={row.mode}
												onchange={(e) => updateFitbMode(index, e.currentTarget.value as FitbMode)}
											>
												{#each Object.entries(FITB_MODE_LABELS) as [mode, label]}
													<option value={mode}>{label}</option>
												{/each}
											</select>
											<div class="flex items-center rounded-full border border-base-300 p-0.5 gap-0.5">
												<button
													class="btn btn-sm rounded-full border-0 {row.flags.ignorePunct ? 'btn-active' : 'btn-ghost'}"
													onclick={() => toggleFitbFlag(index, 'ignorePunct')}
													title="Ignore Punctuation"
												>
													Punct
												</button>
												<button 
													class="btn btn-sm rounded-full border-0 {row.flags.normalizeWs ? 'btn-active' : 'btn-ghost'}"
													onclick={() => toggleFitbFlag(index, 'normalizeWs')}
													title="Normalize Whitespace"
												>
													Space
												</button>
											</div>
											{#if fitbAnswers.length > 1}
												<button class="btn btn-ghost btn-sm btn-square text-error hidden sm:flex" onclick={() => removeFitbRow(index)}>
													<X size={16} />
												</button>
											{/if}
										</div>
									</div>
									{#if index < fitbAnswers.length - 1}
										<div class="divider my-0"></div>
									{/if}
								{/each}
							</div>
							<div class="bg-base-200/50 p-2 border-t border-base-300 flex justify-center">
								<button class="btn btn-xs btn-ghost gap-1" onclick={addFitbRow}>
									<Plus size={14} /> Add Alternative
								</button>
							</div>
						</div>
					</div>

				{:else if questionType === QUESTION_TYPES.MATCHING}
					<div class="space-y-4">
						<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2">Matching Pairs</div>
						<div class="space-y-3">
							{#each Array(Math.max(matchingPrompts.length, matchingAnswers.length)) as _, i (i)}
								<div class="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
									<!-- Left Column: Prompt -->
									<div class="flex-1 w-full relative">
										{#if i < matchingPrompts.length}
											<input
												type="text"
												class="input input-bordered w-full rounded-3xl pr-10"
												placeholder="Prompt {i + 1}"
												bind:value={matchingPrompts[i]}
												oninput={onChange}
											/>
											{#if matchingPrompts.length > 1}
												<button
													type="button"
													class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-error"
													onclick={() => removeMatchingPrompt(i)}
												>
													<X size={14} />
												</button>
											{/if}
										{:else}
											<div class="h-12 w-full rounded-3xl border border-dashed border-base-300 bg-base-100/50 flex items-center justify-center text-xs text-base-content/30 italic">
												Distractor (No Prompt)
											</div>
										{/if}
									</div>
									
									<!-- Center: Arrow -->
									<div class="text-base-content/30 rotate-90 sm:rotate-0 w-5 flex justify-center">
										{#if i < matchingPrompts.length && i < matchingAnswers.length}
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
											</svg>
										{/if}
									</div>

									<!-- Right Column: Answer -->
									<div class="flex-1 w-full relative">
										{#if i < matchingAnswers.length}
											<input
												type="text"
												class="input input-bordered w-full rounded-3xl pr-10 border-success/30 focus:border-success focus:ring-success/20"
												placeholder="Answer {i + 1}"
												bind:value={matchingAnswers[i]}
												oninput={onChange}
											/>
											{#if matchingAnswers.length > 1}
												<button
													type="button"
													class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-error"
													onclick={() => removeMatchingAnswer(i)}
												>
													<X size={14} />
												</button>
											{/if}
										{:else}
											<div class="h-12 w-full rounded-3xl border border-dashed border-base-300 bg-base-100/50 flex items-center justify-center text-xs text-base-content/30 italic">
												No Answer
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
						
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
							<div class="flex justify-center sm:justify-start">
								<button class="btn btn-sm btn-outline gap-2 w-full sm:w-auto" onclick={addMatchingPrompt}>
									<Plus size={14} /> Add Prompt
								</button>
							</div>
							<div class="flex justify-center sm:justify-end">
								<button class="btn btn-sm btn-outline gap-2 w-full sm:w-auto" onclick={addMatchingAnswer}>
									<Plus size={14} /> Add Answer
								</button>
							</div>
						</div>
					</div>

				{:else}
					<!-- Multiple Choice / True False -->
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Options</div>
								<span class="text-[10px] text-base-content/40 font-medium hidden sm:inline">Ctrl + Enter to toggle correct</span>
							</div>
							<div class="flex items-center gap-1">
								{#if questionType === QUESTION_TYPES.MULTIPLE_CHOICE}
									<button
										class="btn btn-xs btn-ghost gap-1"
										onclick={generateAIOptions}
										disabled={!canGenerateAI()}
										title={canGenerateAI() ? 'Generate distractor options with AI' : 'Add stem and correct answer first'}
									>
										{#if isGeneratingAI}
											<Loader2 size={12} class="animate-spin" />
										{:else}
											<Sparkles size={12} />
										{/if}
										<span class="hidden sm:inline">AI</span>
									</button>
									<button class="btn btn-xs btn-ghost gap-1" onclick={shuffleOptions}>
										<Shuffle size={12} /> <span class="hidden sm:inline">Shuffle</span>
									</button>
								{/if}
							</div>
						</div>

						<div class="space-y-3">
							{#each options as option, index (index)}
								<div class="relative group">
									<div class="flex items-center rounded-full border-2 transition-colors bg-base-100 pl-3 pr-2 py-1 {correctAnswers.includes(index.toString()) ? 'border-success bg-success/5' : 'border-base-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'}">
										<input
											type="checkbox"
											class="checkbox checkbox-sm {correctAnswers.includes(index.toString()) ? 'checkbox-success' : 'checkbox-primary'}"
											checked={correctAnswers.includes(index.toString())}
											onclick={() => toggleCorrectAnswer(index)}
											tabindex={-1}
										/>
										<span class="font-semibold text-sm ml-3 text-base-content/50 select-none w-6">{String.fromCharCode(65 + index)}.</span>
										<input
											type="text"
											class="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 h-9"
											bind:value={option.text}
											disabled={questionType === QUESTION_TYPES.TRUE_FALSE}
											placeholder="Option text..."
											onblur={onChange}
											onkeydown={(e) => {
												if (e.ctrlKey && e.key === 'Enter') {
													e.preventDefault();
													toggleCorrectAnswer(index);
												}
											}}
										/>
										{#if options.length > 2 && questionType !== QUESTION_TYPES.TRUE_FALSE}
											<button 
												type="button" 
												class="btn btn-ghost btn-xs btn-circle text-base-content/30 hover:text-error ml-1" 
												tabindex={-1} 
												onclick={() => removeOption(index)}
											>
												<X size={14} />
											</button>
										{:else if questionType === QUESTION_TYPES.TRUE_FALSE}
											<div class="w-8"></div>
										{/if}
									</div>
								</div>
							{/each}
						</div>

						{#if questionType === QUESTION_TYPES.MULTIPLE_CHOICE}
							<button class="btn btn-sm btn-ghost gap-2 w-full border-2 border-dashed border-base-300 hover:border-primary hover:text-primary mt-2" onclick={addOption}>
								<Plus size={14} /> Add Option
							</button>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Explanation & Attachments -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-base-200">
				<div>
					<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-1 flex items-center gap-2">
						<MessageSquare size={14} /> Explanation
					</div>
					<p class="text-[10px] text-base-content/40 mb-2">Add notes or context here to guide AI-generated explanations</p>
					<div class="border border-base-300 rounded-2xl overflow-hidden bg-base-100 group">
						{#if explanationEditor}
							<EditorContent editor={$explanationEditor} />
							<div class="bg-base-200/50 border-t border-base-300 p-1 flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
								{#each expMenuItems as item (item.name)}
									<button
										type="button"
										class="btn btn-ghost btn-xs btn-square {item.active() ? 'btn-active' : ''}"
										onclick={item.command}
										title={item.name}
									>
										<item.icon size={12} />
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<div>
					<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2 flex items-center gap-2">
						<ImageIcon size={14} /> Attachments
					</div>
					
					<div class="space-y-3">
						{#if existingMedia.length > 0 || queuedMedia.length > 0}
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<!-- Existing Media -->
								{#each existingMedia as m (m._id)}
									<div class="border border-base-300 rounded-2xl overflow-hidden bg-base-100">
										<div class="relative group">
											<img src={m.url} alt={m.altText} class="w-full h-32 object-cover" />
											<button 
												class="absolute top-1 right-1 btn btn-circle btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity"
												onclick={() => removeExistingMedia(m._id)}
											>
												<Trash2 size={12} />
											</button>
										</div>
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
											<label class="label cursor-pointer gap-2 text-xs p-0 justify-start">
												<input
													type="checkbox"
													class="checkbox checkbox-xs"
													bind:checked={m.showOnSolution}
													onchange={() => handleExistingMediaChange(m._id, m.altText, m.caption || '', m.showOnSolution)}
												/>
												<span>Show on rationale</span>
											</label>
										</div>
									</div>
								{/each}
								
								<!-- Queued Media -->
								{#each queuedMedia as m, idx (idx)}
									<div class="border border-primary/50 rounded-2xl overflow-hidden bg-base-100 relative">
										<div class="absolute top-2 left-2 badge badge-primary badge-xs z-10">New</div>
										<div class="relative">
											<img src={m.url} alt={m.name} class="w-full h-32 object-cover" />
											<button 
												class="absolute top-1 right-1 btn btn-circle btn-xs btn-error z-10"
												onclick={() => removeQueuedMedia(idx)}
											>
												<Trash2 size={12} />
											</button>
										</div>
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
											<label class="label cursor-pointer gap-2 text-xs p-0 justify-start">
												<input
													type="checkbox"
													class="checkbox checkbox-xs"
													bind:checked={m.showOnSolution}
													onchange={onChange}
												/>
												<span>Show on rationale</span>
											</label>
										</div>
									</div>
								{/each}
							</div>
						{/if}

						<div class="relative">
							{#if isPasteUploading}
								<div class="border-2 border-dashed border-primary rounded-2xl p-6 flex flex-col items-center justify-center h-32 bg-base-100/50">
									<span class="loading loading-spinner text-primary mb-2"></span>
									<span class="text-xs text-primary font-medium">Processing pasted image...</span>
								</div>
							{:else}
								<div class="group relative h-36 w-full border-2 border-dashed border-base-300 rounded-xl hover:border-primary transition-colors bg-base-100/50 flex flex-col items-center justify-center text-center overflow-hidden">
									<!-- The Dropzone covers everything but is invisible -->
									<div class="absolute inset-0 z-10 opacity-0 cursor-pointer">
										<UploadDropzone
											uploader={mediaUploader}
											aria-label="Upload image"
											appearance={{
												container: 'h-full w-full',
												label: 'hidden',
												allowedContent: 'hidden',
												button: 'hidden'
											}}
										/>
									</div>
									
									<!-- Visible Content -->
									<div class="flex flex-col items-center gap-2 p-4 text-base-content/60 group-hover:text-primary transition-colors">
										<div class="p-3 bg-base-200 rounded-full group-hover:bg-primary/10 transition-colors">
											<ImageIcon size={24} />
										</div>
										<div class="flex flex-col gap-0.5">
											<span class="text-sm font-semibold">Upload Image</span>
											<span class="text-xs opacity-70">Drag & drop or paste (Ctrl+V)</span>
										</div>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	:global(.tiptap-content) {
		outline: none;
	}
	:global(.tiptap-content p.is-editor-empty:first-child::before) {
		color: #adb5bd;
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}
</style>
