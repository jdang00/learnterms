// Brand roles shared by Button, Badge, Alert and Progress. Each tone sets three custom properties
// that the variants read: --tone (the solid), --tone-fg (text on the solid), --tone-ink (text on the page).
// Literal class strings so Tailwind can see them.
export const TONES = [
	'neutral',
	'primary',
	'secondary',
	'accent',
	'info',
	'success',
	'warning',
	'error',
	'highlighter',
	'ember'
] as const;

export type Tone = (typeof TONES)[number];

export const toneVars: Record<Tone, string> = {
	neutral:
		'[--tone:var(--neutral)] [--tone-fg:var(--neutral-foreground)] [--tone-ink:var(--foreground)]',
	primary:
		'[--tone:var(--primary)] [--tone-fg:var(--primary-foreground)] [--tone-ink:var(--primary-ink)]',
	secondary:
		'[--tone:var(--secondary)] [--tone-fg:var(--secondary-foreground)] [--tone-ink:var(--secondary-ink)]',
	accent:
		'[--tone:var(--accent)] [--tone-fg:var(--accent-foreground)] [--tone-ink:var(--accent-ink)]',
	info: '[--tone:var(--info)] [--tone-fg:var(--info-foreground)] [--tone-ink:var(--info-ink)]',
	success:
		'[--tone:var(--success)] [--tone-fg:var(--success-foreground)] [--tone-ink:var(--success-ink)]',
	warning:
		'[--tone:var(--warning)] [--tone-fg:var(--warning-foreground)] [--tone-ink:var(--warning-ink)]',
	error: '[--tone:var(--error)] [--tone-fg:var(--error-foreground)] [--tone-ink:var(--error-ink)]',
	highlighter:
		'[--tone:var(--highlighter)] [--tone-fg:var(--highlighter-foreground)] [--tone-ink:var(--highlighter-ink)]',
	ember: '[--tone:var(--ember)] [--tone-fg:var(--ember-foreground)] [--tone-ink:var(--ember-ink)]'
};
