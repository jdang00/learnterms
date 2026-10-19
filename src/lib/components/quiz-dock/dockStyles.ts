import { buttonVariants } from '#lib/components/ui/button/index.js';
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
		shape: shape !== 'auto' ? shape : display === 'icon' ? 'circle' : 'pill'
	})} ${GLASS[variant]}`;
}

// The floating desktop island and the phone bar. Test and review pages reuse these for their own docks.
export const DOCK_ISLAND_CLASS =
	'dock-glass fixed inset-x-0 bottom-5 z-40 mx-auto hidden w-fit items-center gap-2 rounded-full p-2.5 md:inline-flex animate-in fade-in-0 slide-in-from-bottom-6 duration-500 ease-out motion-reduce:animate-none [--segment-gap:--spacing(2)]';
export const DOCK_PHONE_BAR_CLASS =
	'dock-glass bottom-dock fixed inset-x-0 z-50 rounded-t-[1.75rem] border-b-0 md:hidden';

// A big tappable tool in the phone Tools sheet. Callers add the active tone.
export const TOOL_TILE_CLASS =
	'flex min-h-20 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-border text-sm font-medium active:scale-[0.97] px-2 transition-colors disabled:opacity-40';

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
