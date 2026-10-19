import type { Doc } from '../../../../convex/_generated/dataModel';
import type { ExamFinding } from '$lib/examFindings/findings';
import type { AcceptanceLevel } from '$lib/utils/freeResponse';
import { QUESTION_TYPES } from '$lib/types';
import {
	countBlanks,
	expectedAnswerCount,
	inferQuestionType,
	type ParsedQuestion,
	type TypeSuggestion
} from '$lib/utils/questionAuthoring';
import { getRationale, getRationalePlainText } from '$lib/utils/rationale';

export type QuestionItem = Doc<'question'>;
export type EditorMode = 'add' | 'edit';
export type EditorOption = { id?: string; text: string };
export type FitbMode = 'exact' | 'exact_cs' | 'contains' | 'regex';
export type FitbAnswerRow = {
	value: string;
	mode: FitbMode;
	flags: { ignorePunct: boolean; normalizeWs: boolean };
};

export const FITB_MODE_LABELS: Record<FitbMode, string> = {
	exact: 'Exact',
	exact_cs: 'Case-sensitive',
	contains: 'Contains',
	regex: 'Regex'
};

const emptyFitbRow = (): FitbAnswerRow => ({
	value: '',
	mode: 'exact',
	flags: { ignorePunct: false, normalizeWs: false }
});

const fourBlankOptions = (): EditorOption[] => [
	{ text: '' },
	{ text: '' },
	{ text: '' },
	{ text: '' }
];

function cloneOptions(input?: Array<{ id?: string; text: string }> | null): EditorOption[] {
	return (input ?? []).map((option) => ({ id: option.id, text: option.text ?? '' }));
}

function initialOptions(question: QuestionItem | null) {
	return question?.options?.length ? cloneOptions(question.options) : fourBlankOptions();
}

function initialCorrectAnswers(question: QuestionItem | null) {
	if (!question?.correctAnswers || !question.options) return [];
	return question.correctAnswers
		.map((answerId) => {
			const index = question.options?.findIndex((opt) => opt.id === answerId) ?? -1;
			return index !== -1 ? index.toString() : null;
		})
		.filter((idx): idx is string => idx !== null);
}

function initialFitbAnswers(question: QuestionItem | null): FitbAnswerRow[] {
	if (question?.type !== QUESTION_TYPES.FILL_IN_THE_BLANK || !question.options?.length) {
		return [emptyFitbRow()];
	}
	return question.options.map((opt) => {
		const [before, flagsPart] = (opt.text || '').split(' | flags=');
		const [modeMaybe, ...rest] = before.split(':');
		const mode = ['exact', 'exact_cs', 'contains', 'regex'].includes(modeMaybe)
			? (modeMaybe as FitbMode)
			: 'exact';
		return {
			value: rest.join(':'),
			mode,
			flags: {
				ignorePunct: !!flagsPart?.includes('ignore_punct'),
				normalizeWs: !!flagsPart?.includes('normalize_ws')
			}
		};
	});
}

function initialMatching(question: QuestionItem | null) {
	if (question?.type !== QUESTION_TYPES.MATCHING || !question.options?.length) {
		return { prompts: ['', ''], answers: ['', ''] };
	}
	const prompts = question.options
		.filter((option) => option.text?.startsWith('prompt:'))
		.map((option) => option.text.slice('prompt:'.length));
	const answers = question.options
		.filter((option) => option.text?.startsWith('answer:'))
		.map((option) => option.text.slice('answer:'.length));
	return {
		prompts: prompts.length > 0 ? prompts : ['', ''],
		answers: answers.length > 0 ? answers : ['', '']
	};
}

function encodeFitbAnswer(row: FitbAnswerRow): string {
	const base = `${row.mode}:${row.value}`;
	const enabledFlags: string[] = [];
	if (row.flags.ignorePunct) enabledFlags.push('ignore_punct');
	if (row.flags.normalizeWs) enabledFlags.push('normalize_ws');
	return enabledFlags.length ? `${base} | flags=${enabledFlags.join(',')}` : base;
}

