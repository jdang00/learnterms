import type { Check as LucideIcon } from 'lucide-svelte';
import type { Doc } from '../../../convex/_generated/dataModel';
import type { DockDisplay } from './layouts';

export type CommandSource = 'button' | 'keyboard' | 'mobile';

export type CoreCommandId =
	| 'check'
	| 'clear'
	| 'flag'
	| 'reveal'
	| 'highlight'
	| 'previous'
	| 'next'
	| 'nextUnanswered'
	| 'nextFlagged'
	| 'position'
	| 'progress'
	| 'streak'
	| 'timer'
	| 'textSize'
	| 'shuffle'
	| 'filterFlagged'
	| 'filterIncomplete'
	| 'reset'
	| 'autoNext'
	| 'shuffleOptions'
	| 'focus'
	| 'edit';

// answer: acts on the current response · question: acts on the current question
// navigation: moves between questions · session: changes the whole module run
// insight: read-only feedback · preference: a sticky study setting
export type CommandScope =
	| 'answer'
	| 'question'
	| 'navigation'
	| 'insight'
	| 'session'
	| 'preference';

export type CommandTone =
	| 'neutral'
	| 'primary'
	| 'success'
	| 'warning'
	| 'secondary'
	| 'info'
	| 'accent'
	| 'error'
	| 'highlighter'
	| 'ember';

// Variant carries the role (solid = primary action, outline = state toggle, dash = preference,
// ghost = quiet utility); tone carries the hue.
export type ButtonVariant = 'solid' | 'soft' | 'outline' | 'dash' | 'ghost';
export type ButtonLook = { variant: ButtonVariant; tone: CommandTone };

export type QuizCommand = {
	id: string;
	scope: CommandScope;
	icon: typeof LucideIcon;
	name: string;
	description: string;
	// readout shows text, meter shows a small progress bar; neither is clickable.
	kind?: 'button' | 'readout' | 'meter';
	value?: () => number;
	defaultDisplay?: DockDisplay;
	tone: CommandTone;
	look: ButtonLook;
	activeLook?: ButtonLook;
	label: () => string;
	// Small muted suffix after a readout's value, e.g. "in a row".
	caption?: () => string;
	// Longer explanation for the tooltip; falls back to the label.
	detail?: () => string;
	activeIcon?: typeof LucideIcon;
	// Trailing value shown next to the name in the More menu, e.g. "03:12".
	menuValue?: () => string;
	// Whether the tool exists here at all (palette); `visible` hides it contextually in the dock.
	available?: () => boolean;
	visible?: () => boolean;
	enabled?: () => boolean;
	active?: () => boolean;
	href?: () => string;
	run: (source: CommandSource) => void | Promise<void>;
};

export type QuizCommandMap = Record<string, QuizCommand>;

export type QuizCommandRegistry = {
	readonly commands: QuizCommandMap;
	get: (id: string) => QuizCommand | undefined;
	register: (...commands: QuizCommand[]) => () => void;
	readonly textScale: number;
	toggleOptionAt: (index: number) => boolean;
};

type QuestionOption = { id: string; text: string };

// Structural slice of QuizState the commands depend on, so other quiz surfaces can adopt them.
export type QuizCommandState = {
	selectedAnswers: string[];
	eliminatedAnswers: string[];
	checkResult: string;
	currentQuestionFlagged: boolean;
	currentQuestionIndex: number;
	liveInteractedQuestions: string[];
	learningEvidence?: Record<string, { checkedAt?: number }>;
	liveFlaggedQuestions: string[];
	interactedQuestionsCount: number;
	isShuffled: boolean;
	showSolution: boolean;
	highlightEnabled: boolean;
	showFlagged: boolean;
	showIncomplete: boolean;
	isResetModalOpen: boolean;
	autoNextEnabled: boolean;
	optionsShuffleEnabled: boolean;
	checkAnswer: (correctAnswers: string[], selectedAnswers: string[]) => boolean | Promise<boolean>;
	checkFillInTheBlank: (
		text: string,
		question?: Doc<'question'> | null
	) => boolean | Promise<boolean>;
	checkMatching: (question?: Doc<'question'> | null) => boolean | Promise<boolean>;
	scheduleSave: (delayMs?: number) => void;
	toggleFlag: () => void;
	handleSolution: () => void;
	toggleHighlighting: () => Promise<void>;
	toggleShuffle: () => void;
	setAutoNextEnabled: (enabled: boolean) => void;
	setOptionsShuffleEnabled: (enabled: boolean) => void;
	goToNextQuestion: () => Promise<void>;
	goToPreviousQuestion: () => Promise<void>;
	canGoNext: () => boolean;
	canGoPrevious: () => boolean;
	getFilteredQuestions: () => Doc<'question'>[];
	getProgressPercentage: () => number;
	getOrderedOptions: (question: Doc<'question'>) => QuestionOption[];
	toggleOption: (optionId: string) => void;
};
