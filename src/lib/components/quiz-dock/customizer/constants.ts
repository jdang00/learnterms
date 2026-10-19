import type { DockDisplay } from '../layouts';
import type { CommandScope } from '../types';

export const MOTION =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
		? 0
		: 1;

export const SECTIONS: { scope: CommandScope | 'layout'; title: string }[] = [
	{ scope: 'answer', title: 'Answer' },
	{ scope: 'question', title: 'Question' },
	{ scope: 'navigation', title: 'Navigate' },
	{ scope: 'insight', title: 'At a glance' },
	{ scope: 'session', title: 'Session' },
	{ scope: 'preference', title: 'Preferences' },
	{ scope: 'layout', title: 'Layout' }
];

export const QUICK_TOOLS = [
	'notes',
	'calculator',
	'reveal',
	'highlight',
	'streak',
	'shuffle',
	'progress',
	'timer',
	'nextUnanswered',
	'autoNext',
	'textSize',
	'reset'
];

export const MINI_DOCK_LIMIT = 7;
export const BONE = 'rounded-full bg-foreground/[0.06]';
export const MOCK = 'rounded-2xl border border-dashed border-foreground/15 bg-background';
export const PHONE = 'rounded-[2rem] border-[3px] border-foreground/10 bg-background';
export const CAPTION = 'px-1 label-caps';

export const DISPLAY_OPTIONS: [DockDisplay, string][] = [
	['icon', 'Icon'],
	['label', 'Text'],
	['both', 'Both']
];