/** Turns a Convex error into the message the editor shows. */
export function saveErrorMessage(error: unknown): string {
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
	if (error instanceof Error) return formatMessage(error.message);
	if (typeof error === 'string') return formatMessage(error);
	return fallback;
}

export type SaveProblem = { message: string; kind: 'rationale' | 'toast' };

/** Everything the question editor form holds, apart from the TipTap editor instances. */
export class QuestionEditorState {
	questionStem = $state('');
	stemText = $state('');
	questionRationale = $state('');
	questionStatus = $state('draft');
	questionType = $state<string>(QUESTION_TYPES.MULTIPLE_CHOICE);
	freeResponseAcceptance = $state<AcceptanceLevel>('lenient');
	options = $state<EditorOption[]>(fourBlankOptions());
	correctAnswers = $state<string[]>([]);
	fitbAnswers = $state<FitbAnswerRow[]>([emptyFitbRow()]);
	matchingPrompts = $state<string[]>(['', '']);
	matchingAnswers = $state<string[]>(['', '']);
	questionSource = $state<QuestionItem['metadata']['source']>();
	examFindings = $state<ExamFinding[]>([]);
	compactFindings = $state(false);
	editorView = $state<'question' | 'findings'>('question');

	// Stem-aware typing: follow the stem's type while the answers are untouched, then only suggest.
	typeLocked = $state(false);
	autoTyped = $state<TypeSuggestion | null>(null);
	typeSuggestion = $state<TypeSuggestion | null>(null);
	dismissedSuggestion = $state<string | null>(null);

	saveError = $state<string | null>(null);
	isRationaleError = $state(false);
	isSubmitting = $state(false);
	isGeneratingAI = $state(false);

	constructor(private readonly notify: () => void) {}

	/** Tell the host the draft changed (unsaved-changes tracking). */
	touch() {
		this.notify();
	}

	isFreeResponse = $derived(this.questionType === QUESTION_TYPES.FREE_RESPONSE);
	canSubmit = $derived(
		this.questionStem.trim().length > 0 && getRationalePlainText(this.questionRationale).length > 0
	);

	answersPristine = $derived.by(() => {
		if (this.questionType === QUESTION_TYPES.FREE_RESPONSE) return true;
		if (this.questionType === QUESTION_TYPES.FILL_IN_THE_BLANK)
			return this.fitbAnswers.every((row) => !row.value.trim());
		if (this.questionType === QUESTION_TYPES.MATCHING)
			return [...this.matchingPrompts, ...this.matchingAnswers].every((text) => !text.trim());
		if (this.questionType === QUESTION_TYPES.TRUE_FALSE) return this.correctAnswers.length === 0;
		return this.correctAnswers.length === 0 && this.options.every((option) => !option.text.trim());
	});

	visibleSuggestion = $derived(
		this.typeSuggestion &&
			this.typeSuggestion.type !== this.questionType &&
			this.typeSuggestion.type !== this.dismissedSuggestion &&
			// A blank in a stem with options is a normal multiple choice question.
			!(
				this.typeSuggestion.type === QUESTION_TYPES.FILL_IN_THE_BLANK &&
				this.questionType === QUESTION_TYPES.MULTIPLE_CHOICE
			)
			? this.typeSuggestion
			: null
	);

	showAutoTyped = $derived(
		this.autoTyped !== null && this.autoTyped.type === this.questionType && this.answersPristine
	);

