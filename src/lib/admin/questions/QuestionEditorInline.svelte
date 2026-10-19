<script lang="ts">
	import { Separator } from '#lib/components/ui/separator/index.js';
	import ExamFindingsWorkspace from './ExamFindingsWorkspace.svelte';
	import EditorHeader from './editor/EditorHeader.svelte';
	import TypeStatusBar from './editor/TypeStatusBar.svelte';
	import StemSection from './editor/StemSection.svelte';
	import FreeResponseOptions from './editor/FreeResponseOptions.svelte';
	import FillInTheBlankOptions from './editor/FillInTheBlankOptions.svelte';
	import MatchingOptions from './editor/MatchingOptions.svelte';
	import ChoiceOptions from './editor/ChoiceOptions.svelte';
	import RationaleSection from './editor/RationaleSection.svelte';
	import AttachmentsSection from './editor/AttachmentsSection.svelte';
	import { createToolbarCommands } from './editor/toolbar';
	import { QuestionEditorState, type QuestionItem } from './editor/questionEditor.svelte';
	import { QuestionMediaQueue } from './editor/questionMediaQueue.svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api.js';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { DISPLAY_QUESTION_TYPES, QUESTION_TYPES } from '#lib/types.js';
	import {
		INLINE_ANSWER,
		parsePastedQuestion,
		plainTextToHtml,
		splitInlineAnswers,
		type ParsedQuestion
	} from '#lib/utils/questionAuthoring.js';
	import { onMount } from 'svelte';
	import { toastStore } from '#lib/stores/toast.svelte.js';
	import type { Readable } from 'svelte/store';
	import type { Editor, EditorContent } from 'svelte-tiptap';
	import { loadEditorExtensions } from '#lib/config/tiptap.js';
	import { useClerkContext } from 'svelte-clerk';
	import { getRationalePlainText } from '#lib/utils/rationale.js';
	import { useQuestionMedia } from '#lib/utils/useQuestionMedia.svelte.js';

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

	const client = useConvexClient();
	const clerk = useClerkContext();
	const clerkUser = $derived(clerk.user);

	const form = new QuestionEditorState(() => onChange());
	const media = new QuestionMediaQueue(client, {
		moduleId: () => moduleId as Id<'module'>,
		existingCount: () => existingMedia.length,
		busy: () => form.isSubmitting,
		onChange: () => onChange()
	});

	// Exam findings are in beta and limited to manually written questions.
	const canEditExamFindings = $derived(!editingQuestion?.aiGenerated);
	const showFindings = $derived(canEditExamFindings && form.editorView === 'findings');

	let editor = $state() as Readable<Editor>;
	let rationaleEditor = $state() as Readable<Editor>;
	let Content = $state.raw<typeof EditorContent>();
	let suggestionTimer: ReturnType<typeof setTimeout> | undefined;

	function handleKeyboardSave(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			if (!form.isSubmitting && form.questionStem) handleSubmit();
		}
	}

	onMount(() => {
		let disposed = false;
		void (async () => {
			const [{ createEditor, EditorContent }, stemExtensions, rationaleExtensions] =
				await Promise.all([
					import('svelte-tiptap'),
					loadEditorExtensions(),
					loadEditorExtensions()
				]);
			if (disposed) return;
			Content = EditorContent;
			editor = createEditor({
				extensions: stemExtensions,
				content: form.questionStem,
				editorProps: {
					attributes: {
						class: 'prose prose-sm max-w-none focus:outline-hidden min-h-[3rem] p-3 tiptap-content'
					},
					handlePaste: (_view, event) => handleStemPaste(event)
				}
			});

			rationaleEditor = createEditor({
				extensions: rationaleExtensions,
				content: form.questionRationale,
				editorProps: {
					attributes: {
						class:
							'prose prose-sm max-w-none focus:outline-hidden min-h-[3rem] p-3 tiptap-content text-sm'
					}
				}
			});
		})();

		window.addEventListener('keydown', handleKeyboardSave);
		return () => {
			disposed = true;
			window.removeEventListener('keydown', handleKeyboardSave);
			clearTimeout(suggestionTimer);
			media.dispose();
		};
	});

	const stemToolbar = createToolbarCommands(() => $editor);
	const rationaleToolbar = createToolbarCommands(() => $rationaleEditor);
	const menuItems = $derived(stemToolbar.menuItems());
	const rationaleMenuItems = $derived(rationaleToolbar.menuItems());

	$effect(() => {
		if ($editor) {
			const updateStem = () => {
				form.stemUpdated($editor.getHTML(), $editor.getText());
				queueMicrotask(convertInlineAnswers);
				clearTimeout(suggestionTimer);
				suggestionTimer = setTimeout(() => form.refreshTypeSuggestion(), 400);
			};
			$editor.on('update', updateStem);
			return () => $editor.off('update', updateStem);
		}
	});

	$effect(() => {
		if ($rationaleEditor) {
			const updateRationale = () => form.rationaleUpdated($rationaleEditor.getHTML());
			$rationaleEditor.on('update', updateRationale);
			return () => $rationaleEditor.off('update', updateRationale);
		}
	});

	const existingMediaQuery = useQuestionMedia(() =>
		mode === 'edit' ? editingQuestion?._id : null
	);
	let existingMedia = $derived([...(existingMediaQuery.data ?? [])]);

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

	// `{{cornea|the cornea}}` in the stem becomes a blank plus accepted answers.
	function convertInlineAnswers() {
		if (!$editor) return;
		if (
			form.questionType !== QUESTION_TYPES.FILL_IN_THE_BLANK &&
			(form.typeLocked || !form.answersPristine)
		)
			return;
		const found: Array<{ from: number; to: number; answers: string[] }> = [];
		$editor.state.doc.descendants((node, pos) => {
			if (found.length) return false;
			const match = node.isText ? node.text?.match(INLINE_ANSWER) : null;
			if (match?.index !== undefined) {
				const from = pos + match.index;
				found.push({ from, to: from + match[0].length, answers: splitInlineAnswers(match[1]) });
			}
			return !node.isText;
		});
		const [inline] = found;
		if (!inline) return;
		$editor.chain().insertContentAt({ from: inline.from, to: inline.to }, '___').run();
		form.inlineAnswersFound(inline.answers);
	}

	function handleStemPaste(event: ClipboardEvent): boolean {
		const text = event.clipboardData?.getData('text/plain');
		if (!text || !$editor?.isEmpty || !form.answersPristine) return false;
		const parsed = parsePastedQuestion(text);
		if (!parsed) return false;
		applyParsedQuestion(parsed);
		return true;
	}

	function applyParsedQuestion(parsed: ParsedQuestion) {
		const filled = form.applyParsed(parsed);
		if (parsed.rationale && $rationaleEditor && !getRationalePlainText(form.questionRationale)) {
			$rationaleEditor.commands.setContent(plainTextToHtml(parsed.rationale));
			form.questionRationale = $rationaleEditor.getHTML();
			filled.push('the rationale');
		}
		$editor.commands.setContent(plainTextToHtml(parsed.stem));
		form.questionStem = $editor.getHTML();
		form.stemText = $editor.getText();
		const label = DISPLAY_QUESTION_TYPES[parsed.type];
		toastStore.success(
			filled.length ? `${label}: filled in ${filled.join(', ')}` : `Pasted as ${label}`
		);
	}

	const editorResetKey = $derived(
		mode === 'add' ? `add:${addSessionVersion}` : `edit:${editingQuestion?._id ?? 'none'}`
	);

	$effect(() => {
		const resetKey = editorResetKey;
		if (appliedEditorResetKey === resetKey) return;
		appliedEditorResetKey = resetKey;
		const { stem, rationale } = form.reset(editingQuestion, mode, initialAddStatus);
		if ($editor && $editor.getHTML() !== stem) {
			$editor.commands.setContent(stem, { emitUpdate: false });
		}
		if ($rationaleEditor && $rationaleEditor.getHTML() !== rationale) {
			$rationaleEditor.commands.setContent(rationale, { emitUpdate: false });
		}
	});

	const questions = useQuery(api.questions.read.getQuestionsByModule, () =>
		moduleId ? { id: moduleId as Id<'module'> } : 'skip'
	);

	// AI Assistant - inline generation
	function generateAIOptions() {
		window.open('/admin/question-studio', '_blank', 'noopener,noreferrer');
	}

	async function handleSubmit() {
		if (media.isUploading || form.isSubmitting) return;
		if (!moduleId) {
			toastStore.error('Question stem is required');
			return;
		}
		const problem = form.prepareForSave(mode, editingQuestion);
		if (problem) {
			toastStore.error(problem.message);
			return;
		}

		form.isSubmitting = true;
		try {
			let questionId: Id<'question'> | undefined;
			const images = media.imagesForSave();
			const payload = form.savePayload();
			const examFindings = $state.snapshot(form.examFindings);

			if (mode === 'edit' && editingQuestion) {
				await client.mutation(api.questions.write.updateQuestion, {
					images,
					source: form.questionSource ?? null,
					examFindings: canEditExamFindings ? examFindings : undefined,
					examFindingsStyle: canEditExamFindings
						? form.compactFindings
							? 'compact'
							: null
						: undefined,
					questionId: editingQuestion._id as Id<'question'>,
					moduleId: moduleId as Id<'module'>,
					...payload
				});
				questionId = editingQuestion._id as Id<'question'>;
			} else {
				const nextOrder = questions.data?.length
					? Math.max(...questions.data.map((q) => q.order || 0)) + 1
					: 0;
				const createdBy =
					clerkUser?.firstName && clerkUser?.lastName
						? { firstName: clerkUser.firstName, lastName: clerkUser.lastName }
						: undefined;

				questionId = await client.mutation(api.questions.write.insertQuestion, {
					images,
					source: form.questionSource,
					examFindings,
					examFindingsStyle: form.compactFindings ? 'compact' : undefined,
					moduleId: moduleId as Id<'module'>,
					...payload,
					options: payload.options.map((opt) => ({ text: opt.text })),
					aiGenerated: false,
					order: nextOrder,
					metadata: {},
					updatedAt: Date.now(),
					createdBy
				});
			}

			media.clear();
			toastStore.success(mode === 'edit' ? 'Question saved' : 'Question created');
			onSave(mode === 'add' ? questionId : undefined);
		} catch (error) {
			toastStore.error(form.saveFailed(error));
		} finally {
			form.isSubmitting = false;
		}
	}
