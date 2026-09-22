import { getContext, setContext } from 'svelte';
import {
	ArrowLeft,
	ArrowRight,
	BookmarkCheck,
	Check,
	Dices,
	Eraser,
	ALargeSmall,
	ChartPie,
	Eye,
	FastForward,
	Flag,
	Flame,
	FlagTriangleRight,
	Focus,
	Hash,
	Highlighter,
	ListRestart,
	Minimize2,
	Pause,
	Pencil,
	Shuffle,
	SkipForward,
	Timer
} from 'lucide-svelte';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { QUESTION_TYPES } from '$lib/utils/questionType';
import { captureQuestionAnswered } from '$lib/analytics/questionAnswered';
import { clampTextScale, formatDuration, nextTextScale } from './format';
import type {
	CommandSource,
	CoreCommandId,
	QuizCommand,
	QuizCommandMap,
	QuizCommandRegistry,
	QuizCommandState
} from './types';

export type QuizCommandContext = {
	qs: QuizCommandState;
	question: () => Doc<'question'> | null;
	classId: () => Id<'class'>;
	toggleFilter: (filter: 'flagged' | 'incomplete') => Promise<void>;
	selectQuestion: (question: Doc<'question'>) => Promise<void> | void;
	canEdit?: () => boolean;
	editHref?: () => string | null;
};

const TEXT_SCALE_KEY = 'lt:quizTextScale';

