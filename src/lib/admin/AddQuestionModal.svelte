<script lang="ts">
	let { isAddModalOpen, closeAddModal, moduleId } = $props();

	import {
		X,
		MessageSquare,
		Hash,
		ListChecks,
		Lightbulb,
		Bold,
		Italic,
		Type,
		FileText,
		CheckCircle,
		Archive,
		CheckSquare,
		ToggleLeft,
		Edit3,
		Underline as UnderlineIcon,
		Strikethrough as StrikethroughIcon,
		Code as CodeIcon,
		Quote as QuoteIcon,
		List as ListIcon,
		ListOrdered as ListOrderedIcon,
		Link as LinkIcon,
		Highlighter as HighlighterIcon
	} from 'lucide-svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id } from '../../convex/_generated/dataModel';
	import { QUESTION_TYPES } from '../types';
	import { createUploader } from '$lib/utils/uploadthing';
	import { UploadDropzone } from '@uploadthing/svelte';
	import { onMount } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { createEditor, Editor, EditorContent } from 'svelte-tiptap';
	import { getEditorExtensions } from '../config/tiptap';
	import { useClerkContext } from 'svelte-clerk';

	const clerk = useClerkContext();
	const clerkUser = $derived(clerk.user);

	let editor = $state() as Readable<Editor>;
	let explanationEditor = $state() as Readable<Editor>;

	onMount(() => {
		editor = createEditor({
			extensions: getEditorExtensions(),
			content: questionStem || '',
			editorProps: {
				attributes: {
					class: 'prose prose-sm max-w-none focus:outline-none min-h-12 p-3'
				}
			}
		});

		explanationEditor = createEditor({
			extensions: getEditorExtensions(),
			content: questionExplanation || '',
			editorProps: {
				attributes: {
					class: 'prose prose-sm max-w-none focus:outline-none min-h-24 p-3'
				}
			}
		});
	});

	// Toolbar functions
	const toggleBold = () => {
		$editor.chain().focus().toggleBold().run();
	};

	const toggleItalic = () => {
		$editor.chain().focus().toggleItalic().run();
	};

	const toggleUnderline = () => {
		$editor.chain().focus().toggleUnderline().run();
	};

	const toggleStrike = () => {
		$editor.chain().focus().toggleStrike().run();
	};

	const toggleCode = () => {
		$editor.chain().focus().toggleCode().run();
	};

	const toggleBlockquote = () => {
		$editor.chain().focus().toggleBlockquote().run();
	};

	const toggleBulletList = () => {
		$editor.chain().focus().toggleBulletList().run();
	};

	const toggleOrderedList = () => {
		$editor.chain().focus().toggleOrderedList().run();
	};

	const setLink = () => {
		const url = prompt('Enter URL:');
		if (url) {
			$editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
		}
	};

	const unsetLink = () => {
		$editor.chain().focus().extendMarkRange('link').unsetLink().run();
	};

	const toggleHighlight = () => {
		$editor.chain().focus().toggleHighlight().run();
	};

	const setParagraph = () => {
		$editor.chain().focus().setParagraph().run();
	};

	const isActive = (name: string, attrs = {}) => $editor?.isActive(name, attrs) ?? false;

	const menuItems = $derived([
		{
			name: 'bold',
			command: toggleBold,
			icon: Bold,
			active: () => isActive('bold')
		},
		{
			name: 'italic',
			command: toggleItalic,
			icon: Italic,
			active: () => isActive('italic')
		},
		{
			name: 'underline',
			command: toggleUnderline,
			icon: UnderlineIcon,
			active: () => isActive('underline')
		},
		{
			name: 'strike',
			command: toggleStrike,
			icon: StrikethroughIcon,
			active: () => isActive('strike')
		},
		{
			name: 'code',
			command: toggleCode,
			icon: CodeIcon,
			active: () => isActive('code')
		},
		{
			name: 'highlight',
			command: toggleHighlight,
			icon: HighlighterIcon,
			active: () => isActive('highlight')
		},
		{
			name: 'link',
			command: isActive('link') ? unsetLink : setLink,
			icon: LinkIcon,
			active: () => isActive('link')
		},
		{
			name: 'blockquote',
			command: toggleBlockquote,
			icon: QuoteIcon,
			active: () => isActive('blockquote')
		},
		{
			name: 'bullet-list',
			command: toggleBulletList,
			icon: ListIcon,
			active: () => isActive('bulletList')
		},
		{
			name: 'ordered-list',
			command: toggleOrderedList,
			icon: ListOrderedIcon,
			active: () => isActive('orderedList')
		},
		{
			name: 'paragraph',
			command: setParagraph,
			icon: Type,
			active: () => isActive('paragraph')
		}
	]);

	const questionTypeOptions = $derived([
		{
			value: QUESTION_TYPES.MULTIPLE_CHOICE,
			label: 'Multiple Choice',
			icon: CheckSquare
		},
		{
			value: QUESTION_TYPES.TRUE_FALSE,
			label: 'True/False',
			icon: ToggleLeft
		},
		{
			value: QUESTION_TYPES.FILL_IN_THE_BLANK,
			label: 'Fill in the Blank',
			icon: Edit3
		},
		{
			value: QUESTION_TYPES.MATCHING,
			label: 'Matching',
			icon: ListChecks
		}
	]);

	const statusOptions = $derived([
		{
			value: 'published',
			label: 'Published',
			icon: CheckCircle,
			colorClass: 'btn-success btn-soft'
		},
		{
			value: 'draft',
			label: 'Draft',
			icon: FileText,
			colorClass: 'btn-info btn-soft'
		},
		{
			value: 'archived',
			label: 'Archived',
			icon: Archive,
			colorClass: 'btn-error btn-soft'
		}
	]);

	// Explanation editor toolbar functions
	const toggleExplanationBold = () => {
		$explanationEditor.chain().focus().toggleBold().run();
	};

	const toggleExplanationItalic = () => {
		$explanationEditor.chain().focus().toggleItalic().run();
	};

	const toggleExplanationUnderline = () => {
		$explanationEditor.chain().focus().toggleUnderline().run();
	};

	const toggleExplanationStrike = () => {
		$explanationEditor.chain().focus().toggleStrike().run();
	};

	const toggleExplanationCode = () => {
		$explanationEditor.chain().focus().toggleCode().run();
	};

	const toggleExplanationBlockquote = () => {
		$explanationEditor.chain().focus().toggleBlockquote().run();
	};

	const toggleExplanationBulletList = () => {
		$explanationEditor.chain().focus().toggleBulletList().run();
	};

	const toggleExplanationOrderedList = () => {
		$explanationEditor.chain().focus().toggleOrderedList().run();
	};

	const setExplanationLink = () => {
		const url = prompt('Enter URL:');
		if (url) {
			$explanationEditor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
		}
	};

	const unsetExplanationLink = () => {
		$explanationEditor.chain().focus().extendMarkRange('link').unsetLink().run();
	};

	const toggleExplanationHighlight = () => {
		$explanationEditor.chain().focus().toggleHighlight().run();
	};

	const setExplanationParagraph = () => {
		$explanationEditor.chain().focus().setParagraph().run();
	};

	const isExplanationActive = (name: string, attrs = {}) =>
		$explanationEditor?.isActive(name, attrs) ?? false;

	const explanationMenuItems = $derived([
		{
			name: 'bold',
			command: toggleExplanationBold,
			icon: Bold,
			active: () => isExplanationActive('bold')
		},
		{
			name: 'italic',
			command: toggleExplanationItalic,
			icon: Italic,
			active: () => isExplanationActive('italic')
		},
		{
			name: 'underline',
			command: toggleExplanationUnderline,
			icon: UnderlineIcon,
			active: () => isExplanationActive('underline')
		},
		{
			name: 'strike',
			command: toggleExplanationStrike,
			icon: StrikethroughIcon,
			active: () => isExplanationActive('strike')
		},
		{
			name: 'code',
			command: toggleExplanationCode,
			icon: CodeIcon,
			active: () => isExplanationActive('code')
		},
		{
			name: 'highlight',
			command: toggleExplanationHighlight,
			icon: HighlighterIcon,
			active: () => isExplanationActive('highlight')
		},
		{
			name: 'link',
			command: isExplanationActive('link') ? unsetExplanationLink : setExplanationLink,
			icon: LinkIcon,
			active: () => isExplanationActive('link')
		},
		{
			name: 'blockquote',
			command: toggleExplanationBlockquote,
			icon: QuoteIcon,
			active: () => isExplanationActive('blockquote')
		},
		{
			name: 'bullet-list',
			command: toggleExplanationBulletList,
			icon: ListIcon,
			active: () => isExplanationActive('bulletList')
		},
		{
			name: 'ordered-list',
			command: toggleExplanationOrderedList,
			icon: ListOrderedIcon,
			active: () => isExplanationActive('orderedList')
		},
		{
			name: 'paragraph',
			command: setExplanationParagraph,
			icon: Type,
			active: () => isExplanationActive('paragraph')
		}
	]);

	// Update questionStem and questionStemText when editor content changes
	$effect(() => {
		if ($editor) {
			const updateStem = () => {
				questionStem = $editor.getHTML();
				questionStemText = $editor.getText();
			};
			$editor.on('update', updateStem);
			return () => $editor.off('update', updateStem);
		}
	});

	// Update questionExplanation and questionExplanationText when explanation editor content changes
	$effect(() => {
		if ($explanationEditor) {
			const updateExplanation = () => {
				questionExplanation = $explanationEditor.getHTML();
				questionExplanationText = $explanationEditor.getText();
			};
			$explanationEditor.on('update', updateExplanation);
			return () => $explanationEditor.off('update', updateExplanation);
		}
	});

	const client = useConvexClient();

	let questionStem: string = $state('');
	let questionStemText: string = $state('');
	let questionExplanation: string = $state('');
	let questionExplanationText: string = $state('');
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

	// Matching editor state (two-column UI)
	let matchingPrompts: string[] = $state(['', '']);
	let matchingAnswers: string[] = $state(['', '']);

	function addMatchingPrompt() {
		matchingPrompts = [...matchingPrompts, ''];
	}
	function removeMatchingPrompt(index: number) {
		if (matchingPrompts.length <= 1) return;
		matchingPrompts = matchingPrompts.filter((_, i) => i !== index);
	}
	function addMatchingAnswer() {
		matchingAnswers = [...matchingAnswers, ''];
	}
	function removeMatchingAnswer(index: number) {
		if (matchingAnswers.length <= 1) return;
		matchingAnswers = matchingAnswers.filter((_, i) => i !== index);
	}

	// Function to safely update media state
	function addMediaItem(mediaItem: (typeof queuedMedia)[0]) {
		queuedMedia = [...queuedMedia, mediaItem];
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

	const questions = useQuery(api.question.getQuestionsByModule, {
		id: moduleId as Id<'module'>
	});

	function addOption() {
		if (
			questionType === QUESTION_TYPES.TRUE_FALSE ||
			questionType === QUESTION_TYPES.FILL_IN_THE_BLANK ||
			questionType === QUESTION_TYPES.MATCHING
		)
			return;
		options = [...options, { text: '' }];
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
			return;
		}
		if (correctAnswers.includes(indexStr)) {
			correctAnswers = correctAnswers.filter((id) => id !== indexStr);
		} else {
			correctAnswers = [...correctAnswers, indexStr];
		}
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
		const oldCorrect = new Set(correctAnswers.map((s) => parseInt(s)));
		const nextOptions = pairs.map((p) => ({ text: p.opt.text }));
		const nextCorrect: string[] = [];
		pairs.forEach((p, newIndex) => {
			if (oldCorrect.has(p.idx)) nextCorrect.push(newIndex.toString());
		});
		options = nextOptions;
		correctAnswers = nextCorrect;
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
				return { id: makeOptionId(questionStem, full, i), text: full };
			});
			const answersOffset = promptOptions.length;
			const answerOptions = rawAnswers.map((text, i) => {
				const full = `answer:${text}`;
				return { id: makeOptionId(questionStem, full, answersOffset + i), text: full };
			});

			const n = Math.min(promptOptions.length, answerOptions.length);
			const mappings = Array.from(
				{ length: n },
				(_, i) => `${promptOptions[i].id}::${answerOptions[i].id}`
			);

			const nextOrder = questions.data?.length
				? Math.max(...questions.data.map((q) => q.order || 0)) + 1
				: 0;

		isSubmitting = true;
		try {
			const questionId = await client.mutation(api.question.createQuestion, {
				moduleId: moduleId as Id<'module'>,
				type: QUESTION_TYPES.MATCHING,
				stem: questionStem,
				options: [...promptOptions, ...answerOptions],
				correctAnswers: mappings,
				explanation: questionExplanation || '',
				aiGenerated: false,
				status: questionStatus.toLowerCase(),
				order: nextOrder,
				metadata: {},
				updatedAt: Date.now()
			});

				if (questionId && queuedMedia.length > 0) {
					for (let i = 0; i < queuedMedia.length; i++) {
						const m = queuedMedia[i];
						await client.mutation((api as any).questionMedia.create, {
							questionId: questionId as Id<'question'>,
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

				questionStem = '';
				questionStemText = '';
				questionExplanation = '';
				questionExplanationText = '';
				questionStatus = 'draft';
				questionType = 'multiple_choice';
				options = [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
				correctAnswers = [];
				queuedMedia = [];
				matchingPrompts = ['', ''];
				matchingAnswers = ['', ''];
				if ($editor) {
					$editor.commands.setContent('');
				}
				if ($explanationEditor) {
					$explanationEditor.commands.setContent('');
				}
				closeAddModal();
				return;
			} catch (error) {
				console.error('Failed to create matching question', error);
			} finally {
				isSubmitting = false;
			}
		}

		const filledOptions = options.filter((opt) => opt.text.trim());

		if (questionType === QUESTION_TYPES.TRUE_FALSE) {
			if (filledOptions.length !== 2) return;
			if (correctAnswers.length !== 1) return;
		} else if (questionType === QUESTION_TYPES.MULTIPLE_CHOICE) {
			if (filledOptions.length < 2) return;
		} else if (questionType === QUESTION_TYPES.MATCHING) {
			const hasPrompt = filledOptions.some((o) => o.text.startsWith('prompt:'));
			const numAnswers = filledOptions.filter((o) => !o.text.startsWith('prompt:')).length;
			if (!hasPrompt || numAnswers === 0) return;
		}

		isSubmitting = true;

		try {
			const nextOrder = questions.data?.length
				? Math.max(...questions.data.map((q) => q.order || 0)) + 1
				: 0;

		const filteredCorrectAnswers = correctAnswers
			.map((index) => parseInt(index))
			.filter((index) => index < filledOptions.length)
			.map((index) => index.toString());

		const createdBy =
			clerkUser?.firstName && clerkUser?.lastName
				? {
						firstName: clerkUser.firstName,
						lastName: clerkUser.lastName
					}
				: undefined;

		const questionId = await client.mutation(api.question.insertQuestion, {
			moduleId: moduleId as Id<'module'>,
			type: questionType,
			stem: questionStem,
			options: filledOptions,
			correctAnswers: filteredCorrectAnswers,
			explanation: questionExplanation || '',
			aiGenerated: false,
			status: questionStatus.toLowerCase(),
			order: nextOrder,
			metadata: {},
			updatedAt: Date.now(),
			createdBy
		});

			if (questionId && queuedMedia.length > 0) {
				for (let i = 0; i < queuedMedia.length; i++) {
					const m = queuedMedia[i];
					await client.mutation((api as any).questionMedia.create, {
						questionId: questionId as Id<'question'>,
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

			questionStem = '';
			questionStemText = '';
			questionExplanation = '';
			questionExplanationText = '';
			questionStatus = 'draft';
			questionType = 'multiple_choice';
			options = [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
			correctAnswers = [];
			queuedMedia = [];
			// Reset editor content
			if ($editor) {
				$editor.commands.setContent('');
			}
			if ($explanationEditor) {
				$explanationEditor.commands.setContent('');
			}
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

		<div class="mb-8 mt-6 flex items-center gap-2">
			<h3 class="text-2xl font-extrabold tracking-tight">Add New Question</h3>
		</div>

		<!-- Question Controls -->
		<div class="space-y-4 mb-6">
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<label for="question-stem" class="font-semibold flex items-center gap-2 text-sm">
						<MessageSquare size={16} class="text-primary/80" />
						Question
					</label>
					<div class="border border-base-300 rounded-lg overflow-hidden">
						<div class="bg-base-200 border-b border-base-300 p-2 flex gap-1">
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
					<label for="question-type" class="font-semibold flex items-center gap-2 text-sm">
						<Hash size={16} class="text-primary/80" />
						Type
					</label>
					<div class="join join-vertical sm:join-horizontal w-full">
						{#each questionTypeOptions as option (option.value)}
							<label
								class="join-item btn flex-1 gap-2 px-3 py-2 text-sm {questionType === option.value
									? 'btn-active'
									: ''}"
							>
								<input
									type="radio"
									name="question-type"
									class="hidden"
									value={option.value}
									bind:group={questionType}
									onchange={handleTypeChange}
								/>
								<option.icon size={14} />
								{option.label}
							</label>
						{/each}
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<label for="question-status" class="font-semibold flex items-center gap-2 text-sm">
						<Hash size={16} class="text-primary/80" />
						Status
					</label>
					<div class="join join-vertical sm:join-horizontal w-full">
						{#each statusOptions as option (option.value)}
							<label
								class="join-item btn flex-1 gap-2 px-3 py-2 text-sm {option.colorClass} {questionStatus ===
								option.value
									? 'btn-active'
									: ''}"
							>
								<input
									type="radio"
									name="question-status"
									class="hidden"
									value={option.value}
									bind:group={questionStatus}
								/>
								<option.icon size={14} />
								{option.label}
							</label>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<div class="space-y-6">
			<!-- Options & Answers -->
			<div class="card bg-base-200/50 border border-base-300">
				<div class="card-body">
					<h6 class="font-semibold mb-4 flex items-center gap-2 text-sm">
						<ListChecks size={16} class="text-primary/80" />
						Options & Answers
					</h6>

					{#if questionType === QUESTION_TYPES.FILL_IN_THE_BLANK}
						<div class="space-y-4">
							{#each fitbAnswers as row, index (index)}
								<div class="p-3 rounded-lg border border-base-300 bg-base-100">
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
											{#each Object.entries(FITB_MODE_LABELS) as [value, label] (value)}
												<option {value}>{label}</option>
											{/each}
										</select>
									</div>
									<div class="flex items-center gap-4 mt-3">
										<label class="label cursor-pointer gap-2 text-sm">
											<input
												type="checkbox"
												class="checkbox checkbox-sm"
												checked={row.flags.ignorePunct}
												onchange={() => toggleFitbFlag(index, 'ignorePunct')}
											/>
											<span>Ignore Punctuation</span>
										</label>
										<label class="label cursor-pointer gap-2 text-sm">
											<input
												type="checkbox"
												class="checkbox checkbox-sm"
												checked={row.flags.normalizeWs}
												onchange={() => toggleFitbFlag(index, 'normalizeWs')}
											/>
											<span>Normalize Whitespace</span>
										</label>
										<div class="flex-grow"></div>
										{#if fitbAnswers.length > 1}
											<button
												class="btn btn-ghost btn-sm btn-circle"
												onclick={() => removeFitbRow(index)}
											>
												<X size={16} />
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
												class="input input-bordered flex-1"
												placeholder="Prompt {i + 1}"
												value={p}
												oninput={(e) =>
													(matchingPrompts = matchingPrompts.map((v, idx) =>
														idx === i ? (e.target as HTMLInputElement).value : v
													))}
											/>
											{#if matchingPrompts.length > 1}
												<button
													class="btn btn-ghost btn-sm btn-circle"
													onclick={() => removeMatchingPrompt(i)}
												>
													<X size={16} />
												</button>
											{/if}
										</div>
									{/each}
									<button class="btn btn-sm btn-outline" type="button" onclick={addMatchingPrompt}
										>Add Prompt</button
									>
								</div>
							</div>
							<div>
								<h6 class="text-sm font-semibold mb-2">Possible Answers</h6>
								<div class="space-y-3">
									{#each matchingAnswers as a, i (i)}
										<div class="flex items-center gap-2">
											<input
												class="input input-bordered flex-1"
												placeholder="Answer {i + 1}"
												value={a}
												oninput={(e) =>
													(matchingAnswers = matchingAnswers.map((v, idx) =>
														idx === i ? (e.target as HTMLInputElement).value : v
													))}
											/>
											{#if matchingAnswers.length > 1}
												<button
													class="btn btn-ghost btn-sm btn-circle"
													onclick={() => removeMatchingAnswer(i)}
												>
													<X size={16} />
												</button>
											{/if}
										</div>
									{/each}
									<button class="btn btn-sm btn-outline" type="button" onclick={addMatchingAnswer}
										>Add Answer</button
									>
								</div>
							</div>
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
										class="input input-bordered flex-1 rounded-lg"
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
								<div class="flex items-center gap-2">
									<button type="button" class="btn btn-sm btn-outline" onclick={addOption}>
										Add Option
									</button>
									<button type="button" class="btn btn-sm btn-outline" onclick={shuffleOptions}>
										Shuffle Options
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Explanation -->
			<div class="card bg-base-200/50 border border-base-300">
				<div class="card-body">
					<h6 class="font-semibold mb-4 flex items-center gap-2 text-sm">
						<Lightbulb size={16} class="text-primary/80" />
						Explanation
					</h6>
					<div class="border border-base-300 rounded-lg overflow-hidden">
						<div class="bg-base-200 border-b border-base-300 p-2 flex gap-1">
							{#each explanationMenuItems as item (item.name)}
								<button
									type="button"
									class="btn btn-ghost btn-sm gap-1 {item.active() ? 'btn-active' : ''}"
									onclick={item.command}
									title={item.name}
								>
									<item.icon size={16} />
								</button>
							{/each}
						</div>
						<EditorContent editor={$explanationEditor} class="min-h-24" />
					</div>
				</div>
			</div>
		</div>

		<!-- Media Upload -->
		<div class="card bg-base-200/50 border border-base-300">
			<div class="card-body">
				<h6 class="font-semibold mb-4 text-sm">Attachments</h6>
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
									/>
									<label class="label cursor-pointer gap-2 text-sm">
										<input
											type="checkbox"
											class="checkbox checkbox-sm"
											bind:checked={m.showOnSolution}
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