	stemHint = $derived.by(() => {
		if (this.questionType === QUESTION_TYPES.FILL_IN_THE_BLANK && countBlanks(this.stemText) > 1)
			return 'Students get one answer box, so use one blank.';
		const expected = expectedAnswerCount(this.stemText);
		const marked = this.correctAnswers.length;
		if (
			this.questionType === QUESTION_TYPES.MULTIPLE_CHOICE &&
			expected &&
			marked &&
			marked !== expected
		)
			return `The stem asks for ${expected} answers, but ${marked} ${marked === 1 ? 'is' : 'are'} marked correct.`;
		return null;
	});

	matchingRowIndexes = $derived.by(() =>
		Array.from(
			{ length: Math.max(this.matchingPrompts.length, this.matchingAnswers.length) },
			(_, index) => index
		)
	);

	/** Loads a question (or a blank draft) into the form; the host syncs the TipTap editors. */
	reset(editingQuestion: QuestionItem | null, mode: EditorMode, initialAddStatus: string) {
		const nextStem = editingQuestion?.stem ?? '';
		const nextRationale = getRationale(editingQuestion);
		const nextMatching = initialMatching(editingQuestion);

		this.editorView = 'question';
		this.questionSource = editingQuestion?.metadata.source;
		this.compactFindings = editingQuestion?.examFindingsStyle === 'compact';
		this.examFindings = (editingQuestion?.examFindings ?? []).map((finding) => ({
			...finding,
			values: { ...finding.values }
		}));
		this.questionStem = nextStem;
		this.stemText = getRationalePlainText(nextStem);
		this.typeLocked = mode === 'edit';
		this.autoTyped = null;
		this.typeSuggestion = null;
		this.dismissedSuggestion = null;
		this.questionRationale = nextRationale;
		this.questionStatus = editingQuestion?.status ?? initialAddStatus;
		this.questionType = editingQuestion?.type ?? QUESTION_TYPES.MULTIPLE_CHOICE;
		this.freeResponseAcceptance = editingQuestion?.freeResponseAcceptance ?? 'lenient';
		this.options = initialOptions(editingQuestion);
		this.correctAnswers = initialCorrectAnswers(editingQuestion);
		this.fitbAnswers = initialFitbAnswers(editingQuestion);
		this.matchingPrompts = nextMatching.prompts;
		this.matchingAnswers = nextMatching.answers;
		return { stem: nextStem, rationale: nextRationale };
	}

	stemUpdated(html: string, text: string) {
		this.saveError = null;
		this.isRationaleError = false;
		this.questionStem = html;
		this.stemText = text;
		this.notify();
	}

	rationaleUpdated(html: string) {
		this.saveError = null;
		this.isRationaleError = false;
		this.questionRationale = html;
		this.notify();
	}

	setStatus(status: string) {
		this.questionStatus = status;
		this.notify();
	}

	// ── question type ────────────────────────────────────────────────────────
	selectQuestionType(value: string) {
		this.typeLocked = true;
		this.autoTyped = null;
		if (value === this.questionType) return;
		this.applyType(value);
	}

	applyType(value: string) {
		this.questionType = value;
		this.handleTypeChange();
		this.notify();
	}

	private handleTypeChange() {
		if (this.questionType === QUESTION_TYPES.TRUE_FALSE) {
			this.options = [{ text: 'True' }, { text: 'False' }];
			this.correctAnswers = [];
		} else if (this.questionType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			this.options = [{ text: '' }];
			this.fitbAnswers = [emptyFitbRow()];
			this.correctAnswers = [];
		} else if (this.questionType === QUESTION_TYPES.MULTIPLE_CHOICE) {
			this.options = fourBlankOptions();
			this.correctAnswers = [];
		} else if (this.questionType === QUESTION_TYPES.MATCHING) {
			this.matchingPrompts = ['', ''];
			this.matchingAnswers = ['', ''];
			this.correctAnswers = [];
		}
	}

