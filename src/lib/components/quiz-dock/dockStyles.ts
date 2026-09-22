import type { ButtonLook, ButtonVariant, CommandTone, QuizCommand } from './types';
import type { DockDisplay } from './layouts';

export type DockShape = 'auto' | 'segment-start' | 'segment-end';

// Literal class names so Tailwind/daisyUI can see them.
const VARIANT: Record<ButtonVariant, string> = {
	solid: '',
	soft: 'btn-soft',
	outline: 'btn-outline',
	dash: 'btn-dash',
	ghost: 'btn-ghost'
};

const COLOR: Record<Exclude<CommandTone, 'neutral' | 'highlighter' | 'ember'>, string> = {
	primary: 'btn-primary',
	success: 'btn-success',
	warning: 'btn-warning',
	secondary: 'btn-secondary',
	info: 'btn-info',
	accent: 'btn-accent',
	error: 'btn-error'
};

// Matches the stem highlight marks: solid lemon when on, theme-aware ink at rest (see app.css).
const HIGHLIGHTER_SOLID = '[--btn-color:var(--color-highlighter)] [--btn-fg:#422006]';
const HIGHLIGHTER_TINT = '[--btn-color:var(--color-highlighter-ink)]';

// A true orange for streaks; daisyUI's warning reads as amber in most themes.
const EMBER_SOLID = '[--btn-color:#f97316] [--btn-fg:#fff]';
const EMBER_TINT = '[--btn-color:#f97316]';

// Ghost buttons keep their hue in the text; a colored ghost would inherit the -content color.
export const TONE_TEXT: Record<CommandTone, string> = {
	neutral: 'text-base-content/75',
	primary: 'text-primary',
	success: 'text-success',
	warning: 'text-warning',
	secondary: 'text-secondary',
	info: 'text-info',
	accent: 'text-accent',
	error: 'text-error',
	highlighter: 'text-[var(--color-highlighter-ink)]',
	ember: 'text-orange-500'
};

// Previous/next read as one split pill: rounded outside, flat where they meet, nearly touching.
// Containers set --dock-gap so the pair can cancel it.
const SEGMENT_RADIUS: Record<Exclude<DockShape, 'auto'>, string> = {
	'segment-start': 'border-radius: 9999px 0.3rem 0.3rem 9999px',
	'segment-end':
		'border-radius: 0.3rem 9999px 9999px 0.3rem; margin-left: calc(2px - var(--dock-gap, 0px))'
};

export function segmentStyle(shape: DockShape): string | undefined {
	return shape === 'auto' ? undefined : SEGMENT_RADIUS[shape];
}

export const TONE_BADGE: Record<CommandTone, string> = {
	neutral: 'bg-base-content/5 text-base-content/80',
	primary: 'bg-primary/12 text-primary',
	success: 'bg-success/12 text-success',
	warning: 'bg-warning/15 text-warning',
	secondary: 'bg-secondary/12 text-secondary',
	info: 'bg-info/12 text-info',
	accent: 'bg-accent/12 text-accent',
	error: 'bg-error/12 text-error',
	highlighter: 'bg-[var(--color-highlighter)]/25 text-[var(--color-highlighter-ink)]',
	ember: 'bg-orange-500/15 text-orange-500'
};

export function lookClass({ variant, tone }: ButtonLook) {
	if (variant === 'ghost') return `btn-ghost ${TONE_TEXT[tone]}`;
	if (tone === 'neutral') return variant === 'solid' ? 'btn-neutral' : VARIANT[variant];
	if (tone === 'ember')
		return variant === 'solid' ? EMBER_SOLID : `${VARIANT[variant]} ${EMBER_TINT}`;
	if (tone === 'highlighter') {
		return variant === 'solid' ? HIGHLIGHTER_SOLID : `${VARIANT[variant]} ${HIGHLIGHTER_TINT}`;
	}
	return `${VARIANT[variant]} ${COLOR[tone]}`;
}

export function lookFor(command: QuizCommand, active: boolean): ButtonLook {
	if (!active) return command.look;
	return command.activeLook ?? command.look;
}

export function dockButtonClass(
	command: QuizCommand,
	{
		display,
		shape = 'auto',
		active = false
	}: { display: DockDisplay; shape?: DockShape; active?: boolean }
) {
	const form = shape !== 'auto' ? '' : display === 'icon' ? 'btn-circle' : 'rounded-full';
	return `btn btn-sm ${lookClass(lookFor(command, active))} ${form}`;
}

export const READOUT_CLASS =
	'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium tabular-nums text-base-content/80 bg-base-content/[0.06]';

export function isPassive(command: QuizCommand | undefined) {
	return command?.kind === 'readout' || command?.kind === 'meter';
}

export function segmentShape(ids: string[], index: number): DockShape {
	if (ids[index] === 'previous' && ids[index + 1] === 'next') return 'segment-start';
	if (ids[index] === 'next' && ids[index - 1] === 'previous') return 'segment-end';
	return 'auto';
}