export function createQuizCommands(ctx: QuizCommandContext): QuizCommandRegistry {
	let isFullscreen = $state(false);
	let streak = $state(0);
	let bestStreak = $state(0);
	// Only the first check on a question counts, so re-checking can't pad the streak.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- bookkeeping only, never rendered
	const scoredQuestions = new Set<string>();
	let elapsedSeconds = $state(0);
	let timerRunning = $state(true);
	let textScale = $state(1);

	$effect(() => {
		try {
			textScale = clampTextScale(window.localStorage.getItem(TEXT_SCALE_KEY) ?? 1);
		} catch {
			// storage unavailable
		}
	});

	// Counts only while the tab is visible, so a forgotten tab doesn't inflate study time.
	$effect(() => {
		const tick = setInterval(() => {
			if (timerRunning && document.visibilityState === 'visible') elapsedSeconds++;
		}, 1000);
		return () => clearInterval(tick);
	});

	$effect(() => {
		const sync = () => (isFullscreen = Boolean(document.fullscreenElement));
		sync();
		document.addEventListener('fullscreenchange', sync);
		return () => document.removeEventListener('fullscreenchange', sync);
	});

	async function check(source: CommandSource) {
		const question = ctx.question();
		if (!question) return;

		const selectedOptions = [...ctx.qs.selectedAnswers];
		const eliminatedOptions = [...ctx.qs.eliminatedAnswers];
		let isCorrect: boolean;

		try {
			if (question.type === QUESTION_TYPES.FILL_IN_THE_BLANK) {
				isCorrect = await ctx.qs.checkFillInTheBlank(selectedOptions[0] ?? '', question);
			} else if (question.type === QUESTION_TYPES.MATCHING) {
				isCorrect = await ctx.qs.checkMatching(question);
			} else {
				isCorrect = await ctx.qs.checkAnswer(question.correctAnswers ?? [], selectedOptions);
			}
		} catch {
			return;
		}

		if (!scoredQuestions.has(question._id)) {
			scoredQuestions.add(question._id);
			streak = isCorrect ? streak + 1 : 0;
			bestStreak = Math.max(bestStreak, streak);
		}

		captureQuestionAnswered({
			questionId: question._id,
			generationJobId: question.metadata?.generation?.jobId,
			harnessVersion: question.metadata?.generation?.harnessVersion,
			moduleId: question.moduleId,
			classId: ctx.classId(),
			questionType: question.type,
			selectedOptions,
			eliminatedOptions,
			isCorrect,
			submissionSource: source
		});
		ctx.qs.scheduleSave();
	}

	function toggleOptionAt(index: number): boolean {
		const question = ctx.question();
		if (!question || ctx.qs.showSolution) return false;
		if (question.type === QUESTION_TYPES.FILL_IN_THE_BLANK) return false;
		const option = ctx.qs.getOrderedOptions(question)?.[index];
		if (!option?.id) return false;
		ctx.qs.toggleOption(option.id);
		ctx.qs.scheduleSave();
		return true;
	}

	function nextUnansweredQuestion(): Doc<'question'> | null {
		const list = ctx.qs.getFilteredQuestions();
		const current = ctx.qs.currentQuestionIndex;
		for (let step = 1; step < list.length; step++) {
			const candidate = list[(current + step) % list.length];
			if (
				ctx.qs.learningEvidence
					? ctx.qs.learningEvidence[candidate._id]?.checkedAt === undefined
					: !ctx.qs.liveInteractedQuestions.includes(candidate._id)
			)
				return candidate;
		}
		return null;
	}

	function nextFlaggedQuestion(): Doc<'question'> | null {
		const list = ctx.qs.getFilteredQuestions();
		const current = ctx.qs.currentQuestionIndex;
		for (let step = 1; step < list.length; step++) {
			const candidate = list[(current + step) % list.length];
			if (ctx.qs.liveFlaggedQuestions.includes(candidate._id)) return candidate;
		}
		return null;
	}

	const core: Record<CoreCommandId, QuizCommand> = {
		check: {
			id: 'check',
			name: 'Check',
			tone: 'success',
			look: { variant: 'solid', tone: 'success' },
			scope: 'answer',
			icon: Check,
			defaultDisplay: 'label',
			description: 'Grade your answer',
			label: () => 'Check',
			enabled: () => ctx.qs.selectedAnswers.length > 0,
			run: check
		},
		clear: {
			id: 'clear',
			name: 'Clear',
			tone: 'neutral',
			look: { variant: 'ghost', tone: 'neutral' },
			scope: 'answer',
			icon: Eraser,
			defaultDisplay: 'label',
			description: 'Wipe selections and eliminations',
			label: () => 'Clear',
			run: () => {
				ctx.qs.selectedAnswers = [];
				ctx.qs.eliminatedAnswers = [];
				ctx.qs.checkResult = '';
				ctx.qs.scheduleSave();
			}
		},
		flag: {
			id: 'flag',
			name: 'Flag',
			tone: 'warning',
			look: { variant: 'outline', tone: 'warning' },
			activeLook: { variant: 'solid', tone: 'warning' },
			scope: 'question',
			icon: Flag,
			description: 'Mark this question for review',
			label: () => (ctx.qs.currentQuestionFlagged ? 'Remove flag' : 'Flag question'),
			active: () => ctx.qs.currentQuestionFlagged,
			run: () => ctx.qs.toggleFlag()
		},
		reveal: {
			id: 'reveal',
			name: 'Reveal answer',
			tone: 'info',
			look: { variant: 'outline', tone: 'info' },
			activeLook: { variant: 'solid', tone: 'info' },
			scope: 'question',
			icon: Eye,
			description: 'Show the correct answer',
			label: () => (ctx.qs.showSolution ? 'Hide answer' : 'Reveal answer'),
			active: () => ctx.qs.showSolution,
			run: () => ctx.qs.handleSolution()
		},
		highlight: {
			id: 'highlight',
			name: 'Highlight',
			tone: 'highlighter',
			look: { variant: 'soft', tone: 'highlighter' },
			activeLook: { variant: 'solid', tone: 'highlighter' },
			scope: 'question',
			icon: Highlighter,
			description: 'Mark up the question stem',
			label: () => 'Highlight stems',
			active: () => ctx.qs.highlightEnabled,
			run: () => ctx.qs.toggleHighlighting()
		},
		previous: {
			id: 'previous',
			name: 'Previous',
			tone: 'neutral',
			look: { variant: 'outline', tone: 'neutral' },
			scope: 'navigation',
			icon: ArrowLeft,
			description: 'Go back one question',
			label: () => 'Previous question',
			enabled: () => ctx.qs.canGoPrevious(),
			run: () => ctx.qs.goToPreviousQuestion()
		},
		next: {
			id: 'next',
			name: 'Next',
			tone: 'neutral',
			look: { variant: 'outline', tone: 'neutral' },
			scope: 'navigation',
			icon: ArrowRight,
			description: 'Go forward one question',
			label: () =>
				ctx.qs.currentQuestionIndex >= ctx.qs.getFilteredQuestions().length - 1 &&
				'openCompletion' in ctx.qs
					? 'View overview'
					: 'Next question',
			enabled: () => ctx.qs.canGoNext(),
			run: () => ctx.qs.goToNextQuestion()
		},
		nextUnanswered: {
			id: 'nextUnanswered',
			name: 'Next unanswered',
			tone: 'primary',
			look: { variant: 'soft', tone: 'primary' },
			scope: 'navigation',
			defaultDisplay: 'both',
			icon: SkipForward,
			description: 'Jump to the next untouched question',
			label: () => 'Unanswered',
			detail: () => 'Jump to the next question you have not touched',
			enabled: () => nextUnansweredQuestion() !== null,
			run: async () => {
				const target = nextUnansweredQuestion();
				if (target) await ctx.selectQuestion(target);
			}
		},
		position: {
			id: 'position',
			name: 'Position',
			tone: 'neutral',
			look: { variant: 'soft', tone: 'neutral' },
			scope: 'navigation',
			kind: 'readout',
			icon: Hash,
			description: 'Where you are in the module',
			label: () => {
				const total = ctx.qs.getFilteredQuestions().length;
				return total ? `${Math.min(ctx.qs.currentQuestionIndex + 1, total)} / ${total}` : '0 / 0';
			},
			detail: () =>
				`Question ${Math.min(ctx.qs.currentQuestionIndex + 1, ctx.qs.getFilteredQuestions().length)} of ${ctx.qs.getFilteredQuestions().length}`,
			run: () => {}
		},
		nextFlagged: {
			id: 'nextFlagged',
			name: 'Next flagged',
			tone: 'warning',
			look: { variant: 'soft', tone: 'warning' },
			scope: 'navigation',
			defaultDisplay: 'both',
			icon: FlagTriangleRight,
			description: 'Jump to the next question you flagged',
			label: () => 'Flagged',
			detail: () =>
				ctx.qs.liveFlaggedQuestions.length
					? `Jump to the next of ${ctx.qs.liveFlaggedQuestions.length} flagged`
					: 'Nothing flagged yet',
			enabled: () => nextFlaggedQuestion() !== null,
			run: async () => {
				const target = nextFlaggedQuestion();
				if (target) await ctx.selectQuestion(target);
			}
		},
		progress: {
			id: 'progress',
			name: 'Progress',
			tone: 'success',
			look: { variant: 'soft', tone: 'success' },
			scope: 'insight',
			kind: 'meter',
			icon: ChartPie,
			description: 'How much of the module you have done',
			value: () => ctx.qs.getProgressPercentage(),
			label: () => `${ctx.qs.getProgressPercentage()}%`,
			caption: () => 'done',
			detail: () => {
				const total = ctx.qs.getFilteredQuestions().length;
				return `${Math.min(ctx.qs.interactedQuestionsCount, total)} of ${total} answered`;
			},
			run: () => {}
		},
		streak: {
			id: 'streak',
			name: 'Streak',
			tone: 'ember',
			look: { variant: 'soft', tone: 'ember' },
			scope: 'insight',
			kind: 'readout',
			icon: Flame,
			description: 'First-try correct answers in a row',
			label: () => String(streak),
			caption: () => (streak === 1 ? 'correct' : 'in a row'),
			detail: () => `Best this session: ${bestStreak}`,
			active: () => streak >= 3,
			run: () => {}
		},
		timer: {
			id: 'timer',
			name: 'Study timer',
			tone: 'info',
			look: { variant: 'soft', tone: 'neutral' },
			activeLook: { variant: 'soft', tone: 'warning' },
			scope: 'insight',
			icon: Timer,
			activeIcon: Pause,
			defaultDisplay: 'both',
			description: 'Time on task; pauses when you leave the tab',
			label: () => formatDuration(elapsedSeconds),
			menuValue: () => (timerRunning ? '' : 'Paused · ') + formatDuration(elapsedSeconds),
			detail: () =>
				timerRunning
					? 'Study time · pauses when you leave the tab. Click to pause.'
					: 'Paused · click to resume',
			active: () => !timerRunning,
			run: () => {
				timerRunning = !timerRunning;
			}
		},
		textSize: {
			id: 'textSize',
			name: 'Text size',
			tone: 'primary',
			look: { variant: 'dash', tone: 'neutral' },
			activeLook: { variant: 'soft', tone: 'primary' },
			scope: 'preference',
			defaultDisplay: 'both',
			icon: ALargeSmall,
			description: 'Make questions easier to read',
			label: () => `${Math.round(textScale * 100)}%`,
			menuValue: () => `${Math.round(textScale * 100)}%`,
			detail: () => `Question text at ${Math.round(textScale * 100)}% · click to cycle`,
			active: () => textScale !== 1,
			run: () => {
				textScale = nextTextScale(textScale);
				try {
					window.localStorage.setItem(TEXT_SCALE_KEY, String(textScale));
				} catch {
					// storage unavailable
				}
			}
		},
		shuffle: {
			id: 'shuffle',
			name: 'Shuffle questions',
			tone: 'secondary',
			look: { variant: 'solid', tone: 'secondary' },
			scope: 'session',
			defaultDisplay: 'both',
			icon: Shuffle,
			description: 'Randomize question order',
			label: () => (ctx.qs.isShuffled ? 'Unshuffle' : 'Shuffle'),
			active: () => ctx.qs.isShuffled,
			run: () => ctx.qs.toggleShuffle()
		},
		filterFlagged: {
			id: 'filterFlagged',
			name: 'Flagged only',
			tone: 'warning',
			look: { variant: 'dash', tone: 'warning' },
			activeLook: { variant: 'solid', tone: 'warning' },
			scope: 'session',
			icon: Flag,
			description: 'Study only flagged questions',
			label: () => (ctx.qs.showFlagged ? 'Show All' : 'Show Flagged'),
			active: () => ctx.qs.showFlagged,
			run: () => ctx.toggleFilter('flagged')
		},
		filterIncomplete: {
			id: 'filterIncomplete',
			name: 'Unanswered only',
			tone: 'primary',
			look: { variant: 'dash', tone: 'primary' },
			activeLook: { variant: 'solid', tone: 'primary' },
			scope: 'session',
			icon: BookmarkCheck,
			description: 'Hide questions you have answered',
			label: () => (ctx.qs.showIncomplete ? 'Show All' : 'Show Incomplete'),
			active: () => ctx.qs.showIncomplete,
			run: () => ctx.toggleFilter('incomplete')
		},
		reset: {
			id: 'reset',
			name: 'Reset',
			tone: 'error',
			look: { variant: 'ghost', tone: 'error' },
			scope: 'session',
			icon: ListRestart,
			description: 'Start this module over',
			label: () => 'Reset',
			run: () => {
				ctx.qs.isResetModalOpen = true;
			}
		},
		autoNext: {
			id: 'autoNext',
			name: 'Auto next',
			tone: 'info',
			look: { variant: 'dash', tone: 'info' },
			activeLook: { variant: 'soft', tone: 'info' },
			scope: 'preference',
			defaultDisplay: 'both',
			icon: FastForward,
			description: 'Advance after a correct answer',
			label: () => 'Auto next',
			detail: () =>
				ctx.qs.autoNextEnabled
					? 'On · moves to the next question after a correct answer'
					: 'Off · stay on the question after answering',
			active: () => ctx.qs.autoNextEnabled,
			run: () => ctx.qs.setAutoNextEnabled(!ctx.qs.autoNextEnabled)
		},
		shuffleOptions: {
			id: 'shuffleOptions',
			name: 'Shuffle answers',
			tone: 'secondary',
			look: { variant: 'dash', tone: 'secondary' },
			activeLook: { variant: 'soft', tone: 'secondary' },
			scope: 'preference',
			defaultDisplay: 'both',
			icon: Dices,
			description: 'Randomize answer choice order',
			label: () => 'Answers',
			detail: () =>
				ctx.qs.optionsShuffleEnabled
					? 'On · answer choices are randomized'
					: 'Off · answer choices in original order',
			active: () => ctx.qs.optionsShuffleEnabled,
			run: () => ctx.qs.setOptionsShuffleEnabled(!ctx.qs.optionsShuffleEnabled)
		},
		focus: {
			id: 'focus',
			name: 'Focus mode',
			tone: 'accent',
			look: { variant: 'dash', tone: 'accent' },
			activeLook: { variant: 'solid', tone: 'accent' },
			scope: 'preference',
			icon: Focus,
			activeIcon: Minimize2,
			defaultDisplay: 'both',
			description: 'Go fullscreen, hide distractions',
			label: () => (isFullscreen ? 'Exit focus' : 'Focus'),
			available: () => typeof document !== 'undefined' && document.fullscreenEnabled,
			active: () => isFullscreen,
			run: async () => {
				if (document.fullscreenElement) await document.exitFullscreen();
				else await document.documentElement.requestFullscreen();
			}
		},
		edit: {
			id: 'edit',
			name: 'Edit question',
			tone: 'neutral',
			look: { variant: 'ghost', tone: 'neutral' },
			scope: 'question',
			icon: Pencil,
			description: 'Open this question in the editor',
			label: () => 'Edit',
			available: () => ctx.canEdit?.() ?? false,
			visible: () => Boolean(ctx.editHref?.()),
			href: () => ctx.editHref?.() ?? '',
			run: () => {}
		}
	};

	let commands = $state.raw<QuizCommandMap>(core);

	return {
		get commands() {
			return commands;
		},
		get textScale() {
			return textScale;
		},
		get: (id) => commands[id],
		register: (...extra) => {
			commands = { ...commands, ...Object.fromEntries(extra.map((c) => [c.id, c])) };
			return () => {
				const next = { ...commands };
				for (const c of extra) if (next[c.id] === c) delete next[c.id];
				commands = next;
			};
		},
		toggleOptionAt
	};
}

const QUIZ_COMMANDS_KEY = Symbol('quiz-commands');

export function setQuizCommands(registry: QuizCommandRegistry) {
	return setContext(QUIZ_COMMANDS_KEY, registry);
}

export function getQuizCommands(): QuizCommandRegistry | undefined {
	return getContext<QuizCommandRegistry | undefined>(QUIZ_COMMANDS_KEY);
}

export function isCommandShown(command: QuizCommand | undefined): command is QuizCommand {
	return Boolean(command) && command!.available?.() !== false && command!.visible?.() !== false;
}