	refreshTypeSuggestion() {
		const suggestion = inferQuestionType(this.stemText);
		if (this.typeLocked || !this.answersPristine) {
			this.typeSuggestion = suggestion;
			return;
		}
		this.typeSuggestion = null;
		const followed = suggestion?.type === QUESTION_TYPES.MULTIPLE_CHOICE ? null : suggestion;
		if (suggestion && suggestion.type !== this.questionType) {
			this.applyType(suggestion.type);
			this.autoTyped = followed;
		} else if (suggestion) {
			if (this.autoTyped) this.autoTyped = followed;
		} else if (this.autoTyped) {
			this.applyType(QUESTION_TYPES.MULTIPLE_CHOICE);
			this.autoTyped = null;
		}
	}

	acceptSuggestion(suggestion: TypeSuggestion) {
		this.typeLocked = true;
		this.typeSuggestion = null;
		this.applyType(suggestion.type);
	}

	dismissSuggestion(type: string) {
		this.dismissedSuggestion = type;
	}

	undoAutoType() {
		this.typeLocked = true;
		this.autoTyped = null;
		this.applyType(QUESTION_TYPES.MULTIPLE_CHOICE);
	}

	/** `{{answer}}` found in the stem: switch to fill-in-the-blank and record the answers. */
	inlineAnswersFound(answers: string[]) {
		if (this.questionType !== QUESTION_TYPES.FILL_IN_THE_BLANK) {
			this.applyType(QUESTION_TYPES.FILL_IN_THE_BLANK);
			this.autoTyped = { type: QUESTION_TYPES.FILL_IN_THE_BLANK, reason: 'Answer typed in {{ }}' };
		}
		this.addFitbAnswers(answers);
	}

	/** Applies a pasted question's structure; returns what got filled in. The host sets editor text. */
	applyParsed(parsed: ParsedQuestion) {
		this.typeLocked = true;
		this.autoTyped = null;
		this.typeSuggestion = null;
		this.applyType(parsed.type);
		const filled: string[] = [];
		if (parsed.type === QUESTION_TYPES.MULTIPLE_CHOICE && parsed.options.length) {
			this.options = parsed.options.map((text) => ({ text }));
			filled.push(`${parsed.options.length} options`);
		}
		if (parsed.correct.length) {
			this.correctAnswers = parsed.correct.map(String);
			filled.push('the answer');
		}
		if (parsed.fitbAnswers.length) {
			this.addFitbAnswers(parsed.fitbAnswers);
			filled.push('the answer');
		}
		if (parsed.pairs.length) {
			this.matchingPrompts = parsed.pairs.map((pair) => pair.prompt);
			this.matchingAnswers = parsed.pairs.map((pair) => pair.answer);
			filled.push(`${parsed.pairs.length} pairs`);
		}
		return filled;
	}

	// ── fill in the blank ────────────────────────────────────────────────────
	addFitbAnswers(answers: string[]) {
		const filled = this.fitbAnswers.filter((row) => row.value.trim());
		const known = filled.map((row) => row.value.trim().toLowerCase());
		const added = answers
			.filter((answer) => !known.includes(answer.toLowerCase()))
			.map((value) => ({ ...emptyFitbRow(), value }));
		if (filled.length + added.length === 0) return;
		this.fitbAnswers = [...filled, ...added];
		this.notify();
	}

	addFitbRow() {
		this.fitbAnswers = [...this.fitbAnswers, emptyFitbRow()];
		this.notify();
	}

	removeFitbRow(index: number) {
		if (this.fitbAnswers.length <= 1) return;
		this.fitbAnswers = this.fitbAnswers.filter((_, i) => i !== index);
		this.notify();
	}

	updateFitbMode(index: number, mode: FitbMode) {
		this.fitbAnswers = this.fitbAnswers.map((row, i) => (i === index ? { ...row, mode } : row));
		this.notify();
	}

	toggleFitbFlag(index: number, flag: 'ignorePunct' | 'normalizeWs') {
		this.fitbAnswers = this.fitbAnswers.map((row, i) =>
			i === index ? { ...row, flags: { ...row.flags, [flag]: !row.flags[flag] } } : row
		);
		this.notify();
	}

