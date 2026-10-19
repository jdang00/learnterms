import { buttonVariants } from '$lib/components/ui/button';
import type { ButtonLook, CommandTone, QuizCommand } from './types';
import type { DockDisplay } from './layouts';

export type DockShape = 'auto' | 'segment-start' | 'segment-end';

// Icon and label ink for a tone on the page (menus, readouts, the tools bar).
export const TONE_TEXT: Record<CommandTone, string> = {
	neutral: 'text-foreground/75',
	primary: 'text-primary-ink',
	success: 'text-success-ink',
	warning: 'text-warning-ink',
	secondary: 'text-secondary-ink',
	info: 'text-info-ink',
	accent: 'text-accent-ink',
	error: 'text-error-ink',
	highlighter: 'text-highlighter-ink',
	ember: 'text-ember-ink'
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
	neutral: 'bg-foreground/5 text-foreground/80',
	primary: 'bg-primary/12 text-primary-ink',
	success: 'bg-success/14 text-success-ink',
	warning: 'bg-warning/18 text-warning-ink',
	secondary: 'bg-secondary/12 text-secondary-ink',
	info: 'bg-info/14 text-info-ink',
	accent: 'bg-accent/14 text-accent-ink',
	error: 'bg-error/14 text-error-ink',
	highlighter: 'bg-highlighter/30 text-highlighter-ink',
	ember: 'bg-ember/15 text-ember-ink'
};

export function lookFor(command: QuizCommand, active: boolean): ButtonLook {
	if (!active) return command.look;
	return command.activeLook ?? command.look;
}

// Glass finishes by role. Solids read as glossy candy (sheen, inner rim) and light up on hover;
// toggles are frosted pills with a tone rim; utilities stay quiet until hovered.
const GLASS: Record<ButtonLook['variant'], string> = {
	solid:
		'bg-linear-to-b from-white/20 via-white/4 to-transparent shadow-[inset_0_1px_0_rgb(255_255_255/0.4),inset_0_-1px_0_rgb(0_0_0/0.12)] dark:from-white/10 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] hover:bg-(--tone) hover:brightness-110 [transition-property:color,background-color,border-color,box-shadow,translate,filter]',
	soft: 'shadow-[inset_0_1px_0_rgb(255_255_255/0.55),inset_0_0_0_1px_color-mix(in_oklab,var(--tone)_24%,transparent)]',
	outline:
		'border-[1.5px] bg-white/35 shadow-[inset_0_1px_0_rgb(255_255_255/0.6)] hover:bg-white/60 dark:bg-white/[0.03] dark:shadow-none dark:hover:bg-white/8',
	dash: 'border-[1.5px] bg-white/25 hover:bg-white/55 dark:bg-white/[0.03] dark:hover:bg-white/8',
	ghost: 'hover:bg-white/60 dark:hover:bg-white/10'
};

/** The dock's glass finish for a Button variant, for islands built from plain Buttons. */
export function dockGlass(variant: ButtonLook['variant'] = 'solid') {
	return GLASS[variant];
}

export function dockButtonClass(
	command: QuizCommand,
	{
		display,
		shape = 'auto',
		active = false
	}: { display: DockDisplay; shape?: DockShape; active?: boolean }
) {
	const { variant, tone } = lookFor(command, active);
	return `${buttonVariants({
		variant,
		tone,
		size: 'md',
		shape: shape === 'auto' && display === 'icon' ? 'circle' : 'pill'
	})} ${GLASS[variant]}`;
}

export const READOUT_CLASS =
	'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium tabular-nums text-foreground/80 bg-foreground/[0.06]';

export function isPassive(command: QuizCommand | undefined) {
	return command?.kind === 'readout' || command?.kind === 'meter';
}

export function segmentShape(ids: string[], index: number): DockShape {
	if (ids[index] === 'previous' && ids[index + 1] === 'next') return 'segment-start';
	if (ids[index] === 'next' && ids[index - 1] === 'previous') return 'segment-end';
	return 'auto';
}
