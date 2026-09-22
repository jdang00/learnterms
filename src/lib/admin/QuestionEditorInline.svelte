<script lang="ts">
	import QuestionSourceEditor from './QuestionSourceEditor.svelte';
	import QuestionSources from '$lib/components/QuestionSources.svelte';
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
		Trash2,
		Save,
		Image as ImageIcon,
		FileText,
		Sparkles
	} from 'lucide-svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import type { FunctionArgs, FunctionReturnType } from 'convex/server';
	import { api } from '../../convex/_generated/api.js';
	import type { Id, Doc } from '../../convex/_generated/dataModel';
	import { QUESTION_TYPES } from '$lib/types';
	import { onMount } from 'svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Readable } from 'svelte/store';
	import { createEditor, Editor, EditorContent } from 'svelte-tiptap';
	import { getEditorExtensions } from '../config/tiptap';
	import { useClerkContext } from 'svelte-clerk';
	import { Loader2 } from 'lucide-svelte';
	import { getRationale, getRationalePlainText } from '$lib/utils/rationale';
	import { useQuestionMedia } from '$lib/utils/useQuestionMedia.svelte';
	import { uploadQuestionImage } from '$lib/utils/uploadQuestionImage';
	import {
		MAX_QUESTION_IMAGES,
		QUESTION_IMAGE_ACCEPT,
		validateQuestionImage
	} from '$lib/utils/questionMediaUpload';

	type QuestionItem = Doc<'question'>;
	type QuestionMediaItem = FunctionReturnType<typeof api.questionMedia.getByQuestionId>[number];
	type UpdateQuestionMediaArgs = FunctionArgs<typeof api.questionMedia.update>;

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
	let rationaleEditor = $state() as Readable<Editor>;
	let questionSource = $state<Doc<'question'>['metadata']['source']>();

	type ToolbarItem = {
		name: string;
		command: () => void;
		icon:
			| typeof Bold
			| typeof Italic
			| typeof UnderlineIcon
			| typeof StrikethroughIcon
			| typeof CodeIcon
			| typeof HighlighterIcon
			| typeof LinkIcon
			| typeof QuoteIcon
			| typeof ListIcon
			| typeof ListOrderedIcon;
		active: () => boolean;
	};

	function createToolbarCommands(getEditor: () => Editor | undefined) {
		const withEditor = (command: (editor: Editor) => void) => () => {
			const currentEditor = getEditor();
			if (!currentEditor) return;
			command(currentEditor);
		};

		const promptForLink = withEditor((currentEditor) => {
			const url = prompt('Enter URL:');
			if (!url) return;
			currentEditor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
		});

		const unsetLink = withEditor((currentEditor) => {
			currentEditor.chain().focus().extendMarkRange('link').unsetLink().run();
		});

		const isActive = (name: string, attrs = {}) => getEditor()?.isActive(name, attrs) ?? false;

		const commands = {
			toggleBold: withEditor((currentEditor) => currentEditor.chain().focus().toggleBold().run()),
			toggleItalic: withEditor((currentEditor) =>
				currentEditor.chain().focus().toggleItalic().run()
			),
			toggleUnderline: withEditor((currentEditor) =>
				currentEditor.chain().focus().toggleUnderline().run()
			),
			toggleStrike: withEditor((currentEditor) =>
				currentEditor.chain().focus().toggleStrike().run()
			),
			toggleCode: withEditor((currentEditor) => currentEditor.chain().focus().toggleCode().run()),
			toggleHighlight: withEditor((currentEditor) =>
				currentEditor.chain().focus().toggleHighlight().run()
			),
			toggleBlockquote: withEditor((currentEditor) =>
				currentEditor.chain().focus().toggleBlockquote().run()
			),
			toggleBulletList: withEditor((currentEditor) =>
				currentEditor.chain().focus().toggleBulletList().run()
			),
			toggleOrderedList: withEditor((currentEditor) =>
				currentEditor.chain().focus().toggleOrderedList().run()
			),
			setLink: promptForLink,
			unsetLink
		};

		const menuItems = (): ToolbarItem[] => [
			{ name: 'bold', command: commands.toggleBold, icon: Bold, active: () => isActive('bold') },
			{
				name: 'italic',
				command: commands.toggleItalic,
				icon: Italic,
				active: () => isActive('italic')
			},
			{
				name: 'underline',
				command: commands.toggleUnderline,
				icon: UnderlineIcon,
				active: () => isActive('underline')
			},
			{
				name: 'strike',
				command: commands.toggleStrike,
				icon: StrikethroughIcon,
				active: () => isActive('strike')
			},
			{
				name: 'code',
				command: commands.toggleCode,
				icon: CodeIcon,
				active: () => isActive('code')
			},
			{
				name: 'highlight',
				command: commands.toggleHighlight,
				icon: HighlighterIcon,
				active: () => isActive('highlight')
			},
			{
				name: 'link',
				command: () => (isActive('link') ? commands.unsetLink() : commands.setLink()),
				icon: LinkIcon,
				active: () => isActive('link')
			},
			{
				name: 'blockquote',
				command: commands.toggleBlockquote,
				icon: QuoteIcon,
				active: () => isActive('blockquote')
			},
			{
				name: 'bullet-list',
				command: commands.toggleBulletList,
				icon: ListIcon,
				active: () => isActive('bulletList')
			},
			{
				name: 'ordered-list',
				command: commands.toggleOrderedList,
				icon: ListOrderedIcon,
				active: () => isActive('orderedList')
			}
		];

		return { commands, isActive, menuItems };
	}

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
					class: 'prose prose-sm max-w-none focus:outline-hidden min-h-[3rem] p-3 tiptap-content'
				}
			}
		});

		rationaleEditor = createEditor({
			extensions: getEditorExtensions(),
			content: getRationale(editingQuestion),
			editorProps: {
				attributes: {
					class:
						'prose prose-sm max-w-none focus:outline-hidden min-h-[3rem] p-3 tiptap-content text-sm'
				}
			}
		});

		window.addEventListener('keydown', handleKeyboardSave);
		return () => window.removeEventListener('keydown', handleKeyboardSave);
	});

	const stemToolbar = createToolbarCommands(() => $editor);
	const rationaleToolbar = createToolbarCommands(() => $rationaleEditor);
	const menuItems = $derived(stemToolbar.menuItems());
	const rationaleMenuItems = $derived(rationaleToolbar.menuItems());

	const questionTypeOptions = [
		{ value: QUESTION_TYPES.MULTIPLE_CHOICE, label: 'Multiple Choice', icon: CheckSquare },
		{ value: QUESTION_TYPES.TRUE_FALSE, label: 'True/False', icon: ToggleLeft },
		{ value: QUESTION_TYPES.FILL_IN_THE_BLANK, label: 'Fill in Blank', icon: Edit3 },
		{ value: QUESTION_TYPES.MATCHING, label: 'Matching', icon: ListChecks }
	];

	const statusOptions = [
		{
			value: 'published',
			label: 'Published',
			icon: CheckCircle,
			colorClass: 'btn-success'
		},
		{
			value: 'draft',
			label: 'Draft',
			icon: FileText,
			colorClass: 'btn-info'
		},
		{
			value: 'archived',
			label: 'Archived',
			icon: Archive,
			colorClass: 'btn-error'
		}
	];

	$effect(() => {
		if ($editor) {
			const updateStem = () => {
				saveError = null;
				isRationaleError = false;
				questionStem = $editor.getHTML();
				onChange();
			};
			$editor.on('update', updateStem);
			return () => $editor.off('update', updateStem);
		}
	});

	$effect(() => {
		if ($rationaleEditor) {
			const updateRationale = () => {
				saveError = null;
				isRationaleError = false;
				questionRationale = $rationaleEditor.getHTML();
				onChange();
			};
			$rationaleEditor.on('update', updateRationale);
			return () => $rationaleEditor.off('update', updateRationale);
		}
	});

	const client = useConvexClient();
	const clerk = useClerkContext();
	const clerkUser = $derived(clerk.user);

	function getInitialQuestionStem() {
		return editingQuestion?.stem ?? '';
	}

	function getInitialQuestionRationale() {
		return getRationale(editingQuestion);
	}

	function getInitialQuestionStatus() {
		return editingQuestion?.status ?? initialAddStatus;
	}

	function getInitialQuestionType() {
		return editingQuestion?.type ?? QUESTION_TYPES.MULTIPLE_CHOICE;
	}

	function cloneOptions(input?: Array<{ id?: string; text: string }> | null) {
		return (input ?? []).map((option) => ({
			id: option.id,
			text: option.text ?? ''
		}));
	}

	function getInitialOptions() {
		return editingQuestion?.options?.length
			? cloneOptions(editingQuestion.options)
			: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
	}

	function getInitialCorrectAnswers() {
		if (!editingQuestion?.correctAnswers || !editingQuestion.options) return [];
		return editingQuestion.correctAnswers
			.map((answerId) => {
				const index = editingQuestion?.options?.findIndex((opt) => opt.id === answerId) ?? -1;
				return index !== -1 ? index.toString() : null;
			})
			.filter((idx): idx is string => idx !== null);
	}

	function getInitialFitbAnswers(): FitbAnswerRow[] {
		if (
			editingQuestion?.type !== QUESTION_TYPES.FILL_IN_THE_BLANK ||
			!editingQuestion.options?.length
		) {
			return [{ value: '', mode: 'exact', flags: { ignorePunct: false, normalizeWs: false } }];
		}

		return editingQuestion.options.map((opt) => {
			const [before, flagsPart] = (opt.text || '').split(' | flags=');
			const [modeMaybe, ...rest] = before.split(':');
			const mode = ['exact', 'exact_cs', 'contains', 'regex'].includes(modeMaybe)
				? (modeMaybe as FitbMode)
				: 'exact';
			const value = rest.join(':');
			return {
				value,
				mode,
				flags: {
					ignorePunct: !!flagsPart?.includes('ignore_punct'),
					normalizeWs: !!flagsPart?.includes('normalize_ws')
				}
			};
		});
	}

	function getInitialMatchingState() {
		if (editingQuestion?.type !== QUESTION_TYPES.MATCHING || !editingQuestion.options?.length) {
			return {
				prompts: ['', ''],
				answers: ['', '']
			};
		}

		const prompts = editingQuestion.options
			.filter((option) => option.text?.startsWith('prompt:'))
			.map((option) => option.text.slice('prompt:'.length));
		const answers = editingQuestion.options
			.filter((option) => option.text?.startsWith('answer:'))
			.map((option) => option.text.slice('answer:'.length));

		return {
			prompts: prompts.length > 0 ? prompts : ['', ''],
			answers: answers.length > 0 ? answers : ['', '']
		};
	}

	let questionStem: string = $state('');
	let questionRationale: string = $state('');
	let questionStatus: string = $state('draft');
	let questionType: string = $state(QUESTION_TYPES.MULTIPLE_CHOICE);
	let options: Array<{ id?: string; text: string }> = $state([
		{ text: '' },
		{ text: '' },
		{ text: '' },
		{ text: '' }
	]);
	let correctAnswers: string[] = $state([]);
	let isSubmitting: boolean = $state(false);
	let isGeneratingAI: boolean = $state(false);
	let saveError: string | null = $state(null);
	let isRationaleError: boolean = $state(false);
	const canSubmit = $derived(
		questionStem.trim().length > 0 && getRationalePlainText(questionRationale).length > 0
	);
	const rationaleDocsUrl =
		'https://docs.learnterms.com/docs/contributors/why-rationales-are-required';

	let queuedMedia: Array<{
		uploadId: Id<'questionMediaUploads'>;
		url: string;
		name?: string;
		caption?: string;
		showOnSolution?: boolean;
	}> = $state([]);

	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let uploadLabel = $state('');
	let uploadError = $state('');
	let isDraggingImage = $state(false);
	const uploadController = new AbortController();
	onMount(() => () => {
		uploadController.abort();
		for (const media of queuedMedia) {
			URL.revokeObjectURL(media.url);
			void client
				.mutation(api.questionMediaUploads.discard, { uploadId: media.uploadId })
				.catch(() => {});
		}
	});

	const existingMediaQuery = useQuestionMedia(() =>
		mode === 'edit' ? editingQuestion?._id : null
	);
	let existingMedia: QuestionMediaItem[] = $state([]);

	// Fetch existing media when in edit mode
	async function refreshMedia() {
		if (!editingQuestion) return;
		try {
			const media = await client.query(api.questionMedia.getByQuestionId, {
				questionId: editingQuestion._id as Id<'question'>
			});
			existingMedia = [...(media ?? [])].sort((a, b) => a.order - b.order);
		} catch (e) {
			console.error('Failed to fetch media:', e);
		}
	}

	// Load existing media when editing
	$effect(() => {
		existingMedia = [...(existingMediaQuery.data ?? [])];
	});

	// Remove existing media from database
	async function removeExistingMedia(id: string) {
		try {
			await client.mutation(api.questionMedia.softDelete, {
				mediaId: id as Id<'questionMedia'>
			});
			await refreshMedia();
			onChange();
		} catch (e) {
			console.error('Failed to remove media:', e);
		}
	}

	// Update existing media metadata
	async function updateExistingMediaMeta(
		id: string,
		altText: string,
		caption: string,
		showOnSolution?: boolean
	) {
		try {
			const payload: UpdateQuestionMediaArgs = {
				mediaId: id as Id<'questionMedia'>,
				altText,
				caption,
				showOnSolution
			};
			await client.mutation(api.questionMedia.update, payload);
			await refreshMedia();
		} catch (e) {
			console.error('Failed to update media:', e);
		}
	}

	function handleExistingMediaChange(
		id: string,
		altText: string,
		caption: string,
		showOnSolution?: boolean
	) {
		return updateExistingMediaMeta(id, altText, caption, showOnSolution).then(() => {
			onChange();
		});
	}

	async function commitExistingMediaChange(
		id: string,
		altText: string,
		caption: string,
		showOnSolution?: boolean
	) {
		await handleExistingMediaChange(id, altText, caption, showOnSolution);
	}

	function getErrorMessage(error: unknown): string {
		const fallback = 'Failed to save question. Check the question fields and try again.';
		const rationaleRequiredMessage =
			'Add a rationale before publishing or saving this question. Rationales are now required so students can review why an answer is correct.';
		const knownValidationMessages = [
			'Matching questions must use pair-formatted correctAnswers',
			'Question not found or access denied',
			'Module not found',
			'Module question limit'
		];

		const normalizeMessage = (message: string) =>
			message
				.replace(/^.*Uncaught Error:\s*/s, '')
				.replace(/^Error:\s*/, '')
				.split('\n')[0]
				.trim();
		const formatMessage = (rawMessage: string) => {
			const message = normalizeMessage(rawMessage);
			if (message.includes('Question rationale is required')) return rationaleRequiredMessage;
			const knownMessage = knownValidationMessages.find((known) => message.includes(known));
			if (knownMessage) return message;
			if (message.includes('ConvexError') || rawMessage.includes('ConvexError')) return fallback;
			return message.length > 0 ? message : fallback;
		};

		if (error instanceof Error) {
			return formatMessage(error.message);
		}
		if (typeof error === 'string') {
			return formatMessage(error);
		}
		return fallback;
	}

	function handleUploadFailure(message: string, error?: unknown) {
		uploadError = message;
		if (error) {
			console.error(message, error);
		} else {
			console.error(message);
		}
		toastStore.error(message);
	}

	async function uploadImages(files: File[]) {
		if (isUploading || isSubmitting || files.length === 0) return;
		uploadError = '';
		if (existingMedia.length + queuedMedia.length + files.length > MAX_QUESTION_IMAGES) {
			handleUploadFailure(`A question can have up to ${MAX_QUESTION_IMAGES} images.`);
			return;
		}
		try {
			for (const file of files) validateQuestionImage(file.type, file.size);
		} catch (error) {
			handleUploadFailure(error instanceof Error ? error.message : 'Unsupported image.');
			return;
		}
		isUploading = true;
		try {
			for (const file of files) {
				uploadLabel = file.name;
				uploadProgress = 0;
				const uploadId = await uploadQuestionImage(
					client,
					moduleId as Id<'module'>,
					file,
					uploadController.signal,
					(percent) => {
						uploadProgress = percent;
					}
				);
				queuedMedia = [
					...queuedMedia,
					{
						uploadId,
						url: URL.createObjectURL(file),
						name: file.name,
						caption: '',
						showOnSolution: false
					}
				];
				onChange();
			}
		} catch (error) {
			if (!uploadController.signal.aborted)
				handleUploadFailure(error instanceof Error ? error.message : 'Image upload failed.');
		} finally {
			isUploading = false;
		}
	}

	function handleImageDrop(event: DragEvent) {
		event.preventDefault();
		isDraggingImage = false;
		void uploadImages(Array.from(event.dataTransfer?.files ?? []));
	}

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
		await uploadImages(files);
	}

	async function removeQueuedMedia(index: number) {
		const media = queuedMedia[index];
		if (!media || isSubmitting) return;
		await client
			.mutation(api.questionMediaUploads.discard, { uploadId: media.uploadId })
			.catch(() => {});
		URL.revokeObjectURL(media.url);
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
	let initialAddStatus: 'published' | 'draft' = $state('draft');
	let addSessionVersion = $state(0);
	let previousMode: 'add' | 'edit' | null = $state(null);
	let appliedEditorResetKey: string | null = $state(null);

	$effect(() => {
		const currentMode = mode;

		if (currentMode === 'add' && previousMode !== 'add') {
			initialAddStatus = defaultStatus;
			addSessionVersion += 1;
		}

		previousMode = currentMode;
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
	const editorResetKey = $derived(
		mode === 'add' ? `add:${addSessionVersion}` : `edit:${editingQuestion?._id ?? 'none'}`
	);
	const matchingRowIndexes = $derived.by(() =>
		Array.from(
			{ length: Math.max(matchingPrompts.length, matchingAnswers.length) },
			(_, index) => index
		)
	);

	$effect(() => {
		const resetKey = editorResetKey;
		if (appliedEditorResetKey === resetKey) return;
		appliedEditorResetKey = resetKey;

		const nextStem = getInitialQuestionStem();
		const nextRationale = getInitialQuestionRationale();
		const nextMatching = getInitialMatchingState();

		questionSource = editingQuestion?.metadata.source;
		questionStem = nextStem;
		questionRationale = nextRationale;
		questionStatus = getInitialQuestionStatus();
		questionType = getInitialQuestionType();
		options = getInitialOptions();
		correctAnswers = getInitialCorrectAnswers();
		fitbAnswers = getInitialFitbAnswers();
		matchingPrompts = nextMatching.prompts;
		matchingAnswers = nextMatching.answers;

		if ($editor && $editor.getHTML() !== nextStem) {
			$editor.commands.setContent(nextStem, { emitUpdate: false });
		}

		if ($rationaleEditor && $rationaleEditor.getHTML() !== nextRationale) {
			$rationaleEditor.commands.setContent(nextRationale, { emitUpdate: false });
		}
	});

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

	const questions = useQuery(api.question.getQuestionsByModule, () =>
		moduleId ? { id: moduleId as Id<'module'> } : 'skip'
	);

	function addOption() {
		if (
			questionType === QUESTION_TYPES.TRUE_FALSE ||
			questionType === QUESTION_TYPES.FILL_IN_THE_BLANK ||
			questionType === QUESTION_TYPES.MATCHING
		)
			return;
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

	function generateAIOptions() {
		window.open('/admin/question-studio', '_blank', 'noopener,noreferrer');
	}

	function removeOption(index: number) {
		if (
			questionType === QUESTION_TYPES.TRUE_FALSE ||
			questionType === QUESTION_TYPES.FILL_IN_THE_BLANK ||
			questionType === QUESTION_TYPES.MATCHING
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
		onChange();
	}

	function toggleCorrectAnswer(index: number) {
		const indexStr = index.toString();
		if (
			questionType === QUESTION_TYPES.FILL_IN_THE_BLANK ||
			questionType === QUESTION_TYPES.MATCHING
		)
			return;
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
		if (isUploading || isSubmitting) return;
		saveError = null;
		isRationaleError = false;

		if (!questionStem || !moduleId) {
			toastStore.error('Question stem is required');
			return;
		}

		if (!getRationalePlainText(questionRationale)) {
			saveError =
				'Add a rationale before saving this question. Rationales help students understand why the answer is correct and are now required for all questions.';
			isRationaleError = true;
			toastStore.error('Add a rationale before saving this question.');
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

			const promptOptions = rawPrompts.map((text) => {
				const full = `prompt:${text}`;
				return {
					text: full
				};
			});
			const answersOffset = promptOptions.length;
			const answerOptions = rawAnswers.map((text) => {
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
			const images = queuedMedia.map((media) => ({
				uploadId: media.uploadId,
				altText: media.name ?? '',
				caption: media.caption,
				showOnSolution: media.showOnSolution
			}));

			if (mode === 'edit' && editingQuestion) {
				await client.mutation(api.question.updateQuestion, {
					images,
					source: questionSource ?? null,
					questionId: editingQuestion._id as Id<'question'>,
					moduleId: moduleId as Id<'module'>,
					type: questionType,
					stem: questionStem,
					options: cleanOptions,
					correctAnswers,
					rationale: questionRationale || '',
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
					images,
					source: questionSource,
					moduleId: moduleId as Id<'module'>,
					type: questionType,
					stem: questionStem,
					options: cleanOptions.map((opt) => ({ text: opt.text })),
					correctAnswers,
					rationale: questionRationale || '',
					aiGenerated: false,
					status: questionStatus.toLowerCase(),
					order: nextOrder,
					metadata: {},
					updatedAt: Date.now(),
					createdBy
				});
			}

			for (const media of queuedMedia) URL.revokeObjectURL(media.url);
			queuedMedia = [];

			toastStore.success(mode === 'edit' ? 'Question saved' : 'Question created');
			onSave(mode === 'add' ? questionId : undefined);
		} catch (error) {
			const message = getErrorMessage(error);
			console.error('Failed to save question', error);
			saveError = message;
			isRationaleError = false;
			toastStore.error(message);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="h-full flex flex-col overflow-hidden bg-base-100">
	<!-- Top Bar: Title & Actions -->
	<div
		class="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-100 shrink-0"
	>
		<h3 class="text-base font-semibold">{mode === 'edit' ? 'Edit Question' : 'New Question'}</h3>
		<div class="flex items-center gap-2">
			<button
				class="btn btn-sm btn-ghost rounded-full"
				onclick={onCancel}
				disabled={isSubmitting || isUploading}>Cancel</button
			>
			<button
				class="btn btn-sm btn-primary rounded-full gap-2"
				onclick={handleSubmit}
				disabled={isSubmitting || isUploading || !canSubmit}
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

	{#if saveError}
		<div class="px-4 py-3 border-b border-error/20 bg-error/10 text-sm text-error">
			<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
				<span>{saveError}</span>
				{#if isRationaleError}
					<a class="link font-semibold" href={rationaleDocsUrl} target="_blank" rel="noreferrer">
						Why rationales are required
					</a>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Toolbar: Type & Status -->
	<div
		class="flex flex-wrap items-center gap-8 px-6 py-4 border-b border-base-300 bg-base-200/30 shrink-0"
	>
		<!-- Type Selector -->
		<div class="flex flex-col gap-2">
			<span class="text-[10px] font-bold text-base-content/40 uppercase tracking-wider ml-1"
				>Type</span
			>
			<div class="flex shadow-xs bg-base-100 rounded-full border border-base-300 p-1 gap-0.5">
				{#each questionTypeOptions as option (option.value)}
					<button
						class="btn btn-xs sm:btn-sm rounded-full border-0 {questionType === option.value
							? 'btn-active font-medium'
							: 'btn-ghost opacity-60 hover:opacity-100 font-normal'}"
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
			<span class="text-[10px] font-bold text-base-content/70 uppercase tracking-wider ml-1"
				>Status</span
			>
			<div
				class="flex flex-wrap gap-1 rounded-2xl border border-base-300 bg-base-100 p-1 shadow-xs"
			>
				{#each statusOptions as option (option.value)}
					<button
						type="button"
						aria-pressed={questionStatus === option.value}
						class="btn btn-sm rounded-full border-0 px-3 font-semibold {questionStatus ===
						option.value
							? option.colorClass
							: 'btn-ghost text-base-content'}"
						onclick={() => {
							questionStatus = option.value;
							onChange();
						}}
						title={option.label}
					>
						<option.icon size={16} />
						<span>{option.label}</span>
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
					<label
						class="text-xs font-semibold uppercase tracking-wide text-base-content/60 flex items-center gap-2"
					>
						<MessageSquare size={14} /> Question
					</label>
					<span class="text-[10px] text-base-content/40 font-medium hidden sm:inline"
						>Ctrl + S to save</span
					>
				</div>
				<div
					class="border border-base-300 rounded-2xl overflow-hidden bg-base-100 shadow-xs group focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all"
				>
					{#if editor}
						<div
							class="bg-base-200/50 border-b border-base-300 p-1 flex gap-1 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
						>
							{#each menuItems as item (item.name)}
								<button
									type="button"
									class="btn btn-ghost btn-xs btn-square {item.active()
										? 'btn-active text-primary'
										: ''}"
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
							<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60">
								Accepted Answers
							</div>
							<button
								class="btn btn-xs btn-ghost gap-1"
								onclick={generateAIOptions}
								title="Create source-grounded questions in Question Studio"
							>
								{#if isGeneratingAI}
									<Loader2 size={12} class="animate-spin" />
								{:else}
									<Sparkles size={12} />
								{/if}
								<span class="hidden sm:inline">Question Studio</span>
							</button>
						</div>
						<div
							class="card bg-base-100 border border-base-300 shadow-xs rounded-3xl overflow-hidden"
						>
							<div class="card-body p-4 gap-4">
								{#each fitbAnswers as row, index (index)}
									<div class="flex flex-col sm:flex-row gap-3 items-start">
										<div class="flex-1 w-full">
											<div class="flex items-center gap-2 mb-1">
												<span
													class="badge badge-sm {index === 0 ? 'badge-success' : 'badge-ghost'}"
												>
													{index === 0 ? 'Primary' : 'Alt'}
												</span>
												{#if fitbAnswers.length > 1}
													<button
														class="btn btn-ghost btn-xs text-error ml-auto sm:hidden"
														onclick={() => removeFitbRow(index)}
													>
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
												{#each Object.entries(FITB_MODE_LABELS) as [mode, label] (mode)}
													<option value={mode}>{label}</option>
												{/each}
											</select>
											<div
												class="flex items-center rounded-full border border-base-300 p-0.5 gap-0.5"
											>
												<button
													class="btn btn-sm rounded-full border-0 {row.flags.ignorePunct
														? 'btn-active'
														: 'btn-ghost'}"
													onclick={() => toggleFitbFlag(index, 'ignorePunct')}
													title="Ignore Punctuation"
												>
													Punct
												</button>
												<button
													class="btn btn-sm rounded-full border-0 {row.flags.normalizeWs
														? 'btn-active'
														: 'btn-ghost'}"
													onclick={() => toggleFitbFlag(index, 'normalizeWs')}
													title="Normalize Whitespace"
												>
													Space
												</button>
											</div>
											{#if fitbAnswers.length > 1}
												<button
													class="btn btn-ghost btn-sm btn-square text-error hidden sm:flex"
													onclick={() => removeFitbRow(index)}
												>
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
						<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2">
							Matching Pairs
						</div>
						<div class="space-y-3">
							{#each matchingRowIndexes as i (i)}
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
											<div
												class="h-12 w-full rounded-3xl border border-dashed border-base-300 bg-base-100/50 flex items-center justify-center text-xs text-base-content/30 italic"
											>
												Distractor (No Prompt)
											</div>
										{/if}
									</div>

									<!-- Center: Arrow -->
									<div class="text-base-content/30 rotate-90 sm:rotate-0 w-5 flex justify-center">
										{#if i < matchingPrompts.length && i < matchingAnswers.length}
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M13 7l5 5m0 0l-5 5m5-5H6"
												/>
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
											<div
												class="h-12 w-full rounded-3xl border border-dashed border-base-300 bg-base-100/50 flex items-center justify-center text-xs text-base-content/30 italic"
											>
												No Answer
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
							<div class="flex justify-center sm:justify-start">
								<button
									class="btn btn-sm btn-outline gap-2 w-full sm:w-auto"
									onclick={addMatchingPrompt}
								>
									<Plus size={14} /> Add Prompt
								</button>
							</div>
							<div class="flex justify-center sm:justify-end">
								<button
									class="btn btn-sm btn-outline gap-2 w-full sm:w-auto"
									onclick={addMatchingAnswer}
								>
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
								<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60">
									Options
								</div>
								<span class="text-[10px] text-base-content/40 font-medium hidden sm:inline"
									>Ctrl + Enter to toggle correct</span
								>
							</div>
							<div class="flex items-center gap-1">
								{#if questionType === QUESTION_TYPES.MULTIPLE_CHOICE}
									<button
										class="btn btn-xs btn-ghost gap-1"
										onclick={generateAIOptions}
										title={canGenerateAI()
											? 'Generate distractor options with AI'
											: 'Add stem and correct answer first'}
									>
										{#if isGeneratingAI}
											<Loader2 size={12} class="animate-spin" />
										{:else}
											<Sparkles size={12} />
										{/if}
										<span class="hidden sm:inline">Question Studio</span>
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
									<div
										class="flex items-center rounded-full border-2 transition-colors bg-base-100 pl-3 pr-2 py-1 {correctAnswers.includes(
											index.toString()
										)
											? 'border-success bg-success/5'
											: 'border-base-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'}"
									>
										<input
											type="checkbox"
											class="checkbox checkbox-sm {correctAnswers.includes(index.toString())
												? 'checkbox-success'
												: 'checkbox-primary'}"
											checked={correctAnswers.includes(index.toString())}
											onclick={() => toggleCorrectAnswer(index)}
											tabindex={-1}
										/>
										<span class="font-semibold text-sm ml-3 text-base-content/50 select-none w-6"
											>{String.fromCharCode(65 + index)}.</span
										>
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
							<button
								class="btn btn-sm btn-ghost gap-2 w-full border-2 border-dashed border-base-300 hover:border-primary hover:text-primary mt-2"
								onclick={addOption}
							>
								<Plus size={14} /> Add Option
							</button>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Rationale & Attachments -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-base-200">
				<div>
					<div
						class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-1 flex items-center gap-2"
					>
						<MessageSquare size={14} /> Rationale
					</div>
					<p class="text-[10px] text-base-content/40 mb-2">
						Required for every saved question.
						<a class="link" href={rationaleDocsUrl} target="_blank" rel="noreferrer"> Why? </a>
					</p>
					<div class="border border-base-300 rounded-2xl overflow-hidden bg-base-100 group">
						{#if rationaleEditor}
							<EditorContent editor={$rationaleEditor} />
							<div
								class="bg-base-200/50 border-t border-base-300 p-1 flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity"
							>
								{#each rationaleMenuItems as item (item.name)}
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
					{#if editingQuestion?.aiGenerated && !questionSource}
						<QuestionSources source={editingQuestion?.metadata?.generation} editing />
					{/if}
					{#key editorResetKey}
						<QuestionSourceEditor
							moduleId={moduleId as Id<'module'>}
							bind:source={questionSource}
							{onChange}
							disabled={isSubmitting}
						/>
					{/key}
				</div>

				<div>
					<div
						class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2 flex items-center gap-2"
					>
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
												onblur={() =>
													commitExistingMediaChange(
														m._id,
														m.altText,
														m.caption || '',
														m.showOnSolution
													)}
											/>
											<input
												class="input input-bordered input-sm w-full"
												placeholder="Caption (optional)"
												bind:value={m.caption}
												onblur={() =>
													commitExistingMediaChange(
														m._id,
														m.altText,
														m.caption || '',
														m.showOnSolution
													)}
											/>
											<label class="label cursor-pointer gap-2 text-xs p-0 justify-start">
												<input
													type="checkbox"
													class="checkbox checkbox-xs"
													bind:checked={m.showOnSolution}
													onchange={() =>
														commitExistingMediaChange(
															m._id,
															m.altText,
															m.caption || '',
															m.showOnSolution
														)}
												/>
												<span>Show on rationale</span>
											</label>
										</div>
									</div>
								{/each}

								<!-- Queued Media -->
								{#each queuedMedia as m, idx (idx)}
									<div
										class="border border-primary/50 rounded-2xl overflow-hidden bg-base-100 relative"
									>
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

						<label
							class="relative min-h-36 w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-4 {isDraggingImage
								? 'border-primary bg-primary/10'
								: 'border-base-300 bg-base-100/50'} {isUploading || isSubmitting
								? 'opacity-60'
								: 'cursor-pointer hover:border-primary'}"
							ondragover={(event) => {
								event.preventDefault();
								isDraggingImage = true;
							}}
							ondragleave={() => {
								isDraggingImage = false;
							}}
							ondrop={handleImageDrop}
						>
							<ImageIcon size={24} class="text-base-content/50" />
							<span class="mt-2 text-sm font-semibold"
								>{isUploading
									? uploadProgress === 100
										? 'Checking image…'
										: `Uploading ${uploadProgress}%`
									: 'Add images'}</span
							>
							<span class="mt-1 text-xs text-base-content/60"
								>{isUploading ? uploadLabel : 'Browse, drag & drop, or paste an image'}</span
							>
							<span class="mt-1 text-xs text-base-content/50"
								>PNG, JPEG, WebP, GIF · 8 MB each · up to {MAX_QUESTION_IMAGES} images</span
							>
							<input
								type="file"
								class="absolute inset-0 opacity-0 cursor-pointer"
								aria-label="Upload question images"
								accept={QUESTION_IMAGE_ACCEPT}
								multiple
								disabled={isUploading || isSubmitting}
								onchange={(event) => {
									void uploadImages(Array.from(event.currentTarget.files ?? []));
									event.currentTarget.value = '';
								}}
							/>
						</label>
						{#if uploadError}<p class="text-sm text-error" role="alert">{uploadError}</p>{/if}
						<p class="text-xs text-base-content/50">
							Images appear in the quiz attachments viewer. Select “Show on rationale” for images
							that should be revealed with the explanation. Save the question to keep new images.
						</p>
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