	// ── matching ─────────────────────────────────────────────────────────────
	addMatchingPrompt() {
		this.matchingPrompts = [...this.matchingPrompts, ''];
		this.notify();
	}

	removeMatchingPrompt(index: number) {
		if (this.matchingPrompts.length <= 1) return;
		this.matchingPrompts = this.matchingPrompts.filter((_, i) => i !== index);
		this.notify();
	}

	addMatchingAnswer() {
		this.matchingAnswers = [...this.matchingAnswers, ''];
		this.notify();
	}

	removeMatchingAnswer(index: number) {
		if (this.matchingAnswers.length <= 1) return;
		this.matchingAnswers = this.matchingAnswers.filter((_, i) => i !== index);
		this.notify();
	}

	// ── choices ──────────────────────────────────────────────────────────────
	private get hasFreeformOptions() {
		return (
			this.questionType !== QUESTION_TYPES.TRUE_FALSE &&
			this.questionType !== QUESTION_TYPES.FILL_IN_THE_BLANK &&
			this.questionType !== QUESTION_TYPES.MATCHING
		);
	}

	addOption() {
		if (!this.hasFreeformOptions) return;
		this.options = [...this.options, { text: '' }];
		this.notify();
	}

	removeOption(index: number) {
		if (!this.hasFreeformOptions) return;
		if (this.options.length <= 2) return;
		this.options = this.options.filter((_, i) => i !== index);
		this.correctAnswers = this.correctAnswers
			.filter((answerIndex) => parseInt(answerIndex) !== index)
			.map((answerIndex) => {
				const idx = parseInt(answerIndex);
				return idx > index ? (idx - 1).toString() : answerIndex;
			});
		this.notify();
	}

	shuffleOptions() {
		if (!this.hasFreeformOptions) return;
		const pairs = this.options.map((opt, idx) => ({ opt, idx }));
		for (let i = pairs.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[pairs[i], pairs[j]] = [pairs[j], pairs[i]];
		}
		const newCorrect = this.correctAnswers.map((oldIdx) => {
			const newIdx = pairs.findIndex((p) => p.idx === parseInt(oldIdx));
			return newIdx.toString();
		});
		this.options = pairs.map((p) => p.opt);
		this.correctAnswers = newCorrect;
		this.notify();
	}

	toggleCorrectAnswer(index: number) {
		const indexStr = index.toString();
		if (
			this.questionType === QUESTION_TYPES.FILL_IN_THE_BLANK ||
			this.questionType === QUESTION_TYPES.MATCHING
		)
			return;
		if (this.questionType === QUESTION_TYPES.TRUE_FALSE) {
			this.correctAnswers = this.correctAnswers.includes(indexStr) ? [] : [indexStr];
		} else if (this.correctAnswers.includes(indexStr)) {
			this.correctAnswers = this.correctAnswers.filter((id) => id !== indexStr);
		} else {
			this.correctAnswers = [...this.correctAnswers, indexStr];
		}
		this.notify();
	}

	canGenerateAI(): boolean {
		if (this.isGeneratingAI || this.questionStem.trim().length === 0) return false;
		if (this.questionType === QUESTION_TYPES.MULTIPLE_CHOICE) return this.correctAnswers.length > 0;
		if (this.questionType === QUESTION_TYPES.FILL_IN_THE_BLANK)
			return this.fitbAnswers.some((row) => row.value.trim().length > 0);
		return false;
	}

