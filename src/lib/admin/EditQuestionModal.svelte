<script lang="ts">
	let { isEditModalOpen, closeEditModal, editingQuestion, moduleId } = $props();

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
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id } from '../../convex/_generated/dataModel';
	import { DISPLAY_QUESTION_TYPES, QUESTION_TYPES } from '../types';
	import { createUploader } from '$lib/utils/uploadthing';
	import { UploadDropzone } from '@uploadthing/svelte';
	import { onMount } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { createEditor, Editor, EditorContent } from 'svelte-tiptap';
	import { getEditorExtensions } from '../config/tiptap';

	const client = useConvexClient();

	let editor = $state() as Readable<Editor>;
	let explanationEditor = $state() as Readable<Editor>;

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
		showOnSolution?: boolean;
	}> = $state([]);

	// Track which question we've populated to avoid repopulating
	let populatedQuestionId: string = $state('');
	let populatedFormId: string = $state('');

	onMount(() => {
		editor = createEditor({
			extensions: getEditorExtensions(),
			content: '',
			editorProps: {
				attributes: {
					class: 'prose prose-sm max-w-none focus:outline-none min-h-12 p-3'
				}
			}
		});

		explanationEditor = createEditor({
			extensions: getEditorExtensions(),
			content: '',
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
					showOnSolution: false,
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

	async function saveMediaMeta(id: string, alt: string, caption: string, showOnSolution?: boolean) {
		await client.mutation((api as any).questionMedia.update, {
			mediaId: id,
			altText: alt,
			caption,
			showOnSolution
		});
		await refreshMedia();
	}

	function handleMediaMetaChange(
		id: string,
		alt: string,
		caption: string,
		showOnSolution?: boolean
	) {
		saveMediaMeta(id, alt, caption, showOnSolution);
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
	// Matching caches
	let matchingPrompts: string[] = $state(['']);
	let matchingAnswers: string[] = $state(['']);

	$effect(() => {
		const eq = editingQuestion;
		if (!eq || !isEditModalOpen) return;
		if (populatedFormId === eq._id) return;

		const nextType: string = eq.type || 'multiple_choice';
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

		if (nextType === QUESTION_TYPES.MATCHING) {
			const opts = (eq.options || []) as Array<{ id: string; text: string }>;
			matchingPrompts = opts
				.filter((o) => o.text.startsWith('prompt:'))
				.map((o) => o.text.slice('prompt:'.length));
			matchingAnswers = opts
				.filter((o) => o.text.startsWith('answer:'))
				.map((o) => o.text.slice('answer:'.length));
			if (matchingPrompts.length === 0) matchingPrompts = [''];
			if (matchingAnswers.length === 0) matchingAnswers = [''];
		}

		// One-time assignments
		questionStatus = nextStatus;
		questionType = nextType;
		options = nextOptions;
		correctAnswers = correctAnswerIndices;
		if (nextType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			fitbAnswers = nextFitbAnswers;
		}

		if (nextType === QUESTION_TYPES.MULTIPLE_CHOICE) {
			mcOptionsCache = [...nextOptions];
			mcCorrectCache = [...correctAnswerIndices];
		} else if (nextType === QUESTION_TYPES.TRUE_FALSE) {
			tfCorrectCache = correctAnswerIndices[0] ?? '';
		} else if (nextType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			fitbAnswersCache = [...nextFitbAnswers];
		}

		populatedFormId = eq._id;
	});

	$effect(() => {
		if (!isEditModalOpen) {
			populatedFormId = '';
			populatedQuestionId = '';
		}
	});

	// Populate editors when editingQuestion becomes available
	$effect(() => {
		if (
			editingQuestion &&
			$editor &&
			$explanationEditor &&
			editingQuestion._id !== populatedQuestionId
		) {
			// Mark that we've populated this question
			populatedQuestionId = editingQuestion._id;

			// Set the editor content
			$editor.commands.setContent(editingQuestion.stem || '');
			$explanationEditor.commands.setContent(editingQuestion.explanation || '');
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
		} else if (newType === QUESTION_TYPES.MATCHING) {
			// No generic options list; matching has its own two-column UI.
			// Initialize if empty
			if (!matchingPrompts || matchingPrompts.length === 0) matchingPrompts = [''];
			if (!matchingAnswers || matchingAnswers.length === 0) matchingAnswers = [''];
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

	function shuffleOptions() {
		if (
			questionType === QUESTION_TYPES.TRUE_FALSE ||
			questionType === QUESTION_TYPES.FILL_IN_THE_BLANK
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

	async function handleSubmit() {
		if (!editingQuestion) return;

		// Get content directly from editors
		const finalStem = $editor?.getHTML() || '';
		const finalExplanation = $explanationEditor?.getHTML() || '';

		if (!finalStem.trim()) return;

		if (questionType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			const sanitized = fitbAnswers.filter((r) => r.value.trim());
			if (sanitized.length < 1) return;
			const encoded = sanitized.map((row) => ({
				text: `${row.mode}:${row.value}${row.flags.ignorePunct || row.flags.normalizeWs ? ` | flags=${[row.flags.ignorePunct ? 'ignore_punct' : '', row.flags.normalizeWs ? 'normalize_ws' : ''].filter(Boolean).join(',')}` : ''}`
			}));
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
				return { id: makeOptionId(finalStem, full, i), text: full };
			});
			const answersOffset = promptOptions.length;
			const answerOptions = rawAnswers.map((text, i) => {
				const full = `answer:${text}`;
				return { id: makeOptionId(finalStem, full, answersOffset + i), text: full };
			});

			const n = Math.min(promptOptions.length, answerOptions.length);
			const mappings = Array.from(
				{ length: n },
				(_, i) => `${promptOptions[i].id}::${answerOptions[i].id}`
			);

			// Replace options and keep correctAnswers as pair ids so server stores them intact
			options = [...promptOptions, ...answerOptions].map((o) => ({ text: o.text }));
			correctAnswers = mappings;
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
			const filteredCorrectAnswers =
				questionType === QUESTION_TYPES.MATCHING
					? correctAnswers
					: correctAnswers
							.map((index) => parseInt(index))
							.filter((index) => index < filledOptions.length)
							.map((index) => index.toString());

			await client.mutation(api.question.updateQuestion, {
				questionId: editingQuestion._id,
				moduleId: moduleId as Id<'module'>,
				type: questionType,
				stem: finalStem,
				options: filledOptions,
				correctAnswers: filteredCorrectAnswers,
				explanation: finalExplanation,
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

		<div class="mb-8 mt-6 flex items-center gap-2">
			<h3 class="text-2xl font-extrabold tracking-tight">Edit Question</h3>
		</div>

		{#if !editingQuestion}
			<div class="alert alert-error mb-6">
				<span>No question selected for editing.</span>
			</div>
		{:else}
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
														onclick={() =>
															(matchingPrompts = matchingPrompts.filter((_, idx) => idx !== i))}
													>
														<X size={16} />
													</button>
												{/if}
											</div>
										{/each}
										<button
											class="btn btn-sm btn-outline"
											type="button"
											onclick={() => (matchingPrompts = [...matchingPrompts, ''])}
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
														onclick={() =>
															(matchingAnswers = matchingAnswers.filter((_, idx) => idx !== i))}
													>
														<X size={16} />
													</button>
												{/if}
											</div>
										{/each}
										<button
											class="btn btn-sm btn-outline"
											type="button"
											onclick={() => (matchingAnswers = [...matchingAnswers, ''])}
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
									<div class="flex items-center gap-2 mt-2">
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

				<!-- Media Management -->
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
						{#if mediaList.length > 0}
							<div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
								{#each mediaList as m (m._id)}
									<div class="border border-base-300 rounded-lg overflow-hidden bg-base-100">
										<img src={m.url} alt={m.altText} class="w-full h-24 object-cover" />
										<div class="p-3 space-y-2">
											<input
												class="input input-bordered input-sm w-full"
												placeholder="Alt text"
												bind:value={m.altText}
												oninput={() =>
													handleMediaMetaChange(
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
												oninput={() =>
													handleMediaMetaChange(
														m._id,
														m.altText,
														m.caption || '',
														m.showOnSolution
													)}
											/>
											<label class="label cursor-pointer gap-2 text-sm">
												<input
													type="checkbox"
													class="checkbox checkbox-sm"
													bind:checked={m.showOnSolution}
													onchange={() =>
														handleMediaMetaChange(
															m._id,
															m.altText,
															m.caption || '',
															m.showOnSolution
														)}
												/>
												<span>Show on solution</span>
											</label>
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

			<div class="modal-action mt-8">
				<form method="dialog" class="flex gap-3">
					<button class="btn btn-ghost" onclick={closeEditModal} disabled={isSubmitting}
						>Cancel</button
					>
					<button class="btn btn-primary gap-2" onclick={handleSubmit} disabled={isSubmitting}>
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