</script>

<div class="h-full flex flex-col overflow-hidden bg-background">
	<EditorHeader
		{form}
		{mode}
		{canEditExamFindings}
		uploading={media.isUploading}
		{onCancel}
		onSubmit={handleSubmit}
	/>

	{#if form.saveError}
		<div class="px-4 py-3 border-b border-error/20 bg-error/10 text-sm text-error-ink">
			<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
				<span>{form.saveError}</span>
				{#if form.isRationaleError && !form.isFreeResponse}
					<a
						class="font-semibold underline underline-offset-4"
						href="https://docs.learnterms.com/docs/contributors/why-rationales-are-required"
						target="_blank"
						rel="noreferrer"
					>
						Why rationales are required
					</a>
				{/if}
			</div>
		</div>
	{/if}

	{#if showFindings}
		<div class="min-h-0 flex-1">
			<ExamFindingsWorkspace
				bind:findings={form.examFindings}
				bind:compact={form.compactFindings}
				stem={form.questionStem}
				onBack={() => (form.editorView = 'question')}
				{onChange}
				disabled={form.isSubmitting}
			/>
		</div>
	{/if}

	<TypeStatusBar {form} hidden={showFindings} />

	<!-- Main Scrollable Content -->
	<div
		class="flex-1 overflow-y-auto min-h-0 p-4 pb-40 sm:p-6 sm:pb-40"
		class:hidden={showFindings}
		onpaste={(event) => media.handlePaste(event)}
	>
		<div class="w-full max-w-none space-y-8">
			<StemSection {form} editor={$editor} {Content} {menuItems} />

			<Separator class="my-2 opacity-50" />

			<div>
				{#if form.questionType === QUESTION_TYPES.FREE_RESPONSE}
					<FreeResponseOptions {form} />
				{:else if form.questionType === QUESTION_TYPES.FILL_IN_THE_BLANK}
					<FillInTheBlankOptions {form} onGenerate={generateAIOptions} />
				{:else if form.questionType === QUESTION_TYPES.MATCHING}
					<MatchingOptions {form} />
				{:else}
					<ChoiceOptions {form} onGenerate={generateAIOptions} />
				{/if}
			</div>

			<!-- Rationale & Attachments -->
			<div
				class="grid grid-cols-1 gap-6 pt-4 border-t border-muted {form.isFreeResponse
					? ''
					: 'md:grid-cols-2'}"
			>
				<RationaleSection
					{form}
					editor={$rationaleEditor}
					{Content}
					menuItems={rationaleMenuItems}
					{moduleId}
					{editingQuestion}
					{editorResetKey}
				/>
				<AttachmentsSection {form} {media} {editingQuestion} bind:existingMedia />
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