	// ── saving ───────────────────────────────────────────────────────────────
	/**
	 * Checks the draft and encodes fill-in-the-blank and matching answers into options.
	 * Returns the problem to surface, or null when the draft can be saved.
	 */
	prepareForSave(mode: EditorMode, editingQuestion: QuestionItem | null): SaveProblem | null {
		this.saveError = null;
		this.isRationaleError = false;

		if (!this.questionStem) return { message: 'Question stem is required', kind: 'toast' };

		if (!getRationalePlainText(this.questionRationale)) {
			this.saveError =
				this.questionType === QUESTION_TYPES.FREE_RESPONSE
					? 'Add the ground truth / source used to grade responses.'
					: 'Add a rationale before saving this question. Rationales help students understand why the answer is correct and are now required for all questions.';
			this.isRationaleError = true;
			return { message: this.saveError, kind: 'rationale' };
		}

		if (this.questionType === QUESTION_TYPES.FILL_IN_THE_BLANK) {
			const sanitized = this.fitbAnswers.filter((r) => r.value.trim());
			if (sanitized.length < 1)
				return { message: 'At least one answer is required', kind: 'toast' };
			const existingFitb = mode === 'edit' && editingQuestion ? editingQuestion.options || [] : [];
			const encoded = sanitized.map((row, i) => ({
				id: existingFitb[i]?.id,
				text: encodeFitbAnswer(row)
			}));
			this.options = encoded;
			this.correctAnswers = encoded.map((_, i) => i.toString());
		}

		if (this.questionType === QUESTION_TYPES.MATCHING) {
			const rawPrompts = this.matchingPrompts.map((t) => t.trim()).filter((t) => t.length > 0);
			const rawAnswers = this.matchingAnswers.map((t) => t.trim()).filter((t) => t.length > 0);
			if (rawPrompts.length === 0 || rawAnswers.length === 0) {
				return { message: 'At least one prompt and one answer are required', kind: 'toast' };
			}
			const promptOptions = rawPrompts.map((text) => ({ text: `prompt:${text}` }));
			const answersOffset = promptOptions.length;
			const answerOptions = rawAnswers.map((text) => ({ text: `answer:${text}` }));
			const mappings: string[] = [];
			const n = Math.min(rawPrompts.length, rawAnswers.length);
			for (let i = 0; i < n; i++) mappings.push(`${i}::${answersOffset + i}`);
			this.options = [...promptOptions, ...answerOptions];
			this.correctAnswers = mappings;
		}

		if (this.questionType === QUESTION_TYPES.FREE_RESPONSE) {
			this.options = [];
			this.correctAnswers = [];
		}

		const filledOptions = this.filledOptions();
		if (this.questionType === QUESTION_TYPES.TRUE_FALSE && this.correctAnswers.length !== 1)
			return { message: 'Select True or False as the correct answer', kind: 'toast' };
		if (this.questionType === QUESTION_TYPES.MULTIPLE_CHOICE && filledOptions.length < 2)
			return { message: 'At least 2 options are required', kind: 'toast' };
		if (this.questionType === QUESTION_TYPES.FILL_IN_THE_BLANK && filledOptions.length < 1)
			return { message: 'At least one answer is required', kind: 'toast' };
		if (this.questionType === QUESTION_TYPES.MATCHING && this.correctAnswers.length < 1)
			return { message: 'At least one matching pair is required', kind: 'toast' };
		return null;
	}

	private filledOptions() {
		return this.options.filter((opt) => opt.text.trim());
	}

	/** Fields shared by the insert and update mutations, after `prepareForSave` succeeded. */
	savePayload() {
		return {
			type: this.questionType,
			freeResponseAcceptance:
				this.questionType === QUESTION_TYPES.FREE_RESPONSE
					? this.freeResponseAcceptance
					: undefined,
			stem: this.questionStem,
			options: this.filledOptions().map((opt) => ({ id: opt.id, text: opt.text })),
			correctAnswers: this.correctAnswers,
			rationale: this.questionRationale || '',
			status: this.questionStatus.toLowerCase()
		};
	}

	saveFailed(error: unknown) {
		const message = saveErrorMessage(error);
		console.error('Failed to save question', error);
		this.saveError = message;
		this.isRationaleError = false;
		return message;
	}
}
